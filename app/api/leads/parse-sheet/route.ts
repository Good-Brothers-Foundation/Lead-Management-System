import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Simple, robust RFC 4180 compliant CSV parser
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(cell);
      cell = "";
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell);
      result.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Handle remaining content if not terminated by newline
  if (cell || row.length > 0) {
    row.push(cell);
    result.push(row);
  }

  // Filter out completely empty rows
  return result.filter(r => r.length > 0 && r.some(c => c.trim() !== ""));
}

function cleanHeader(header: unknown, index: number): string {
  const trimmed = String(header ?? "").trim();
  return trimmed === "" ? `Column ${index + 1}` : trimmed;
}

function normalizeHeaderToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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

const IDENTITY_HEADERS = new Set([
  "contactperson",
  "fullname",
  "contactname",
  "leadname",
  "customername",
  "clientname",
  "ownername",
  "businessname",
  "companyname",
  "organization",
  "org",
  "firm",
  "business",
  "clinicname",
  "shopname",
  "brandname",
  "name",
]);

function isAssessmentNameColumn(headerToken: string, allHeaderTokens: string[]): boolean {
  if (headerToken !== "name") return false;
  return allHeaderTokens.some((token) => ASSESSMENT_METRIC_HEADERS.has(token));
}

function normalizeSheetName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBkdTrackerSheetName(sheetName: string): boolean {
  const token = normalizeSheetName(sheetName);
  return token.includes("bkdleadtracker") || (token.includes("bkd") && token.includes("tracker"));
}

function isReviewScoreboardSheetName(sheetName: string): boolean {
  const token = normalizeSheetName(sheetName);
  return token.includes("reviewscoreboard") || (token.includes("review") && token.includes("score"));
}

function canonicalHeaderLabel(rawHeader: string): string {
  const token = normalizeHeaderToken(rawHeader);
  const aliases: Record<string, string[]> = {
    "Contact Name": ["contactperson", "fullname", "contactname", "leadname", "customername", "clientname", "ownername"],
    "Business Name": ["businessname", "companyname", "company", "organization", "org", "firm", "business", "clinicname", "shopname", "brandname"],
    "Lead Type": ["leadtype", "clienttype", "businesstype", "type", "b2b", "b2c"],
    "Phone Number": ["phonenumber", "mobilenumber", "contactnumber", "phone", "mobile", "contact", "tel"],
    "Email Address": ["emailaddress", "emails", "email", "mail", "mails"],
    "Physical Address": ["address", "location", "street", "city", "state", "country", "zip"],
    "Category / Industry": ["category", "industry", "niche"],
    "Required Service": ["requiredservice", "service", "job", "project", "need"],
    "Lead Source": ["leadsource", "source", "channel", "from"],
    "Pipeline Status": ["leadstatus", "status", "stage", "state"],
    "Notes / Description": ["comments", "description", "details", "info", "notes", "note", "comment"],
    "GMB / Maps Link": ["googlemapslink", "gmblink", "googlemaps", "mapslink", "gmb", "maps"],
    "Website URL": ["website", "url", "site", "web", "link"],
    Budget: ["budget", "amount", "cost", "price"],
    Timeline: ["timeline", "nextfollowup", "timeframe", "startdate", "when"],
    "Assigned To": ["assignedto", "owner", "assignee", "agent", "member"],
  };

  for (const [label, list] of Object.entries(aliases)) {
    if (list.includes(token)) return label;
  }

  return rawHeader;
}

function isNonEmptyRow(row: string[]): boolean {
  return row.some((cell) => cell.trim() !== "");
}

function filterLeadRows(rawHeaders: string[], rows: string[][]): string[][] {
  const rawHeaderTokens = rawHeaders.map((h) => normalizeHeaderToken(h));
  const identityIndices = rawHeaderTokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => IDENTITY_HEADERS.has(token) && !isAssessmentNameColumn(token, rawHeaderTokens))
    .map(({ index }) => index);

  return identityIndices.length > 0
    ? rows.filter((row) => identityIndices.some((idx) => String(row[idx] ?? "").trim() !== ""))
    : rows;
}

