"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Eye,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import Image from "next/image";
import { LeadFormData } from "@/lib/types/lead";
import { useLeads } from "@/hooks/use-leads";
import LeadDetailSheet from "./LeadDetailSheet";
import { LeadTableFilters } from "./sections/lead-table-filters";
import {
  LeadTableRow,
  getStatusStyles,
  getLeadServices,
} from "./sections/lead-table-row";
import { WhatsAppTemplateModal } from "./sections/WhatsAppTemplateModal";
import { LeadKanbanBoard } from "./sections/LeadKanbanBoard";
import { formatLabel } from "@/lib/lead-insights";
import { GoogleSheetSyncModal } from "./sections/GoogleSheetSyncModal";

// --- LEAD MOBILE CARD COMPONENT ---
interface LeadMobileCardProps {
  lead: LeadFormData;
  onViewDetails: (lead: LeadFormData) => void;
  onWhatsAppClick: (lead: LeadFormData) => void;
}

function LeadMobileCard({
  lead,
  onViewDetails,
  onWhatsAppClick,
}: LeadMobileCardProps) {
  const statusMeta = getStatusStyles(lead.status);
  const leadServices = getLeadServices(lead);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3.5 hover:border-border/60 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm text-foreground leading-snug break-words">
            {lead.fullName}
          </h3>
          {lead.category && (
            <span className="text-xs text-muted-foreground font-medium block mt-0.5">
              {lead.category}
            </span>
          )}
          {lead.address && (
            <span className="inline-flex items-center gap-1.5 mt-1 text-xs text-muted-foreground max-w-full">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{lead.address}</span>
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusMeta.bg}`}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-xs border-y border-border/40 py-2.5">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Service
          </span>
          <span className="font-semibold text-foreground truncate block capitalize">
            {lead.service || "—"}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Source
          </span>
          <span className="font-semibold text-foreground truncate block capitalize">
            {lead.source ? formatLabel(lead.source) : "—"}
          </span>
        </div>
        <div className="space-y-0.5 col-span-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Contact Info
          </span>
          <div className="flex flex-col gap-1 mt-1">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
              {lead.phone}
            </span>
            {lead.emails && lead.emails.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground max-w-full">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.emails[0]}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 flex-wrap">
          {leadServices.length > 0 ? (
            leadServices.map((svc) => {
              let href =
                svc.key === "website" ? lead.website : lead.socials![svc.key];
              if (href === "N/A" || !href) return null;
              return (
                <a
                  key={svc.key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={svc.label}
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full border shrink-0 ${svc.colorClass}`}
                >
                  <Image
                    className="in-dark:invert"
                    src={svc.src}
                    alt={svc.label}
                    width={12}
                    height={12}
                  />
                </a>
              );
            })
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">
              No socials present
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lead.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onWhatsAppClick(lead)}
              className="h-8 gap-1.5 px-2.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/10 cursor-pointer border-green-500/20"
            >
              <Image
                src="/icons/whatsapp.svg"
                alt="WhatsApp"
                width={12}
                height={12}
              />
              Chat
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onViewDetails(lead)}
            className="h-8 gap-1.5 px-2.5 text-xs text-white bg-(--button-primary) hover:opacity-90 cursor-pointer border-none"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN TABLE COMPONENT ---
const CLIENT_PAGE_LIMIT = 20;

