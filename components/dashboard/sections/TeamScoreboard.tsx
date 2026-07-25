"use client";

import { useMemo } from "react";
import { LeadFormData } from "@/lib/types/lead";
import { TeamTask } from "@/lib/types/team";
import { TrendingUp, Users, Star } from "lucide-react";
import { normalizeStatus } from "@/lib/lead-insights";

// Pipeline stage weights define the score per lead at each stage
const STAGE_WEIGHTS: Record<string, number> = {
  new: 1,
  contacted: 3,
  qualified: 7,
  proposal: 10,
  won: 20,
  converted: 20,
  lost: 0,
  unqualified: 0,
};

const mapStatusToStage = (status?: string): string => {
  const s = normalizeStatus(status);
  if (s === "unknown") return "lost";
  if (s === "converted" || s === "won") return "won";
  if (s === "unqualified" || s === "lost") return "lost";
  if (s === "proposal") return "proposal";
  if (s === "qualified") return "qualified";
  if (s === "contacted") return "contacted";
  if (s === "new") return "new";
  return "lost";
};

const STAGE_DISPLAY = [
  { key: "new",       label: "New",      colorClass: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { key: "contacted", label: "Contacted",colorClass: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { key: "qualified", label: "Qualified",colorClass: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  { key: "proposal",  label: "Proposal", colorClass: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  { key: "won",       label: "Won",      colorClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { key: "lost",      label: "Lost",     colorClass: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
];

interface MemberRow {
  name: string;
  score: number;
  total: number;
  stages: Record<string, number>;
  taskCompletion: number;
  conversionRate: number;
}

interface TeamScoreboardProps {
  leads: LeadFormData[];
  tasks: TeamTask[];
}

export function TeamScoreboard({ leads, tasks }: TeamScoreboardProps) {
  const rows = useMemo<MemberRow[]>(() => {
    const memberMap: Record<string, MemberRow> = {};

    leads.forEach((lead) => {
      const owner = lead.assignedTo?.trim().toLowerCase() || "";
      if (!owner || owner === "unassigned") return;
      if (!memberMap[owner]) {
        memberMap[owner] = { name: owner, score: 0, total: 0, stages: {}, taskCompletion: 0, conversionRate: 0 };
      }
      const stage = mapStatusToStage(lead.status);
      memberMap[owner].stages[stage] = (memberMap[owner].stages[stage] || 0) + 1;
      memberMap[owner].total++;
      memberMap[owner].score += STAGE_WEIGHTS[stage] || 0;
    });

    const taskMap: Record<string, { total: number; completed: number }> = {};
    tasks.filter((t) => !t.isDeleted).forEach((task) => {
      const name = typeof task.assignedTo === "object" && task.assignedTo
        ? (task.assignedTo as any).name?.trim().toLowerCase()
        : (task.assignedTo as string)?.trim().toLowerCase() || "";
      if (!name) return;
      if (!taskMap[name]) taskMap[name] = { total: 0, completed: 0 };
      taskMap[name].total++;
      if (task.status === "completed") taskMap[name].completed++;
    });

    Object.keys(memberMap).forEach((key) => {
      const td = taskMap[key];
      memberMap[key].taskCompletion = td && td.total > 0 ? Math.round((td.completed / td.total) * 100) : 0;
      const won = memberMap[key].stages["won"] || 0;
      const total = memberMap[key].total;
      memberMap[key].conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    });

    return Object.values(memberMap).sort((a, b) => b.score - a.score);
  }, [leads, tasks]);

  const maxScore = rows[0]?.score || 1;

  if (rows.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
        <Users className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-muted-foreground">No team data yet.</p>
        <p className="text-xs text-muted-foreground/70">Assign leads to team members to see the scoreboard.</p>
      </div>
    );
  }

  const rankGradients = ["from-yellow-500 to-amber-400", "from-slate-400 to-slate-300", "from-amber-700 to-amber-600"];

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const pct = Math.round((row.score / maxScore) * 100);
        const displayName = row.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
        const isTopThree = idx < 3;

        return (
          <div
            key={row.name}
            className={`relative rounded-xl border p-4 space-y-3 transition-all duration-200 hover:shadow-md ${
              isTopThree
                ? "border-[#fd6102]/30 bg-[#fd6102]/5 hover:bg-[#fd6102]/10"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            {isTopThree && (
              <div className={`absolute top-3 right-3 h-7 w-7 rounded-full bg-gradient-to-br ${rankGradients[idx]} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                {idx + 1}
              </div>
            )}

            <div className="flex items-center gap-3 pr-8">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                isTopThree ? "bg-[#fd6102] text-white shadow-sm" : "bg-muted border border-border text-foreground"
              }`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground capitalize truncate">{displayName}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {row.total} leads
                  </span>
                  {row.conversionRate > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      {row.conversionRate}% win rate
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-extrabold text-foreground leading-none">{row.score}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">pts</p>
              </div>
            </div>

            <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isTopThree ? "bg-[#fd6102]" : "bg-muted-foreground/40"}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STAGE_DISPLAY.filter((s) => (row.stages[s.key] || 0) > 0).map((s) => (
                <span key={s.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${s.colorClass}`}>
                  {s.label}: {row.stages[s.key]}
                </span>
              ))}
              {row.taskCompletion > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold text-violet-600 bg-violet-500/10 border-violet-500/20">
                  <Star className="h-2.5 w-2.5" />
                  Tasks {row.taskCompletion}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