function parseWorkbookRows(workbook: XLSX.WorkBook): {
  headers: string[];
  rows: string[][];
  sheetStats: Array<{ name: string; rowCount: number }>;
} {
  let masterHeaders: string[] = [];
  const rows: string[][] = [];
  const sheetStats: Array<{ name: string; rowCount: number }> = [];
  const bkdSheets = workbook.SheetNames.filter(isBkdTrackerSheetName);
  const nonScoreboardSheets = workbook.SheetNames.filter((name) => !isReviewScoreboardSheetName(name));
  const sheetNamesToProcess = bkdSheets.length > 0
    ? bkdSheets
    : (nonScoreboardSheets.length > 0 ? nonScoreboardSheets : workbook.SheetNames);

  for (const sheetName of sheetNamesToProcess) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as string[][];

    const normalizedMatrix = matrix
      .map((row) => row.map((cell) => String(cell ?? "").trim()))
      .filter(isNonEmptyRow);

    if (normalizedMatrix.length === 0) continue;

    const rawHeaders = normalizedMatrix[0].map((h, i) => cleanHeader(h, i));
    const sheetHeaders = rawHeaders.map((header) => canonicalHeaderLabel(header));
    const sheetRows = normalizedMatrix.slice(1).filter(isNonEmptyRow);
    const filteredSheetRows = filterLeadRows(rawHeaders, sheetRows);

    if (masterHeaders.length === 0) {
      masterHeaders = [...sheetHeaders];
    } else {
      // Keep a unified schema across tabs by appending unseen columns.
      for (const header of sheetHeaders) {
        if (!masterHeaders.includes(header)) {
          masterHeaders.push(header);
        }
      }
    }

    for (const row of filteredSheetRows) {
      const byHeader: Record<string, string> = {};
      sheetHeaders.forEach((header, index) => {
        byHeader[header] = row[index] ?? "";
      });

      const aligned = masterHeaders.map((header) => byHeader[header] ?? "");
      if (isNonEmptyRow(aligned)) {
        rows.push(aligned);
      }
    }

    sheetStats.push({ name: sheetName, rowCount: filteredSheetRows.length });
  }

  return {
    headers: masterHeaders,
    rows,
    sheetStats,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    const importAllTabs = body?.importAllTabs !== false;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, message: "URL is required and must be a string." },
        { status: 400 }
      );
    }

    // Extract Spreadsheet ID from Google Sheet URL
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Google Sheet URL. Please ensure it follows the format https://docs.google.com/spreadsheets/d/.../edit",
        },
        { status: 400 }
      );
    }

    const spreadsheetId = match[1];
    let gid = "";
    try {
      const parsedUrl = new URL(url);
      gid = parsedUrl.searchParams.get("gid") || "";
    } catch {
      gid = "";
    }
    
    if (importAllTabs) {
      const workbookUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const workbookRes = await fetch(workbookUrl);

      if (workbookRes.ok) {
        const workbookBuffer = Buffer.from(await workbookRes.arrayBuffer());
        const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
        const { headers, rows, sheetStats } = parseWorkbookRows(workbook);

        if (headers.length > 0 && rows.length > 0) {
          return NextResponse.json({
            success: true,
            headers,
            rows,
            meta: {
              mode: "bkd-tracker-only",
              gidUsed: gid || null,
              rowCount: rows.length,
              sheetCount: sheetStats.length,
              sheets: sheetStats,
            },
          });
        }
      }
      // If XLSX export fails or returns no rows, continue to CSV fallback below.
    }

    // Fallback: single-tab CSV export. If gid exists, fetch that exact tab.
    const csvUrl = gid
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch spreadsheet (HTTP ${response.status}). Make sure the Google Sheet's Share setting is set to 'Anyone with the link can view'.`,
        },
        { status: 400 }
      );
    }

    const csvText = await response.text();

    // Check if the response contains HTML (which indicates a login screen/redirect to sign in)
    if (csvText.trim().startsWith("<!DOCTYPE html>") || csvText.includes("<html")) {
      return NextResponse.json(
        {
          success: false,
          message: "Access Denied. Please ensure the Google Sheet's Share setting is set to 'Anyone with the link can view' (under the Share button in Google Sheets).",
        },
        { status: 400 }
      );
    }

    const parsedData = parseCSV(csvText);

    if (parsedData.length === 0) {
      return NextResponse.json(
        { success: false, message: "The Google Sheet appears to be empty." },
        { status: 400 }
      );
    }

    const rawHeaders = parsedData[0].map((h, i) => cleanHeader(h, i));
    const headers = rawHeaders.map((header) => canonicalHeaderLabel(header));
    const csvRows = parsedData.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
    const rows = filterLeadRows(rawHeaders, csvRows);

    return NextResponse.json({
      success: true,
      headers,
      rows,
      meta: {
        mode: "bkd-tracker-csv",
        gidUsed: gid || null,
        rowCount: rows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while parsing the Google Sheet.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
