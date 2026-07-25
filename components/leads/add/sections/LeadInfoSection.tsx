"use client";

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadFormData } from "@/lib/types/lead";
import { membersApi } from "@/lib/api/team";
import { Member } from "@/lib/types/team";
import { useLeads } from "@/hooks/use-leads";
import { formatLabel } from "@/lib/lead-insights";

interface LeadInfoProps {
  formData: LeadFormData;
  onSelectChange: (field: string, value: string) => void;
}

const DEFAULT_SERVICES = [
  { value: "unidentified", label: "UnIdentified" },
  { value: "website", label: "Website Development" },
  { value: "ecommerce", label: "E-Commerce Development" },
  { value: "app", label: "Mobile App Development" },
  { value: "seo", label: "SEO" },
  { value: "uiux", label: "UI/UX Design" }
];

const DEFAULT_BUDGETS = [
  { value: "unidentified", label: "UnIdentified" },
  { value: "under25", label: "Under ₹25,000" },
  { value: "25to50", label: "₹25,000 - ₹50,000" },
  { value: "50to100", label: "₹50,000 - ₹1,00,000" },
  { value: "100plus", label: "Above ₹1,00,000" }
];

const DEFAULT_TIMELINES = [
  { value: "unidentified", label: "UnIdentified" },
  { value: "1week", label: "Within 1 Week" },
  { value: "2weeks", label: "Within 2 Weeks" },
  { value: "1month", label: "Within 1 Month" },
  { value: "3months", label: "2-3 Months" }
];

const DEFAULT_SOURCES = [
  { value: "google-maps", label: "Google Maps" },
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" }
];

export default function LeadInfoSection({
  formData,
  onSelectChange,
}: LeadInfoProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const { services: dbServices = [], sources: dbSources = [], timelines: dbTimelines = [], budgets: dbBudgets = [] } = useLeads({ page: 1, limit: 1 });

  useEffect(() => {
    membersApi.getAll()
      .then((data) => setMembers(data.filter((m) => m.status === "Active")))
      .catch((err) => console.error("Error loading team members for lead add form:", err));
  }, []);

  const servicesList = useMemo(() => {
    const list = [...DEFAULT_SERVICES];
    dbServices.forEach((s) => {
      const exists = list.some((item) => item.value === s || item.label.toLowerCase() === s.toLowerCase());
      if (!exists && s.trim() !== "") {
        list.push({ value: s, label: formatLabel(s) });
      }
    });
    return list;
  }, [dbServices]);

  const budgetsList = useMemo(() => {
    const list = [...DEFAULT_BUDGETS];
    dbBudgets.forEach((b) => {
      const exists = list.some((item) => item.value === b || item.label.toLowerCase() === b.toLowerCase());
      if (!exists && b.trim() !== "") {
        list.push({ value: b, label: formatLabel(b) });
      }
    });
    return list;
  }, [dbBudgets]);

  const timelinesList = useMemo(() => {
    const list = [...DEFAULT_TIMELINES];
    dbTimelines.forEach((t) => {
      const exists = list.some((item) => item.value === t || item.label.toLowerCase() === t.toLowerCase());
      if (!exists && t.trim() !== "") {
        list.push({ value: t, label: formatLabel(t) });
      }
    });
    return list;
  }, [dbTimelines]);

  const sourcesList = useMemo(() => {
    const list = [...DEFAULT_SOURCES];
    dbSources.forEach((s) => {
      const exists = list.some((item) => item.value === s || item.label.toLowerCase() === s.toLowerCase());
      if (!exists && s.trim() !== "") {
        list.push({ value: s, label: formatLabel(s) });
      }
    });
    return list;
  }, [dbSources]);

  return (
    <div className="p-6 border border-border rounded-xl bg-background/50 space-y-6">
      <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
        Lead Information
      </h3>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Lead Type</Label>
          <Select
            onValueChange={(v) => onSelectChange("leadType", v)}
            value={formData.leadType}
          >
            <SelectTrigger id="leadType" className="h-10 bg-card border-input">
              <SelectValue placeholder="Select Lead Type" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="w-[--radix-select-trigger-width]">
              <SelectItem value="b2b">B2B</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="ngo">NGO / Non-Profit</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Service Interested In</Label>
          <Select
            onValueChange={(v) => onSelectChange("service", v)}
            value={formData.service}
          >
            <SelectTrigger id="service" className="h-10 bg-card border-input">
              <SelectValue placeholder="Select Service" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              {servicesList.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Budget Range</Label>
          <Select
            onValueChange={(v) => onSelectChange("budget", v)}
            value={formData.budget}
          >
            <SelectTrigger id="budget" className="h-10 bg-card border-input">
              <SelectValue placeholder="Select Budget" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              {budgetsList.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Project Timeline</Label>
          <Select
            onValueChange={(v) => onSelectChange("timeline", v)}
            value={formData.timeline}
          >
            <SelectTrigger id="timeline" className="h-10 bg-card border-input">
              <SelectValue placeholder="Select Timeline" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              {timelinesList.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Required Field with Validation Anchor */}
        <div className="space-y-2 relative">
          <Label className="text-sm font-medium">Lead Source *</Label>
          <Select
            onValueChange={(v) => onSelectChange("source", v)}
            value={formData.source}
          >
            <SelectTrigger id="source" className="h-10 bg-card border-input">
              <SelectValue placeholder="Lead Source" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              {sourcesList.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            tabIndex={-1}
            required
            value={formData.source}
            onChange={() => {}}
            className="absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
          />
        </div>

        {/* Required Field with Validation Anchor */}
        <div className="space-y-2 relative">
          <Label className="text-sm font-medium">Lead Status *</Label>
          <Select
            onValueChange={(v) => onSelectChange("status", v)}
            value={formData.status}
          >
            <SelectTrigger id="status" className="h-10 bg-card border-input">
              <SelectValue placeholder="Lead Status" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal Sent</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
            </SelectContent>
          </Select>
          <input
            tabIndex={-1}
            required
            value={formData.status}
            onChange={() => {}}
            className="absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Assigned To</Label>
          <Select
            onValueChange={(v) => onSelectChange("assignedTo", v)}
            value={formData.assignedTo}
          >
            <SelectTrigger
              id="assignedTo"
              className="h-10 bg-card border-input"
            >
              <SelectValue placeholder="Assign Lead" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="w-[--radix-select-trigger-width]"
            >
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((member) => (
                <SelectItem key={member._id} value={member.name.toLowerCase().replace(/\s+/g, "-")}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
