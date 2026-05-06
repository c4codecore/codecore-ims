import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "@/hooks/useAuth";
import { ToastProvider }  from "@/hooks/useToast";
import ProtectedRoute     from "@/components/ProtectedRoute";
import Login              from "@/pages/Login";
import Dashboard, { DashboardHome } from "@/pages/Dashboard";
import Students           from "@/pages/Students";
import StudentDetail      from "@/pages/StudentDetail";

// Placeholder for modules not yet built
function ComingSoon({ page }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
      <p className="text-lg font-semibold text-foreground">{page}</p>
      <p className="text-sm">This module is coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* All protected pages share the Dashboard shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Dashboard />}>
                <Route path="/dashboard"      element={<DashboardHome />} />
                <Route path="/students"       element={<Students />} />
                <Route path="/students/:id"   element={<StudentDetail />} />
                <Route path="/fees"           element={<ComingSoon page="Fees" />} />
                <Route path="/attendance"     element={<ComingSoon page="Attendance" />} />
                <Route path="/results"        element={<ComingSoon page="Results" />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}