import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard, { DashboardHome } from "@/pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              {/* Default child rendered at /dashboard */}
              <Route index element={<DashboardHome />} />
            </Route>
            {/* Stub routes – pages to be built later */}
            <Route path="/students"   element={<Dashboard />} />
            <Route path="/fees"       element={<Dashboard />} />
            <Route path="/attendance" element={<Dashboard />} />
            <Route path="/results"    element={<Dashboard />} />
          </Route>

          {/* Catch-all → redirect to dashboard (protected) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}