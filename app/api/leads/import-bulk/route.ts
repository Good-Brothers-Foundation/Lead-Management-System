import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Activity from "@/lib/models/Activity";
import Notification from "@/lib/models/Notification";
import { broadcast } from "@/lib/realtime";

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

    for (const leadData of leadsArray) {
      if (leadData.source && leadData.source.trim().toLowerCase() === "google") {
        leadData.source = "google-maps";
      }

      if (!leadData.status || leadData.status.trim() === "" || leadData.status === "—") {
        leadData.status = "new";
      } else {
        const lower = leadData.status.trim().toLowerCase();
        if (["new", "contacted", "qualified", "proposal", "converted", "unqualified"].includes(lower)) {
          leadData.status = lower;
        } else {
          leadData.status = "new";
        }
      }
      const { fullName, phone, gmbLink, address } = leadData;

      // Minimal required validation check
      if (!fullName || fullName.trim() === "") {
        skippedLeads.push({ lead: leadData, reason: "Missing full name" });
        continue;
      }

      // Check duplicates within the same incoming batch
      let isBatchDuplicate = false;
      const trimmedGmb = gmbLink && gmbLink !== "N/A" ? gmbLink.trim() : "";
      if (trimmedGmb && processedGmbLinks.has(trimmedGmb)) {
        isBatchDuplicate = true;
      }

      const cleanPhone = phone && phone !== "N/A" ? phone.replace(/[^0-9]/g, "") : "";
      const last10Digits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";
      if (last10Digits && processedPhones.has(last10Digits)) {
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
      if (!existingLead && last10Digits) {
        const regexStr = last10Digits.split("").join("\\D*") + "$";
        existingLead = await Lead.findOne({
          phone: { $regex: new RegExp(regexStr) }
        });
      }

      // 3. Check by Full Name and Address
      if (!existingLead && address && address !== "N/A" && address.trim() !== "") {
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
      if (last10Digits) processedPhones.add(last10Digits);

      // Create new lead database record
      const newLead = await Lead.create(leadData);
      insertedLeads.push(newLead);

      // Create activity trail record
      await Activity.create({
        leadId: newLead._id,
        action: "Lead Imported",
        performedBy: "Scraper Bulk Import / System",
        details: `Lead bulk imported for ${newLead.fullName}`,
      });
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
