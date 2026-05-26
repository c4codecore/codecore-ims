/**
 * Attendance.jsx  —  CodeCore IMS
 *
 * Bug fixes applied:
 *  Bug 2  — DayDrawerContent: fake/random data hata diya, real API call lagaya
 *  Bug 4  — fetchData: a.student === s.id match fix (integer cast)
 *  Bug 6  — Report tab: future months navigate nahi ho sakte ab
 *  Bug 7  — StudentDrawerContent: summary label "Overall attendance" kar diya (filter-independent)
 *  Bug 8  — Mark Attendance: future date navigate nahi ho sakta ab
 *  Bug 9  — openStudentDrawer: duplicate `sid` key hata diya
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { createPortal } from "react-dom";
import api from "@/api/axios";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  CalendarCheck, Save, Loader2, AlertCircle, Users,
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronLeft,
  ChevronRight, BarChart2, ClipboardList, TrendingUp,
  AlertTriangle, X, BookOpen, User, MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";


// ─────────────────────────────────────────────────────────── helpers ─────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}
function p2(n) { return String(n).padStart(2, "0"); }

function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function shortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}
function monthDisplay(iso) {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });
}
function shiftDay(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function shiftMonth(iso, delta) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function firstDOW(y, m)    { return new Date(y, m - 1, 1).getDay(); }

// ──────────────────────────────────────────────────────── constants ──────────

const STATUS_CFG = {
  present: {
    label: "Present", Icon: CheckCircle2,
    activeCls : "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400",
    rowCls    : "bg-emerald-500/[0.04]",
    avCls     : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    textCls   : "text-emerald-600 dark:text-emerald-400",
    dotCls    : "bg-emerald-500",
  },
  absent: {
    label: "Absent", Icon: XCircle,
    activeCls : "bg-rose-500/15 text-rose-600 border-rose-500/40 dark:text-rose-400",
    rowCls    : "bg-rose-500/[0.04]",
    avCls     : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    textCls   : "text-rose-600 dark:text-rose-400",
    dotCls    : "bg-rose-500",
  },
  leave: {
    label: "Leave", Icon: Clock,
    activeCls : "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400",
    rowCls    : "bg-amber-500/[0.04]",
    avCls     : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    textCls   : "text-amber-600 dark:text-amber-400",
    dotCls    : "bg-amber-500",
  },
};
const STATUSES = ["present", "absent", "leave"];

function pctColor(pct) {
  return pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
}
function pctTextCls(pct) {
  return pct >= 75
    ? "text-emerald-600 dark:text-emerald-400"
    : pct >= 50
    ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";
}

// ─────────────────────────────────────────────────── small atoms ─────────────

function Avatar({ name = "?", status = "absent" }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.absent;
  return (
    <div className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-full",
      "text-xs font-semibold uppercase select-none",
      cfg.avCls,
    )}>
      {(name[0] ?? "?").toUpperCase()}
    </div>
  );
}

function PctBar({ pct = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", pctColor(pct))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium w-9 text-right tabular-nums", pctTextCls(pct))}>
        {pct}%
      </span>
    </div>
  );
}

function StatTriple({ present = 0, absent = 0, leave = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Present", val: present, cls: "text-emerald-600 dark:text-emerald-400" },
        { label: "Absent",  val: absent,  cls: "text-rose-600 dark:text-rose-400"       },
        { label: "Leave",   val: leave,   cls: "text-amber-600 dark:text-amber-400"     },
      ].map(({ label, val, cls }) => (
        <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
          <div className={cn("text-xl font-semibold tabular-nums", cls)}>{val}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function BigPct({ pct = 0, sub = "" }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5 text-center mb-3">
      <div className={cn("text-4xl font-bold tabular-nums", pctTextCls(pct))}>{pct}%</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", pctColor(pct))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────── Drawer ─────────

function Drawer({ open, onClose, title, icon: Icon = User, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
          "w-full max-w-[440px] bg-background border-l border-border shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2.5 font-semibold text-foreground text-sm">
            {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
            <span className="truncate">{title}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center size-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>
      </aside>
    </>,
    document.body,
  );
}

// ────────────────────────────────────────────── Calendar Heatmap ─────────────

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function CalendarMonth({ year, month, data = {} }) {
  const days  = daysInMonth(year, month);
  const start = firstDOW(year, month);
  const cells = [
    ...Array.from({ length: start }, (_, i) => ({ day: null, key: `blank-${i}` })),
    ...Array.from({ length: days },  (_, i) => ({ day: i + 1, key: `day-${i + 1}` })),
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground mb-3">
        {new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ day, key }) => {
          if (!day) return <div key={key} />;
          const iso     = `${year}-${p2(month)}-${p2(day)}`;
          const st      = data[iso];
          const isToday = iso === todayISO();
          return (
            <div
              key={key}
              title={`${iso}: ${st ?? "no data"}`}
              className={cn(
                "aspect-square flex items-center justify-center text-[10px] font-medium rounded",
                st === "present" && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                st === "absent"  && "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                st === "leave"   && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                !st              && "bg-muted/50 text-muted-foreground",
                isToday          && "ring-2 ring-blue-500 ring-offset-1",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentCalendar({ calData = {}, filter = "month", month = currentMonthISO() }) {
  const months = useMemo(() => {
    const now = new Date();
    if (filter === "month") {
      const [y, m] = month.split("-").map(Number);
      return [{ y, m }];
    }
    const count = filter === "3m" ? 3 : 12;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  }, [filter, month]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { cls: "bg-emerald-500/60", label: "Present" },
          { cls: "bg-rose-500/60",    label: "Absent"  },
          { cls: "bg-amber-500/60",   label: "Leave"   },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-2.5 rounded-sm inline-block", cls)} />
            {label}
          </span>
        ))}
      </div>
      {months.map(({ y, m }) => (
        <CalendarMonth key={`${y}-${m}`} year={y} month={m} data={calData} />
      ))}
    </div>
  );
}

// ──────────────────────────────────────── Student Drawer Content ─────────────

function StudentDrawerContent({
  sid, studentName, courseName, summary, calData: initialCalData, currentMonth, fetchCalData,
}) {
  const [filter,     setFilter]     = useState("month");
  const [calData,    setCalData]    = useState(initialCalData ?? {});
  const [calLoading, setCalLoading] = useState(false);

  const pct = summary ? Math.round(summary.percentage ?? 0) : 0;

  useEffect(() => {
    setFilter("month");
  }, [sid]);

  useEffect(() => {
    setCalData(initialCalData ?? {});
  }, [sid, initialCalData]);

  const handleFilter = useCallback(async (f) => {
    setFilter(f);
    if (!fetchCalData) return;
    const now         = new Date();
    const currentYear = now.getFullYear();
    const prevYear    = currentYear - 1;

    let years = [currentYear];
    if (f === "3m") {
      const monthIndex = now.getMonth();
      if (monthIndex < 3) years = [prevYear, currentYear];
    }
    if (f === "year") {
      years = [currentYear];
    }

    setCalLoading(true);
    const merged = await fetchCalData(sid, years);
    setCalData(merged);
    setCalLoading(false);
  }, [sid, fetchCalData]);

  return (
    <>
      {/* Info card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <SectionLabel icon={User}>Student info</SectionLabel>
        {[["Course", courseName], ["Status", "Active"]].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
            <span className="text-muted-foreground">{l}</span>
            <span className={cn("font-medium", l === "Status" && "text-emerald-600 dark:text-emerald-400")}>{v}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[["month", "This month"], ["3m", "3 months"], ["year", "This year"]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => handleFilter(k)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              filter === k
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bug 7 fix: label "Overall attendance" — filter tabs calendar ko
          control karte hain, summary stats overall lifetime hain.
          Misleading "This month / 3 months / This year" sub-label hata diya. */}
      {summary
        ? <BigPct pct={pct} sub="Overall attendance" />
        : <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
      }

      {summary
        ? <StatTriple present={summary.present} absent={summary.absent} leave={summary.leave} />
        : <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
      }

      {/* Calendar heatmap */}
      <div>
        <SectionLabel icon={CalendarCheck}>Attendance calendar</SectionLabel>
        {calLoading
          ? <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />
          : <StudentCalendar calData={calData} filter={filter} month={currentMonth} />
        }
      </div>
    </>
  );
}

