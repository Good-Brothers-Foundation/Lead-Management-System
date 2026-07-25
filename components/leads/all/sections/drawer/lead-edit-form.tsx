import { useState, useEffect, useMemo } from "react";
import { LeadFormData } from "@/lib/types/lead";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldRenderer } from "./field-renderer";
import { membersApi } from "@/lib/api/team";
import { Member } from "@/lib/types/team";
import { useLeads } from "@/hooks/use-leads";
import { formatLabel } from "@/lib/lead-insights";

const DEFAULT_SERVICES = [
  { value: "unidentified", label: "UnIdentified" },
  { value: "website", label: "Website Development" },
  { value: "ecommerce", label: "E-Commerce Development" },
  { value: "app", label: "Mobile App Development" },
  { value: "seo", label: "SEO & Marketing" },
  { value: "custom-software", label: "Custom Software" }
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
  { value: "flexible", label: "Flexible / Ongoing" }
];

const DEFAULT_SOURCES = [
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google-maps", label: "Google Maps" },
  { value: "whatsapp", label: "WhatsApp Inquiry" },
  { value: "referral", label: "Referral" },
  { value: "social-media", label: "Social Media" }
];

interface LeadEditFormProps {
  editData: LeadFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (field: keyof LeadFormData, value: string) => void;
}

