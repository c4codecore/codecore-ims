import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/api/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  CalendarCheck,
  Save,
  Loader2,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  // Returns local date as "YYYY-MM-DD" (avoids UTC-shift from new Date().toISOString())
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = ["present", "absent", "leave"];

const STATUS_CONFIG = {
  present: {
    label: "Present",
    icon: CheckCircle2,
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/25 dark:text-emerald-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    badge: "success",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    icon: XCircle,
    active: "bg-rose-500/15 text-rose-600 border-rose-500/40 hover:bg-rose-500/25 dark:text-rose-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    badge: "destructive",
    dot: "bg-rose-500",
  },
  leave: {
    label: "Leave",
    icon: Clock,
    active: "bg-amber-500/15 text-amber-600 border-amber-500/40 hover:bg-amber-500/25 dark:text-amber-400",
    inactive: "bg-background text-muted-foreground border-border hover:bg-muted",
    badge: "warning",
    dot: "bg-amber-500",
  },
};

// ── Status toggle button ──────────────────────────────────────────────────────
function StatusButton({ status, isActive, onClick }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
        isActive ? cfg.active : cfg.inactive
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {cfg.label}
    </button>
  );
}

// ── Summary pill ──────────────────────────────────────────────────────────────
function SummaryPill({ status, count, total }) {
  const cfg = STATUS_CONFIG[status];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
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
}

// ── Main Attendance Component ─────────────────────────────────────────────────
export default function Attendance() {
  const { toast } = useToast();

  const [date, setDate] = useState(todayISO());
  const [students, setStudents] = useState([]);   // all active students
  const [existing, setExisting] = useState([]);   // attendance records from API for this date
  const [records, setRecords] = useState({});   // { [studentId]: { status, note } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch students + existing attendance for the chosen date ────────────────
  const fetchData = useCallback(async (selectedDate) => {
    setLoading(true);
    setError("");
    try {
      const [studRes, attRes] = await Promise.all([
        api.get("/api/students/", { params: { status: "active" } }),
        api.get("/api/attendance/", { params: { date: selectedDate } }),
      ]);

      const studentList = Array.isArray(studRes.data)
        ? studRes.data
        : (studRes.data.results ?? []);

      const attList = Array.isArray(attRes.data)
        ? attRes.data
        : (attRes.data.results ?? []);

      setStudents(studentList);
      setExisting(attList);

      // Build initial records map — pre-fill from existing attendance, default "absent"
      const map = {};
      studentList.forEach((s) => {
        const found = attList.find((a) => a.student === s.id);
        map[s.id] = {
          status: found?.status ?? "absent",
          note: found?.note ?? "",
        };
      });
      setRecords(map);
    } catch (err) {
      console.error("[Attendance] fetch error:", err);
      setError(err.response?.data?.detail ?? "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(date);
  }, [date, fetchData]);

  // ── Toggle student status ────────────────────────────────────────────────────
  const toggleStatus = useCallback((studentId, status) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }, []);

  // ── Update note for a student ────────────────────────────────────────────────
  const updateNote = useCallback((studentId, note) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note },
    }));
  }, []);

  // ── Summary counts (derived from current records state) ──────────────────────
  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      present: vals.filter((r) => r.status === "present").length,
      absent: vals.filter((r) => r.status === "absent").length,
      leave: vals.filter((r) => r.status === "leave").length,
      total: vals.length,
    };
  }, [records]);

  // ── Save attendance ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        date,
        records: students.map((s) => ({
          student: s.id,
          status: records[s.id]?.status ?? "absent",
          note: records[s.id]?.note ?? "",
        })),
      };
      const { data } = await api.post("/api/attendance/mark/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        type: "success",
        title: "Attendance saved!",
        description: `${data.created ?? 0} created, ${data.updated ?? 0} updated for ${formatDisplayDate(date)}.`,
        duration: 5000,
      });
      // Re-fetch to sync with backend
      await fetchData(date);
    } catch (err) {
      console.error("[Attendance] save error:", err);
      console.error("[Attendance] response data:", err.response?.data);
      toast({
        type: "error",
        title: "Failed to save attendance",
        description: err.response?.data?.detail ?? "Please try again.",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark and manage daily student attendance
          </p>
        </div>

        {/* Date picker + refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <CalendarCheck className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="attendance-date-picker"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 w-44"
            />
          </div>
          <Button
            id="refresh-attendance-btn"
            variant="outline"
            size="sm"
            onClick={() => fetchData(date)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Selected date label ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 -mt-2">
        <CalendarCheck className="size-4 text-primary shrink-0" />
        <p className="text-sm font-medium text-foreground">{formatDisplayDate(date)}</p>
        {existing.length > 0 && (
          <Badge variant="info" className="ml-1">
            Previously saved
          </Badge>
        )}
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <SummaryPill key={s} status={s} count={counts[s]} total={counts.total} />
        ))}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Table toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" />
            <span>
              <span className="font-medium text-foreground">{students.length}</span> students
            </span>
          </div>
          <div className="flex gap-1.5">
            {/* Quick-mark all buttons */}
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setRecords((prev) => {
                      const updated = { ...prev };
                      students.forEach((st) => {
                        updated[st.id] = { ...updated[st.id], status: s };
                      });
                      return updated;
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    cfg.inactive
                  )}
                  title={`Mark all as ${cfg.label}`}
                >
                  All {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* States */}
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
                <TableHead className="hidden lg:table-cell min-w-[160px]">Note</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {students.map((student, idx) => {
                const rec = records[student.id] ?? { status: "absent", note: "" };
                const status = rec.status;

                return (
                  <TableRow
                    key={student.id}
                    className={cn(
                      "transition-colors",
                      status === "present" && "bg-emerald-500/5",
                      status === "absent" && "bg-rose-500/5",
                      status === "leave" && "bg-amber-500/5",
                    )}
                  >
                    {/* # */}
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>

                    {/* Student */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors",
                            status === "present" && "bg-emerald-500/15 text-emerald-600",
                            status === "absent" && "bg-rose-500/15 text-rose-600",
                            status === "leave" && "bg-amber-500/15 text-amber-600",
                          )}
                        >
                          {student.name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{student.name}</p>
                          {/* Course on mobile */}
                          <p className="truncate text-xs text-muted-foreground sm:hidden">
                            {student.course_name ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Course */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal">
                        {student.course_name ?? "—"}
                      </Badge>
                    </TableCell>

                    {/* Status toggle buttons */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map((s) => (
                          <StatusButton
                            key={s}
                            status={s}
                            isActive={status === s}
                            onClick={() => toggleStatus(student.id, s)}
                          />
                        ))}
                      </div>
                    </TableCell>

                    {/* Note */}
                    <TableCell className="hidden lg:table-cell">
                      <Input
                        id={`note-${student.id}`}
                        type="text"
                        placeholder="Optional note…"
                        value={rec.note}
                        onChange={(e) => updateNote(student.id, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* ── Save footer ──────────────────────────────────────────────── */}
        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{counts.present}</span> present ·{" "}
              <span className="font-medium text-foreground">{counts.absent}</span> absent ·{" "}
              <span className="font-medium text-foreground">{counts.leave}</span> on leave
            </p>
            <Button
              id="save-attendance-btn"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-1.5"
            >
              {saving
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Save className="size-3.5" />}
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