// ──────────────────────────────────────────── Day Drawer Content ─────────────

function DayDrawerContent({ day, dayRecords, dayLoading }) {
  // Bug 2 fix: ab real API data use hota hai — fake math hata diya.
  // dayRecords = [{ student_id, student_name, course_name, status }, ...]
  // dayLoading = boolean

  if (!day) return null;

  const total = (day.present ?? 0) + (day.absent ?? 0) + (day.leave ?? 0);
  const pct   = total > 0 ? Math.round((day.present / total) * 100) : 0;

  return (
    <>
      <BigPct pct={pct} sub={isoToDisplay(day.date)} />
      <StatTriple present={day.present} absent={day.absent} leave={day.leave} />

      <div className="rounded-xl border border-border bg-card p-4">
        <SectionLabel icon={Users}>Students — {shortDate(day.date)}</SectionLabel>

        {dayLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Loading students…</p>
          </div>
        )}

        {!dayLoading && dayRecords.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No attendance data for this day
          </p>
        )}

        {!dayLoading && dayRecords.length > 0 && (
          <div className="space-y-1.5">
            {dayRecords.map((s) => {
              const st  = s.status ?? "absent";
              const cfg = STATUS_CFG[st] ?? STATUS_CFG.absent;
              const { Icon } = cfg;
              return (
                <div key={s.student_id ?? s.student} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
                  <Avatar name={s.student_name ?? s.name ?? "?"} status={st} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.student_name ?? s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.course_name ?? "—"}</p>
                  </div>
                  <span className={cn("text-xs font-medium flex items-center gap-1 shrink-0", cfg.textCls)}>
                    <Icon className="size-3" />{cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────── Course Drawer Content ───────────────

function CourseDrawerContent({ course, students, onStudentClick }) {
  if (!course) return null;
  const pct    = Math.round(course.percentage ?? 0);
  const sorted = [...students].sort((a, b) => b.percentage - a.percentage);

  return (
    <>
      <BigPct pct={pct} sub={course.course_name} />
      <StatTriple
        present={course.present ?? 0}
        absent={course.absent   ?? 0}
        leave={course.leave     ?? 0}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <SectionLabel icon={Users}>{students.length} students enrolled</SectionLabel>
        <div className="space-y-1.5">
          {sorted.map(s => {
            const sp = Math.round(s.percentage);
            return (
              <button
                key={s.student_id}
                onClick={() => onStudentClick(s.student_id, s)}
                className="w-full flex items-center gap-2.5 rounded-lg bg-muted/40 hover:bg-muted px-3 py-2 transition-colors text-left"
              >
                <Avatar name={s.student_name} status={sp >= 75 ? "present" : "absent"} />
                <span className="flex-1 text-sm font-medium truncate">{s.student_name}</span>
                <div className="w-28 shrink-0">
                  <PctBar pct={sp} />
                </div>
              </button>
            );
          })}
          {sorted.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No students found</p>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════ MARK ATTENDANCE TAB ════════════════════

function StatusButton({ status, isActive, onClick }) {
  const cfg  = STATUS_CFG[status];
  const Icon = cfg.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
        isActive
          ? cfg.activeCls
          : "border-border text-muted-foreground hover:bg-muted bg-background",
      )}
    >
      <Icon className="size-3" />
      {cfg.label}
    </button>
  );
}

function MarkAttendance({ onStudentClick }) {
  const { toast }               = useToast();
  const [date, setDate]         = useState(todayISO);
  const [students, setStudents] = useState([]);
  const [records,  setRecords]  = useState({});
  const [savedSet, setSavedSet] = useState(() => new Set());
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const fetchData = useCallback(async (d) => {
    setLoading(true);
    setError("");
    try {
      const [sR, aR] = await Promise.all([
        api.get("/api/students/", { params: { status: "active" } }),
        api.get("/api/attendance/", { params: { date: d } }),
      ]);
      const sList = Array.isArray(sR.data) ? sR.data : (sR.data.results ?? []);
      const aList = Array.isArray(aR.data) ? aR.data : (aR.data.results ?? []);

      setStudents(sList);
      if (aList.length > 0) setSavedSet(prev => new Set([...prev, d]));

      const map = {};
      sList.forEach(s => {
        // Bug 4 fix: a.student ko integer cast karke compare karo.
        // AttendanceSerializer mein student PrimaryKeyRelatedField hai (integer),
        // lekin JSON parse ke baad kabhi kabhi comparison type mismatch ho sakti thi.
        const f = aList.find(a => Number(a.student) === Number(s.id));
        map[s.id] = { status: f?.status ?? "absent", note: f?.note ?? "" };
      });
      setRecords(map);
    } catch (e) {
      setError(e.response?.data?.detail ?? "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const toggle = useCallback((sid, status) =>
    setRecords(prev => ({ ...prev, [sid]: { ...prev[sid], status } })), []);

  const bulkSet = useCallback((status) =>
    setRecords(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], status }; });
      return next;
    }), []);

  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      present : vals.filter(r => r.status === "present").length,
      absent  : vals.filter(r => r.status === "absent").length,
      leave   : vals.filter(r => r.status === "leave").length,
      total   : vals.length,
    };
  }, [records]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/api/attendance/mark/", {
        date,
        records: students.map(s => ({
          student : s.id,
          status  : records[s.id]?.status ?? "absent",
          note    : records[s.id]?.note   ?? "",
        })),
      });
      setSavedSet(prev => new Set([...prev, date]));
      toast({
        type: "success",
        title: "Attendance saved!",
        description: `${data.created ?? 0} created · ${data.updated ?? 0} updated`,
        duration: 4000,
      });
    } catch {
      toast({ type: "error", title: "Failed to save", duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayISO();
  const isSaved = savedSet.has(date);

  // Bug 8 fix: future date navigate nahi hona chahiye.
  // Pehle sirf isToday check tha — agar user past date pe tha
  // toh wo today se aage ja sakta tha.
  const isFutureOrToday = date >= todayISO();

  return (
    <div className="flex flex-col gap-5">

      {/* ── Date navigation ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{isoToDisplay(date)}</p>
          <div className="flex items-center gap-2 mt-1">
            {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
            {isSaved && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 dark:text-blue-400">Previously saved</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setDate(d => shiftDay(d, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="relative">
            <CalendarCheck className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => {
                // Bug 8 fix: input se bhi future date block karo
                if (e.target.value <= todayISO()) setDate(e.target.value);
              }}
              className="pl-9 w-44"
            />
          </div>
          {/* Bug 8 fix: isFutureOrToday use kiya — past date pe bhi future navigate nahi hoga */}
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setDate(d => shiftDay(d, 1))}
            disabled={isFutureOrToday}>
            <ChevronRight className="size-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDate(todayISO())}>
              Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchData(date)} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />Refresh
          </Button>
        </div>
      </div>

      {/* ── Pill stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {STATUSES.map(s => {
          const cfg   = STATUS_CFG[s];
          const count = counts[s];
          const pct   = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0;
          return (
            <div key={s} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <span className={cn("size-2.5 shrink-0 rounded-full", cfg.dotCls)} />
              <div>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className="text-lg font-bold leading-none">
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
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Student table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>
              <span className="font-medium text-foreground">{students.length}</span> students
            </span>
            <span className="hidden text-xs sm:inline">· click a row to view details</span>
          </div>
          <div className="flex gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => bulkSet(s)}
                className="border border-border rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                All {STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Loading attendance…</p>
          </div>
        )}

        {!loading && students.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <Users className="size-10 opacity-30" />
            <p className="text-sm">No active students found.</p>
          </div>
        )}

        {!loading && students.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, idx) => {
                const st  = records[s.id]?.status ?? "absent";
                const cfg = STATUS_CFG[st];
                return (
                  <TableRow
                    key={s.id}
                    className={cn("transition-colors cursor-pointer", cfg.rowCls)}
                    onClick={() => onStudentClick(s.id, s)}
                  >
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} status={st} />
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{s.course_name ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal">{s.course_name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map(x => (
                          <StatusButton key={x} status={x} isActive={st === x}
                            onClick={() => toggle(s.id, x)} />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{counts.present} present</span>
              {" · "}
              <span className="font-medium text-rose-600 dark:text-rose-400">{counts.absent} absent</span>
              {" · "}
              <span className="font-medium text-amber-600 dark:text-amber-400">{counts.leave} leave</span>
            </p>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════ ATTENDANCE REPORT TAB ══════════════════

function DailyTrendChart({ data, onBarClick }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return null;

  const maxVal = Math.max(...data.map(d => d.present + d.absent + d.leave), 1);

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] h-36 w-full">
        {data.map((d, i) => {
          const total = d.present + d.absent + d.leave;
          const pH    = total > 0 ? (d.present / maxVal) * 100 : 0;
          const aH    = total > 0 ? (d.absent  / maxVal) * 100 : 0;
          const lH    = total > 0 ? (d.leave   / maxVal) * 100 : 0;
          const isHov = hovered === i;

          return (
            <div
              key={i}
              className="relative flex flex-col-reverse flex-1 cursor-pointer group"
              style={{ height: "100%" }}
              onClick={() => onBarClick(d)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && (
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-2 text-[11px] shadow-lg">
                  <p className="font-medium text-foreground mb-1">{shortDate(d.date)}</p>
                  <p className="text-emerald-600">Present: {d.present}</p>
                  <p className="text-rose-600">Absent: {d.absent}</p>
                  <p className="text-amber-600">Leave: {d.leave}</p>
                </div>
              )}
              <div className="flex flex-col-reverse w-full rounded-sm overflow-hidden" style={{ height: "100%" }}>
                <div
                  className={cn("w-full transition-all duration-300", isHov ? "bg-emerald-500" : "bg-emerald-500/70")}
                  style={{ height: `${pH}%` }}
                />
                <div
                  className={cn("w-full transition-all duration-300", isHov ? "bg-rose-500" : "bg-rose-500/70")}
                  style={{ height: `${aH}%` }}
                />
                <div
                  className={cn("w-full transition-all duration-300", isHov ? "bg-amber-500" : "bg-amber-500/70")}
                  style={{ height: `${lH}%` }}
                />
              </div>
              <p className="absolute -bottom-5 left-0 right-0 text-center text-[8px] text-muted-foreground truncate">
                {shortDate(d.date).split(" ")[0]}
              </p>
            </div>
          );
        })}
      </div>
      <div className="h-5" />
    </div>
  );
}

function AttendanceReport({ onStudentClick, onCourseClick, onDayClick, onReportLoad }) {
  const [month,   setMonth]   = useState(currentMonthISO);
  const [report,  setReport]  = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sortBy,  setSortBy]  = useState("name");

  const fetchReport = useCallback(async (m) => {
    setLoading(true);
    setError("");
    try {
      const [rR, tR] = await Promise.all([
        api.get("/api/attendance/report/", { params: { month: m } }),
        api.get("/api/attendance/",         { params: { date: todayISO() } }),
      ]);
      const data = rR.data;
      setReport(data);
      onReportLoad?.(data);
      const tl = Array.isArray(tR.data) ? tR.data : (tR.data.results ?? []);
      setTodayList(tl);
    } catch (e) {
      setError(e.response?.data?.detail ?? "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [onReportLoad]);

  useEffect(() => { fetchReport(month); }, [month, fetchReport]);

  const sortedStudents = useMemo(() => {
    if (!report?.students) return [];
    const rows = [...report.students];
    if (sortBy === "pct") return rows.sort((a, b) => a.percentage - b.percentage);
    if (sortBy === "abs") return rows.sort((a, b) => b.absent - a.absent);
    return rows.sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [report, sortBy]);

  const lowStudents = useMemo(
    () => (report?.students ?? []).filter(s => s.percentage < 75 && s.total > 0),
    [report],
  );
  const streakStudents = useMemo(() =>
    [...(report?.students ?? [])]
      .filter(s => s.consecutive_absent >= 2)
      .sort((a, b) => b.consecutive_absent - a.consecutive_absent)
      .slice(0, 6),
    [report],
  );

  const todayPresent = todayList.filter(a => a.status === "present").length;
  const todayAbsent  = todayList.filter(a => a.status === "absent").length;
  const todayLeave   = todayList.filter(a => a.status === "leave").length;
  const todayMarked  = todayList.length > 0;

  // Bug 6 fix: future months navigate nahi hone chahiye.
  // Pehle sirf isCurrentMonth check tha — lekin agar user manually
  // past month pe chala gaya aur wapas aaya toh future mein ja sakta tha.
  const isCurrentMonth = month === currentMonthISO();
  const isFutureMonth  = month >= currentMonthISO();

  return (
    <div className="flex flex-col gap-5">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Today Present", val: todayMarked ? todayPresent : "—",
            sub: todayMarked ? `of ${todayList.length} marked` : "Not marked yet",
            Icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10",
          },
          {
            label: "Today Absent", val: todayMarked ? todayAbsent : "—",
            sub: todayMarked ? `+ ${todayLeave} on leave` : "Not marked yet",
            Icon: XCircle, color: "text-rose-500 bg-rose-500/10",
          },
          {
            label: "Monthly Avg", val: report ? `${Math.round(report.summary?.percentage ?? 0)}%` : "—",
            sub: report ? `${report.summary.students_marked}/${report.summary.active_students} marked` : monthDisplay(month),
            Icon: TrendingUp, color: "text-blue-500 bg-blue-500/10",
          },
          {
            label: "Below 75%", val: report ? lowStudents.length : "—",
            sub: "Students at risk",
            Icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10",
          },
        ].map(({ label, val, sub, Icon, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", color)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {loading
                ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-muted" />
                : <p className="text-xl font-bold">{val}</p>
              }
              {!loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setMonth(m => shiftMonth(m, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold min-w-36 text-center">{monthDisplay(month)}</span>
          {/* Bug 6 fix: isFutureMonth use kiya — current month pe bhi aur
              future months pe bhi next button disabled rahega */}
          <Button variant="outline" size="icon" className="size-8"
            onClick={() => setMonth(m => shiftMonth(m, 1))}
            disabled={isFutureMonth}>
            <ChevronRight className="size-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" className="text-xs"
              onClick={() => setMonth(currentMonthISO())}>
              This Month
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReport(month)} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Daily trend chart ── */}
      {(report?.daily_trend?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold">Daily Attendance Trend</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MousePointerClick className="size-3" />Click any bar to see that day's details
              </p>
            </div>
            <div className="flex items-center gap-3">
              {[["bg-emerald-500/70","Present"],["bg-rose-500/70","Absent"],["bg-amber-500/70","Leave"]].map(([cls, l]) => (
                <span key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2.5 rounded-sm inline-block", cls)} />{l}
                </span>
              ))}
            </div>
          </div>
          <DailyTrendChart data={report.daily_trend} onBarClick={onDayClick} />
        </div>
      )}

      {/* ── 3-column insight cards ── */}
      {!loading && report && (
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Course summary */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">Course Summary</p>
              <Badge variant="secondary" className="font-normal">{report.course_summary?.length ?? 0}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <MousePointerClick className="size-3" />Click to see students
            </p>
            <div className="space-y-1.5">
              {(report.course_summary ?? []).map(c => {
                const pct = Math.round(c.percentage);
                return (
                  <button
                    key={c.course_name}
                    onClick={() => onCourseClick(c.course_name)}
                    className="w-full rounded-lg p-2 hover:bg-muted/60 transition-colors text-left space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{c.course_name}</span>
                      <span className={cn("ml-2 shrink-0", pctTextCls(pct))}>{pct}%</span>
                    </div>
                    <PctBar pct={pct} />
                  </button>
                );
              })}
              {(report.course_summary ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No course data</p>
              )}
            </div>
          </div>

          {/* Needs attention */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Needs Attention</p>
              <Badge variant="secondary">{lowStudents.length} low</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <MousePointerClick className="size-3" />Click for student details
            </p>
            <div className="space-y-1.5">
              {lowStudents.slice(0, 6).map(s => (
                <button
                  key={s.student_id}
                  onClick={() => onStudentClick(s.student_id, s)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 px-3 py-2 transition-colors"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">{s.student_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.course_name}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {Math.round(s.percentage)}%
                  </span>
                </button>
              ))}
              {lowStudents.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No low attendance 🎉</p>
              )}
            </div>
          </div>

          {/* Follow up */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Follow Up</p>
              <Badge variant="secondary">{streakStudents.length} alerts</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <MousePointerClick className="size-3" />Click for student details
            </p>
            <div className="space-y-1.5">
              {streakStudents.map(s => (
                <button
                  key={s.student_id}
                  onClick={() => onStudentClick(s.student_id, s)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 px-3 py-2 transition-colors"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">{s.student_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.course_name}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {s.consecutive_absent} days
                  </span>
                </button>
              ))}
              {streakStudents.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No consecutive absences</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Student report table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-wrap gap-2">
          <p className="text-sm font-medium">
            Student Report
            {report?.students && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {report.students.length} students · click a row for details
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
            {[["name","Name"],["pct","% ↑"],["abs","Absent ↓"]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                  sortBy === k
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Loading report…</p>
          </div>
        )}
        {!loading && sortedStudents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <BarChart2 className="size-10 opacity-30" />
            <p className="text-sm">No attendance data for this month.</p>
          </div>
        )}
        {!loading && sortedStudents.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">A</TableHead>
                <TableHead className="text-center hidden md:table-cell">L</TableHead>
                <TableHead className="min-w-[130px]">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((s, idx) => {
                const pct = Math.round(s.percentage);
                const low = pct < 75 && s.total > 0;
                return (
                  <TableRow
                    key={s.student_id}
                    className={cn("cursor-pointer transition-colors", low && "bg-rose-500/[0.04]")}
                    onClick={() => onStudentClick(s.student_id, s)}
                  >
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.student_name} status={pct >= 75 ? "present" : "absent"} />
                        <div>
                          <p className="font-medium text-sm">{s.student_name}</p>
                          {low && (
                            <p className="text-xs text-rose-600 flex items-center gap-0.5 dark:text-rose-400">
                              <AlertTriangle className="size-3" />Low attendance
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
                    <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">{s.present}</TableCell>
                    <TableCell className={cn("text-center font-semibold", s.absent > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>{s.absent}</TableCell>
                    <TableCell className={cn("text-center font-semibold hidden md:table-cell", s.leave > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{s.leave}</TableCell>
                    <TableCell><PctBar pct={pct} /></TableCell>
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

// ═══════════════════════════════════════════════════ ROOT PAGE ════════════════

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("mark");

  const reportDataRef = useRef(null);

  // Drawer state
  const [drawer, setDrawer] = useState({ open: false, mode: null, data: null });

  // Bug 2 fix: day drawer ke liye real API data state
  const [dayRecords, setDayRecords]   = useState([]);
  const [dayLoading, setDayLoading]   = useState(false);

  const summaryCache = useRef({});
  const calCache     = useRef({});

  const closeDrawer = useCallback(() =>
    setDrawer(prev => ({ ...prev, open: false })), []);

  const fetchCalData = useCallback(async (sid, years = [new Date().getFullYear()]) => {
    if (!calCache.current[sid]) calCache.current[sid] = {};
    const missing = years.filter(y => !calCache.current[sid][y]);

    await Promise.all(missing.map(async (year) => {
      try {
        const { data } = await api.get("/api/attendance/calendar/", {
          params: { student: sid, year },
        });
        calCache.current[sid][year] = data.records ?? {};
      } catch {
        calCache.current[sid][year] = {};
      }
    }));

    return years.reduce((acc, y) => ({
      ...acc,
      ...(calCache.current[sid]?.[y] ?? {}),
    }), {});
  }, []);

  const openStudentDrawer = useCallback(async (sid, studentObj) => {
    const name   = studentObj?.name ?? studentObj?.student_name ?? "Student";
    const course = studentObj?.course_name ?? "—";

    setDrawer({ open: true, mode: "student", data: { sid, name, course, summary: null, calData: {} } });

    const currentYear = new Date().getFullYear();

    const [, calData] = await Promise.all([
      (async () => {
        if (!summaryCache.current[sid]) {
          try {
            const { data } = await api.get("/api/attendance/summary/", { params: { student: sid } });
            summaryCache.current[sid] = data;
          } catch {
            const known = reportDataRef.current?.students?.find(s => s.student_id === sid);
            summaryCache.current[sid] = known
              ? { total: known.total, present: known.present, absent: known.absent, leave: known.leave, percentage: known.percentage }
              : null;
          }
        }
      })(),
      fetchCalData(sid, [currentYear]),
    ]);

    // Bug 9 fix: duplicate `sid` key hata diya
    setDrawer({
      open: true,
      mode: "student",
      data: { sid, name, course, summary: summaryCache.current[sid], calData, fetchCalData },
    });
  }, [fetchCalData]);

  const openCourseDrawer = useCallback((courseName) => {
    const rd       = reportDataRef.current;
    const course   = rd?.course_summary?.find(c => c.course_name === courseName) ?? null;
    const students = (rd?.students ?? []).filter(s => s.course_name === courseName);
    setDrawer({ open: true, mode: "course", data: { course, students, courseName } });
  }, []);

  // Bug 2 fix: day drawer mein real API data fetch karo
  const openDayDrawer = useCallback(async (day) => {
    const rd = reportDataRef.current;
    setDrawer({ open: true, mode: "day", data: { day, allStudents: rd?.students ?? [] } });

    // Real attendance records us date ke liye fetch karo
    setDayRecords([]);
    setDayLoading(true);
    try {
      const { data } = await api.get("/api/attendance/", { params: { date: day.date } });
      const records  = Array.isArray(data) ? data : (data.results ?? []);

      // Attendance records mein student_name aur course_name
      // AttendanceSerializer se aate hain (student_name, course_name fields hain)
      setDayRecords(records);
    } catch {
      setDayRecords([]);
    } finally {
      setDayLoading(false);
    }
  }, []);

  const handleCourseStudentClick = useCallback((sid, studentObj) => {
    closeDrawer();
    setTimeout(() => openStudentDrawer(sid, studentObj), 280);
  }, [closeDrawer, openStudentDrawer]);

  const handleReportLoad = useCallback((data) => {
    reportDataRef.current = data;
  }, []);

  const drawerTitle = (() => {
    if (!drawer.data) return "Details";
    switch (drawer.mode) {
      case "student": return drawer.data.name;
      case "course":  return drawer.data.courseName;
      case "day":     return `${shortDate(drawer.data.day?.date ?? "")} — Daily Summary`;
      default:        return "Details";
    }
  })();

  const drawerIcon = drawer.mode === "course" ? BookOpen
    : drawer.mode === "day"     ? CalendarCheck
    : User;

  const TABS = [
    { key: "mark",   label: "Mark Attendance",  Icon: ClipboardList },
    { key: "report", label: "Attendance Report", Icon: BarChart2     },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mark daily attendance and view monthly reports
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "mark" ? (
        <MarkAttendance onStudentClick={openStudentDrawer} />
      ) : (
        <AttendanceReport
          onStudentClick={openStudentDrawer}
          onCourseClick={openCourseDrawer}
          onDayClick={openDayDrawer}
          onReportLoad={handleReportLoad}
        />
      )}

      {/* ── Slide-in Drawer ── */}
      <Drawer open={drawer.open} onClose={closeDrawer} title={drawerTitle} icon={drawerIcon}>

        {drawer.open && drawer.mode === "student" && drawer.data && (
          <StudentDrawerContent
            sid={drawer.data.sid}
            studentName={drawer.data.name}
            courseName={drawer.data.course}
            summary={drawer.data.summary}
            calData={drawer.data.calData}
            currentMonth={currentMonthISO()}
            fetchCalData={fetchCalData}
          />
        )}

        {drawer.open && drawer.mode === "course" && drawer.data && (
          <CourseDrawerContent
            course={drawer.data.course}
            students={drawer.data.students}
            onStudentClick={(sid) => {
              const s = drawer.data.students.find(x => x.student_id === sid);
              handleCourseStudentClick(sid, s);
            }}
          />
        )}

        {/* Bug 2 fix: real dayRecords aur dayLoading pass kiye */}
        {drawer.open && drawer.mode === "day" && drawer.data && (
          <DayDrawerContent
            day={drawer.data.day}
            dayRecords={dayRecords}
            dayLoading={dayLoading}
          />
        )}

      </Drawer>
    </div>
  );
}