export function LeadEditForm({ editData, onChange, onSelectChange }: LeadEditFormProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const { services: dbServices = [], sources: dbSources = [], timelines: dbTimelines = [], budgets: dbBudgets = [] } = useLeads({ page: 1, limit: 1 });

  useEffect(() => {
    membersApi.getAll()
      .then((data) => setMembers(data.filter((m) => m.status === "Active")))
      .catch((err) => console.error("Error loading team members for lead edit form:", err));
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
    <div className="space-y-8 sm:space-y-10 pb-6">
      
      {/* Block 1: Contact Group Data */}
      <div className="p-4 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4 sm:space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Personal & General Information
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <FieldRenderer 
            label="Contact Name *" 
            name="fullName" 
            value={editData.fullName} 
            isEditing 
            onChange={onChange} 
          />
          <FieldRenderer 
            label="Business Name" 
            name="businessName" 
            value={editData.businessName || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="businessName" 
                placeholder="e.g. Acme Corp, Tech Solutions Ltd" 
                value={editData.businessName || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="Category" 
            name="category" 
            value={editData.category || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="category" 
                placeholder="e.g. Technology, Retail, Individual Account" 
                value={editData.category || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="Phone Number *" 
            name="phone" 
            value={editData.phone} 
            isEditing 
            onChange={onChange} 
          />
          <FieldRenderer 
            label="Alternate Phone" 
            name="alternatePhone" 
            value={editData.alternatePhone || ""} 
            isEditing 
            onChange={onChange} 
          />
          <FieldRenderer 
            label="Email Addresses (Comma separated)" 
            name="emails" 
            value={editData.emails?.join(", ") || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="emails" 
                placeholder="email1@example.com, email2@example.com" 
                value={editData.emails?.join(", ") || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="Rating (1.0 - 5.0)" 
            name="rating" 
            value={editData.rating?.toString() || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                type="number" 
                name="rating" 
                step="0.1" 
                min="1" 
                max="5" 
                value={editData.rating || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <div className="md:col-span-2">
            <FieldRenderer 
              label="Address" 
              name="address" 
              value={editData.address || ""} 
              isEditing 
              onChange={onChange} 
            />
          </div>
        </div>
      </div>

      {/* Block 2: Service and System Dropdowns */}
      <div className="p-4 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4 sm:space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Lead & Context Details
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          <FieldRenderer
            label="Lead Type"
            name="leadType"
            value={editData.leadType || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("leadType", v)} value={editData.leadType}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Lead Type" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="b2b">B2B</SelectItem>
                  <SelectItem value="b2c">B2C</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="ngo">NGO / Non-Profit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Service Interested In"
            name="service"
            value={editData.service || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("service", v)} value={editData.service}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Service" /></SelectTrigger>
                <SelectContent position="popper">
                  {servicesList.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Budget Range"
            name="budget"
            value={editData.budget || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("budget", v)} value={editData.budget}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Budget" /></SelectTrigger>
                <SelectContent position="popper">
                  {budgetsList.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Project Timeline"
            name="timeline"
            value={editData.timeline || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("timeline", v)} value={editData.timeline}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Timeline" /></SelectTrigger>
                <SelectContent position="popper">
                  {timelinesList.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Lead Source *"
            name="source"
            value={editData.source}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("source", v)} value={editData.source}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Source" /></SelectTrigger>
                <SelectContent position="popper">
                  {sourcesList.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Lead Status *"
            name="status"
            value={editData.status}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("status", v)} value={editData.status}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal Sent</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Assigned To"
            name="assignedTo"
            value={editData.assignedTo || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("assignedTo", v)} value={editData.assignedTo}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Assign Owner" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member._id} value={member.name.toLowerCase().replace(/\s+/g, "-")}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>
      </div>

      {/* Block 3: Deadlines & Follow-ups */}
      <div className="p-4 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4 sm:space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Follow Up Schedule
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FieldRenderer
            label="Follow Up Date"
            name="followUpDate"
            value={editData.followUpDate || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={<input type="date" name="followUpDate" value={editData.followUpDate || ""} onChange={onChange} className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" />}
          />
          <FieldRenderer
            label="Follow Up Time"
            name="followUpTime"
            value={editData.followUpTime || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={<input type="time" name="followUpTime" value={editData.followUpTime || ""} onChange={onChange} className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" />}
          />

          <FieldRenderer
            label="Priority"
            name="priority"
            value={editData.priority || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("priority", v)} value={editData.priority}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Priority" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <FieldRenderer
            label="Contact Method"
            name="contactMethod"
            value={editData.contactMethod || ""}
            isEditing
            onChange={onChange}
            renderCustomEdit={
              <Select onValueChange={(v) => onSelectChange("contactMethod", v)} value={editData.contactMethod}>
                <SelectTrigger className="h-10 bg-card"><SelectValue placeholder="Select Method" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>
      </div>

      {/* Block 4: Directory & Social Media Links */}
      <div className="p-4 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4 sm:space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Directory & Social Media Links
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <FieldRenderer 
            label="Website URL" 
            name="website" 
            value={editData.website || ""} 
            isEditing 
            onChange={onChange} 
          />
          <FieldRenderer 
            label="Google Business Listing (GMB)" 
            name="gmbLink" 
            value={editData.gmbLink || ""} 
            isEditing 
            onChange={onChange} 
          />
          <FieldRenderer 
            label="Facebook Link" 
            name="socials.facebook" 
            value={editData.socials?.facebook || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="socials.facebook" 
                placeholder="https://facebook.com/username" 
                value={editData.socials?.facebook || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="Instagram Link" 
            name="socials.instagram" 
            value={editData.socials?.instagram || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="socials.instagram" 
                placeholder="https://instagram.com/username" 
                value={editData.socials?.instagram || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="LinkedIn Link" 
            name="socials.linkedin" 
            value={editData.socials?.linkedin || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="socials.linkedin" 
                placeholder="https://linkedin.com/in/username" 
                value={editData.socials?.linkedin || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <FieldRenderer 
            label="Twitter Link" 
            name="socials.twitter" 
            value={editData.socials?.twitter || ""} 
            isEditing 
            onChange={onChange} 
            renderCustomEdit={
              <input 
                name="socials.twitter" 
                placeholder="https://twitter.com/username" 
                value={editData.socials?.twitter || ""} 
                onChange={onChange} 
                className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
              />
            }
          />
          <div className="md:col-span-2">
            <FieldRenderer 
              label="YouTube Link" 
              name="socials.youtube" 
              value={editData.socials?.youtube || ""} 
              isEditing 
              onChange={onChange} 
              renderCustomEdit={
                <input 
                  name="socials.youtube" 
                  placeholder="https://youtube.com/c/channelname" 
                  value={editData.socials?.youtube || ""} 
                  onChange={onChange} 
                  className="h-10 w-full bg-card border border-input rounded-md px-3 text-sm focus-visible:ring-1 focus-visible:outline-none" 
                />
              }
            />
          </div>
        </div>
      </div>

      {/* Block 5: Multi-line Textareas */}
      <div className="p-4 sm:p-6 border border-border rounded-xl bg-background/50 space-y-4 sm:space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Detailed Logs & Notes
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Requirements</label>
            <Textarea name="requirements" value={editData.requirements || ""} onChange={onChange} rows={4} className="bg-card resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea name="notes" value={editData.notes || ""} onChange={onChange} rows={4} className="bg-card resize-none" />
          </div>
        </div>
      </div>

    </div>
  );
}