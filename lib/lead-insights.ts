import { LeadFormData } from "@/lib/types/lead";

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayString = () => getLocalDateString(new Date());

const STATUS_ALIASES: Record<string, string> = {
  new: "new",
  contacted: "contacted",
  "follow-up-1": "contacted",
  "follow-up-2": "contacted",
  "follow-up-3": "contacted",
  followup1: "contacted",
  followup2: "contacted",
  followup3: "contacted",
  qualified: "qualified",
  "meeting-booked": "qualified",
  proposal: "proposal",
  "quotation-sent": "proposal",
  converted: "converted",
  won: "converted",
  "closed-won": "converted",
  unqualified: "unqualified",
  lost: "unqualified",
  "closed-lost": "unqualified",
};

export const normalizeStatus = (status?: string) => {
  const s = status?.trim().toLowerCase();
  if (!s || s === "—") {
    return "unknown";
  }

  const slug = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (STATUS_ALIASES[slug]) {
    return STATUS_ALIASES[slug];
  }

  return slug || "unknown";
};

export const getStatusCounts = (leads: LeadFormData[]) =>
  leads.reduce<Record<string, number>>((counts, lead) => {
    const status = normalizeStatus(lead.status);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

export const getServiceCounts = (leads: LeadFormData[]) =>
  leads.reduce<Record<string, number>>((counts, lead) => {
    const service = lead.service?.trim().toLowerCase() || "not specified";
    counts[service] = (counts[service] || 0) + 1;
    return counts;
  }, {});

export const getTodayFollowUps = (leads: LeadFormData[]) => {
  const today = todayString();
  return leads.filter((lead) => lead.followUpDate === today);
};

export const getUpcomingFollowUps = (leads: LeadFormData[]) => {
  const today = todayString();
  return leads.filter((lead) => lead.followUpDate && lead.followUpDate > today);
};

export const getOverdueFollowUps = (leads: LeadFormData[]) => {
  const today = todayString();
  return leads.filter((lead) => lead.followUpDate && lead.followUpDate < today);
};

export const sortByFollowUpDate = (leads: LeadFormData[]) =>
  [...leads].sort((a, b) => {
    const first = `${a.followUpDate || "9999-12-31"} ${a.followUpTime || "23:59"}`;
    const second = `${b.followUpDate || "9999-12-31"} ${b.followUpTime || "23:59"}`;
    return first.localeCompare(second);
  });

export const formatLabel = (value?: string) => {
  if (!value || typeof value !== "string") return "";
  const lowercase = value.trim().toLowerCase();
  if (lowercase === "google" || lowercase === "google-maps") {
    return "Google Maps";
  }
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
