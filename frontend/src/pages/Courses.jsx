import { useState, useEffect, useCallback } from "react";
import api from "@/api/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  BookOpen,
  Pencil,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Token helper (tries multiple keys, logs which one is found) ───────────────
function getToken() {
  const key =
    localStorage.getItem("access_token") ? "access_token" :
    localStorage.getItem("access")        ? "access"       :
    localStorage.getItem("token")         ? "token"        : null;

  const token = key ? localStorage.getItem(key) : null;

  // Debug: log token presence and all localStorage keys
  console.log("[Courses] token key used:", key);
  console.log("[Courses] token value (first 20 chars):", token?.slice(0, 20) ?? "(null)");
  console.log("[Courses] all localStorage keys:", Object.keys(localStorage));

  return token;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null || amount === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Edit Course Modal ─────────────────────────────────────────────────────────
function EditCourseModal({ course, open, onClose, onSuccess }) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    total_fee:        "",
    offer_fee:        "",
    duration_months:  "",
    fee_type:         "monthly",
    is_active:        true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Populate form when course changes
  useEffect(() => {
    if (!course) return;
    setForm({
      total_fee:       course.total_fee       ?? "",
      offer_fee:       course.offer_fee       ?? "",
      duration_months: course.duration_months ?? "",
      fee_type:        course.fee_type        ?? "monthly",
      is_active:       course.is_active       ?? true,
    });
    setModalError("");
  }, [course]);

  const handleClose = () => {
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);
    try {
      const token = getToken();
      const payload = {
        total_fee:       Number(form.total_fee)       || 0,
        offer_fee:       form.offer_fee !== "" ? Number(form.offer_fee) : null,
        duration_months: Number(form.duration_months) || 1,
        fee_type:        form.fee_type,
        is_active:       form.is_active,
      };
      await api.patch(`/api/students/courses/${course.id}/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ type: "success", title: `"${course.name}" updated!`, duration: 4000 });
      handleClose();
      onSuccess();
    } catch (err) {
      console.error("[EditCourse] error:", err);
      console.error("[EditCourse] status:", err.response?.status);
      console.error("[EditCourse] response data:", err.response?.data);
      if (err.response?.status === 401) {
        console.error("[EditCourse] 401 — all localStorage keys:", Object.keys(localStorage));
      }
      const msg =
        err.response?.data?.detail ??
        Object.values(err.response?.data ?? {}).flat().join(" ") ??
        `Failed to update course. (HTTP ${err.response?.status ?? "network error"})`;
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" />
            Edit Course
          </DialogTitle>
          {course && (
            <p className="text-sm text-muted-foreground pt-0.5">
              {course.name}{" "}
              <span className="font-mono text-xs">({course.short_name})</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {/* Total Fee */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-total-fee" className="text-sm font-medium text-foreground">
              Total Fee (₹)
            </label>
            <Input
              id="edit-total-fee"
              type="number"
              min="0"
              value={form.total_fee}
              onChange={(e) => setForm((p) => ({ ...p, total_fee: e.target.value }))}
            />
          </div>

          {/* Offer Fee */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-offer-fee" className="text-sm font-medium text-foreground">
              Offer Fee (₹){" "}
              <span className="text-xs font-normal text-muted-foreground">(leave blank for none)</span>
            </label>
            <Input
              id="edit-offer-fee"
              type="number"
              min="0"
              placeholder="—"
              value={form.offer_fee}
              onChange={(e) => setForm((p) => ({ ...p, offer_fee: e.target.value }))}
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-duration" className="text-sm font-medium text-foreground">
              Duration (months)
            </label>
            <Input
              id="edit-duration"
              type="number"
              min="1"
              max="60"
              value={form.duration_months}
              onChange={(e) => setForm((p) => ({ ...p, duration_months: e.target.value }))}
            />
          </div>

          {/* Fee Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Fee Type</label>
            <Select
              value={form.fee_type}
              onValueChange={(v) => setForm((p) => ({ ...p, fee_type: v }))}
            >
              <SelectTrigger id="edit-fee-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="onetime">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="edit-is-active"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                form.is_active ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-4 rounded-full bg-white shadow ring-0 transition-transform",
                  form.is_active ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <label className="text-sm font-medium text-foreground cursor-pointer"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}>
              {form.is_active ? "Active" : "Inactive"}
            </label>
          </div>

          {/* Inline error */}
          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="save-course-btn"
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Courses Page ─────────────────────────────────────────────────────────
export default function Courses() {
  const { toast } = useToast();

  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editTarget, setEditTarget] = useState(null);   // course being edited
  const [modalOpen,  setModalOpen]  = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const { data } = await api.get("/api/students/courses/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      console.error("[Courses] fetch error:", err);
      console.error("[Courses] status:", err.response?.status);
      console.error("[Courses] response data:", err.response?.data);
      if (err.response?.status === 401) {
        console.error("[Courses] 401 — all localStorage keys:", Object.keys(localStorage));
      }
      const status = err.response?.status ? ` (HTTP ${err.response.status})` : "";
      setError((err.response?.data?.detail ?? "Failed to load courses.") + status);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const openEdit = (course) => {
    setEditTarget(course);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage course details, fees and availability
          </p>
        </div>
        <Button
          id="refresh-courses-btn"
          variant="outline"
          size="sm"
          onClick={fetchCourses}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
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

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">
          <BookOpen className="size-4 shrink-0" />
          <span>
            <span className="font-medium text-foreground">{courses.length}</span> courses
          </span>
        </div>

        {/* States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading courses…</p>
          </div>

        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <BookOpen className="size-10 opacity-30" />
            <p className="text-sm font-medium">No courses found. Run the seed command.</p>
          </div>

        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Short</TableHead>
                <TableHead className="hidden md:table-cell text-center">Duration</TableHead>
                <TableHead>Total Fee</TableHead>
                <TableHead className="hidden lg:table-cell">Offer Fee</TableHead>
                <TableHead className="hidden md:table-cell">Fee Type</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {courses.map((course, idx) => (
                <TableRow key={course.id} className="transition-colors">
                  {/* # */}
                  <TableCell className="w-8 text-center text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                        {course.short_name ?? "—"}
                      </div>
                      <p className="font-medium text-foreground">{course.name}</p>
                    </div>
                  </TableCell>

                  {/* Short name */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {course.short_name}
                    </Badge>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">
                    {course.duration_months}m
                  </TableCell>

                  {/* Total Fee */}
                  <TableCell className="tabular-nums font-medium text-foreground">
                    {formatCurrency(course.total_fee)}
                  </TableCell>

                  {/* Offer Fee */}
                  <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">
                    {course.offer_fee != null ? (
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(course.offer_fee)}
                      </span>
                    ) : (
                      <span className="text-xs italic">—</span>
                    )}
                  </TableCell>

                  {/* Fee Type */}
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="info" className="capitalize text-xs">
                      {course.fee_type}
                    </Badge>
                  </TableCell>

                  {/* Active */}
                  <TableCell className="text-center">
                    {course.is_active ? (
                      <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="mx-auto size-4 text-muted-foreground/50" />
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    <Button
                      id={`edit-course-btn-${course.id}`}
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openEdit(course)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      <EditCourseModal
        course={editTarget}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSuccess={fetchCourses}
      />
    </div>
  );
}
