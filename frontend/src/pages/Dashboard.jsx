import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wallet,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { to: "/students",   label: "Students",   icon: Users           },
  { to: "/courses",    label: "Courses",    icon: BookOpen        },
  { to: "/fees",       label: "Fees",       icon: Wallet          },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck   },
  { to: "/results",    label: "Results",    icon: ClipboardList   },
];

function SidebarLink({ to, label, Icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
    </NavLink>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "teacher"
      ? "Teacher"
      : "Student";

  const sidebar = (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-card",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow shadow-primary/30">
          <GraduationCap className="size-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">CodeCore IMS</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Institute Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Navigation
        </p>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <SidebarLink
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </div>
      </nav>

      {/* User card at bottom */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          {/* Avatar */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
            {user?.username?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Button
            id="logout-btn"
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            title="Logout"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-shrink-0">{sidebar}</div>

      {/* ── Mobile sidebar overlay ────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-50 flex">{sidebar}</div>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <button
            id="mobile-menu-btn"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Welcome back,{" "}
              <span className="text-primary font-semibold">{user?.username}</span>! 👋
            </p>
          </div>
          {/* Logout button visible only on mobile top bar since sidebar handles desktop */}
          <Button
            id="topbar-logout-btn"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 lg:hidden"
          >
            <LogOut className="size-3.5" />
            Logout
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Default page rendered at /dashboard ─────────────────────────────────────
export function DashboardHome() {
  const { user } = useAuth();

  const [stats, setStats]     = useState(null);   // { total_students, total_courses }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api
      .get("/api/students/stats/")
      .then(({ data }) => setStats(data))
      .catch(() => setError("Could not load stats. Check backend connection."))
      .finally(() => setLoading(false));
  }, []);

  const roleLabel =
    user?.role === "admin"   ? "Administrator" :
    user?.role === "teacher" ? "Teacher"        : "Student";

  const cards = [
    {
      label : "Total Students",
      value : stats?.total_students,
      icon  : Users,
      color : "text-blue-500 bg-blue-500/10",
      suffix: "enrolled",
    },
    {
      label : "Active Courses",
      value : stats?.total_courses,
      icon  : ClipboardList,
      color : "text-emerald-500 bg-emerald-500/10",
      suffix: "courses",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back,{" "}
          <span className="font-medium text-foreground">{user?.username}</span>{" "}
          &mdash; {roleLabel}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ label, value, icon: Icon, color, suffix }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", color)}>
              <Icon className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {loading ? (
                /* Skeleton pulse */
                <div className="mt-1 h-7 w-16 animate-pulse rounded-md bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {value ?? "—"}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">{suffix}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick-links / info card */}
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <GraduationCap className="mx-auto mb-3 size-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">More modules coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the sidebar to navigate to Students, Fees, Attendance, or Results.
        </p>
      </div>
    </div>
  );
}
