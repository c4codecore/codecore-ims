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
  Bell, BellDot, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateReceiptPDF, generateReceiptPDFBase64 } from '@/lib/generateReceipt';
import { Download, Mail, MessageCircle } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from "react";

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

  useEffect(() => {
    if (!open) return;
    setLoadStudents(true);
    api.get("/api/students/?status=active")
      .then(({ data }) => setStudents(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => toast({ type: "error", title: "Failed to load students", duration: 3000 }))
      .finally(() => setLoadStudents(false));
  }, [open]);

  useEffect(() => {
    if (!form.student) { setEnrollments([]); return; }
    setLoadEnroll(true);
    api.get(`/api/students/${form.student}/enrollments/`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setEnrollments(list);
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Total Fee (₹) <span className="text-destructive">*</span></label>
            <Input type="number" min="0" placeholder="e.g. 7500"
              value={form.total_fee}
              onChange={e => setForm(p => ({ ...p, total_fee: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Discount (₹)</label>
            <Input type="number" min="0" placeholder="0"
              value={form.discount}
              onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
          </div>

          {form.total_fee && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Final Fee</span>
              <span className="text-lg font-bold text-foreground">{fmt(finalFee)}</span>
            </div>
          )}

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

// ── Edit Fee Structure Modal ──────────────────────────────────────────────────
function EditFeeModal({ open, fee, onClose, onSuccess }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState({ total_fee: "", discount: "0", note: "" });

  // Pre-fill form when fee changes
  useEffect(() => {
    if (fee) {
      setForm({
        total_fee: fee.total_fee != null ? String(fee.total_fee) : "",
        discount:  fee.discount  != null ? String(fee.discount)  : "0",
        note:      fee.note ?? "",
      });
      setModalError("");
    }
  }, [fee]);

  const finalFee = useMemo(() => {
    const t = parseFloat(form.total_fee) || 0;
    const d = parseFloat(form.discount)  || 0;
    return Math.max(0, t - d);
  }, [form.total_fee, form.discount]);

  const handleClose = () => {
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!form.total_fee) {
      setModalError("Total fee is required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/api/fees/${fee.id}/update/`, {
        total_fee: parseFloat(form.total_fee),
        discount:  parseFloat(form.discount) || 0,
        note:      form.note,
      });
      toast({ type: "success", title: "Fee structure updated!", duration: 4000 });
      handleClose();
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        Object.values(err.response?.data ?? {}).flat().join(" ") ??
        "Failed to update fee structure.";
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
            <Pencil className="size-5 text-primary" />
            Edit Fee Structure
          </DialogTitle>
        </DialogHeader>

        {/* Read-only info banner */}
        {fee && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Student: </span>
            <span className="font-medium">{fee.student_name}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">Course: </span>
            <span className="font-medium">{fee.course_name}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Total Fee (₹) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number" min="0" placeholder="e.g. 7500"
              value={form.total_fee}
              onChange={e => setForm(p => ({ ...p, total_fee: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Discount (₹)</label>
            <Input
              type="number" min="0" placeholder="0"
              value={form.discount}
              onChange={e => setForm(p => ({ ...p, discount: e.target.value }))}
            />
          </div>

          {form.total_fee && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Final Fee</span>
              <span className="text-lg font-bold text-foreground">{fmt(finalFee)}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Note <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              placeholder="Any remarks…"
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            />
          </div>

          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
              {submitting ? "Saving…" : "Save Changes"}
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
  const [sendingEmail, setSendingEmail] = useState(null);

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
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.receipt_no}</span>

                    <button
                      onClick={async () => {
                        setLoadingReceipt(true);
                        try {
                          const photoBase64 = await getPhotoBase64(fee.student_photo_url);
                          generateReceiptPDF(fee.payments, fee, { logoBase64, stampBase64, photoBase64 });
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
                      {loadingReceipt ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    </button>

                    <button
                      disabled={sendingEmail === p.id}
                      onClick={async () => {
                        if (!fee.student_email) {
                          toast({ type: 'error', title: 'Student email not found', duration: 3000 });
                          return;
                        }
                        setSendingEmail(p.id);
                        try {
                          const photoBase64 = await getPhotoBase64(fee.student_photo_url);
                          const pdf_base64 = generateReceiptPDFBase64(fee.payments, fee, { logoBase64, stampBase64, photoBase64 });
                          await api.post('/api/fees/payments/send-receipt/', {
                            email: fee.student_email,
                            student_name: fee.student_name,
                            receipt_no: p.receipt_no,
                            amount: p.amount,
                            course_name: fee.course_name,
                            pdf_base64,
                          });
                          toast({ type: 'success', title: 'Email sent! ✅', duration: 4000 });
                        } catch (err) {
                          console.error('Email send error:', err);
                          toast({ type: 'error', title: 'Email not sent, please try again', duration: 4000 });
                        } finally {
                          setSendingEmail(null);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      title="Send Email"
                    >
                      {sendingEmail === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                    </button>

                    <button
                      onClick={() => {
                        const date = new Date(p.payment_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        });
                        const amount = Number(p.amount).toLocaleString('en-IN');
                        const msg =
                          `*CODE CORE COMPUTER CENTER*\n_Empowering Futures Through Technology_\n\nDear *${fee.student_name}*,\n\nYour fee payment has been successfully received.\n\n*RECEIPT DETAILS*\n-----------------------------\nReceipt No.  : *${p.receipt_no}*\nAmount Paid  : *Rs. ${amount}*\nCourse       : *${fee.course_name}*\nDate         : *${date}*\n-----------------------------\n\nPlease keep this message for your records.\nIf you have any questions, feel free to contact us.\n\n*+91-9013010909*\nwww.codecore.in\n\n_Thank you for choosing Code Core Computer Center!_`;
                        window.open(
                          `https://wa.me/91${fee.student_phone?.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`,
                          '_blank'
                        );
                      }}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="WhatsApp Message"
                    >
                      <MessageCircle className="size-3.5" />
                    </button>
                  </div>
                </td>

                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                    title="Delete payment"
                  >
                    {deletingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No payments yet.</p>
      )}

      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPaymentModal(true)}>
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

// ── Fee Reminders Tab ─────────────────────────────────────────────────────────
function FeeRemindersTab({ data, loading, error, onRefresh }) {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState({
    overdue: true,
    due_soon: true,
    upcoming: false,
  });

  const filter = (list) =>
    !search ? list : list.filter(s =>
      s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.roll_no ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").includes(search)
    );

  const handleWhatsApp = (s) => {
    const dueDate = new Date(s.due_date).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    const msg = encodeURIComponent(
      `*CODE CORE COMPUTER CENTER*\n_Empowering Futures Through Technology_\n\nNamaste *${s.student_name}* ji 🙏\n\nYeh ek friendly reminder hai ki aapki *${s.course_name}* course ki monthly fees ki due date *${dueDate}* hai.\n\nOutstanding balance: *₹${Number(s.balance).toLocaleString("en-IN")}*\n\nKripya fees jald se jald jama karein. Dhanyawad! 🙏\n\n*+91-9013010909*\nwww.codecore.in`
    );
    window.open(
      `https://wa.me/91${(s.phone ?? "").replace(/\D/g, "").slice(-10)}?text=${msg}`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading reminders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-destructive">
        <AlertCircle className="size-8 opacity-70" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>Try again</Button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, overdue, due_soon, upcoming, today } = data;
  const totalActionable = summary.overdue_count + summary.due_soon_count + summary.upcoming_count;

  const SECTIONS = [
    {
      key: "overdue",
      label: "Overdue",
      list: overdue,
      badgeCls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
      headerCls: "text-rose-600 dark:text-rose-400",
      dotCls: "bg-rose-500",
      cardCls: "bg-rose-50/60 dark:bg-rose-500/5",
      tagFn: (s) => ({
        cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
        label: `${s.overdue_days} din overdue`,
      }),
    },
    {
      key: "due_soon",
      label: "Due Today / Soon",
      list: due_soon,
      badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
      headerCls: "text-amber-600 dark:text-amber-400",
      dotCls: "bg-amber-400",
      cardCls: "bg-amber-50/60 dark:bg-amber-500/5",
      tagFn: (s) => ({
        cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        label: s.days_until_due === 0 ? "Aaj due hai" : `${s.days_until_due} din mein`,
      }),
    },
    {
      key: "upcoming",
      label: "Due This Week",
      list: upcoming,
      badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      headerCls: "text-blue-600 dark:text-blue-400",
      dotCls: "bg-blue-400",
      cardCls: "bg-blue-50/60 dark:bg-blue-500/5",
      tagFn: (s) => ({
        cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
        label: `${s.days_until_due} din mein`,
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {new Date(today).toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Overdue",
            count: summary.overdue_count,
            cls: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20",
          },
          {
            label: "Due soon",
            count: summary.due_soon_count,
            cls: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20",
          },
          {
            label: "This week",
            count: summary.upcoming_count,
            cls: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",
          },
        ].map(({ label, count, cls, bg }) => (
          <div key={label} className={cn("rounded-xl border p-4 text-center", bg)}>
            <div className={cn("text-2xl font-bold", cls)}>{count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Overdue balance banner */}
      {summary.overdue_count > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-rose-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs opacity-75 mb-0.5">Total overdue balance</p>
            <p className="text-xl font-bold">
              ₹{Number(summary.total_overdue_balance).toLocaleString("en-IN")}
            </p>
          </div>
          <AlertCircle className="size-8 opacity-60" />
        </div>
      )}

      {/* Search */}
      {totalActionable > 0 && (
        <Input
          placeholder="Search by name, roll no, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* All clear state */}
      {totalActionable === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <CheckCircle2 className="size-12 text-emerald-500 opacity-70" />
          <p className="text-sm font-medium">Sab clear hai! Koi fees due nahi.</p>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(({ key, label, list, badgeCls, headerCls, dotCls, cardCls, tagFn }) => {
        const filtered = filter(list);
        if (!filtered.length) return null;
        const isOpen = openSection[key];

        return (
          <div key={key} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

            {/* Section header — clickable to collapse */}
            <button
              onClick={() => setOpenSection(p => ({ ...p, [key]: !p[key] }))}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2 rounded-full shrink-0", dotCls)} />
                <span className={cn("text-sm font-semibold", headerCls)}>{label}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeCls)}>
                  {filtered.length}
                </span>
              </div>
              {isOpen
                ? <ChevronUp className="size-4 text-muted-foreground" />
                : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>

            {/* Student cards */}
            {isOpen && (
              <div className="divide-y divide-border">
                {filtered.map((s) => {
                  const tag = tagFn(s);
                  return (
                    <div
                      key={s.fee_structure_id}
                      className={cn("flex items-center gap-3 px-4 py-3", cardCls)}
                    >
                      {/* Avatar */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                        {s.student_name?.[0] ?? "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">
                            {s.student_name}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", tag.cls)}>
                            {tag.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          <div className="truncate">
                            {s.course_name}
                            {s.roll_no && (
                              <span className="ml-1.5 font-mono">· {s.roll_no}</span>
                            )}
                          </div>
                          <div>
                            📞 {s.phone}
                            {s.last_payment_date && (
                              <span className="ml-2 opacity-70">
                                · Last paid:{" "}
                                {new Date(s.last_payment_date).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Balance + WhatsApp */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">
                            ₹{Number(s.balance).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">balance</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs gap-1.5 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-500/10"
                          onClick={() => handleWhatsApp(s)}
                        >
                          <MessageCircle className="size-3" /> Remind
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Fees Page ────────────────────────────────────────────────────────────
export default function Fees() {
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState("fees");

  // Fee structures state
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summLoading, setSummLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeStudents, setActiveStudents] = useState(null);
  const [activeStudLoading, setActiveStudLoading] = useState(true);

  // Edit fee state
  const [editFee, setEditFee] = useState(null);

  // Reminders state
  const [reminders, setReminders] = useState(null);
  const [remLoading, setRemLoading] = useState(false);
  const [remError, setRemError] = useState("");

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

  const fetchActiveStudents = useCallback(async () => {
    setActiveStudLoading(true);
    try {
      const { data } = await api.get("/api/students/?status=active");
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setActiveStudents(list.length);
    } catch {
      setActiveStudents(null);
    } finally {
      setActiveStudLoading(false);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    setRemLoading(true);
    setRemError("");
    try {
      const { data } = await api.get("/api/fees/due-reminders/");
      setReminders(data);
    } catch (err) {
      setRemError(err.response?.data?.detail ?? "Failed to load reminders.");
    } finally {
      setRemLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
    fetchSummary();
    fetchActiveStudents();
  }, []);

  // Reminders: load when tab is opened for the first time
  useEffect(() => {
    if (activeTab === "reminders" && !reminders && !remLoading) {
      fetchReminders();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    fetchFees();
    fetchSummary();
    fetchActiveStudents();
  };

  const monthlyReceived = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let total = 0;
    fees.forEach(fee => {
      (fee.payments ?? []).forEach(p => {
        const d = new Date(p.payment_date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          total += Number(p.amount) || 0;
        }
      });
    });
    return total;
  }, [fees]);

  const monthName = new Date().toLocaleString("en-IN", { month: "long" });

  const summaryCards = [
    {
      label: `${monthName} Received`,
      value: loading ? "—" : fmt(monthlyReceived),
      icon: CheckCircle2,
      colorClass: "text-emerald-500 bg-emerald-500/10",
      loading: loading,
    },
    {
      label: "Active Students",
      value: activeStudents ?? "—",
      icon: CircleDollarSign,
      colorClass: "text-blue-500 bg-blue-500/10",
      loading: activeStudLoading,
    },
  ];

  // Bell icon: BellDot if there are overdue students
  const hasOverdue = (reminders?.summary?.overdue_count ?? 0) > 0;
  const reminderBadgeCount =
    (reminders?.summary?.overdue_count ?? 0) +
    (reminders?.summary?.due_soon_count ?? 0);

  const TABS = [
    { key: "fees",      label: "Fee Structures", Icon: CircleDollarSign },
    { key: "reminders", label: "Due Reminders",  Icon: hasOverdue ? BellDot : Bell },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Heading ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage student fee structures and payments
          </p>
        </div>
        {activeTab === "fees" && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
              <Plus className="size-3.5" /> Add Fee Structure
            </Button>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
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
              key === "reminders" && hasOverdue && activeTab !== key
                ? "text-rose-500 dark:text-rose-400"
                : ""
            )}
          >
            <Icon className="size-4" />
            {label}
            {/* Badge: show only when reminders are loaded and there's something */}
            {key === "reminders" && reminderBadgeCount > 0 && (
              <span className={cn(
                "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                hasOverdue
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              )}>
                {reminderBadgeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "fees" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {summaryCards.map(card => (
              <SummaryCard key={card.label} {...card} loading={summLoading} />
            ))}
          </div>

          {/* Table */}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee, idx) => (
                    <React.Fragment key={fee.id}>
                      <TableRow
                        className={cn("transition-colors cursor-pointer hover:bg-muted/60",
                          expandedId === fee.id && "bg-muted/40")}
                        onClick={() => setExpandedId(expandedId === fee.id ? null : fee.id)}
                      >
                        <TableCell className="w-10 text-center text-xs text-muted-foreground">{idx + 1}</TableCell>

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
                          <div className="flex items-center justify-end gap-3">
                            {/* Edit button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditFee(fee);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit fee structure"
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Expand/collapse payments */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(expandedId === fee.id ? null : fee.id);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {expandedId === fee.id
                                ? <><ChevronUp className="size-3.5" /> Hide</>
                                : <><ChevronDown className="size-3.5" /> Payments</>}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedId === fee.id && (
                        <TableRow key={`${fee.id}-expand`} className="hover:bg-transparent">
                          <TableCell colSpan={8} className="p-0">
                            <PaymentHistory fee={fee} onPaymentAdded={handleRefresh} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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

          <EditFeeModal
            open={!!editFee}
            fee={editFee}
            onClose={() => setEditFee(null)}
            onSuccess={() => {
              setEditFee(null);
              handleRefresh();
            }}
          />
        </>
      ) : (
        <FeeRemindersTab
          data={reminders}
          loading={remLoading}
          error={remError}
          onRefresh={fetchReminders}
        />
      )}
    </div>
  );
}