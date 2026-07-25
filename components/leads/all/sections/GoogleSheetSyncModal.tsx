"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Columns,
  Eye,
  Info
} from "lucide-react";

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAPPABLE_FIELDS = [
  { key: "fullName", label: "Contact Name", required: false, desc: "Primary contact name (fallback: business name)" },
  { key: "businessName", label: "Business Name", required: false, desc: "Company / organization name" },
  { key: "leadType", label: "Lead Type", required: false, desc: "B2B, B2C, Individual, etc." },
  { key: "phone", label: "Phone Number", required: false, desc: "Used to detect duplicates" },
  { key: "emails", label: "Email Address", required: false, desc: "Supports comma-separated emails" },
  { key: "address", label: "Physical Address", required: false, desc: "Location/Street detail" },
  { key: "category", label: "Category / Industry", required: false, desc: "Business category or niche" },
  { key: "service", label: "Required Service", required: false, desc: "Service the lead is requesting" },
  { key: "source", label: "Lead Source", required: false, desc: "Defaults to 'google-sheets'" },
  { key: "status", label: "Pipeline Status", required: false, desc: "Defaults to 'new'" },
  { key: "notes", label: "Notes / Description", required: false, desc: "Additional comments" },
  { key: "gmbLink", label: "GMB / Maps Link", required: false, desc: "Google Business profile URL" },
  { key: "website", label: "Website URL", required: false, desc: "Lead's website" },
  { key: "budget", label: "Budget", required: false, desc: "Financial size / cost constraint" },
  { key: "timeline", label: "Timeline", required: false, desc: "Expected start/completion time" },
  { key: "assignedTo", label: "Assigned To", required: false, desc: "Team member full name" }
];

type Step = "connect" | "map" | "preview" | "syncing" | "result";

interface SyncSummary {
  totalProcessed: number;
  insertedCount: number;
  skippedCount: number;
  skipped: { lead: { fullName: string }; reason: string }[];
}

interface ParseMeta {
  mode?: string;
  gidUsed?: string | null;
  rowCount?: number;
  sheetCount?: number;
  sheets?: Array<{ name: string; rowCount: number }>;
}

const ASSESSMENT_METRIC_HEADERS = new Set([
  "total",
  "score",
  "new",
  "contacted",
  "fu1",
  "fu2",
  "fu3",
  "quotation",
  "meeting",
  "proposal",
  "converted",
  "unqualified",
  "closedlost",
]);

function normalizedHeaderToken(value: string): string {
  return value.toLowerCase().replace(/\s*\(\d+\)\s*$/, "").replace(/[^a-z0-9]/g, "");
}

function makeHeadersUnique(headers: string[]): string[] {
  const seen: Record<string, number> = {};
  return headers.map((header) => {
    const base = header.trim();
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : `${base} (${seen[base]})`;
  });
}

function shouldIgnoreAssessmentHeader(header: string, allHeaders: string[]): boolean {
  const token = normalizedHeaderToken(header);
  if (ASSESSMENT_METRIC_HEADERS.has(token)) return true;

  // A plain "Name" often belongs to the right-side team assessment table.
  // Ignore it only when metric columns are also present in the same sheet.
  if (token === "name") {
    const hasMetricColumns = allHeaders.some((h) => ASSESSMENT_METRIC_HEADERS.has(normalizedHeaderToken(h)));
    return hasMetricColumns;
  }

  return false;
}

