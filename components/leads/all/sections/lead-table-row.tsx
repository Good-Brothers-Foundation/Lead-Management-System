"use client";

import Image from "next/image";
import {
  Phone,
  Mail,
  UserCheck,
  Eye,
  MapPin,
  Clock,
  Globe,
  Share2,
  Camera,
  Link as LinkIcon,
  X as XIcon,
  Video,
  type LucideIcon,
} from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LeadFormData } from "@/lib/types/lead";
import { formatLabel } from "@/lib/lead-insights";
import { timeAgo } from "@/lib/utils";

interface LeadTableRowProps {
  lead: LeadFormData;
  onViewDetails: (lead: LeadFormData) => void;
  onWhatsAppClick: (lead: LeadFormData) => void;
}

export const getStatusStyles = (status: string) => {
  const normalized = (status || "").trim().toLowerCase();
  switch (normalized) {
    case "new":
      return {
        bg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "New",
      };
    case "contacted":
      return {
        bg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        label: "Contacted",
      };
    case "qualified":
      return {
        bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        label: "Qualified",
      };
    case "proposal":
    case "proposal-sent":
      return {
        bg: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        label: "Proposal Sent",
      };
    case "converted":
    case "won":
      return {
        bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        label: "Converted",
      };
    case "unqualified":
    case "closed-lost":
    case "lost":
      return {
        bg: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        label: "Closed Lost",
      };
    case "follow-up-1":
    case "fu1":
      return {
        bg: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        label: "Follow-up 1",
      };
    case "follow-up-2":
    case "fu2":
      return {
        bg: "bg-amber-500/10 text-amber-800 border-amber-500/30",
        label: "Follow-up 2",
      };
    case "follow-up-3":
    case "fu3":
      return {
        bg: "bg-amber-500/10 text-amber-900 border-amber-500/40",
        label: "Follow-up 3",
      };
    case "quotation":
    case "quotation-sent":
      return {
        bg: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        label: "Quotation Sent",
      };
    case "meeting":
    case "meeting-booked":
      return {
        bg: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
        label: "Meeting Booked",
      };
    case "payment":
    case "payment-received":
      return {
        bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        label: "Payment",
      };
    default:
      return {
        bg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "New",
      };
  }
};

export type SocialKey = "facebook" | "instagram" | "linkedin" | "twitter" | "youtube";
export type ServiceMeta = {
  key: "website" | SocialKey;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  src: string;
};

export const SERVICE_CONFIG: ServiceMeta[] = [
  {
    key: "website",
    label: "Website",
    icon: Globe,
    colorClass: "text-sky-600 bg-sky-500/10 border-sky-500/20",
    src: "/icons/globe.svg",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Share2,
    colorClass: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    src: "/icons/facebook.svg",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Camera,
    colorClass: "text-pink-600 bg-pink-500/10 border-pink-500/20",
    src: "/icons/instagram.svg",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: LinkIcon,
    colorClass: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
    src: "/icons/linkedin.svg",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    icon: XIcon,
    colorClass: "text-slate-700 bg-slate-500/10 border-slate-500/20",
    src: "/icons/twitter.svg",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Video,
    colorClass: "text-red-600 bg-red-500/10 border-red-500/20",
    src: "/icons/youtube.svg",
  },
];

// Returns only the services that actually have a value on this lead.
// website lives at the top level; the rest live under lead.socials.
export const getLeadServices = (lead: LeadFormData): ServiceMeta[] => {
  return SERVICE_CONFIG.filter((svc) => {
    const value =
      svc.key === "website"
        ? lead.website
        : lead.socials?.[svc.key as keyof NonNullable<LeadFormData["socials"]>];
    return typeof value === "string" && value.trim() !== "";
  });
};

