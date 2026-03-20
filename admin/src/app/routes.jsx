import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./providers/AuthProvider";

import AdminLayout from "./layout/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

/* ================= ENROLLMENTS ================= */
import EnrollmentsLayout from "./pages/enrollments/EnrollmentsLayout";
import CoachingEnrollments from "./pages/enrollments/CoachingEnrollments";

/* ================= SPORTS ================= */
import SportsPage from "./pages/sports/SportsPage";

/* ================= BATCHES ================= */
import CoachingBatches from "./pages/batches/CoachingBatches";

/* ================= FACILITIES ================= */
import FacilitiesPage from "./pages/facilities/FacilitiesPage";

/* ================= TURF RENTALS ================= */
import TurfRentalLayout from "./pages/turf-rental/TurfRentalLayout";
import TurfInvoiceList from "./pages/turf-rental/TurfInvoiceList";
import StaffPayment from "./pages/turf-rental/StaffPayment";
import TurfRentals from "./pages/turf-rental/TurfRentals";

/* ================= REPORTS ================= */
import Reports from "./pages/reports/Reports";

/* ================= USERS ================= */
import AdminUsers from "./pages/users/UsersList";

import RenewalHistory from "./pages/enrollments/RenewalHistory";
import InvoiceList from "./pages/enrollments/InvoiceList";


/* ================= INVOICE ================= */
import InvoiceView from "./pages/invoice/InvoiceView";

/* ================= ROLE GUARD ================= */
import RoleGuard from "../components/RoleGuard";

/* ================= SETTINGS ================= */
import Settings from "./pages/settings/Settings";

export default function RoutesList() {

  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  const role = user?.role;

  return (
    <Routes>

      {/* ================= LOGIN ================= */}

      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ================= PROTECTED ADMIN AREA ================= */}

      <Route
        path="/admin"
        element={
          isAuthenticated
            ? <AdminLayout />
            : <Navigate to="/admin/login" />
        }
      >

        {/* ================= ROOT REDIRECT ================= */}

        <Route
          index
          element={
            role === "staff"
              ? <Navigate to="/admin/turf-rentals" />
              : <AdminDashboard />
          }
        />

        {/* ================= DASHBOARD ================= */}

        <Route
          path="dashboard"
          element={
            <RoleGuard allow={["admin"]}>
              <AdminDashboard />
            </RoleGuard>
          }
        />

        {/* ================= ENROLLMENTS ================= */}

        <Route
          path="enrollments"
          element={
            <RoleGuard allow={["admin"]}>
              <EnrollmentsLayout />
            </RoleGuard>
          }
        >
          <Route index element={<CoachingEnrollments />} />
          <Route path="coaching" element={<CoachingEnrollments />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="renewals" element={<RenewalHistory />} />
        </Route>

        <Route
          path="invoice/:id"
          element={
            <RoleGuard allow={["admin", "staff"]}>
              <InvoiceView />
            </RoleGuard>
          }
        />

        {/* ================= SPORTS ================= */}

        <Route
          path="sports"
          element={
            <RoleGuard allow={["admin"]}>
              <SportsPage />
            </RoleGuard>
          }
        />

        {/* ================= BATCHES ================= */}

        <Route
          path="batches"
          element={
            <RoleGuard allow={["admin"]}>
              <CoachingBatches />
            </RoleGuard>
          }
        />

        {/* ================= FACILITIES ================= */}

        <Route
          path="facilities"
          element={
            <RoleGuard allow={["admin"]}>
              <FacilitiesPage />
            </RoleGuard>
          }
        />

        {/* ================= TURF BOOKINGS ================= */}

        <Route
          path="turf-rentals"
          element={
            <RoleGuard allow={["admin", "staff"]}>
              <TurfRentalLayout />
            </RoleGuard>
          }
        >
          {/* MAIN LIST */}
          <Route index element={<TurfRentals />} />

          {/* INVOICE TAB */}
          <Route path="invoices" element={<TurfInvoiceList />} />

        </Route>

        {/* ================= STAFF PAYMENT ================= */}

        <Route
          path="turf-rentals/:id/payment"
          element={
            <RoleGuard allow={["admin", "staff"]}>
              <StaffPayment />
            </RoleGuard>
          }
        />

        {/* ================= REPORTS ================= */}

        <Route
          path="reports"
          element={
            <RoleGuard allow={["admin"]}>
              <Reports />
            </RoleGuard>
          }
        />

        {/* ================= USERS ================= */}

        <Route
          path="users"
          element={
            <RoleGuard allow={["admin"]}>
              <AdminUsers />
            </RoleGuard>
          }
        />

        {/* ================= SETTINGS ================= */}

        <Route
          path="settings"
          element={
            <RoleGuard allow={["admin"]}>
              <Settings />
            </RoleGuard>
          }
        />

      </Route>

      {/* ================= FALLBACK ================= */}

      <Route path="*" element={<Navigate to="/admin/login" />} />

    </Routes>
  );

}