// Intelligent matching of headers
function autoMapHeaders(headers: string[], fieldKey: string): string {
  // Normalize headers once and skip blank ones (they're never real field matches)
  const normHeaders = headers
    .filter(h => h && h.trim() !== "")
    .map(h => ({
      original: h,
      normalized: normalizedHeaderToken(h)
    }));

  // Order matters: more specific aliases are checked first so e.g. "contact person"
  // wins over the generic "name", and "owner" wins over nothing for assignedTo.
  const matches: Record<string, string[]> = {
    fullName: ["contactperson", "fullname", "contactname", "leadname", "customername", "clientname", "ownername", "title"],
    businessName: ["businessname", "companyname", "company", "organization", "org", "firm", "business", "clinicname", "shopname", "brandname", "name"],
    leadType: ["leadtype", "clienttype", "businesstype", "type", "b2b", "b2c"],
    phone: ["phonenumber", "mobilenumber", "contactnumber", "phone", "mobile", "contact", "tel"],
    emails: ["emailaddress", "emails", "email", "mail", "mails"],
    address: ["address", "location", "street", "city", "state", "country", "zip"],
    category: ["category", "industry", "niche"],
    service: ["requiredservice", "service", "job", "project", "need"],
    source: ["leadsource", "source", "channel", "from"],
    status: ["leadstatus", "status", "stage", "state"],
    notes: ["comments", "description", "details", "info", "notes", "note", "comment"],
    gmbLink: ["googlemapslink", "gmblink", "googlemaps", "mapslink", "gmb", "maps"],
    website: ["website", "url", "site", "web", "link"],
    budget: ["budget", "amount", "cost", "price"],
    timeline: ["timeline", "nextfollowup", "timeframe", "startdate", "when"],
    assignedTo: ["assignedto", "owner", "assignee", "agent", "member"]
  };

  const targets = matches[fieldKey] || [];
  for (const target of targets) {
    const match = normHeaders.find(h => h.normalized === target);
    if (match) return match.original;
  }

  // Fallback: substring match (only if no exact alias hit)
  for (const target of targets) {
    const match = normHeaders.find(h => h.normalized.includes(target) || target.includes(h.normalized));
    if (match) return match.original;
  }

  const exactMatch = normHeaders.find(h => h.normalized === fieldKey.toLowerCase());
  if (exactMatch) return exactMatch.original;

  return "";
}