export default function AllLeadsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Client-side pagination page (operates on sortedLeads)
  const [clientPage, setClientPage] = useState(1);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setClientPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setClientPage(1);
  };

  const handleCategoryFilterChange = (category: string) => {
    setCategoryFilter(category);
    setClientPage(1);
  };

  const handleServiceFilterChange = (service: string) => {
    setServiceFilter(service);
    setClientPage(1);
  };

  const handleAssigneeFilterChange = (assignee: string) => {
    setAssigneeFilter(assignee);
    setClientPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setClientPage(1);
  };

  /**
   * Pass ALL filters to the backend — the backend now applies them regardless
   * of whether page/limit are present. Client-side filtering below acts as a
   * safety net in case any filter value has a casing/trimming mismatch.
   */
  const {
    leads = [],
    categories: hookCategories = [],
    services: hookServices = [],
    assignees: hookAssignees = [],
    statusCounts = {},
    isLoading,
    error,
    refetch,
    updateLead,
  } = useLeads({
    // No page / limit — fetch ALL leads matching these filters
    status: statusFilter,
    category: categoryFilter,
    search: debouncedSearch,
    service: serviceFilter === "all" ? undefined : serviceFilter,
    assignee: assigneeFilter === "all" ? undefined : assigneeFilter,
  });

  const [selectedLead, setSelectedLead] = useState<LeadFormData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [whatsappLead, setWhatsappLead] = useState<LeadFormData | null>(null);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleOpenDetails = (lead: LeadFormData) => {
    setSelectedLead(lead);
    setIsSheetOpen(true);
  };

  const handleOpenWhatsApp = (lead: LeadFormData) => {
    setWhatsappLead(lead);
    setIsWhatsappOpen(true);
  };

  const handleUpdateLeadRecord = async (updatedLead: LeadFormData) => {
    const savedLead = await updateLead(updatedLead);
    if (savedLead) setSelectedLead(savedLead);
  };

  // --- Dynamic filter option lists ---

  const categories = useMemo(() => {
    if (hookCategories && hookCategories.length > 0) return hookCategories;
    const cats = new Set<string>();
    leads.forEach((lead) => {
      if (lead.category && lead.category.trim() !== "") {
        cats.add(lead.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [leads, hookCategories]);

  // Dynamic services: prefer API-returned list, fall back to unique values from leads
  const services = useMemo(() => {
    if (hookServices && hookServices.length > 0) return hookServices;
    const svcSet = new Set<string>();
    leads.forEach((lead) => {
      if (lead.service && lead.service.trim() !== "") {
        svcSet.add(lead.service.trim());
      }
    });
    return Array.from(svcSet).sort();
  }, [leads, hookServices]);

  // Dynamic assignees: from Lead.distinct("assignedTo") via the API — exact strings stored in DB.
  // Falls back to extracting unique assignedTo values from the current leads batch.
  const assignees = useMemo(() => {
    if (hookAssignees && hookAssignees.length > 0) return hookAssignees;
    const asgSet = new Set<string>();
    leads.forEach((lead) => {
      if (lead.assignedTo && lead.assignedTo.trim() !== "") {
        asgSet.add(lead.assignedTo.trim());
      }
    });
    return Array.from(asgSet).sort();
  }, [leads, hookAssignees]);

  // --- Client-side filtering (safety net — backend should already filter, but this
  // guarantees correctness even if there are casing mismatches or unsupported params)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        (lead.category &&
          lead.category.trim().toLowerCase() === categoryFilter.trim().toLowerCase());

      const matchesSearch =
        !debouncedSearch ||
        lead.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (lead.category && lead.category.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (lead.address && lead.address.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (lead.service && lead.service.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (lead.phone && lead.phone.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesService =
        serviceFilter === "all" ||
        (lead.service &&
          lead.service.trim().toLowerCase() === serviceFilter.trim().toLowerCase());

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !lead.assignedTo) ||
        (lead.assignedTo &&
          lead.assignedTo.trim().toLowerCase() === assigneeFilter.trim().toLowerCase());

      return matchesStatus && matchesCategory && matchesSearch && matchesService && matchesAssignee;
    });
  }, [leads, statusFilter, categoryFilter, debouncedSearch, serviceFilter, assigneeFilter]);

  // --- Client-side sorting on filteredLeads ---
  const sortedLeads = useMemo(() => {
    const arr = [...filteredLeads];
    switch (sortBy) {
      case "az":
        return arr.sort((a, b) => a.fullName.localeCompare(b.fullName));
      case "za":
        return arr.sort((a, b) => b.fullName.localeCompare(a.fullName));
      case "oldest":
        return arr.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );
      case "newest":
      default:
        return arr.sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
        );
    }
  }, [filteredLeads, sortBy]);

  // --- Client-side pagination on sortedLeads ---
  const totalFiltered = sortedLeads.length;
  const totalClientPages = Math.max(1, Math.ceil(totalFiltered / CLIENT_PAGE_LIMIT));

  // Clamp clientPage if sortedLeads shrinks (e.g. after applying a new filter)
  const safePage = Math.min(clientPage, totalClientPages);

  const paginatedLeads = useMemo(() => {
    const start = (safePage - 1) * CLIENT_PAGE_LIMIT;
    return sortedLeads.slice(start, start + CLIENT_PAGE_LIMIT);
  }, [sortedLeads, safePage]);

  const startItem = totalFiltered > 0 ? (safePage - 1) * CLIENT_PAGE_LIMIT + 1 : 0;
  const endItem = Math.min(safePage * CLIENT_PAGE_LIMIT, totalFiltered);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalClientPages <= 5) {
      for (let i = 1; i <= totalClientPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalClientPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalClientPages - 2) pages.push("...");
      pages.push(totalClientPages);
    }
    return pages;
  };

  return (
    <div className="w-full space-y-6 p-4">
      <LeadTableFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}

        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        statusCounts={statusCounts}

        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        categories={categories}

        serviceFilter={serviceFilter}
        onServiceFilterChange={handleServiceFilterChange}
        services={services}

        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={handleAssigneeFilterChange}
        assignees={assignees}

        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      <div className="flex justify-end items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSyncModalOpen(true)}
          className="h-8.5 gap-1.5 px-3 rounded-lg text-xs font-semibold text-green-600 hover:text-green-700 hover:bg-green-500/10 cursor-pointer border-green-500/20 mr-auto"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
          Import Google Sheet
        </Button>
        <Button
          type="button"
          variant={viewMode === "table" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setViewMode("table")}
          className="h-8.5 gap-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer border-border/80"
        >
          <List className="h-3.5 w-3.5" />
          Table View
        </Button>
        <Button
          type="button"
          variant={viewMode === "kanban" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setViewMode("kanban")}
          className="h-8.5 gap-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer border-border/80"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Kanban Board
        </Button>
      </div>

      {viewMode === "table" ? (
        <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
          {error && (
            <div className="flex items-center justify-between gap-4 border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span>
                {typeof error === "string"
                  ? error
                  : "An error occurred fetching leads."}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refetch}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="font-bold text-foreground w-[20%]">Lead Identity</TableHead>
                  <TableHead className="font-bold text-foreground w-[16%]">Contact Detail</TableHead>
                  <TableHead className="font-bold text-foreground w-[14%]">Has Services</TableHead>
                  <TableHead className="font-bold text-foreground w-[14%]">Required Service</TableHead>
                  <TableHead className="font-bold text-foreground w-[12%]">Source</TableHead>
                  <TableHead className="font-bold text-foreground w-[12%]">Status Flag</TableHead>
                  <TableHead className="font-bold text-foreground w-[14%]">Assigned To</TableHead>
                  <TableHead className="text-right font-bold text-foreground w-[10%]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead, idx) => {
                    const leadId = lead._id || "";
                    return (
                      <LeadTableRow
                        key={leadId || idx}
                        lead={lead}
                        onViewDetails={handleOpenDetails}
                        onWhatsAppClick={handleOpenWhatsApp}
                      />
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No leads match the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-4 max-h-[65vh] overflow-y-auto bg-muted/5">
            {isLoading ? (
              <div className="text-center text-xs text-muted-foreground py-10">
                Loading leads...
              </div>
            ) : paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead, idx) => (
                <LeadMobileCard
                  key={lead._id || idx}
                  lead={lead}
                  onViewDetails={handleOpenDetails}
                  onWhatsAppClick={handleOpenWhatsApp}
                />
              ))
            ) : (
              <div className="text-center text-xs text-muted-foreground py-10">
                No leads match the selected filters.
              </div>
            )}
          </div>

          {/* Pagination — always based on filteredLeads count */}
          {totalClientPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-muted/20 px-6 py-4">
              <p className="text-xs text-muted-foreground font-medium">
                Showing{" "}
                <span className="font-bold text-foreground">{startItem}</span>{" "}
                to{" "}
                <span className="font-bold text-foreground">{endItem}</span>{" "}
                of{" "}
                <span className="font-bold text-foreground">{totalFiltered}</span>{" "}
                leads
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg cursor-pointer border-border hover:bg-muted/80 disabled:opacity-50"
                  onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-xs text-muted-foreground font-medium select-none"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <Button
                      key={`page-${pageNum}`}
                      type="button"
                      variant={safePage === pageNum ? "secondary" : "outline"}
                      className={`h-8 w-8 text-xs font-bold rounded-lg cursor-pointer border-border
                        ${safePage === pageNum ? "bg-(--button-secondary) text-white hover:bg-(--button-secondary)/90" : "hover:bg-muted/80"}`}
                      onClick={() => setClientPage(pageNum as number)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg cursor-pointer border-border hover:bg-muted/80 disabled:opacity-50"
                  onClick={() => setClientPage((p) => Math.min(totalClientPages, p + 1))}
                  disabled={safePage === totalClientPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <LeadKanbanBoard
          leads={sortedLeads}
          onViewDetails={handleOpenDetails}
          onUpdateLead={handleUpdateLeadRecord}
        />
      )}

      <LeadDetailSheet
        lead={selectedLead}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onUpdate={handleUpdateLeadRecord}
      />

      <WhatsAppTemplateModal
        lead={whatsappLead}
        isOpen={isWhatsappOpen}
        onClose={() => setIsWhatsappOpen(false)}
      />

      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}