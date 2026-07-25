import { useState, useEffect, useCallback } from "react";
import { LeadFormData } from "@/lib/types/lead";
import { useRealtimeSubscription } from "@/components/providers/RealtimeProvider";
import { formatLabel } from "@/lib/lead-insights";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  MapPin,
  Star,
  Mail,
  Phone,
  Calendar,
  Clock,
  UserCheck,
  DollarSign,
  FileText,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";

const getStatusBadgeStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "new": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "contacted": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "qualified": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "proposal": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "converted": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "unqualified": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case "new": return "New";
    case "contacted": return "Contacted";
    case "qualified": return "Qualified";
    case "proposal": return "Proposal Sent";
    case "converted": return "Converted";
    case "unqualified": return "Unqualified";
    default: return status;
  }
};

interface LeadDetailViewProps {
  lead: LeadFormData;
}

export function LeadDetailView({ lead }: LeadDetailViewProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const fetchActivities = useCallback(() => {
    if (!lead?._id) return;
    setLoadingActivities(true);
    fetch(`/api/leads/${lead._id}/activities`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivities(data.data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingActivities(false));
  }, [lead?._id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Subscribe to real-time updates to refresh activities list instantly
  useRealtimeSubscription("lead_updated", (updatedLead: any) => {
    if (updatedLead?._id === lead?._id) {
      fetchActivities();
    }
  });

  // Format dates for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-6">
      {/* 1. Core Profile Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 border border-border rounded-xl bg-muted/20">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {lead.category || "Individual Account"}
            </span>
            {lead.leadType && (
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                {lead.leadType.toUpperCase()}
              </span>
            )}
            {lead.rating && (
              <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                <span>{lead.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {lead.businessName || lead.fullName}
          </h2>
          {lead.businessName && lead.fullName && (
            <p className="text-xs text-muted-foreground font-medium">Contact: {lead.fullName}</p>
          )}
          {lead.address && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span>{lead.address}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:self-center">
          <Badge className={`capitalize font-bold border px-3 py-1 rounded-md text-xs ${getStatusBadgeStyles(lead.status || "new")}`}>
            {getStatusLabel(lead.status || "new")}
          </Badge>
          {lead.priority && (
            <Badge
              className={`capitalize font-bold border px-3 py-1 rounded-md text-xs ${
                lead.priority.toLowerCase() === "high"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : lead.priority.toLowerCase() === "medium"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {lead.priority} Priority
            </Badge>
          )}
        </div>
      </div>

      {/* Grid: Details Blocks */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Block A: Contact Information */}
        <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
          <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
            <Phone className="h-4 w-4 text-[#fd6102]" />
            Contact Channels
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Primary Phone
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {lead.phone || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Alternate Phone
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {lead.alternatePhone || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Email Addresses
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lead.emails && lead.emails.length > 0 ? (
                  lead.emails.map((email: string, idx: number) => (
                    <a
                      key={idx}
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted transition-colors border border-border/80"
                    >
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {email}
                    </a>
                  ))
                ) : (
                  <p className="text-sm font-medium text-muted-foreground/80">
                    —
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block B: Sales & Intent Context */}
        <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
          <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
            <DollarSign className="h-4 w-4 text-[#fd6102]" />
            Lead Context & Assignment
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Service Interested
              </Label>
              <p className="text-sm font-semibold capitalize text-foreground">
                {lead.service || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Budget Estimate
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {lead.budget || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Timeline
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {lead.timeline || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Lead Source
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {lead.source ? formatLabel(lead.source) : "—"}
              </p>
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Assigned Owner
              </Label>
              <div className="flex items-center gap-2 pt-0.5">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold capitalize text-foreground">
                  {lead.assignedTo || "Unassigned"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Block C: Follow-up Logistics */}
        <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
          <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
            <Calendar className="h-4 w-4 text-[#fd6102]" />
            Follow Up Schedule
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Follow Up Date
              </Label>
              <div className="flex items-center gap-2 pt-0.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {formatDate(lead.followUpDate)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Follow Up Time
              </Label>
              <div className="flex items-center gap-2 pt-0.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {lead.followUpTime || "—"}
                </span>
              </div>
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Preferred Contact Method
              </Label>
              <p className="text-sm font-semibold capitalize text-foreground">
                {lead.contactMethod || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Block D: Web & Social Directory */}
        <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
          <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
            <Globe className="h-4 w-4 text-[#fd6102]" />
            Web & Social Profiles
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Website
                </Label>
                {lead.website ? (
                  <a
                    href={
                      lead.website.startsWith("http")
                        ? lead.website
                        : `https://${lead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-blue-500 hover:underline"
                  >
                    <span>Visit Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground/75">
                    —
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Google Business
                </Label>
                {lead.gmbLink ? (
                  <a
                    href={lead.gmbLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-blue-500 hover:underline"
                  >
                    <span>GMB Listing</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground/75">
                    —
                  </p>
                )}
              </div>
            </div>

            {/* Social Grid */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-medium text-muted-foreground">
                Social Links
              </Label>
              <div className="flex flex-wrap gap-2">
                {lead.socials?.facebook && (
                  <a
                    href={lead.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-muted/60 text-[#1877F2] hover:bg-muted transition-colors border border-border/80"
                    title="Facebook"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {lead.socials?.instagram && (
                  <a
                    href={lead.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-muted/60 text-[#E1306C] hover:bg-muted transition-colors border border-border/80"
                    title="Instagram"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </a>
                )}
                {lead.socials?.linkedin && (
                  <a
                    href={lead.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-muted/60 text-[#0A66C2] hover:bg-muted transition-colors border border-border/80"
                    title="LinkedIn"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect width="4" height="12" x="2" y="9" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                )}
                {lead.socials?.twitter && (
                  <a
                    href={lead.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-muted/60 text-[#1DA1F2] hover:bg-muted transition-colors border border-border/80"
                    title="Twitter"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </a>
                )}
                {lead.socials?.youtube && (
                  <a
                    href={lead.socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-muted/60 text-[#FF0000] hover:bg-muted transition-colors border border-border/80"
                    title="YouTube"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
                      <polygon points="10 15 15 12 10 9" />
                    </svg>
                  </a>
                )}
                {!lead.socials?.facebook &&
                  !lead.socials?.instagram &&
                  !lead.socials?.linkedin &&
                  !lead.socials?.twitter &&
                  !lead.socials?.youtube && (
                    <p className="text-xs font-medium text-muted-foreground/80">
                      No social profiles linked.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Block E: Rich Content Areas (Full Width) */}
      <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
        <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
          <FileText className="h-4 w-4 text-[#fd6102]" />
          Detailed Logs & Notes
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Project Requirements
            </Label>
            <p className="p-3 bg-muted/30 rounded-md text-sm leading-relaxed text-foreground min-h-[100px] whitespace-pre-wrap">
              {lead.requirements || "No requirements added."}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Additional Notes
            </Label>
            <p className="p-3 bg-muted/30 rounded-md text-sm leading-relaxed text-foreground min-h-[100px] whitespace-pre-wrap">
              {lead.notes || "No notes added."}
            </p>
          </div>
        </div>
      </div>

      {/* Block F: Activity Audit Trail / Timeline */}
      <div className="p-5 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4">
        <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80 border-b border-border pb-2 inline-flex items-center gap-1.5 w-full">
          <Clock className="h-4 w-4 text-[#fd6102]" />
          Lead Activity Timeline
        </h3>
        {loadingActivities ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length > 0 ? (
          <div className="relative pl-6 border-l border-border/80 ml-3 space-y-6 py-2">
            {activities.map((act) => (
              <div key={act._id} className="relative">
                {/* Stepper Dot */}
                <div className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-[#fd6102] shadow-sm" />
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-foreground">{act.action}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(act.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {act.details && <p className="text-xs text-muted-foreground leading-relaxed">{act.details}</p>}
                  <span className="text-[9px] font-bold text-muted-foreground/60">Performed by: <span className="capitalize">{act.performedBy}</span></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground/75 italic">No activity logs recorded yet.</p>
        )}
      </div>

      {/* Block G: System Timestamps (Small Footer) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>
            Created:{" "}
            {lead.createdAt
              ? new Date(lead.createdAt).toLocaleString("en-IN")
              : "—"}
          </span>
        </div>
        {lead.updatedAt && (
          <span>
            Updated: {new Date(lead.updatedAt).toLocaleString("en-IN")}
          </span>
        )}
      </div>
    </div>
  );
}
