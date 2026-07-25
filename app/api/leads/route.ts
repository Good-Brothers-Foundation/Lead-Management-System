import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Activity from "@/lib/models/Activity";
import Notification from "@/lib/models/Notification";
import { broadcast } from "@/lib/realtime";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Self-healing migration: Convert any invalid or missing statuses (like "—", null, or empty strings) to "new"
    await Lead.updateMany(
      {
        $or: [
          { status: { $in: ["—", "", null] } },
          { status: { $exists: false } }
        ]
      } as any,
      { $set: { status: "new" } }
    );

    // Self-healing migration: Convert any missing or empty sources to "google-maps"
    await Lead.updateMany(
      {
        $or: [
          { source: { $in: ["", null] } },
          { source: { $exists: false } }
        ]
      } as any,
      { $set: { source: "google-maps" } }
    );

    const { searchParams } = new URL(req.url);

    // Read all filter params
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const service = searchParams.get("service");
    const assignee = searchParams.get("assignee");

    // Build the MongoDB query — always applied regardless of pagination
    const query: Record<string, unknown> = { isDeleted: { $ne: true } };

    if (status && status !== "all") {
      query.status = status;
    }
    if (category && category !== "all") {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }
    if (service && service !== "all") {
      query.service = { $regex: new RegExp(`^${service.trim()}$`, "i") };
    }
    if (assignee && assignee !== "all") {
      if (assignee === "unassigned") {
        query.$or = [
          { assignedTo: { $exists: false } },
          { assignedTo: null },
          { assignedTo: "" },
        ] as unknown as Record<string, unknown>;
      } else {
        query.assignedTo = { $regex: new RegExp(`^${assignee.trim()}$`, "i") };
      }
    }
    if (search && search.trim() !== "") {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      // If assignee filter already set $or, wrap with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { fullName: searchRegex },
              { category: searchRegex },
              { address: searchRegex },
              { service: searchRegex },
              { phone: searchRegex },
            ],
          },
        ] as unknown as Record<string, unknown>;
        delete query.$or;
      } else {
        query.$or = [
          { fullName: searchRegex },
          { category: searchRegex },
          { address: searchRegex },
          { service: searchRegex },
          { phone: searchRegex },
        ] as unknown as Record<string, unknown>;
      }
    }

    // Shared metadata query (always over full dataset for sidebar counts)
    const [
      distinctCategories,
      distinctServices,
      distinctSources,
      distinctTimelines,
      distinctBudgets,
      distinctAssignees,
      statusAgg,
    ] = await Promise.all([
      Lead.distinct("category", { isDeleted: { $ne: true } }),
      Lead.distinct("service", { isDeleted: { $ne: true } }),
      Lead.distinct("source", { isDeleted: { $ne: true } }),
      Lead.distinct("timeline", { isDeleted: { $ne: true } }),
      Lead.distinct("budget", { isDeleted: { $ne: true } }),
      Lead.distinct("assignedTo", { isDeleted: { $ne: true } }),
      Lead.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const categories = (distinctCategories as unknown[])
      .filter((c): c is string => typeof c === "string" && c.trim() !== "")
      .sort();
    const services = (distinctServices as unknown[])
      .filter((s): s is string => typeof s === "string" && s.trim() !== "")
      .sort();
    const sources = (distinctSources as unknown[])
      .filter((s): s is string => typeof s === "string" && s.trim() !== "")
      .sort();
    const timelines = (distinctTimelines as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim() !== "")
      .sort();
    const budgets = (distinctBudgets as unknown[])
      .filter((b): b is string => typeof b === "string" && b.trim() !== "")
      .sort();
    const assignees = (distinctAssignees as unknown[])
      .filter((a): a is string => typeof a === "string" && a.trim() !== "")
      .sort();

    // statusCounts always reflect the whole dataset (not the filtered view)
    const totalAllLeads = await Lead.countDocuments({ isDeleted: { $ne: true } });
    const statusCounts: Record<string, number> = { all: totalAllLeads };
    (statusAgg as { _id: string; count: number }[]).forEach((item) => {
      if (item._id) statusCounts[item._id] = item.count;
    });

    // --- Paginated response ---
    if (pageStr || limitStr) {
      const page = Math.max(1, parseInt(pageStr || "1"));
      const limit = Math.max(1, parseInt(limitStr || "20"));

      const totalFiltered = await Lead.countDocuments(query);
      const totalPages = Math.ceil(totalFiltered / limit);
      const skip = (page - 1) * limit;

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return NextResponse.json({
        success: true,
        data: leads,
        categories,
        services,
        sources,
        timelines,
        budgets,
        assignees,
        statusCounts,
        pagination: {
          total: totalFiltered,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    }

    // --- Non-paginated response (all matching leads) ---
    const leads = await Lead.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: leads.length,
      data: leads,
      categories,
      services,
      sources,
      timelines,
      budgets,
      assignees,
      statusCounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (body.source && body.source.trim().toLowerCase() === "google") {
      body.source = "google-maps";
    }

    if (!body.status || body.status.trim() === "" || body.status === "—") {
      body.status = "new";
    } else {
      // Normalize to a canonical kebab/slug form so duplicate detection and
      // filter dropdowns work consistently. Custom values (e.g. "Closed Lost",
      // "Quotation Sent") are slugged rather than silently dropped to "new".
      const lower = body.status.trim().toLowerCase();
      if (["new", "contacted", "qualified", "proposal", "converted", "unqualified"].includes(lower)) {
        body.status = lower;
      } else {
        body.status = lower
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
    }

    const { fullName, phone, gmbLink, address } = body;

    let existingLead = null;

    // 1. Check by GMB Link
    if (gmbLink && gmbLink !== "N/A" && gmbLink.trim() !== "") {
      existingLead = await Lead.findOne({ gmbLink: gmbLink.trim() });
    }

    // 2. Check by Phone
    if (!existingLead && phone && phone !== "N/A" && phone.trim() !== "") {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 10) {
        const last10Digits = cleanPhone.slice(-10);
        const regexStr = last10Digits.split("").join("\\D*") + "$";
        existingLead = await Lead.findOne({
          phone: { $regex: new RegExp(regexStr) }
        });
      }
    }

    // 3. Check by Full Name and Address
    if (!existingLead && fullName && address && address !== "N/A" && address.trim() !== "") {
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
      return NextResponse.json(
        {
          success: false,
          message: `Lead already exists: a duplicate was found under the name "${existingLead.fullName}"`,
        },
        { status: 409 }
      );
    }

    const lead = await Lead.create(body);

    // Create lead activity audit log
    await Activity.create({
      leadId: lead._id,
      action: "Lead Created",
      performedBy: lead.assignedTo || "System / Admin",
      details: `Lead created for ${lead.fullName} requesting service: ${lead.service || "unspecified"}`,
    });

    // Create system notification
    const notification = await Notification.create({
      title: "New Lead Added 👤",
      message: `${lead.fullName} has been added to the pipeline for ${lead.service || "unspecified"}`,
      type: "lead_created",
      link: "/leads/all",
    });

    // Broadcast real-time events
    broadcast("lead_created", lead);
    broadcast("notification_created", notification);

    return NextResponse.json(
      { success: true, message: "Lead created successfully", data: lead },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
