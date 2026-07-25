"use client";

import { useMemo, useEffect, useState } from "react";
import {
  RefreshCw, AlertCircle, Users, Target, Activity, Zap, CheckSquare,
  TrendingUp, PhoneCall, UserCheck, CheckCircle2, Clock, ArrowRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { teamTasksApi } from "@/lib/api/team";
import { TeamTask } from "@/lib/types/team";
import { useLeads } from "@/hooks/use-leads";
import { useRealtimeSubscription } from "@/components/providers/RealtimeProvider";
import {
  formatLabel, getOverdueFollowUps, getServiceCounts,
  getStatusCounts, getTodayFollowUps, getUpcomingFollowUps, sortByFollowUpDate
} from "@/lib/lead-insights";
import { generateTrendData, getCountsByField } from "@/lib/utils";
import { MetricCard } from "./sections/MetricCard";
import { ChartCard } from "./sections/ChartCard";
import { FollowUpRow } from "./sections/FollowUpRow";
import { TeamScoreboard } from "./sections/TeamScoreboard";
import { RECHARTS_PALETTE, STATUS_COLORS } from "@/lib/data/dashboard.color";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
  fontSize: "12px",
};

const FUNNEL_GRADIENTS = [
  { id: "g0", from: "#3b82f6", to: "#6366f1", icon: Users, label: "All Leads" },
  { id: "g1", from: "#f59e0b", to: "#f97316", icon: PhoneCall, label: "Contacted" },
  { id: "g2", from: "#8b5cf6", to: "#ec4899", icon: UserCheck, label: "Qualified" },
  { id: "g3", from: "#10b981", to: "#14b8a6", icon: CheckCircle2, label: "Converted" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-[#fd6102] pl-3">
      <h2 className="text-base font-black uppercase tracking-wider text-foreground">{children}</h2>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { leads = [], isLoading, error, refetch } = useLeads();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    teamTasksApi.getAll().then(setTasks).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isLoading) setLastUpdated(new Date());
  }, [isLoading]);

  useRealtimeSubscription("task_created", (t: TeamTask) => setTasks(p => p.some(x => x._id === t._id) ? p : [t, ...p]));
  useRealtimeSubscription("task_updated", (t: TeamTask) => setTasks(p => p.map(x => x._id === t._id ? t : x)));
  useRealtimeSubscription("task_deleted", ({ id }: { id: string }) => setTasks(p => p.map(x => x._id === id ? { ...x, isDeleted: true } : x)));

  const d = useMemo(() => {
    const statusCounts = getStatusCounts(leads);
    const todayFollowUps = getTodayFollowUps(leads);
    const upcomingFollowUps = getUpcomingFollowUps(leads);
    const overdueFollowUps = getOverdueFollowUps(leads);
    const closedCount = (statusCounts.converted || 0) + (statusCounts.qualified || 0);
    const activeTasks = tasks.filter(t => !t.isDeleted && t.status !== "completed");

    // Member task stats
    const memberStats: Record<string, { total: number; completed: number; leads: number }> = {};
    tasks.filter(t => !t.isDeleted).forEach(task => {
      const name = typeof task.assignedTo === "object" && task.assignedTo ? task.assignedTo.name : "Unassigned";
      if (!memberStats[name]) memberStats[name] = { total: 0, completed: 0, leads: 0 };
      memberStats[name].total++;
      if (task.status === "completed") memberStats[name].completed++;
    });
    const ownerCounts = getCountsByField(leads, "assignedTo");
    Object.entries(ownerCounts).forEach(([name, count]) => {
      if (!memberStats[name]) memberStats[name] = { total: 0, completed: 0, leads: 0 };
      memberStats[name].leads = count;
    });

    return {
      statusCounts,
      serviceCounts: getServiceCounts(leads),
      sourceCounts: getCountsByField(leads, "source"),
      ownerCounts,
      budgetCounts: getCountsByField(leads, "budget"),
      todayFollowUps,
      upcomingFollowUps,
      overdueFollowUps,
      nextFollowUps: sortByFollowUpDate([...todayFollowUps, ...upcomingFollowUps]).slice(0, 8),
      closedCount,
      activeCount: Math.max(leads.length - closedCount, 0),
      conversionRate: leads.length > 0 ? Math.round((closedCount / leads.length) * 100) : 0,
      trendData: generateTrendData(leads),
      activeTasks: activeTasks.length,
      memberStats,
    };
  }, [leads, tasks]);

  const statusData = Object.entries(d.statusCounts).filter(([, c]) => c > 0).map(([status, count]) => ({
    name: formatLabel(status), value: count, status,
  }));

  const sourceData = Object.entries(d.sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([source, count]) => ({
    name: formatLabel(source), count,
  }));

  const serviceData = Object.entries(d.serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([service, count]) => ({
    name: formatLabel(service), count,
  }));

  const funnelData = [
    { count: leads.length },
    { count: d.statusCounts.contacted || 0 },
    { count: d.statusCounts.qualified || 0 },
    { count: d.statusCounts.converted || 0 },
  ];

  if (isLoading && leads.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-40 gap-4">
        <RefreshCw className="h-10 w-10 text-[#fd6102] animate-spin" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Aggregating live lead insights...</p>
      </div>
    );
  }

  return (
    <main className="w-full space-y-10 px-6 py-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analytics Dashboard</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Real-time pipeline insights · Last updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => { refetch(); teamTasksApi.getAll().then(setTasks).catch(console.error); }} disabled={isLoading} className="h-10 px-5 gap-2 rounded-xl border-border/80 shadow-sm">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* ── ROW 1: KPI CARDS ── */}
      <section className="space-y-4">
        <SectionHeading>Key Metrics</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Total Leads"
            value={leads.length}
            detail="Active in your pipeline"
            icon={Users}
            accentColor="#3b82f6"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${d.conversionRate}%`}
            detail={`${d.closedCount} qualified + converted`}
            trend={d.conversionRate >= 30 ? "↑ Strong performance" : d.conversionRate > 0 ? "↓ Room to grow" : "No conversions yet"}
            icon={Target}
            accentColor="#10b981"
          />
          <MetricCard
            title="Active Pipeline"
            value={d.activeCount}
            detail="Leads being actively worked"
            icon={Activity}
            accentColor="#f59e0b"
          />
          <MetricCard
            title="Overdue Follow-ups"
            value={d.overdueFollowUps.length}
            detail={`${d.todayFollowUps.length} due today · ${d.upcomingFollowUps.length} upcoming`}
            trend={d.overdueFollowUps.length > 0 ? `⚠ ${d.overdueFollowUps.length} need urgent action` : "✓ All follow-ups current"}
            icon={Zap}
            accentColor={d.overdueFollowUps.length > 0 ? "#ef4444" : "#10b981"}
          />
          <MetricCard
            title="Tasks Pending"
            value={d.activeTasks}
            detail="Team tasks in backlog / progress"
            icon={CheckSquare}
            accentColor="#8b5cf6"
          />
        </div>
      </section>

      {/* ── ROW 2: TREND + DONUT ── */}
      <section className="space-y-4">
        <SectionHeading>Pipeline Overview</SectionHeading>
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Area Chart — 3 cols */}
          <div className="lg:col-span-3">
            <ChartCard title="Lead Acquisition Trend" description="New leads captured over the past 30 days vs. conversions">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.trendData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConversions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} dx={-8} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradLeads)" name="New Leads" dot={false} />
                    <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradConversions)" name="Conversions" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Donut — 2 cols */}
          <div className="lg:col-span-2">
            <ChartCard title="Status Distribution" description="Proportional split across all pipeline stages">
              <div className="relative flex items-center justify-center h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={68} outerRadius={88} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || RECHARTS_PALETTE[i % RECHARTS_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [val ?? 0, "Leads"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-3xl font-black text-foreground">{leads.length}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {statusData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.status] || RECHARTS_PALETTE[i % RECHARTS_PALETTE.length] }} />
                    <span className="text-[11px] font-semibold text-foreground truncate">{entry.name}</span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      </section>

      {/* ── ROW 3: SOURCES + SERVICES + URGENCY ── */}
      <section className="space-y-4">
        <SectionHeading>Channels & Urgency</SectionHeading>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Sources */}
          <ChartCard title="Leads by Source" description="Which channels are generating the most leads">
            {sourceData.length > 0 ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} layout="vertical" margin={{ left: -8, right: 16, top: 4, bottom: 0 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={85} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={RECHARTS_PALETTE[i % RECHARTS_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No source data available.</p>
            )}
          </ChartCard>

          {/* Services */}
          <ChartCard title="Service Demand" description="Most requested services from your leads">
            {serviceData.length > 0 ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceData} layout="vertical" margin={{ left: -8, right: 16, top: 4, bottom: 0 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Requests" radius={[0, 6, 6, 0]}>
                      {serviceData.map((_, i) => (
                        <Cell key={i} fill={RECHARTS_PALETTE[(i + 2) % RECHARTS_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No service data available.</p>
            )}
          </ChartCard>

          {/* Follow-up Urgency */}
          <ChartCard title="Follow-up Urgency" description="Time-sensitivity breakdown of pending outreach">
            <div className="space-y-4">
              {[
                { label: "Overdue", sub: "Requires immediate action", count: d.overdueFollowUps.length, color: "#ef4444", bg: "bg-red-500/8 border-red-500/15", textColor: "text-red-600", icon: "🔴" },
                { label: "Due Today", sub: "Must contact today", count: d.todayFollowUps.length, color: "#f59e0b", bg: "bg-amber-500/8 border-amber-500/15", textColor: "text-amber-600", icon: "🟡" },
                { label: "Upcoming", sub: "Scheduled for next 7 days", count: d.upcomingFollowUps.length, color: "#10b981", bg: "bg-emerald-500/8 border-emerald-500/15", textColor: "text-emerald-600", icon: "🟢" },
              ].map((item) => (
                <div key={item.label} className={`flex items-center justify-between rounded-xl border p-4 ${item.bg} hover:brightness-95 transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${item.color}18` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                  <span className={`text-3xl font-black tabular-nums ${item.textColor}`}>{item.count}</span>
                </div>
              ))}
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Follow-ups</span>
                <span className="text-lg font-black text-foreground">{d.todayFollowUps.length + d.upcomingFollowUps.length + d.overdueFollowUps.length}</span>
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* ── ROW 4: TEAM SCOREBOARD ── */}
      <section className="space-y-4">
        <SectionHeading>🏆 Team Scoreboard</SectionHeading>
        <ChartCard
          title="Performance Leaderboard"
           description="Ranked by weighted pipeline score · Won=20pts · Proposal=10pts · Qualified=7pts · Contacted=3pts · New=1pt (sheet aliases like Follow-up, Meeting Booked, Quotation Sent are auto-mapped)"
        >
          <TeamScoreboard leads={leads} tasks={tasks} />
        </ChartCard>
      </section>

      {/* ── CONVERSION FUNNEL & TEAM WORKLOAD ── */}
      <section className="space-y-4">
        <SectionHeading>Conversion Funnel &amp; Team Workload</SectionHeading>
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Conversion Funnel */}
          <ChartCard title="Conversion Funnel" description="Step-by-step drop-off from first touch to close">
            <div className="space-y-3">
              {FUNNEL_GRADIENTS.map((step, i) => {
                const count = funnelData[i]?.count || 0;
                const total = funnelData[0]?.count || 1;
                const pct = Math.round((count / total) * 100);
                const nextCount = funnelData[i + 1]?.count || 0;
                const stepConv = count > 0 && i < 3 ? Math.round((nextCount / count) * 100) : null;
                const Icon = step.icon;

                return (
                  <div key={step.id}>
                    <div
                      className="relative rounded-xl p-4 flex items-center justify-between overflow-hidden text-white"
                      style={{ background: `linear-gradient(135deg, ${step.from}, ${step.to})` }}
                    >
                      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 50%, white, transparent)" }} />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold opacity-85">{step.label}</p>
                          <p className="text-2xl font-extrabold leading-tight">{count}</p>
                        </div>
                      </div>
                      <div className="text-right relative z-10">
                        <p className="text-2xl font-black opacity-90">{pct}%</p>
                        <p className="text-[10px] opacity-70">{i === 0 ? "Baseline" : "of all leads"}</p>
                      </div>
                    </div>
                    {stepConv !== null && (
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <div className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px] font-black text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {stepConv}% moved to next stage
                        </span>
                        <div className="flex-1 h-px bg-border/60" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* Team Workload */}
          <ChartCard title="Team Workload" description="Lead ownership and task completion per team member">
            {Object.keys(d.memberStats).length > 0 || Object.keys(d.ownerCounts).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(d.memberStats).length > 0
                  ? Object.entries(d.memberStats)
                      .sort((a, b) => (b[1].leads + b[1].total) - (a[1].leads + a[1].total))
                      .slice(0, 6)
                      .map(([name, stats]) => {
                        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        const leadPct = leads.length > 0 ? Math.round((stats.leads / leads.length) * 100) : 0;
                        return (
                          <div key={name} className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-2.5 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-[#fd6102]/15 border border-[#fd6102]/25 flex items-center justify-center text-[#fd6102] text-[11px] font-black">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-foreground capitalize">{name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.leads} leads</span>
                                <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{stats.total} tasks</span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Lead ownership</span><span className="font-bold text-foreground">{leadPct}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-[#fd6102] rounded-full transition-all duration-500" style={{ width: `${leadPct}%` }} />
                              </div>
                              {stats.total > 0 && (
                                <>
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>Task completion</span><span className="font-bold text-emerald-600">{completionRate}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                  : Object.entries(d.ownerCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([owner, count]) => {
                      const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                      return (
                        <div key={owner} className="flex flex-col gap-1.5 rounded-xl bg-muted/30 border border-border/40 p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground capitalize">{owner}</span>
                            <span className="text-sm font-extrabold text-foreground">{count} <span className="text-xs text-muted-foreground font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No team data found. Assign leads and tasks to team members.</p>
            )}
          </ChartCard>
        </div>
      </section>

      {/* ── ROW 5: BUDGET RANGES (progress bars) ── */}
      {Object.keys(d.budgetCounts).length > 0 && (
        <section className="space-y-4">
          <SectionHeading>Budget Distribution</SectionHeading>
          <ChartCard title="Lead Budget Ranges" description="How leads are distributed across budget brackets">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(d.budgetCounts).sort((a, b) => b[1] - a[1]).map(([budget, count], i) => {
                const pct = Math.round((count / leads.length) * 100) || 0;
                const color = RECHARTS_PALETTE[i % RECHARTS_PALETTE.length];
                return (
                  <div key={budget} className="rounded-xl bg-muted/30 border border-border/40 p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">{formatLabel(budget)}</span>
                      <span className="text-sm font-extrabold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{pct}% of all leads</p>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </section>
      )}

      {/* ── ROW 6: NEXT FOLLOW-UPS TABLE ── */}
      <section className="space-y-4">
        <SectionHeading>Next Follow-ups</SectionHeading>
        <ChartCard
          title="Upcoming Outreach Queue"
          description={`${d.todayFollowUps.length} due today · ${d.upcomingFollowUps.length} upcoming · ${d.overdueFollowUps.length} overdue`}
          action={
            d.overdueFollowUps.length > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 px-3 py-1 text-[10px] font-black">
                <Clock className="h-3 w-3" />
                {d.overdueFollowUps.length} overdue
              </span>
            ) : undefined
          }
        >
          {d.nextFollowUps.length > 0 ? (
            <div>
              {d.nextFollowUps.map((lead) => (
                <FollowUpRow key={lead._id || lead.phone} lead={lead} />
              ))}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">No scheduled follow-ups found.</p>
              <p className="text-xs text-muted-foreground/70">Set follow-up dates on leads to see them appear here.</p>
            </div>
          )}
        </ChartCard>
      </section>

    </main>
  );
}