export function GoogleSheetSyncModal({ isOpen, onClose, onSuccess }: GoogleSheetSyncModalProps) {
  const [step, setStep] = useState<Step>("connect");
  const [sheetUrl, setSheetUrl] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [parseMeta, setParseMeta] = useState<ParseMeta | null>(null);
  
  // Sync statistics
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  const resetState = () => {
    setStep("connect");
    setSheetUrl("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setIsLoading(false);
    setErrorMsg("");
    setSummary(null);
    setParseMeta(null);
  };

  const handleClose = () => {
    onClose();
    // Wait a brief moment before resetting so transition finishes
    setTimeout(resetState, 200);
  };

  // Step 1: Connect Spreadsheet and fetch headers
  const handleFetchHeaders = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg("Please paste a Google Sheet URL.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads/parse-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl, importAllTabs: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to parse the Google Sheet.");
      }
      setRawRows(data.rows);
      setParseMeta(data.meta || null);

      // Header preprocessing:
      // - Many Google Sheets contain blank header cells (e.g. empty columns).
      //   We re-label them to "Column 1", "Column 2" so they are still selectable
      //   for mapping but never collide in React keys or in our auto-mapper.
      // - Trim whitespace once and reuse for auto-mapping so fuzzy matching
      //   ignores stray spaces.
      const cleanHeaders = data.headers.map((h, i) => {
        const trimmed = (h ?? "").toString().trim();
        return trimmed === "" ? `Column ${i + 1}` : trimmed;
      });

      const nonAssessmentHeaders = cleanHeaders.filter((h) => !shouldIgnoreAssessmentHeader(h, cleanHeaders));
      const uniqueHeaders = makeHeadersUnique(nonAssessmentHeaders);
      setHeaders(uniqueHeaders);

      // Perform intelligent auto-mapping
      const initialMapping: Record<string, string> = {};
      MAPPABLE_FIELDS.forEach(field => {
        const autoMatch = autoMapHeaders(uniqueHeaders, field.key);
        if (autoMatch) {
          initialMapping[field.key] = autoMatch;
        }
      });
      setMapping(initialMapping);
      setStep("map");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to Google Sheet.");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert raw row to Lead object based on mapping
  const mapRowToLead = (row: string[]) => {
    const lead: Record<string, any> = {};
    const headerIndices = headers.reduce((acc, h, i) => {
      acc[h] = i;
      return acc;
    }, {} as Record<string, number>);

    MAPPABLE_FIELDS.forEach(field => {
      const mappedHeader = mapping[field.key];
      if (mappedHeader) {
        const index = headerIndices[mappedHeader];
        const val = row[index]?.trim();
        if (val !== undefined && val !== "") {
          if (field.key === "emails") {
            // emails is schema array
            lead.emails = val.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
          } else {
            lead[field.key] = val;
          }
        }
      }
    });

    // If contact name is absent, use business name as lead identity.
    if ((!lead.fullName || lead.fullName.trim() === "") && lead.businessName) {
      lead.fullName = lead.businessName;
    }

    // Enforce default fields if not mapped/empty
    if (!lead.fullName) lead.fullName = "";
    if (!lead.status) lead.status = "new";
    if (!lead.source) lead.source = "google-sheets";

    return lead;
  };

  // Generate preview of leads
  const previewLeads = useMemo(() => {
    return rawRows.slice(0, 3).map(mapRowToLead);
  }, [rawRows, mapping, headers]);

  const importableRowsCount = useMemo(() => {
    return rawRows.reduce((count, row) => {
      const lead = mapRowToLead(row);
      return lead.fullName && lead.fullName.trim() !== "" ? count + 1 : count;
    }, 0);
  }, [rawRows, mapping, headers]);

  const handleGoToPreview = () => {
    if (!mapping.fullName && !mapping.businessName) {
      setErrorMsg("Map either 'Contact Name' or 'Business Name' to continue.");
      return;
    }
    setErrorMsg("");
    setStep("preview");
  };

  // Step 4: Import all leads to bulk API
  const handleSyncLeads = async () => {
    setIsLoading(true);
    setStep("syncing");

    try {
      const allMappedLeads = rawRows.map(mapRowToLead).filter(lead => lead.fullName.trim() !== "");

      const res = await fetch("/api/leads/import-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allMappedLeads),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Bulk import failed.");
      }

      setSummary({
        totalProcessed: result.summary.totalProcessed,
        insertedCount: result.summary.insertedCount,
        skippedCount: result.summary.skippedCount,
        skipped: result.skipped || [],
      });

      onSuccess(); // Trigger leads refresh on parent table
      setStep("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sync error. Please try again.");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
            Google Sheet Import Wizard
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-semibold">
            Import new leads directly from your cloud spreadsheet records in seconds.
          </DialogDescription>
        </DialogHeader>

        {/* STEP CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {/* STEP 1: CONNECT */}
          {step === "connect" && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl space-y-2 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0 text-blue-600" />
                  Prerequisite Sharing Rule
                </span>
                <p className="leading-relaxed">
                  Open your Google Sheet, click the <strong>Share</strong> button, and change the General Access to <strong>"Anyone with the link can view"</strong>. 
                  This allows the Lead CRM backend to read the data without requiring Google Developer API setups.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sheetUrl" className="font-bold text-foreground">Google Sheet Link</Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={isLoading}
                  className="h-10 bg-background border-input text-foreground text-sm"
                />
              </div>

              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === "map" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Columns className="h-3.5 w-3.5" />
                  Map Google Sheet Columns
                </span>
                <span className="text-xs font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                  {headers.length} headers parsed
                </span>
              </div>

              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {MAPPABLE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5 p-3 bg-muted/10 border border-border/40 rounded-xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-foreground">
                        {field.label} {field.required && <span className="text-destructive font-black">*</span>}
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-medium">{field.desc}</span>
                    </div>

                    <select
                      value={mapping[field.key] || ""}
                      onChange={(e) => {
                        setMapping({ ...mapping, [field.key]: e.target.value });
                        if (field.key === "fullName" && e.target.value) {
                          setErrorMsg("");
                        }
                      }}
                      className="w-full h-9 rounded-lg border border-input bg-background text-xs px-2 focus-visible:outline-none focus-visible:ring-1 text-foreground"
                    >
                      <option value="">-- Leave Empty / Ignore --</option>
                      {headers.map((header, idx) => (
                        // Index-based key is safe here because the header list is
                        // static for the lifetime of this modal step. Using the
                        // raw header text would crash when the sheet contains
                        // empty/duplicate column names.
                        <option key={`${idx}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === "preview" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Data Preview (First 3 Rows)
              </span>

              <div className="border border-border rounded-xl overflow-hidden bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="p-3 font-bold text-foreground">Full Name</th>
                        <th className="p-3 font-bold text-foreground">Phone</th>
                        <th className="p-3 font-bold text-foreground">Email</th>
                        <th className="p-3 font-bold text-foreground">Service</th>
                        <th className="p-3 font-bold text-foreground">Source</th>
                        <th className="p-3 font-bold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewLeads.map((lead, idx) => (
                        <tr key={idx} className="border-b border-border/40 last:border-0 hover:bg-muted/5">
                          <td className="p-3 font-semibold text-foreground truncate max-w-[120px]">
                            {lead.fullName || <span className="text-destructive italic">Missing</span>}
                          </td>
                          <td className="p-3 text-muted-foreground">{lead.phone || "—"}</td>
                          <td className="p-3 text-muted-foreground truncate max-w-[120px]">
                            {lead.emails && lead.emails.length > 0 ? lead.emails.join(", ") : "—"}
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[100px]">{lead.service || "—"}</td>
                          <td className="p-3 text-muted-foreground">{lead.source}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 uppercase border border-green-500/20">
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-muted/10 p-3.5 border border-border/60 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-foreground">Summary</p>
                <p className="text-muted-foreground leading-relaxed">
                  Parsed <strong>{rawRows.length} sheet rows</strong>. <strong>{importableRowsCount}</strong> rows currently have a mapped contact or business name and are eligible for import. Clicking 'Confirm & Sync' will add new records and skip duplicates.
                </p>
                {parseMeta && (
                  <p className="text-muted-foreground leading-relaxed">
                    Parse mode: <strong>{parseMeta.mode || "unknown"}</strong>
                    {typeof parseMeta.sheetCount === "number" ? (
                      <>
                        {" "}across <strong>{parseMeta.sheetCount}</strong> sheet tab(s)
                      </>
                    ) : null}
                    .
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: SYNCING */}
          {step === "syncing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
              <div className="text-center space-y-1">
                <p className="font-bold text-foreground text-sm">Processing Google Sheet leads...</p>
                <p className="text-xs text-muted-foreground">Checking duplicate criteria, applying values, and building histories.</p>
              </div>
            </div>
          )}

          {/* STEP 5: SYNC RESULT */}
          {step === "result" && summary && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center p-4 bg-green-500/5 border border-green-500/10 rounded-2xl space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="font-black text-foreground text-base">Google Sheet Sync Completed!</p>
                <p className="text-xs text-muted-foreground">
                  The leads in the spreadsheet have been processed.
                </p>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/10 border border-border p-3 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block">Processed</span>
                  <span className="text-lg font-black text-foreground block">{summary.totalProcessed}</span>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-green-700 uppercase font-black tracking-wider block">Created</span>
                  <span className="text-lg font-black text-green-600 block">{summary.insertedCount}</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-amber-700 uppercase font-black tracking-wider block">Skipped</span>
                  <span className="text-lg font-black text-amber-600 block">{summary.skippedCount}</span>
                </div>
              </div>

              {/* SKIPPED ITEMS DETAIL LIST */}
              {summary.skipped.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Skipped Details ({summary.skipped.length})
                  </span>
                  <div className="border border-border rounded-xl max-h-[200px] overflow-y-auto bg-background divide-y divide-border/40 text-xs">
                    {summary.skipped.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 hover:bg-muted/5 gap-4">
                        <span className="font-bold text-foreground shrink-0">{item.lead.fullName || "Un-named Lead"}</span>
                        <span className="text-muted-foreground text-right italic font-medium break-all">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTION CONTROLS */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between gap-2">
          {step === "connect" && (
            <>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="h-9 cursor-pointer text-xs font-semibold">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleFetchHeaders}
                disabled={isLoading || !sheetUrl.trim()}
                className="h-9 gap-1.5 px-4 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 cursor-pointer text-xs font-semibold border-none rounded-lg"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Connect & Parse
              </Button>
            </>
          )}

          {step === "map" && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("connect")} className="h-9 gap-1.5 cursor-pointer text-xs font-semibold">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleGoToPreview}
                className="h-9 gap-1.5 px-4 text-white bg-green-600 hover:bg-green-700 cursor-pointer text-xs font-semibold border-none rounded-lg"
              >
                Next: Preview
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("map")} disabled={isLoading} className="h-9 gap-1.5 cursor-pointer text-xs font-semibold">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSyncLeads}
                disabled={isLoading}
                className="h-9 gap-1.5 px-4 text-white bg-green-600 hover:bg-green-700 cursor-pointer text-xs font-semibold border-none rounded-lg"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirm & Sync Leads
              </Button>
            </>
          )}

          {step === "syncing" && (
            <div className="w-full text-center text-xs font-medium text-muted-foreground py-1 select-none">
              Processing in background... please wait.
            </div>
          )}

          {step === "result" && (
            <Button type="button" onClick={handleClose} className="w-full h-9 text-white bg-green-600 hover:bg-green-700 cursor-pointer text-xs font-semibold border-none rounded-lg">
              Finish Sync
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
