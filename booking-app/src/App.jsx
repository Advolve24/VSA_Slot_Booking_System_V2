import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "@/app/layout/MainLayout";

import Home from "@/pages/Home";
import EnrollCoaching from "@/pages/enrollment/EnrollCoaching";
import EnrollmentSuccess from "@/pages/enrollment/EnrollmentSuccess";
import TurfBooking from "@/pages/booking/TurfBooking";
import TurfConfirm from "@/pages/booking/TurfConfirm";
import TurfSuccess from "@/pages/booking/TurfSuccess";


import MyAccount from "@/pages/MyAccount";
import MyEnrollments from "@/pages/MyEnrollments";
import MyTurfBookings from "@/pages/MyTurfBookings";
import RenewEnrollment from "@/pages/enrollment/RenewEnrollment";
import RenewalSuccess from "@/pages/enrollment/RenewalSuccess";
import ApplyLeave from "@/pages/enrollment/ApplyLeave";
import MyInvoices from "@/pages/MyInvoices";
import InvoiceView from "@/pages/InvoiceView";

import ProtectedRoute from "@/app/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <div id="recaptcha-container"></div>
      <Routes>

        <Route element={<MainLayout />}>

          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/enroll" element={<EnrollCoaching />} />
          <Route path="/enrollment-success" element={<EnrollmentSuccess />} />
          <Route path="/renew-enrollment/:id" element={<RenewEnrollment />} />
          <Route path="/renewal-success" element={<RenewalSuccess />} />
          <Route path="/apply-leave/:id" element={<ApplyLeave />} />

          <Route path="/book-turf" element={<TurfBooking />} />
          <Route path="/book-turf/confirm" element={<TurfConfirm />} />
          <Route path="/turf-success" element={<TurfSuccess />} />
       

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<MyAccount />} />
            <Route path="/my-enrollments" element={<MyEnrollments />} />
            <Route path="/my-turf-bookings" element={<MyTurfBookings />} />
            <Route path="/my-invoices" element={<MyInvoices />} />
            <Route path="/invoice/view/:id" element={<InvoiceView />} />

          </Route>

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="py-20 text-center text-gray-500">
                Page Not Found
              </div>
            }
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}
