"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  AlertTriangle, 
  Image as ImageIcon, 
  ChevronRight, 
  Info,
  Users
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { leadsApi } from "@/lib/api/leads";
import { LeadFormData } from "@/lib/types/lead";

type BroadcastBlock = 
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; imagePath: string; caption?: string };

export default function BroadcastPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [leads, setLeads] = useState<LeadFormData[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Message Chain
  const [blocks, setBlocks] = useState<BroadcastBlock[]>([
    { id: "1", type: "text", text: "Hello {fullName}," }
  ]);

  // Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Load all categories on mount
  useEffect(() => {
    leadsApi.getAll({ limit: 1 })
      .then((res) => {
        setCategories(res.categories || []);
      })
      .catch((err) => console.error("Error fetching categories:", err))
      .finally(() => setIsLoadingMetadata(false));
  }, []);

  // Fetch leads when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setLeads([]);
      setSelectedLeadIds(new Set());
      return;
    }

    setIsLoadingLeads(true);
    leadsApi.getAll({ category: selectedCategory })
      .then((res) => {
        setLeads(res.data || []);
        // Select all leads by default when loading a category
        const allIds = new Set((res.data || []).map((l) => l._id!).filter(Boolean));
        setSelectedLeadIds(allIds);
      })
      .catch((err) => console.error("Error fetching leads for category:", err))
      .finally(() => setIsLoadingLeads(false));
  }, [selectedCategory]);

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(leads.map((l) => l._id!).filter(Boolean));
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    const updated = new Set(selectedLeadIds);
    if (checked) {
      updated.add(id);
    } else {
      updated.delete(id);
    }
    setSelectedLeadIds(updated);
  };

  // Message Chain handlers
  const addTextBlock = () => {
    setBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "text", text: "" }
    ]);
  };

  const addImageBlock = () => {
    setBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "image", imagePath: "", caption: "" }
    ]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1) return; // Keep at least one block
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlockText = (id: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === "text" ? { ...b, text } : b))
    );
  };

  const updateBlockImage = (id: string, fields: Partial<Extract<BroadcastBlock, { type: "image" }>>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === "image" ? { ...b, ...fields } : b))
    );
  };

  // Placeholder injection
  const injectPlaceholder = (id: string, placeholder: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === id && b.type === "text") {
          return { ...b, text: b.text + ` ${placeholder}` };
        }
        return b;
      })
    );
  };

  // Get selected leads phone numbers
  const targetPhoneNumbers = useMemo(() => {
    return leads
      .filter((l) => selectedLeadIds.has(l._id!))
      .map((l) => l.phone)
      .filter((p): p is string => typeof p === "string" && p.trim() !== "");
  }, [leads, selectedLeadIds]);

  // Validate campaign configuration
  const isCampaignValid = useMemo(() => {
    if (targetPhoneNumbers.length === 0) return false;
    
    // All blocks must be filled
    for (const b of blocks) {
      if (b.type === "text" && !b.text.trim()) return false;
      if (b.type === "image" && !b.imagePath.trim()) return false;
    }
    
    return true;
  }, [targetPhoneNumbers, blocks]);

  // Execute broadcast outreach
  const triggerBroadcast = async () => {
    setIsSending(true);
    setSendStatus(null);

    // Format blocks for backend service (remove UI id)
    const formattedBlocks = blocks.map((b) => {
      if (b.type === "text") {
        return { type: "text", text: b.text };
      } else {
        return { 
          type: "image", 
          imagePath: b.imagePath, 
          caption: b.caption?.trim() || undefined 
        };
      }
    });

    try {
      const response = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumbers: targetPhoneNumbers,
          blocks: formattedBlocks,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSendStatus({
          success: true,
          message: data.message,
        });
      } else {
        setSendStatus({
          success: false,
          message: data.message || "Failed to trigger broadcast.",
        });
      }
    } catch (err) {
      setSendStatus({
        success: false,
        message: err instanceof Error ? err.message : "Network error executing broadcast.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in select-none">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Megaphone className="h-6 w-6 text-[#fd6102]" style={{ color: "var(--button-primary)" }} />
            <h1 className="text-3xl font-black tracking-tight">Campaign Broadcast</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure target lists, assemble message chains, and dispatch automated outreach campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Target Audience selection */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="shadow-sm border border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Step 1: Select Target Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Lead Category</label>
                {isLoadingMetadata ? (
                  <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                ) : (
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedCategory && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Available Leads ({leads.length})
                    </span>
                    <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {selectedLeadIds.size} Selected
                    </span>
                  </div>

                  {isLoadingLeads ? (
                    <div className="space-y-3 pt-4">
                      <div className="h-8 bg-muted animate-pulse rounded" />
                      <div className="h-8 bg-muted animate-pulse rounded" />
                      <div className="h-8 bg-muted animate-pulse rounded" />
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
                      No leads found in this category.
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-[50px] text-center">
                              <input 
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer"
                                checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <TableRow key={lead._id}>
                              <TableCell className="text-center">
                                <input 
                                  type="checkbox"
                                  className="h-4 w-4 cursor-pointer"
                                  checked={selectedLeadIds.has(lead._id!)}
                                  onChange={(e) => handleSelectLead(lead._id!, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-sm">{lead.fullName}</TableCell>
                              <TableCell className="text-sm font-mono text-muted-foreground">{lead.phone || "—"}</TableCell>
                              <TableCell className="text-xs uppercase tracking-wide font-black">{lead.source}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Message Chain builder */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="shadow-sm border border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Step 2: Build Message Chain
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {blocks.map((block, index) => (
                  <div 
                    key={block.id} 
                    className="p-4 border rounded-lg bg-card/50 relative group space-y-3 transition-colors hover:border-muted-foreground/30"
                  >
                    {/* Badge & Trash Action Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Block {index + 1}: {block.type}
                      </span>
                      {blocks.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                          onClick={() => removeBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Block Form Content */}
                    {block.type === "text" ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Write message... Use {fullName} for variable injection."
                          value={block.text}
                          onChange={(e) => updateBlockText(block.id, e.target.value)}
                          className="min-h-[100px] text-sm"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground mr-1">Insert Placeholders:</span>
                          <button
                            type="button"
                            onClick={() => injectPlaceholder(block.id, "{fullName}")}
                            className="px-2 py-0.5 text-[10px] font-semibold border rounded bg-background hover:bg-accent cursor-pointer"
                          >
                            Full Name
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold">Image System Path</label>
                          <Input
                            placeholder="e.g. C:\Users\Mayank Kansal\Downloads\logo.png"
                            value={block.imagePath}
                            onChange={(e) => updateBlockImage(block.id, { imagePath: e.target.value })}
                            className="text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold">Image Caption (Optional)</label>
                          <Input
                            placeholder="Type caption..."
                            value={block.caption || ""}
                            onChange={(e) => updateBlockImage(block.id, { caption: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Block Addition Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addTextBlock}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add Text Block
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addImageBlock}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <ImageIcon className="h-3 w-3" /> Add Image Block
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={!isCampaignValid}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black cursor-pointer py-5 flex items-center justify-center gap-2"
                >
                  Configure & Send Broadcast
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {!isCampaignValid && selectedCategory && (
                  <p className="text-[10px] text-destructive mt-2 text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Ensure recipients are selected and all blocks are filled.
                  </p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Confirmation & Status Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Confirm Broadcast Dispatch
            </DialogTitle>
            <DialogDescription className="pt-2">
              You are about to launch a WhatsApp Outreach Campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/30 border rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-bold">{selectedCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Leads:</span>
                <span className="font-bold">{targetPhoneNumbers.length} contacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign Chain:</span>
                <span className="font-bold">{blocks.length} message blocks</span>
              </div>
            </div>

            <div className="p-3 border border-amber-200/50 bg-amber-500/10 text-amber-600 rounded-lg flex gap-2 text-xs">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Headed Browser Execution:</strong> Spawning this campaign will launch a headed browser window on your desktop to login/session check and automate message delivery. Please do not close it.
              </div>
            </div>

            {sendStatus && (
              <div className={`p-4 border rounded-lg text-sm ${
                sendStatus.success 
                  ? "border-emerald-200/50 bg-emerald-500/10 text-emerald-600" 
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {sendStatus.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {sendStatus.success ? "Campaign Launched!" : "Trigger Failed"}
                </div>
                <div className="text-xs mt-1 leading-relaxed">
                  {sendStatus.message}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isSending}
              onClick={() => {
                setIsConfirmOpen(false);
                setSendStatus(null);
              }}
              className="cursor-pointer"
            >
              Close
            </Button>
            {!sendStatus?.success && (
              <Button
                onClick={triggerBroadcast}
                disabled={isSending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  "Confirm & Launch Campaign"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