export function LeadTableRow({
  lead,
  onViewDetails,
  onWhatsAppClick,
}: LeadTableRowProps) {
  const statusMeta = getStatusStyles(lead.status);
  const leadServices = getLeadServices(lead);

  const handleWhatsAppRedirect = () => {
    onWhatsAppClick(lead);
  };

  return (
    <TableRow className="border-b border-border hover:bg-muted/20 transition-colors divide-x divide-border">
      {/* Identity — w-[20%] on the matching TableHead */}
      <TableCell className="font-medium py-3.5 w-[20%] overflow-hidden align-center">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-foreground text-wrap">
              {lead.fullName}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-0.5 min-w-0">
            {lead.category && (
              <span className="font-medium truncate">
                Category: {lead.category}
              </span>
            )}
            {lead.address && (
              <span className="inline-flex items-center gap-1 mt-0.5 min-w-0">
                <MapPin className="h-3 w-3 text-muted-foreground/75 shrink-0" />
                <span className="truncate">{lead.address}</span>
              </span>
            )}
            {lead.createdAt && (
              <span
                className="inline-flex items-center gap-1 mt-1"
                title={new Date(lead.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              >
                <Clock className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  {timeAgo(lead.createdAt)}
                </span>
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Contacts — w-[16%] on the matching TableHead */}
      <TableCell className="w-[16%] overflow-hidden align-center">
        <div className="flex flex-col space-y-0.5 text-xs min-w-0">
          <span className="text-foreground inline-flex items-center gap-1 min-w-0">
            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </span>
          {lead.emails && lead.emails.length > 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-1 min-w-0">
              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">{lead.emails[0]}</span>
            </span>
          )}
        </div>
      </TableCell>

      {/* Services present (website / socials) */}
      <TableCell className="w-[14%] overflow-hidden align-center">
        {leadServices.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {leadServices.map((svc) => {
              let href = svc.key ==  "website" ?  lead.website : lead.socials![svc.key];

              if(href == "N/A"){
                return;
              }

              return (
                <a href={href}
                  key={svc.key}
                  title={svc.label}
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full border shrink-0 ${svc.colorClass}`}
                >
                  <Image
                    className="in-dark:invert"
                    src={svc.src}
                    alt="WhatsApp"
                    width={14}
                    height={14}
                  />
                </a>
              );
            })}
          </div>
        ) : (
          <span className="inline-flex items-center max-w-full px-2.5 py-0.5 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-600 border-rose-500/20">
            <span className="truncate">None</span>
          </span>
        )}
      </TableCell>

      {/* Core Fields — widths match TableHead: w-[14%] and w-[12%] */}
      <TableCell className="capitalize text-xs font-semibold text-foreground w-[14%] truncate align-center">
        {lead.service}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground font-medium w-[12%] truncate align-center">
        {formatLabel(lead.source)}
      </TableCell>

      {/* Status Badge — w-[12%] on the matching TableHead */}
      <TableCell className="w-[12%] overflow-hidden align-center">
        <span
          className={`inline-flex items-center max-w-full px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.bg}`}
        >
          <span className="truncate">{statusMeta.label}</span>
        </span>
      </TableCell>

      {/* Owner Assignment — w-[14%] on the matching TableHead */}
      <TableCell className="w-[14%] overflow-hidden align-center">
        {lead.assignedTo ? (
          <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md capitalize max-w-full">
            <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">{lead.assignedTo}</span>
          </span>
        ) : (
          <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-md font-medium">
            Unassigned
          </span>
        )}
      </TableCell>

      {/* Context Execution Actions — w-[12%] on the matching TableHead */}
      <TableCell className="text-right w-[10%] align-center">
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {lead.phone && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleWhatsAppRedirect}
              className="h-8 w-8 text-muted-foreground hover:text-white rounded-md cursor-pointer transition-colors flex items-center justify-center hover:bg-green-500/10"
            >
              <Image
                src="/icons/whatsapp.svg"
                alt="WhatsApp"
                width={14}
                height={14}
              />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onViewDetails(lead)}
            className="h-8 w-8 text-muted-foreground hover:text-white rounded-md cursor-pointer transition-colors flex items-center justify-center hover:bg-(--button-primary)"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
