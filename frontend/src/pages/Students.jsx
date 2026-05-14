import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  Search, RefreshCw, Users, AlertCircle,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Sheet, Loader2, UserPlus, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_VARIANT = {
  active: "success",
  completed: "info",
  dropped: "destructive",
};

function StatusBadge({ status }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </Badge>
  );
}

// ── Sortable column header ────────────────────────────────────────────────────
function SortableHead({ label, field, sortConfig, onSort, className }) {
  const active = sortConfig.field === field;
  return (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap", className)}>
      <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground">
        {label}
        {active ? (
          sortConfig.dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Add Student Modal ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", father_name: "", mother_name: "",
  phone: "", email: "", gender: "Female",
  dob: "", qualification: "", address: "",
  course: "", admission_date: "", total_fees: "",
  status: "active", comments: "",
};

function AddStudentModal({ open, onClose, onSuccess }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Load courses once
  useEffect(() => {
    if (!open) return;
    api.get("/api/students/courses/").then(({ data }) => setCourses(data)).catch(() => {});
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}); }
  }, [open]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side required check
    const req = { name: "Name", phone: "Phone", email: "Email", gender: "Gender" };
    const errs = {};
    Object.entries(req).forEach(([k, label]) => {
      if (!form[k].trim()) errs[k] = `${label} required`;
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        course: form.course || null,
        admission_date: form.admission_date || null,
        total_fees: form.total_fees || null,
        dob: form.dob || null,
      };
      await api.post("/api/students/", payload);
      toast({ type: "success", title: "Student added!", description: `${form.name} ka record aur enrollment ban gaya.`, duration: 4000 });
      onSuccess();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Map server field errors
        setErrors(data);
        toast({ type: "error", title: "Save failed", description: "Form mein errors hain, check karo.", duration: 4000 });
      } else {
        toast({ type: "error", title: "Save failed", description: err.message, duration: 4000 });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const field = (label, key, type = "text", required = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <Input
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={cn("h-9 text-sm", errors[key] && "border-destructive")}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Naya Student Add Karo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Student + Enrollment ek saath ban jaayega</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

          {/* Section: Personal Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Personal Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Student Name", "name", "text", true)}
              {field("Father Name", "father_name")}
              {field("Mother Name", "mother_name")}
              {field("Phone", "phone", "tel", true)}
              {field("Email", "email", "email", true)}
              {field("Date of Birth", "dob", "date")}

              {/* Gender */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Gender<span className="text-destructive ml-0.5">*</span>
                </label>
                <select
                  value={form.gender}
                  onChange={set("gender")}
                  className={cn(
                    "h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                    errors.gender && "border-destructive"
                  )}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
              </div>

              {field("Qualification", "qualification")}
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <textarea
                value={form.address}
                onChange={set("address")}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Section: Course & Admission */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Course & Admission
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Course dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Course</label>
                <select
                  value={form.course}
                  onChange={set("course")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Select Course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {field("Admission Date", "admission_date", "date")}
              {field("Total Fees (₹)", "total_fees", "number")}

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={set("status")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">Comments / Notes</label>
              <textarea
                value={form.comments}
                onChange={set("comments")}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5 min-w-[120px]">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              {saving ? "Saving…" : "Student Add Karo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Students() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("active");
  const [students, setStudents]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [syncing, setSyncing]           = useState(false);
  const [search, setSearch]             = useState("");
  const [sortConfig, setSortConfig]     = useState({ field: "name", dir: "asc" });
  const [showAddModal, setShowAddModal] = useState(false);

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // ── Fetch students ──────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const url = statusFilter ? `/api/students/?status=${statusFilter}` : "/api/students/";
      const { data } = await api.get(url);
      setStudents(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [statusFilter]);
  useEffect(() => { setPage(1); }, [search]);

  // ── Sync ────────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/api/students/sync/");
      const c = data?.created ?? "";
      const u = data?.updated ?? "";
      toast({
        type: "success", title: "Sync complete!",
        description: `${c} created, ${u} updated.`,
        duration: 5000,
      });
      await fetchStudents();
    } catch (err) {
      toast({ type: "error", title: "Sync failed", description: err.response?.data?.detail ?? "Could not sync.", duration: 5000 });
    } finally {
      setSyncing(false);
    }
  };

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSortConfig((prev) =>
      prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }
    );
    setPage(1);
  };

  // ── Filter + Sort ───────────────────────────────────────────────────────────
  const processed = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = q
      ? students.filter((s) =>
          s.name?.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q) ||
          s.father_name?.toLowerCase().includes(q)
        )
      : students;
    rows = [...rows].sort((a, b) => {
      const aVal = sortConfig.field === "course" ? (a.course_name ?? "") : (a[sortConfig.field] ?? "");
      const bVal = sortConfig.field === "course" ? (b.course_name ?? "") : (b[sortConfig.field] ?? "");
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [students, search, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const all = search ? processed : students;
    return {
      total:     all.length,
      active:    all.filter((s) => s.status === "active").length,
      completed: all.filter((s) => s.status === "completed").length,
      dropped:   all.filter((s) => s.status === "dropped").length,
    };
  }, [students, processed, search]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AddStudentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchStudents}
      />

      <div className="flex flex-col gap-6">
        {/* Page heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage and view all enrolled students</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button id="refresh-students-btn" variant="outline" size="sm" onClick={fetchStudents} disabled={loading || syncing} className="gap-1.5">
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>

            <Button id="sync-sheet-btn" variant="outline" size="sm" onClick={handleSync} disabled={syncing || loading} className="gap-1.5">
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <Sheet className="size-3.5" />}
              {syncing ? "Syncing…" : "Sync from Sheet"}
            </Button>

            <Button id="add-student-btn" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
              <UserPlus className="size-3.5" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",     value: counts.total,     variant: "default"     },
            { label: "Active",    value: counts.active,    variant: "success"     },
            { label: "Completed", value: counts.completed, variant: "info"        },
            { label: "Dropped",   value: counts.dropped,   variant: "destructive" },
          ].map(({ label, value, variant }) => (
            <Badge key={label} variant={variant} className="gap-1.5 px-3 py-1 text-xs">
              <Users className="size-3" />
              {value} {label}
            </Badge>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Filter Tabs */}
          <div className="flex gap-1 border-b border-border px-4 pt-3">
            {[
              { label: "Active",    value: "active",    count: counts.active    },
              { label: "Completed", value: "completed", count: counts.completed },
              { label: "Dropped",   value: "dropped",   count: counts.dropped   },
              { label: "All",       value: "",          count: counts.total     },
            ].map(({ label, value, count }) => (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setPage(1); }}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  statusFilter === value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="student-search"
                type="search"
                placeholder="Search by name, father name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {processed.length} result{processed.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm">Loading students…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-destructive">
              <AlertCircle className="size-8 opacity-70" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchStudents}>Try again</Button>
            </div>
          ) : processed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Users className="size-10 opacity-30" />
              <p className="text-sm font-medium">
                {search ? "No students match your search." : "No students found."}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
                  Clear search
                </button>
              )}
              {!search && (
                <Button size="sm" className="mt-2 gap-1.5" onClick={() => setShowAddModal(true)}>
                  <UserPlus className="size-3.5" />
                  Add First Student
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <SortableHead label="Name"        field="name"        sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Father Name" field="father_name" sortConfig={sortConfig} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortableHead label="Phone"       field="phone"       sortConfig={sortConfig} onSort={handleSort} className="hidden sm:table-cell" />
                  <SortableHead label="Course"      field="course"      sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Join Date"   field="join_date"   sortConfig={sortConfig} onSort={handleSort} className="hidden md:table-cell" />
                  <SortableHead label="Status"      field="status"      sortConfig={sortConfig} onSort={handleSort} />
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.map((student, idx) => (
                  <TableRow
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="cursor-pointer transition-colors hover:bg-muted/60"
                  >
                    <TableCell className="w-10 text-center text-xs text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                          {student.name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{student.name}</p>
                          {student.email && (
                            <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {student.father_name || "—"}
                    </TableCell>

                    <TableCell className="hidden font-mono text-sm sm:table-cell">
                      {student.phone || "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {student.course_name ?? student.course?.name ?? "—"}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(student.join_date)}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={student.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && !error && processed.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, processed.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{processed.length}</span> students
              </p>
              <div className="flex items-center gap-1">
                <Button id="prev-page-btn" variant="outline" size="xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button id="next-page-btn" variant="outline" size="xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
