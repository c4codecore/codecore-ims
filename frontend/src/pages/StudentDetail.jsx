import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Input }  from "@/components/ui/input";
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
  ArrowLeft,
  User,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  MapPin,
  CreditCard,
  GraduationCap,
  Pencil,
  ChevronDown,
  Loader2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_VARIANT = {
  active:    "success",
  completed: "info",
  dropped:   "destructive",
};

const STATUS_OPTIONS = [
  { value: "active",    label: "Active",    color: "text-emerald-600" },
  { value: "completed", label: "Completed", color: "text-blue-600"    },
  { value: "dropped",   label: "Dropped",   color: "text-rose-600"    },
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

// ── Token helper ──────────────────────────────────────────────────────────────
function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access")        ||
    localStorage.getItem("token")
  );
}

// ── Info row (read-only display) ──────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Change Status Dropdown ────────────────────────────────────────────────────
function StatusChanger({ student, onUpdated }) {
  const { toast } = useToast();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus) => {
    if (newStatus === student.status) { setOpen(false); return; }
    setLoading(true);
    try {
      const { data } = await api.patch(
        `/api/students/${student.id}/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast({
        type:        "success",
        title:       "Status updated!",
        description: `${student.name}'s status changed to ${newStatus}.`,
        duration:    4000,
      });
      onUpdated(data);
    } catch (err) {
      console.error("[StatusChanger] error:", err.response?.data);
      toast({
        type:        "error",
        title:       "Failed to update status",
        description: err.response?.data?.detail ?? "Please try again.",
        duration:    5000,
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        id="change-status-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
          "border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {loading
          ? <Loader2 className="size-3.5 animate-spin" />
          : <ChevronDown className="size-3.5" />}
        Change Status
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-card shadow-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                id={`status-opt-${opt.value}`}
                onClick={() => handleChange(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted first:rounded-t-lg last:rounded-b-lg",
                  student.status === opt.value ? "font-semibold" : "font-normal",
                  opt.color
                )}
              >
                <span className={cn(
                  "size-1.5 rounded-full bg-current",
                  student.status === opt.value ? "opacity-100" : "opacity-40"
                )} />
                {opt.label}
                {student.status === opt.value && (
                  <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Edit Student Modal ────────────────────────────────────────────────────────
function EditStudentModal({ student, open, onClose, onSaved }) {
  const { toast } = useToast();

  const [courses,    setCourses]    = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form,       setForm]       = useState({});

  // Populate form from student data
  useEffect(() => {
    if (!student || !open) return;
    setForm({
      name:           student.name           ?? "",
      father_name:    student.father_name    ?? "",
      mother_name:    student.mother_name    ?? "",
      phone:          student.phone          ?? "",
      email:          student.email          ?? "",
      address:        student.address        ?? "",
      qualification:  student.qualification  ?? "",
      gender:         student.gender         ?? "",
      dob:            student.dob            ?? "",
      course:         student.course         ?? "",   // integer ID
      aadhaar_number: student.aadhaar_number ?? "",
      comments:       student.comments       ?? "",
      status:         student.status         ?? "active",
    });
    setModalError("");
  }, [student, open]);

  // Fetch courses list when modal opens
  useEffect(() => {
    if (!open) return;
    api
      .get("/api/students/courses/", {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      .then(({ data }) => setCourses(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {/* non-fatal */});
  }, [open]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target ? e.target.value : e }));

  const handleClose = () => {
    setModalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        course: form.course !== "" ? Number(form.course) : null,
        dob:    form.dob    || null,
      };
      const { data } = await api.patch(
        `/api/students/${student.id}/`,
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast({ type: "success", title: "Student updated successfully!", duration: 4000 });
      handleClose();
      onSaved(data);
    } catch (err) {
      console.error("[EditStudent] error:", err);
      console.error("[EditStudent] response:", err.response?.data);
      const msg =
        err.response?.data?.detail ??
        Object.values(err.response?.data ?? {}).flat().join(" ") ??
        `Failed to save. (HTTP ${err.response?.status ?? "network error"})`;
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Form field helpers ────────────────────────────────────────────────────
  const Field = ({ id, label, children, note }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {note && <span className="ml-1 text-xs font-normal text-muted-foreground">({note})</span>}
      </label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" />
            Edit Student
          </DialogTitle>
          {student && (
            <p className="text-sm text-muted-foreground">
              Editing profile for <span className="font-medium text-foreground">{student.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
          {/* ── Section: Personal ── */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Personal Information
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="edit-name" label="Full Name">
                <Input id="edit-name" value={form.name ?? ""} onChange={set("name")} />
              </Field>
              <Field id="edit-phone" label="Phone">
                <Input id="edit-phone" value={form.phone ?? ""} onChange={set("phone")} />
              </Field>
              <Field id="edit-email" label="Email">
                <Input id="edit-email" type="email" value={form.email ?? ""} onChange={set("email")} />
              </Field>
              <Field id="edit-dob" label="Date of Birth">
                <Input id="edit-dob" type="date" value={form.dob ?? ""} onChange={set("dob")} />
              </Field>
              <Field id="edit-gender" label="Gender">
                <Select value={form.gender ?? ""} onValueChange={set("gender")}>
                  <SelectTrigger id="edit-gender"><SelectValue placeholder="Select gender…" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="edit-father" label="Father's Name">
                <Input id="edit-father" value={form.father_name ?? ""} onChange={set("father_name")} />
              </Field>
              <Field id="edit-mother" label="Mother's Name">
                <Input id="edit-mother" value={form.mother_name ?? ""} onChange={set("mother_name")} />
              </Field>
              <Field id="edit-address" label="Address">
                <Input id="edit-address" value={form.address ?? ""} onChange={set("address")} />
              </Field>
            </div>
          </div>

          {/* ── Section: Academic ── */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Academic Information
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="edit-course" label="Course">
                <Select
                  value={form.course !== "" && form.course != null ? String(form.course) : ""}
                  onValueChange={(v) => setForm((p) => ({ ...p, course: v }))}
                >
                  <SelectTrigger id="edit-course">
                    <SelectValue placeholder="Select course…" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="edit-qualification" label="Qualification">
                <Input id="edit-qualification" value={form.qualification ?? ""} onChange={set("qualification")} />
              </Field>
              <Field id="edit-aadhaar" label="Aadhaar Number">
                <Input id="edit-aadhaar" value={form.aadhaar_number ?? ""} onChange={set("aadhaar_number")} />
              </Field>
              <Field id="edit-status" label="Status">
                <Select value={form.status ?? "active"} onValueChange={set("status")}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* ── Section: Comments ── */}
          <Field id="edit-comments" label="Comments" note="optional">
            <textarea
              id="edit-comments"
              rows={3}
              value={form.comments ?? ""}
              onChange={set("comments")}
              placeholder="Any additional notes…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </Field>

          {/* ── Inline error ── */}
          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button id="save-student-btn" type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main StudentDetail Page ───────────────────────────────────────────────────
export default function StudentDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { toast }  = useToast();

  const [student,   setStudent]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [editOpen,  setEditOpen]  = useState(false);

  const fetchStudent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/api/students/${id}/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setStudent(data);
    } catch {
      setError("Could not load student details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  // Called after status change or edit save — update local state immediately
  const handleUpdated = (updated) => setStudent(updated);

  const courseName = student?.course_name ?? student?.course?.name ?? "—";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            id="back-to-students"
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/students")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {loading ? "Loading…" : (student?.name ?? "Student Detail")}
            </h1>
            <p className="text-sm text-muted-foreground">Student profile</p>
          </div>
        </div>

        {/* Action buttons — only visible once student data is loaded */}
        {student && (
          <div className="flex items-center gap-2 shrink-0">
            <StatusChanger student={student} onUpdated={handleUpdated} />
            <Button
              id="edit-student-btn"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {student && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* ── Personal info card ── */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Personal Info
              </p>
              <Badge variant={STATUS_VARIANT[student.status] ?? "secondary"}>
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {student.status
                  ? student.status.charAt(0).toUpperCase() + student.status.slice(1)
                  : "—"}
              </Badge>
            </div>

            {/* Avatar */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary uppercase">
                {student.name?.[0] ?? "?"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{student.name}</p>
                <p className="text-sm text-muted-foreground">{student.email || "—"}</p>
              </div>
            </div>

            <InfoRow icon={User}       label="Father's Name"   value={student.father_name}   />
            <InfoRow icon={User}       label="Mother's Name"   value={student.mother_name}   />
            <InfoRow icon={Phone}      label="Phone"           value={student.phone}         />
            <InfoRow icon={Mail}       label="Email"           value={student.email}         />
            <InfoRow icon={Calendar}   label="Date of Birth"   value={student.dob}           />
            <InfoRow icon={User}       label="Gender"          value={student.gender}        />
            <InfoRow icon={MapPin}     label="Address"         value={student.address}       />
          </div>

          {/* ── Academic info card ── */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Info
            </p>
            <InfoRow icon={BookOpen}      label="Course"          value={courseName}             />
            <InfoRow icon={Calendar}      label="Join Date"       value={student.join_date}      />
            <InfoRow icon={GraduationCap} label="Qualification"   value={student.qualification}  />
            <InfoRow icon={CreditCard}    label="Aadhaar Number"  value={student.aadhaar_number} />
            <InfoRow icon={ShieldCheck}   label="Sheet Row"       value={student.sheet_row ? `Row ${student.sheet_row}` : null} />
            <InfoRow icon={MessageSquare} label="Comments"        value={student.comments}       />
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      <EditStudentModal
        student={student}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          handleUpdated(updated);
          setEditOpen(false);
        }}
      />
    </div>
  );
}
