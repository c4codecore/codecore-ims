import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/api/axios";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  CalendarCheck, Save, Loader2, AlertCircle, Users,
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronLeft,
  ChevronRight, BarChart2, ClipboardList, TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

function prevDay(iso) {
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function nextDay(iso) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(monthISO) {
  if (!monthISO) return "";
  const [y, m] = monthISO.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = ["present", "absent", "leave"];
const STATUS_CONFIG = {
  present: {
    label: "Present", icon: CheckCircle2,
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/25 dark:text-emerald-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent", icon: XCircle,
    active: "bg-rose-500/15 text-rose-600 border-rose-500/40 hover:bg-rose-500/25 dark:text-rose-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    dot: "bg-rose-500",
  },
  leave: {
    label: "Leave", icon: Clock,
    active: "bg-amber-500/15 text-amber-600 border-amber-500/40 hover:bg-amber-500/25 dark:text-amber-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    dot: "bg-amber-500",
  },
};

// ── Status Button ─────────────────────────────────────────────────────────────
function StatusButton({ status, isActive, onClick }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
        isActive ? cfg.active : cfg.inactive)}>
      <Icon className="size-3.5 shrink-0" />
      {cfg.label}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, colorClass, loading }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", colorClass)}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading
          ? <div className="mt-1 h-7 w-20 animate-pulse rounded-md bg-muted" />
          : <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>}
        {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Daily Trend Chart ─────────────────────────────────────────────────────────
function DailyTrendChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      No trend data available
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.present + d.absent + d.leave), 1);

  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((day, i) => {
        const total = day.present + day.absent + day.leave;
        const presentH = total > 0 ? (day.present / maxVal) * 100 : 0;
        const absentH = total > 0 ? (day.absent / maxVal) * 100 : 0;
        const leaveH = total > 0 ? (day.leave / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2 py-1.5 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
              <p className="font-medium text-foreground mb-0.5">{formatShortDate(day.date)}</p>
              <p className="text-emerald-600">Present: {day.present}</p>
              <p className="text-rose-600">Absent: {day.absent}</p>
              <p className="text-amber-600">Leave: {day.leave}</p>
            </div>
            {/* Stacked bar */}
            <div className="flex flex-col-reverse w-full rounded-sm overflow-hidden" style={{ height: "100px" }}>
              <div className="bg-emerald-500/70 w-full transition-all duration-500" style={{ height: `${presentH}%` }} />
              <div className="bg-rose-500/70 w-full transition-all duration-500" style={{ height: `${absentH}%` }} />
              <div className="bg-amber-500/70 w-full transition-all duration-500" style={{ height: `${leaveH}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground truncate w-full text-center">{formatShortDate(day.date)}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Attendance % Bar ──────────────────────────────────────────────────────────
function AttendanceBar({ percentage }) {
  const color = percentage >= 75 ? "bg-emerald-500" : percentage >= 50 ? "bg-amber-500" : "bg-rose-500";
  const textColor = percentage >= 75 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn("text-xs font-medium w-10 text-right", textColor)}>
        {percentage}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MARK ATTENDANCE TAB ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function MarkAttendance() {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [students, setStudents] = useState([]);
  const [existing, setExisting] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (selectedDate) => {
    setLoading(true);
    setError("");
    try {
      const [studRes, attRes] = await Promise.all([
        api.get("/api/students/", { params: { status: "active" } }),
        api.get("/api/attendance/", { params: { date: selectedDate } }),
      ]);
      const studentList = Array.isArray(studRes.data) ? studRes.data : (studRes.data.results ?? []);
      const attList = Array.isArray(attRes.data) ? attRes.data : (attRes.data.results ?? []);
      setStudents(studentList);
      setExisting(attList);
      const map = {};
      studentList.forEach(s => {
        const found = attList.find(a => a.student === s.id);
        map[s.id] = { status: found?.status ?? "absent", note: found?.note ?? "" };
      });
      setRecords(map);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const toggleStatus = useCallback((studentId, status) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }, []);

  const updateNote = useCallback((studentId, note) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  }, []);

  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      present: vals.filter(r => r.status === "present").length,
      absent: vals.filter(r => r.status === "absent").length,
      leave: vals.filter(r => r.status === "leave").length,
      total: vals.length,
    };
  }, [records]);

  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        date,
        records: students.map(s => ({
          student: s.id,
          status: records[s.id]?.status ?? "absent",
          note: records[s.id]?.note ?? "",
        })),
      };
      const { data } = await api.post("/api/attendance/mark/", payload);
      toast({
        type: "success", title: "Attendance saved!",
        description: `${data.created ?? 0} created, ${data.updated ?? 0} updated.`,
        duration: 4000,
      });
      await fetchData(date);
    } catch (err) {
      toast({ type: "error", title: "Failed to save", description: err.response?.data?.detail ?? "Please try again.", duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayISO();

  return (
    <div className="flex flex-col gap-5">

      {/* ── Date Navigation ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{formatDisplayDate(date)}</p>
          <div className="flex items-center gap-2 mt-1">
            {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
            {existing.length > 0 && <Badge variant="info" className="text-xs">Previously Saved</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setDate(prevDay(date))}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="relative">
            <CalendarCheck className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-9 w-44" />
          </div>
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setDate(nextDay(date))} disabled={isToday}>
            <ChevronRight className="size-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDate(todayISO())}>
              Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchData(date)} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Summary Pills ── */}
      <div className="grid grid-cols-3 gap-3">
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = counts[s];
          const pct = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0;
          return (
            <div key={s} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <span className={cn("size-2.5 rounded-full shrink-0", cfg.dot)} />
              <div>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className="text-lg font-bold leading-none text-foreground">
                  {count}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({pct}%)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" />
            <span><span className="font-medium text-foreground">{students.length}</span> students</span>
          </div>
          <div className="flex gap-1.5">
            {STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} type="button"
                  onClick={() => setRecords(prev => {
                    const u = { ...prev };
                    students.forEach(st => { u[st.id] = { ...u[st.id], status: s }; });
                    return u;
                  })}
                  className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors", cfg.inactive)}>
                  All {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading attendance…</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <Users className="size-10 opacity-30" />
            <p className="text-sm font-medium">No active students found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, idx) => {
                const rec = records[student.id] ?? { status: "absent", note: "" };
                const status = rec.status;
                return (
                  <TableRow key={student.id}
                    className={cn("transition-colors",
                      status === "present" && "bg-emerald-500/5",
                      status === "absent" && "bg-rose-500/5",
                      status === "leave" && "bg-amber-500/5")}>
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors",
                          status === "present" && "bg-emerald-500/15 text-emerald-600",
                          status === "absent" && "bg-rose-500/15 text-rose-600",
                          status === "leave" && "bg-amber-500/15 text-amber-600")}>
                          {student.name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{student.name}</p>
                          <p className="truncate text-xs text-muted-foreground sm:hidden">{student.course_name ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal">{student.course_name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map(s => (
                          <StatusButton key={s} status={s} isActive={status === s}
                            onClick={() => toggleStatus(student.id, s)} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Input type="text" placeholder="Optional note…" value={rec.note}
                        onChange={e => updateNote(student.id, e.target.value)}
                        className="h-7 text-xs" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Save Footer */}
        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600">{counts.present} present</span>
              {" · "}
              <span className="font-medium text-rose-600">{counts.absent} absent</span>
              {" · "}
              <span className="font-medium text-amber-600">{counts.leave} on leave</span>
            </p>
            <Button size="sm" onClick={handleSave} disabled={saving || loading} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ATTENDANCE REPORT TAB ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AttendanceReport() {
  const [month, setMonth] = useState(currentMonthISO());
  const [report, setReport] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const { data } = await api.get("/api/attendance/", { params: { date: todayISO() } });
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setTodayData({
        present: list.filter(a => a.status === "present").length,
        absent: list.filter(a => a.status === "absent").length,
        leave: list.filter(a => a.status === "leave").length,
        total: list.length,
        marked: list.length > 0,
      });
    } catch {
      setTodayData(null);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (selectedMonth) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/attendance/report/", { params: { month: selectedMonth } });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); fetchReport(month); }, []);
  useEffect(() => { fetchReport(month); }, [month]);

  function prevMonth(m) {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(y, mo - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function nextMonth(m) {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(y, mo, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const isCurrentMonth = month === currentMonthISO();

  const sortedStudents = useMemo(() => {
    if (!report?.students) return [];
    return [...report.students].sort((a, b) => {
      if (sortBy === "percentage") return a.percentage - b.percentage;
      if (sortBy === "absent") return b.absent - a.absent;
      return a.student_name.localeCompare(b.student_name);
    });
  }, [report, sortBy]);

  const monthlyAvg = useMemo(() => {
    if (report?.summary) return Math.round(report.summary.percentage ?? 0);
    if (!report?.students || report.students.length === 0) return 0;
    return Math.round(report.students.reduce((s, x) => s + x.percentage, 0) / report.students.length);
  }, [report]);

  const lowAttendance = useMemo(() => {
    if (!report?.students) return 0;
    return report.students.filter(s => s.percentage < 75 && s.total > 0).length;
  }, [report]);

  const consecutiveAbsentees = useMemo(() => {
    if (!report?.students) return [];
    return report.students
      .filter(s => s.consecutive_absent >= 2)
      .sort((a, b) => b.consecutive_absent - a.consecutive_absent)
      .slice(0, 6);
  }, [report]);

  return (
    <div className="flex flex-col gap-5">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Today Present" icon={CheckCircle2}
          value={todayData?.marked ? todayData.present : "—"}
          sub={todayData?.marked ? `of ${todayData.total} marked` : "Not marked yet"}
          colorClass="text-emerald-500 bg-emerald-500/10" loading={todayLoading} />
        <KpiCard label="Today Absent" icon={XCircle}
          value={todayData?.marked ? todayData.absent : "—"}
          sub={todayData?.marked ? `+ ${todayData.leave} on leave` : "Not marked yet"}
          colorClass="text-rose-500 bg-rose-500/10" loading={todayLoading} />
        <KpiCard label="Monthly Avg %" icon={TrendingUp}
          value={loading ? "—" : `${monthlyAvg}%`}
          sub={report?.summary ? `${report.summary.students_marked}/${report.summary.active_students} students marked` : formatMonth(month)}
          colorClass="text-blue-500 bg-blue-500/10" loading={loading} />
        <KpiCard label="Low Attendance" icon={AlertTriangle}
          value={loading ? "—" : lowAttendance}
          sub="Students below 75%"
          colorClass="text-amber-500 bg-amber-500/10" loading={loading} />
      </div>

      {/* ── Month Navigation ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setMonth(prevMonth(month))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-36 text-center">
            {formatMonth(month)}
          </span>
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setMonth(nextMonth(month))} disabled={isCurrentMonth}>
            <ChevronRight className="size-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setMonth(currentMonthISO())}>
              This Month
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReport(month)} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* ── Daily Trend Chart ── */}
      {report?.daily_trend && report.daily_trend.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Daily Attendance Trend</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatMonth(month)}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500/70 inline-block" />Present</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rose-500/70 inline-block" />Absent</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-500/70 inline-block" />Leave</span>
            </div>
          </div>
          <DailyTrendChart data={report.daily_trend} />
        </div>
      )}

      {!loading && report?.summary && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Course Summary</p>
              <Badge variant="secondary" className="font-normal">{report.course_summary?.length ?? 0} courses</Badge>
            </div>
            <div className="space-y-3">
              {(report.course_summary ?? []).slice(0, 6).map(course => (
                <div key={course.course_name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-foreground">{course.course_name}</span>
                    <span className="shrink-0 text-muted-foreground">{course.percentage}%</span>
                  </div>
                  <AttendanceBar percentage={course.percentage} />
                </div>
              ))}
              {(report.course_summary ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No course data.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Needs Attention</p>
              <Badge variant="secondary" className="font-normal">{report.low_attendance?.length ?? 0} low</Badge>
            </div>
            <div className="space-y-2">
              {(report.low_attendance ?? []).slice(0, 6).map(student => (
                <div key={student.student_id} className="flex items-center justify-between gap-3 rounded-lg bg-rose-500/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{student.student_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.course_name}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-rose-600">{student.percentage}%</span>
                </div>
              ))}
              {(report.low_attendance ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No low attendance students.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Follow Up</p>
              <Badge variant="secondary" className="font-normal">{consecutiveAbsentees.length} alerts</Badge>
            </div>
            <div className="space-y-2">
              {consecutiveAbsentees.map(student => (
                <div key={student.student_id} className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{student.student_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.course_name}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-600">{student.consecutive_absent} absent</span>
                </div>
              ))}
              {consecutiveAbsentees.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No consecutive absence alerts.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Student Report Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-wrap gap-2">
          <p className="text-sm font-medium text-foreground">
            Student-wise Report
            {report?.students && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{report.students.length} students</span>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
            {[{ key: "name", label: "Name" }, { key: "percentage", label: "% ↑" }, { key: "absent", label: "Absent ↓" }].map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)}
                className={cn("px-2 py-0.5 rounded text-xs font-medium transition-colors",
                  sortBy === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading report…</p>
          </div>
        ) : !report?.students || report.students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <BarChart2 className="size-10 opacity-30" />
            <p className="text-sm font-medium">No attendance data for this month.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center hidden md:table-cell">Leave</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Streak</TableHead>
                <TableHead className="min-w-[140px]">Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((s, idx) => {
                const isLow = s.percentage < 75 && s.total > 0;
                return (
                  <TableRow key={s.student_id} className={cn("transition-colors", isLow && "bg-rose-500/5")}>
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
                          isLow ? "bg-rose-500/15 text-rose-600" : "bg-primary/10 text-primary")}>
                          {s.student_name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{s.student_name}</p>
                          {isLow && (
                            <p className="text-xs text-rose-600 flex items-center gap-0.5">
                              <AlertTriangle className="size-3" /> Low attendance
                            </p>
                          )}
                          {s.total === 0 && (
                            <p className="text-xs text-muted-foreground">Not marked this month</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal">{s.course_name}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-emerald-600">{s.present}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-semibold", s.absent > 0 ? "text-rose-600" : "text-muted-foreground")}>{s.absent}</span>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className={cn("font-semibold", s.leave > 0 ? "text-amber-600" : "text-muted-foreground")}>{s.leave}</span>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      {s.consecutive_absent > 0 ? (
                        <span className="font-semibold text-amber-600">{s.consecutive_absent}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AttendanceBar percentage={s.percentage} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN ATTENDANCE PAGE ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function Attendance() {
  const [activeTab, setActiveTab] = useState("mark");

  const tabs = [
    { key: "mark", label: "Mark Attendance", icon: ClipboardList },
    { key: "report", label: "Attendance Report", icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Heading ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mark daily attendance and view monthly reports</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "mark" ? <MarkAttendance /> : <AttendanceReport />}
    </div>
  );
}
