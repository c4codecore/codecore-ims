import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/useToast";
import {
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Sheet,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_VARIANT = {
  active:    "success",
  completed: "info",
  dropped:   "destructive",
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
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {active ? (
          sortConfig.dir === "asc"
            ? <ChevronUp className="size-3" />
            : <ChevronDown className="size-3" />
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Students() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [syncing, setSyncing]       = useState(false);
  const [search, setSearch]         = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "name", dir: "asc" });

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // ── Fetch students ────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/students/");
      setStudents(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  // ── Sync from Google Sheet ────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/api/students/sync/");
      const count = data?.synced ?? data?.count ?? data?.total ?? "";
      toast({
        type:        "success",
        title:       "Sync complete!",
        description: count
          ? `${count} students synced from Google Sheet.`
          : "Students synced from Google Sheet.",
        duration: 5000,
      });
      // Refresh the list
      await fetchStudents();
    } catch (err) {
      toast({
        type:        "error",
        title:       "Sync failed",
        description: err.response?.data?.detail ?? "Could not sync from Google Sheet.",
        duration:    5000,
      });
    } finally {
      setSyncing(false);
    }
  };

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSortConfig((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
    setPage(1);
  };

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const processed = useMemo(() => {
    const q = search.toLowerCase().trim();

    let rows = q
      ? students.filter(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.father_name?.toLowerCase().includes(q)
        )
      : students;

    rows = [...rows].sort((a, b) => {
      let aVal = sortConfig.field === "course" ? (a.course?.name ?? "") : (a[sortConfig.field] ?? "");
      let bVal = sortConfig.field === "course" ? (b.course?.name ?? "") : (b[sortConfig.field] ?? "");
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.dir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [students, search, sortConfig]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const all = search ? processed : students;
    return {
      total:     all.length,
      active:    all.filter((s) => s.status === "active").length,
      completed: all.filter((s) => s.status === "completed").length,
      dropped:   all.filter((s) => s.status === "dropped").length,
    };
  }, [students, processed, search]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page heading ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view all enrolled students
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            id="refresh-students-btn"
            variant="outline"
            size="sm"
            onClick={fetchStudents}
            disabled={loading || syncing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            id="sync-sheet-btn"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="gap-1.5"
          >
            {syncing
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Sheet className="size-3.5" />}
            {syncing ? "Syncing…" : "Sync from Sheet"}
          </Button>
        </div>
      </div>

      {/* ── Stat pills ───────────────────────────────────────────────── */}
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

      {/* ── Table card ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Search + result count */}
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

        {/* States: loading / error / empty / table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Loading students…</p>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-destructive">
            <AlertCircle className="size-8 opacity-70" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStudents}>
              Try again
            </Button>
          </div>

        ) : processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <Users className="size-10 opacity-30" />
            <p className="text-sm font-medium">
              {search ? "No students match your search." : "No students found."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-primary hover:underline"
              >
                Clear search
              </button>
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
                  {/* Row number */}
                  <TableCell className="w-10 text-center text-xs text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </TableCell>

                  {/* Name + email */}
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

                  {/* Father Name */}
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {student.father_name || "—"}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="hidden font-mono text-sm sm:table-cell">
                    {student.phone || "—"}
                  </TableCell>

                  {/* Course */}
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {student.course?.name ?? "—"}
                    </Badge>
                  </TableCell>

                  {/* Join date */}
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {formatDate(student.join_date)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={student.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination footer */}
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
              <Button
                id="prev-page-btn"
                variant="outline"
                size="xs"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                id="next-page-btn"
                variant="outline"
                size="xs"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
