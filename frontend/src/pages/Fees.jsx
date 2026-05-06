import { useState, useEffect, useMemo } from "react";
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
  Wallet,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Plus,
  RefreshCw,
  Loader2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(monthStr) {
  if (!monthStr) return "—";
  // monthStr could be "2025-03" or "2025-03-01"
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function FeeBadge({ status }) {
  const isPaid = status === "paid";
  return (
    <Badge variant={isPaid ? "success" : "destructive"}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {isPaid ? "Paid" : "Pending"}
    </Badge>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, colorClass, loading }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", colorClass)}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

// ── Add Fee Modal ─────────────────────────────────────────────────────────────
function AddFeeModal({ open, onClose, onSuccess }) {
  const { toast } = useToast();

  const [students,     setStudents]     = useState([]);
  const [loadStudents, setLoadStudents] = useState(false);

  const [form, setForm] = useState({
    student: "",
    amount:  "",
    month:   "",
    note:    "",
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [modalError,   setModalError]  = useState("");

  // Fetch students when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadStudents(true);
    api
      .get("/api/students/")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setStudents(list);
      })
      .catch(() =>
        toast({ type: "error", title: "Failed to load students", duration: 3000 })
      )
      .finally(() => setLoadStudents(false));
  }, [open]);

  // Auto-fill amount when student changes
  useEffect(() => {
    if (!form.student) return;
    const selected = students.find((s) => String(s.id) === String(form.student));
    if (selected?.course?.offer_fee != null) {
      setForm((prev) => ({ ...prev, amount: String(selected.course.offer_fee) }));
    } else if (selected?.course?.total_fee != null) {
      setForm((prev) => ({ ...prev, amount: String(selected.course.total_fee) }));
    }
  }, [form.student, students]);

  const handleClose = () => {
    setForm({ student: "", amount: "", month: "", note: "" });
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.student || !form.amount || !form.month) {
      setModalError("Please fill in all required fields.");
      return;
    }

    // Convert "YYYY-MM" → "YYYY-MM-01" as required by the API
    const monthForApi = form.month.length === 7 ? `${form.month}-01` : form.month;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        "/api/fees/create/",
        {
          student: Number(form.student),
          amount:  Number(form.amount),
          month:   monthForApi,
          note:    form.note,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({ type: "success", title: "Fee record added successfully!", duration: 4000 });
      handleClose();   // resets form + closes modal
      onSuccess();     // refreshes fee list & summary
    } catch (err) {
      // Log full error details for debugging
      console.error("[AddFee] submit error:", err);
      console.error("[AddFee] response data:", err.response?.data);
      console.error("[AddFee] status:", err.response?.status);

      const msg =
        err.response?.data?.detail ??
        Object.values(err.response?.data ?? {}).flat().join(" ") ??
        "Failed to add fee. Please try again.";
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
            <CircleDollarSign className="size-5 text-primary" />
            Add Fee Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {/* Student dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Student <span className="text-destructive">*</span>
            </label>
            {loadStudents ? (
              <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading students…
              </div>
            ) : (
              <Select
                value={form.student}
                onValueChange={(v) => setForm((p) => ({ ...p, student: v }))}
              >
                <SelectTrigger id="fee-student-select">
                  <SelectValue placeholder="Select a student…" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.course?.short_name ? ` — ${s.course.short_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fee-amount" className="text-sm font-medium text-foreground">
              Amount (₹) <span className="text-destructive">*</span>
            </label>
            <Input
              id="fee-amount"
              type="number"
              min="1"
              placeholder="e.g. 2500"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
            {form.student && (
              <p className="text-xs text-muted-foreground">
                Auto-filled from course fee. Adjust if needed.
              </p>
            )}
          </div>

          {/* Month picker */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fee-month" className="text-sm font-medium text-foreground">
              Month <span className="text-destructive">*</span>
            </label>
            <Input
              id="fee-month"
              type="month"
              value={form.month}
              onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fee-note" className="text-sm font-medium text-foreground">
              Note <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </label>
            <Input
              id="fee-note"
              type="text"
              placeholder="Any remarks…"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>

          {/* Inline error banner */}
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
              id="submit-fee-btn"
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {submitting ? "Saving…" : "Add Fee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Fees Page ────────────────────────────────────────────────────────────
const FILTER_OPTIONS = ["All", "Pending", "Paid"];

export default function Fees() {
  const { toast } = useToast();

  const [fees,        setFees]        = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [summLoading, setSummLoading] = useState(true);
  const [error,       setError]       = useState("");
  const [filter,      setFilter]      = useState("All");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [markingId,   setMarkingId]   = useState(null); // fee id being marked paid

  // ── Fetch all fees ──────────────────────────────────────────────────────────
  const fetchFees = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/fees/");
      setFees(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load fees. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch summary stats ─────────────────────────────────────────────────────
  const fetchSummary = async () => {
    setSummLoading(true);
    try {
      const { data } = await api.get("/api/fees/summary/");
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchSummary();
  }, []);

  // ── Mark as Paid ────────────────────────────────────────────────────────────
  const handleMarkPaid = async (fee) => {
    setMarkingId(fee.id);
    try {
      await api.patch(`/api/fees/${fee.id}/paid/`);
      toast({
        type:        "success",
        title:       "Fee marked as paid!",
        description: `${fee.student?.name ?? "Student"}'s fee for ${formatMonth(fee.month)} is now paid.`,
        duration:    4000,
      });
      // Refresh both list and summary
      await Promise.all([fetchFees(), fetchSummary()]);
    } catch (err) {
      toast({
        type:        "error",
        title:       "Failed to mark as paid",
        description: err.response?.data?.detail ?? "Please try again.",
        duration:    5000,
      });
    } finally {
      setMarkingId(null);
    }
  };

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === "All") return fees;
    return fees.filter((f) =>
      filter === "Paid" ? f.status === "paid" : f.status === "pending"
    );
  }, [fees, filter]);

  // ── Summary card values ─────────────────────────────────────────────────────
  const summaryCards = [
    {
      label:      "Total Pending",
      value:      summary?.total_pending ?? "—",
      icon:       Clock,
      colorClass: "text-amber-500 bg-amber-500/10",
    },
    {
      label:      "Pending Amount",
      value:      summary != null ? formatCurrency(summary.pending_amount) : "—",
      icon:       Wallet,
      colorClass: "text-rose-500 bg-rose-500/10",
    },
    {
      label:      "Total Paid",
      value:      summary?.total_paid ?? "—",
      icon:       CheckCircle2,
      colorClass: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label:      "Paid Amount",
      value:      summary != null ? formatCurrency(summary.paid_amount) : "—",
      icon:       CircleDollarSign,
      colorClass: "text-blue-500 bg-blue-500/10",
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page heading ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, manage and record all student fee payments
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            id="refresh-fees-btn"
            variant="outline"
            size="sm"
            onClick={() => { fetchFees(); fetchSummary(); }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            id="add-fee-btn"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Fee
          </Button>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} loading={summLoading} />
        ))}
      </div>

      {/* ── Table card ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Filter tabs + result count */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <div className="flex rounded-lg border border-border overflow-hidden">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  id={`filter-${opt.toLowerCase()}-btn`}
                  onClick={() => setFilter(opt)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    filter === opt
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {!loading && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span>{" "}
              record{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* States: loading / error / empty / table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading fees…</p>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-destructive">
            <AlertCircle className="size-8 opacity-70" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFees}>
              Try again
            </Button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <CircleDollarSign className="size-10 opacity-30" />
            <p className="text-sm font-medium">
              {filter === "All" ? "No fee records found." : `No ${filter.toLowerCase()} fees found.`}
            </p>
            {filter !== "All" && (
              <button
                onClick={() => setFilter("All")}
                className="text-xs text-primary hover:underline"
              >
                Show all fees
              </button>
            )}
          </div>

        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((fee, idx) => (
                <TableRow
                  key={fee.id}
                  className={cn(
                    "transition-colors",
                    fee.status === "paid" ? "opacity-75" : ""
                  )}
                >
                  {/* Row # */}
                  <TableCell className="w-10 text-center text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>

                  {/* Student */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                        {fee.student?.name?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {fee.student?.name ?? "—"}
                        </p>
                        {/* Show course on small screens inline */}
                        <p className="truncate text-xs text-muted-foreground sm:hidden">
                          {fee.student?.course?.short_name ?? fee.course?.short_name ?? "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Course */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="font-normal">
                      {fee.student?.course?.short_name ??
                       fee.student?.course?.name ??
                       fee.course?.short_name ??
                       fee.course?.name ??
                       "—"}
                    </Badge>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {formatCurrency(fee.amount)}
                  </TableCell>

                  {/* Month */}
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {formatMonth(fee.month)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <FeeBadge status={fee.status} />
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    {fee.status === "pending" ? (
                      <Button
                        id={`mark-paid-btn-${fee.id}`}
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700"
                        disabled={markingId === fee.id}
                        onClick={() => handleMarkPaid(fee)}
                      >
                        {markingId === fee.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        {markingId === fee.id ? "Saving…" : "Mark as Paid"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Add Fee Modal ──────────────────────────────────────────────── */}
      <AddFeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchFees();
          fetchSummary();
        }}
      />
    </div>
  );
}
