import { LeadFormData } from "@/lib/types/lead";

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayString = () => getLocalDateString(new Date());

export const normalizeStatus = (status?: string) => {
  const s = status?.trim().toLowerCase();
  if (!s || s === "—" || !["new", "contacted", "qualified", "proposal", "converted", "unqualified"].includes(s)) {
    return "new";
  }
  return s;
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
