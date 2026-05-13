import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/api/axios";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  Wallet, AlertCircle, CheckCircle2, CircleDollarSign,
  Plus, RefreshCw, Loader2, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateReceiptPDF, generateReceiptPDFBase64 } from '@/lib/generateReceipt';
import { Download, Mail, MessageCircle } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Fees.jsx ke top mein — logo + stamp dono load karo
function useAssetBase64(src) {
  const [b64, setB64] = useState(null);
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      setB64(canvas.toDataURL('image/png'));
    };
  }, [src]);
  return b64;
}

// Google Drive URL se base64 photo
async function getPhotoBase64(photoUrl) {
  if (!photoUrl) return null;
  try {
    const fileId = photoUrl.match(/[-\w]{25,}/)?.[0];
    if (!fileId) return null;
    const directUrl = `http://localhost:8000/api/students/proxy-image/?id=${fileId}`;
    const res = await fetch(directUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Photo load failed, placeholder use hoga:', e);
    return null;
  }
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, colorClass, loading }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", colorClass)}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading
          ? <div className="mt-1 h-7 w-24 animate-pulse rounded-md bg-muted" />
          : <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>}
      </div>
    </div>
  );
}

// ── Add Fee Structure Modal ───────────────────────────────────────────────────
function AddFeeModal({ open, onClose, onSuccess }) {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loadStudents, setLoadStudents] = useState(false);
  const [loadEnroll, setLoadEnroll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState({
    student: "", enrollment: "", total_fee: "", discount: "0", note: "",
  });

  const finalFee = useMemo(() => {
    const t = parseFloat(form.total_fee) || 0;
    const d = parseFloat(form.discount) || 0;
    return Math.max(0, t - d);
  }, [form.total_fee, form.discount]);

  // Fetch students on open
  useEffect(() => {
    if (!open) return;
    setLoadStudents(true);
    api.get("/api/students/?status=active")
      .then(({ data }) => setStudents(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => toast({ type: "error", title: "Failed to load students", duration: 3000 }))
      .finally(() => setLoadStudents(false));
  }, [open]);

  // Fetch enrollments when student selected
  useEffect(() => {
    if (!form.student) { setEnrollments([]); return; }
    setLoadEnroll(true);
    api.get(`/api/students/${form.student}/enrollments/`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setEnrollments(list);
        // Auto-select if only one enrollment
        if (list.length === 1) {
          setForm(p => ({
            ...p,
            enrollment: String(list[0].id),
            total_fee: list[0].fee_amount ? String(list[0].fee_amount) : p.total_fee,
          }));
        }
      })
      .catch(() => toast({ type: "error", title: "Failed to load enrollments", duration: 3000 }))
      .finally(() => setLoadEnroll(false));
  }, [form.student]);

  // Auto-fill fee when enrollment selected
  const handleEnrollmentChange = (v) => {
    const enroll = enrollments.find(e => String(e.id) === v);
    setForm(p => ({
      ...p,
      enrollment: v,
      total_fee: enroll?.fee_amount ? String(enroll.fee_amount) : p.total_fee,
    }));
  };

  const handleClose = () => {
    setForm({ student: "", enrollment: "", total_fee: "", discount: "0", note: "" });
    setEnrollments([]);
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!form.enrollment || !form.total_fee) {
      setModalError("Please select enrollment and enter total fee.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/fees/create/", {
        enrollment: Number(form.enrollment),
        total_fee: parseFloat(form.total_fee),
        discount: parseFloat(form.discount) || 0,
        note: form.note,
      });
      toast({ type: "success", title: "Fee structure created!", duration: 4000 });
      handleClose();
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.detail ??
        Object.values(err.response?.data ?? {}).flat().join(" ") ??
        "Failed to create fee structure.";
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
            Add Fee Structure
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {/* Student */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Student <span className="text-destructive">*</span></label>
            {loadStudents
              ? <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
              : <Select value={form.student} onValueChange={(v) => setForm(p => ({ ...p, student: v, enrollment: "", total_fee: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select student…" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          </div>

          {/* Enrollment */}
          {form.student && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Enrollment <span className="text-destructive">*</span></label>
              {loadEnroll
                ? <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
                : enrollments.length === 0
                  ? <p className="text-sm text-muted-foreground">No enrollments found. Add enrollment first.</p>
                  : <Select value={form.enrollment} onValueChange={handleEnrollmentChange}>
                    <SelectTrigger><SelectValue placeholder="Select enrollment…" /></SelectTrigger>
                    <SelectContent>
                      {enrollments.map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.course_name} {e.roll_no ? `(${e.roll_no})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              }
            </div>
          )}

          {/* Total Fee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Total Fee (₹) <span className="text-destructive">*</span></label>
            <Input type="number" min="0" placeholder="e.g. 7500"
              value={form.total_fee}
              onChange={e => setForm(p => ({ ...p, total_fee: e.target.value }))} />
          </div>

          {/* Discount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Discount (₹)</label>
            <Input type="number" min="0" placeholder="0"
              value={form.discount}
              onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
          </div>

          {/* Final Fee (auto-calculated) */}
          {form.total_fee && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Final Fee</span>
              <span className="text-lg font-bold text-foreground">{fmt(finalFee)}</span>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Note <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
            <Input placeholder="Any remarks…"
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>

          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {submitting ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Payment Modal ─────────────────────────────────────────────────────────
function AddPaymentModal({ open, feeStructureId, onClose, onSuccess }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState({
    amount: "", payment_date: todayISO(), payment_mode: "cash", note: "",
  });

  useEffect(() => {
    if (open) {
      // Auto-fill month as current month
      const now = new Date();
      const monthStr = now.toLocaleString("en-IN", { month: "long" }) + "-" + now.getFullYear();
      setForm(p => ({ ...p, month: monthStr, payment_date: todayISO() }));
      setModalError("");
    }
  }, [open]);

  const handleClose = () => {
    setForm({ amount: "", payment_date: todayISO(), payment_mode: "cash", month: "", note: "" });
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.payment_date) {
      setModalError("Amount and date are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/fees/payments/create/", {
        fee_structure: feeStructureId,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        month: form.month,
        note: form.note,
      });
      toast({ type: "success", title: "Payment added!", duration: 3000 });
      handleClose();
      onSuccess();
    } catch (err) {
      setModalError(err.response?.data?.detail ?? "Failed to add payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Amount (₹) <span className="text-destructive">*</span></label>
            <Input type="number" min="1" placeholder="e.g. 1500"
              value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Payment Date <span className="text-destructive">*</span></label>
            <Input type="date" value={form.payment_date}
              onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Payment Mode</label>
            <Select value={form.payment_mode} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Note <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
            <Input placeholder="Any remarks…" value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>

          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {submitting ? "Saving…" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment History Row ───────────────────────────────────────────────────────
function PaymentHistory({ fee, onPaymentAdded }) {
  const { toast } = useToast();
  const [paymentModal, setPaymentModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const logoBase64 = useAssetBase64('/logo.png');
  const stampBase64 = useAssetBase64('/stamp.png');
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null); // payment id being emailed

  const handleDelete = async (paymentId) => {
    if (!confirm("Delete this payment?")) return;
    setDeletingId(paymentId);
    try {
      await api.delete(`/api/fees/payments/${paymentId}/delete/`);
      toast({ type: "success", title: "Payment deleted", duration: 3000 });
      onPaymentAdded();
    } catch {
      toast({ type: "error", title: "Failed to delete payment", duration: 3000 });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-4">
      {/* Fee Summary */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total Fee: </span>
          <span className="font-semibold">{fmt(fee.total_fee)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Discount: </span>
          <span className="font-semibold text-amber-600">-{fmt(fee.discount)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Final Fee: </span>
          <span className="font-semibold">{fmt(fee.final_fee)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Paid: </span>
          <span className="font-semibold text-emerald-600">{fmt(fee.total_paid)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Balance: </span>
          <span className={cn("font-semibold", fee.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
            {fmt(fee.balance)}
          </span>
        </div>
      </div>

      {/* Payments Table */}
      {fee.payments?.length > 0 ? (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="pb-2 text-left font-medium">#</th>
              <th className="pb-2 text-left font-medium">Date</th>
              <th className="pb-2 text-left font-medium">Amount</th>
              <th className="pb-2 text-left font-medium">Mode</th>
              <th className="pb-2 text-left font-medium">Month</th>
              <th className="pb-2 text-left font-medium">Receipt</th>
              <th className="pb-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {fee.payments.map((p, idx) => (
              <tr key={p.id || p.receipt_no || idx}
                className="border-b border-border/50 last:border-0">
                <td className="py-1.5 text-muted-foreground">{idx + 1}</td>
                <td className="py-1.5">{p.payment_date}</td>
                <td className="py-1.5 font-medium">{fmt(p.amount)}</td>
                <td className="py-1.5">
                  <Badge variant={p.payment_mode === "cash" ? "secondary" : "info"} className="text-xs">
                    {p.payment_mode === "cash" ? "Cash" : "Online"}
                  </Badge>
                </td>
                <td className="py-1.5 text-muted-foreground">{p.month || "—"}</td>
                <td className="py-1.5 font-mono text-xs text-muted-foreground">{p.receipt_no}</td>

                {/* --- Updated Action Cell --- */}
                <td className="py-1.5 text-right">
                  <div className="flex items-center justify-end gap-2.5">

                    {/* 1. Download PDF */}
                    <button
                      onClick={async () => {
                        setLoadingReceipt(true);
                        try {
                          const photoBase64 = await getPhotoBase64(fee.student_photo_url);
                          generateReceiptPDF(fee.payments, fee, {
                            logoBase64,
                            stampBase64,
                            photoBase64,
                          });
                        } catch (err) {
                          console.error('Receipt error:', err);
                          alert('Receipt generate nahi hui, dobara try karo.');
                        } finally {
                          setLoadingReceipt(false);
                        }
                      }}
                      disabled={loadingReceipt}
                      className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                      title="Download Receipt"
                    >
                      {loadingReceipt
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Download className="size-3.5" />
                      }
                    </button>

                    {/* 2. Send Gmail */}
                    <button
                      disabled={sendingEmail === p.id}
                      onClick={async () => {
                        // Check student email
                        if (!fee.student_email) {
                          toast({ type: 'error', title: 'Student ka email nahi hai', duration: 3000 });
                          return;
                        }
                        setSendingEmail(p.id);
                        try {
                          const photoBase64 = await getPhotoBase64(fee.student_photo_url);
                          const pdf_base64 = generateReceiptPDFBase64(fee.payments, fee, {
                            logoBase64,
                            stampBase64,
                            photoBase64,
                          });
                          await api.post('/api/fees/payments/send-receipt/', {
                            email: fee.student_email,
                            student_name: fee.student_name,
                            receipt_no: p.receipt_no,
                            amount: p.amount,
                            course_name: fee.course_name,
                            pdf_base64,
                          });
                          toast({ type: 'success', title: 'Email bhej diya gaya! ✅', duration: 4000 });
                        } catch (err) {
                          console.error('Email send error:', err);
                          toast({ type: 'error', title: 'Email nahi gayi, dobara try karo', duration: 4000 });
                        } finally {
                          setSendingEmail(null);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      title="Send Email"
                    >
                      {sendingEmail === p.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Mail className="size-3.5" />}
                    </button>

                    {/* 3. WhatsApp Message */}
                    <button
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `*CODE CORE COMPUTER CENTER* 🎓
_Empowering Futures Through Technology_

Dear *${fee.student_name}*,

✅ Your fee payment has been successfully received.

*RECEIPT DETAILS*
━━━━━━━━━━━━━━━━━━━
🧾 Receipt No.  : *${p.receipt_no}*
💰 Amount Paid  : *Rs. ${Number(p.amount).toLocaleString('en-IN')}*
📚 Course       : *${fee.course_name}*
📅 Date         : *${new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}*
━━━━━━━━━━━━━━━━━━━

Please keep this message for your records.

If you have any questions, feel free to contact us.

📞 +91-9013010909
🌐 www.codecore.in

_Thank you for choosing Code Core Computer Center!_ 🙏`
                        );
                        window.open(`https://wa.me/91${fee.student_phone?.replace(/\D/g, '').slice(-10)}?text=${msg}`, '_blank');
                      }}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="WhatsApp Message"
                    >
                      <MessageCircle className="size-3.5" />
                    </button>

                    {/* 4. Delete (Existing) */}
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      {deletingId === p.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No payments yet.</p>
      )}

      <Button size="sm" variant="outline" className="gap-1.5"
        onClick={() => setPaymentModal(true)}>
        <Plus className="size-3.5" /> Add Payment
      </Button>

      <AddPaymentModal
        open={paymentModal}
        feeStructureId={fee.id}
        onClose={() => setPaymentModal(false)}
        onSuccess={onPaymentAdded}
      />
    </div>
  );
}

// ── Main Fees Page ────────────────────────────────────────────────────────────
export default function Fees() {
  const { toast } = useToast();

  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summLoading, setSummLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/fees/");
      setFees(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load fees.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummLoading(true);
    try {
      const { data } = await api.get("/api/fees/summary/");
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
    fetchSummary();
  }, []);

  const handleRefresh = () => { fetchFees(); fetchSummary(); };

  const summaryCards = [
    { label: "Total Final Fee", value: summary ? fmt(summary.total_final_fee) : "—", icon: CircleDollarSign, colorClass: "text-blue-500 bg-blue-500/10" },
    { label: "Total Collected", value: summary ? fmt(summary.total_paid) : "—", icon: CheckCircle2, colorClass: "text-emerald-500 bg-emerald-500/10" },
    { label: "Total Balance", value: summary ? fmt(summary.total_balance) : "—", icon: Wallet, colorClass: "text-rose-500 bg-rose-500/10" },
    { label: "Total Students", value: summary?.total_students ?? "—", icon: CircleDollarSign, colorClass: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Heading ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage student fee structures and payments</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" /> Add Fee Structure
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => (
          <SummaryCard key={card.label} {...card} loading={summLoading} />
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Fee Structures</p>
          {!loading && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{fees.length}</span> records
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading fees…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-destructive">
            <AlertCircle className="size-8 opacity-70" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFees}>Try again</Button>
          </div>
        ) : fees.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <CircleDollarSign className="size-10 opacity-30" />
            <p className="text-sm font-medium">No fee structures found.</p>
            <button onClick={() => setModalOpen(true)} className="text-xs text-primary hover:underline">
              Add first fee structure
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead className="hidden md:table-cell">Roll No</TableHead>
                <TableHead>Final Fee</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee, idx) => (
                <>
                  <TableRow
                    key={fee.id}
                    className={cn("transition-colors cursor-pointer hover:bg-muted/60",
                      expandedId === fee.id && "bg-muted/40")}
                    onClick={() => setExpandedId(expandedId === fee.id ? null : fee.id)}
                  >
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>

                    {/* Student */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                          {fee.student_name?.[0] ?? "?"}
                        </div>
                        <p className="truncate font-medium text-foreground">{fee.student_name ?? "—"}</p>
                      </div>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal">{fee.course_name ?? "—"}</Badge>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                      {fee.roll_no ?? "—"}
                    </TableCell>

                    <TableCell className="font-medium">{fmt(fee.final_fee)}</TableCell>

                    <TableCell className="text-emerald-600 font-medium">{fmt(fee.total_paid)}</TableCell>

                    <TableCell>
                      <Badge variant={fee.balance > 0 ? "destructive" : "success"}>
                        {fee.balance > 0 ? fmt(fee.balance) : "Cleared ✓"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {expandedId === fee.id
                          ? <><ChevronUp className="size-3.5" /> Hide</>
                          : <><ChevronDown className="size-3.5" /> Payments</>}
                      </button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Payment History */}
                  {expandedId === fee.id && (
                    <TableRow key={`${fee.id}-expand`} className="hover:bg-transparent">
                      <TableCell colSpan={8} className="p-0">
                        <PaymentHistory
                          fee={fee}
                          onPaymentAdded={handleRefresh}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AddFeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
