import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Activity from "@/lib/models/Activity";
import Notification from "@/lib/models/Notification";
import { broadcast } from "@/lib/realtime";

function normalizeValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPlaceholder(value: unknown): boolean {
  const raw = normalizeValue(value).toLowerCase();
  return raw === "" || ["n/a", "na", "-", "—", "null", "undefined"].includes(raw);
}

function toPhoneLast10(phone: unknown): string {
  if (isPlaceholder(phone)) return "";
  const cleaned = String(phone).replace(/[^0-9]/g, "");
  return cleaned.length >= 10 ? cleaned.slice(-10) : "";
}

function normalizeEmails(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value
      .map((entry) => normalizeValue(entry).toLowerCase())
      .filter((entry) => entry !== "" && !isPlaceholder(entry)))];
  }

  const asString = normalizeValue(value);
  if (!asString || isPlaceholder(asString)) return [];

  return [...new Set(
    asString
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry !== "" && !isPlaceholder(entry))
  )];
}

function normalizeSource(source: unknown): string {
  const src = normalizeValue(source).toLowerCase();
  const sourceAlias: Record<string, string> = {
    google: "google-maps",
    gmb: "google-maps",
    "google-maps": "google-maps",
    "google maps": "google-maps",
    direct: "walk-in",
    "walk-in": "walk-in",
    walkin: "walk-in",
    ig: "instagram",
    insta: "instagram",
    instagram: "instagram",
    wa: "whatsapp",
    whatsapp: "whatsapp",
    fb: "facebook",
    facebook: "facebook",
  };

  if (isPlaceholder(src)) return "google-sheets";
  return sourceAlias[src] || src;
}

function normalizeStatus(status: unknown): string {
  const raw = normalizeValue(status);
  if (isPlaceholder(raw)) return "new";

  const lower = raw.toLowerCase();
  const allowedCanonical = ["new", "contacted", "qualified", "proposal", "converted", "unqualified"];
  if (allowedCanonical.includes(lower)) {
    return lower;
  }

  return lower
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "new";
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const leadsArray = Array.isArray(body) ? body : (Array.isArray(body.leads) ? body.leads : null);

    if (!leadsArray) {
      return NextResponse.json(
        { success: false, message: "Invalid payload. Expected an array of leads." },
        { status: 400 }
      );
    }

    const insertedLeads = [];
    const skippedLeads = [];

    // Keep track of processed identifiers in this batch to avoid inserting self-duplicates
    const processedGmbLinks = new Set<string>();
    const processedPhones = new Set<string>();
    const processedEmails = new Set<string>();

    for (const leadData of leadsArray) {
      try {
        const normalizedLead: Record<string, unknown> = { ...leadData };
        normalizedLead.source = normalizeSource(leadData?.source);
        normalizedLead.status = normalizeStatus(leadData?.status);

        // Remove placeholder fields to avoid sparse unique index collisions.
        if (isPlaceholder(leadData?.gmbLink)) delete normalizedLead.gmbLink;
        if (isPlaceholder(leadData?.phone)) delete normalizedLead.phone;
        if (isPlaceholder(leadData?.address)) delete normalizedLead.address;
        if (isPlaceholder(leadData?.website)) delete normalizedLead.website;
        if (isPlaceholder(leadData?.assignedTo)) delete normalizedLead.assignedTo;

        const contactName = normalizeValue(leadData?.fullName);
        const businessName = normalizeValue(leadData?.businessName);
        const fullName = businessName || contactName;
        const gmbLink = normalizeValue(leadData?.gmbLink);
        const address = normalizeValue(leadData?.address);
        const primaryPhoneLast10 = toPhoneLast10(leadData?.phone);
        const alternatePhoneLast10 = toPhoneLast10(leadData?.alternatePhone);
        const phonesForMatch = [...new Set([primaryPhoneLast10, alternatePhoneLast10].filter(Boolean))];
        const emailsForMatch = normalizeEmails(leadData?.emails);

        // Minimal required validation check
        if (!fullName) {
          skippedLeads.push({ lead: leadData, reason: "Missing contact/business name" });
          continue;
        }
        normalizedLead.fullName = fullName;
        if (businessName) normalizedLead.businessName = businessName;
        if (emailsForMatch.length > 0) {
          normalizedLead.emails = emailsForMatch;
        } else {
          delete normalizedLead.emails;
        }

        // Check duplicates within the same incoming batch
        let isBatchDuplicate = false;
        const trimmedGmb = isPlaceholder(gmbLink) ? "" : gmbLink;
        if (trimmedGmb && processedGmbLinks.has(trimmedGmb)) {
          isBatchDuplicate = true;
        }

        if (phonesForMatch.some((phone) => processedPhones.has(phone))) {
          isBatchDuplicate = true;
        }

        if (emailsForMatch.some((email) => processedEmails.has(email))) {
          isBatchDuplicate = true;
        }

        if (isBatchDuplicate) {
          skippedLeads.push({ lead: leadData, reason: "Duplicate lead within the uploaded batch" });
          continue;
        }

        // Check database duplicates
        let existingLead = null;

        // 1. Check by GMB Link
        if (trimmedGmb) {
          existingLead = await Lead.findOne({ gmbLink: trimmedGmb });
        }

        // 2. Check by Phone suffix matching
        if (!existingLead && phonesForMatch.length > 0) {
          const phoneRegexConditions = phonesForMatch.map((phone) => {
            const regexStr = phone.split("").join("\\D*") + "$";
            return { phone: { $regex: new RegExp(regexStr) } };
          });

          existingLead = await Lead.findOne({
            $or: phoneRegexConditions
          });
        }

        // 3. Check by email intersection
        if (!existingLead && emailsForMatch.length > 0) {
          existingLead = await Lead.findOne({
            emails: { $in: emailsForMatch }
          });
        }

        // 4. Check by Full Name and Address
        if (!existingLead && address && !isPlaceholder(address)) {
          const cleanName = fullName.replace(/[^a-zA-Z0-9]/g, "");
          const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, "");

          if (cleanName && cleanAddress) {
            const nameRegex = new RegExp("^\\W*" + cleanName.split("").join("\\W*") + "\\W*$", "i");
            const addrRegex = new RegExp("^\\W*" + cleanAddress.split("").join("\\W*") + "\\W*$", "i");

            existingLead = await Lead.findOne({
              fullName: { $regex: nameRegex },
              address: { $regex: addrRegex }
            });
          }
        }

        if (existingLead) {
          skippedLeads.push({ lead: leadData, reason: `Duplicate of existing lead: "${existingLead.fullName}"` });
          continue;
        }

        // Register identifiers to prevent subsequent batch duplicates
        if (trimmedGmb) processedGmbLinks.add(trimmedGmb);
        phonesForMatch.forEach((phone) => processedPhones.add(phone));
        emailsForMatch.forEach((email) => processedEmails.add(email));

        // Create new lead database record
        const newLead = await Lead.create(normalizedLead);
        insertedLeads.push(newLead);

        // Create activity trail record
        await Activity.create({
          leadId: newLead._id,
          action: "Lead Imported",
          performedBy: "Scraper Bulk Import / System",
          details: `Lead bulk imported for ${newLead.fullName}`,
        });
      } catch (rowError) {
        const message = rowError instanceof Error ? rowError.message : String(rowError);
        const duplicateKey = /E11000 duplicate key/i.test(message);
        skippedLeads.push({
          lead: leadData,
          reason: duplicateKey
            ? "Skipped due to duplicate unique field value"
            : `Import failed for this row: ${message}`,
        });
      }
    }

    if (insertedLeads.length > 0) {
      // Create single summary notification
      const notification = await Notification.create({
        title: "Bulk Leads Imported 📥",
        message: `${insertedLeads.length} new leads have been imported successfully. ${skippedLeads.length} leads were skipped.`,
        type: "lead_created",
        link: "/leads/all",
      });

      // Broadcast to all connected clients
      broadcast("lead_created", insertedLeads[0]); // Broadcast first lead to trigger a list update
      broadcast("notification_created", notification);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: leadsArray.length,
        insertedCount: insertedLeads.length,
        skippedCount: skippedLeads.length,
      },
      inserted: insertedLeads.map((l) => ({ id: l._id, fullName: l.fullName })),
      skipped: skippedLeads,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Bulk import execution failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
