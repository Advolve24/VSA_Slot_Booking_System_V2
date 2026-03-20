import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  X,
  Calendar,
  Trophy,
  Clock,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/* ================= DATE FORMAT ================= */

function fmtDate(d) {
  return format(new Date(d), "dd MMM yyyy");
}

/* ================= TIME FORMAT ================= */

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/* ================= COMPONENT ================= */

export default function MyTurfBookings() {

  const { toast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);

  const [isMobile, setIsMobile] = useState(false);

  /* ================= RESPONSIVE ================= */

  useEffect(() => {

    const check = () => setIsMobile(window.innerWidth < 768);

    check();

    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);

  }, []);

  /* ================= FETCH BOOKINGS ================= */

  const fetchBookings = async () => {

    try {

      const res = await api.get("/users/my-turf-bookings");

      setBookings(res.data || []);

    } catch {

      toast({
        variant: "destructive",
        title: "Failed to load bookings"
      });

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    fetchBookings();
  }, []);

  /* ================= DOWNLOAD INVOICE ================= */

  const downloadInvoice = async (id) => {

    try {

      const response = await api.get(
        `/invoice/turf/${id}/download`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;

      link.setAttribute("download", `turf-invoice-${id}.pdf`);

      document.body.appendChild(link);

      link.click();

    } catch {

      toast({
        variant: "destructive",
        title: "Invoice download failed"
      });

    }

  };

  /* ================= CANCEL BOOKING ================= */

const confirmCancel = async () => {
    try {

      await api.patch(`/turf-rentals/${cancelBooking._id}/cancel`, {
        source: "user",
      });

      toast({
        title: "Refund request submitted"
      });

      setCancelBooking(null);

      fetchBookings();

    } catch (err) {

      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Cancellation failed"
      });

    }

  };

  if (loading)
    return <div className="py-16 text-center">Loading...</div>;

  return (

    <>
      <div className="max-w-6xl mx-auto py-6 px-4">

        <h1 className="text-xl font-semibold mb-4 text-green-800">
          My Turf Bookings
        </h1>

        {bookings.length === 0 ? (

          <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
            No turf bookings found.
          </div>

        ) : isMobile ? (

          /* ================= MOBILE CARDS ================= */

          <div className="space-y-4">

            {bookings.map((b) => {

              const fullyPaid = (b.totalPaid || 0) >= (b.finalAmount || 0);
              const isCancelled = b.bookingStatus === "cancelled";

              return (

                <div
                  key={b._id}
                  className={`border rounded-xl p-4 bg-white ${isCancelled ? "opacity-60" : ""}`}
                >

                  <div className="flex justify-between items-start">

                    <div>

                      <h3 className="font-semibold text-gray-800">
                        {b.facilityName}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {b.sportName}
                      </p>

                    </div>

                    <span className="text-sm capitalize">
                      {b.bookingStatus}
                    </span>

                  </div>

                  <div className="mt-3 space-y-2 text-sm">

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {fmtDate(b.rentalDate)}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatTime(b.startTime)} - {formatTime(b.endTime)}
                    </div>

                    <div className="text-green-700 font-medium">
                      Paid ₹{b.totalPaid || 0}
                    </div>

                    {b.dueAmount > 0 && (
                      <div className="text-red-600 text-xs">
                        Due ₹{b.dueAmount}
                      </div>
                    )}

                  </div>

                  <div className="flex gap-2 mt-4">

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    {fullyPaid && !isCancelled && (
                      <Button
                        size="sm"
                        className="bg-green-700 text-white"
                        onClick={() => downloadInvoice(b._id)}
                      >
                        Invoice
                      </Button>
                    )}

                    {!isCancelled && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCancelBooking(b)}
                      >
                        Cancel
                      </Button>
                    )}

                  </div>

                </div>

              );

            })}

          </div>

        ) : (

          /* ================= DESKTOP TABLE ================= */

          <div className="bg-white border rounded-lg overflow-hidden">

            <table className="w-full text-sm">

              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">Facility</th>
                  <th className="p-3">Sport</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>

                {bookings.map((b) => {

                  const fullyPaid = (b.totalPaid || 0) >= (b.finalAmount || 0);
                  const isCancelled = b.bookingStatus === "cancelled";

                  return (

                    <tr
                      key={b._id}
                      className={`border-t ${isCancelled ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"}`}
                    >

                      <td className="p-3 font-medium">
                        {b.facilityName}
                      </td>

                      <td className="p-3">
                        {b.sportName}
                      </td>

                      <td className="p-3">
                        {fmtDate(b.rentalDate)}
                      </td>

                      <td className="p-3">
                        {formatTime(b.startTime)} - {formatTime(b.endTime)}
                      </td>

                      <td className="p-3">

                        <div className="text-green-700 font-medium">
                          Paid ₹{b.totalPaid || 0}
                        </div>

                        {b.dueAmount > 0 && (
                          <div className="text-xs text-red-600">
                            Due ₹{b.dueAmount}
                          </div>
                        )}

                      </td>

                      <td className="p-3 capitalize">
                        {b.bookingStatus}
                      </td>

                      <td className="p-3 text-center">

                        <div className="flex gap-2 justify-center">

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBooking(b)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>

                          {fullyPaid && !isCancelled && (
                            <Button
                              size="sm"
                              className="bg-green-700 text-white"
                              onClick={() => downloadInvoice(b._id)}
                            >
                              Invoice
                            </Button>
                          )}

                          {!isCancelled && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCancelBooking(b)}
                            >
                              Cancel
                            </Button>
                          )}

                        </div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ================= VIEW DRAWER ================= */}

      {selectedBooking && (

        isMobile ? (

          <Sheet open onOpenChange={() => setSelectedBooking(null)}>

            <SheetContent
              side="bottom"
              className="h-[70vh] rounded-t-2xl"
            >
              <BookingDetails booking={selectedBooking} />
            </SheetContent>

          </Sheet>

        ) : (

          <Modal onClose={() => setSelectedBooking(null)}>
            <BookingDetails booking={selectedBooking} />
          </Modal>

        )

      )}

      {/* ================= CANCEL POPUP ================= */}

      {cancelBooking && (

        isMobile ? (

          <Sheet open onOpenChange={() => setCancelBooking(null)}>

            <SheetContent
              side="bottom"
              className="h-[70vh] rounded-t-2xl overflow-y-auto"
            >

              <CancelPopup
                booking={cancelBooking}
                onCancel={() => setCancelBooking(null)}
                onConfirm={() => confirmCancel()}
              />

            </SheetContent>

          </Sheet>

        ) : (

          <Modal onClose={() => setCancelBooking(null)}>

            <CancelPopup
              booking={cancelBooking}
              onCancel={() => setCancelBooking(null)}
              onConfirm={confirmCancel}
            />

          </Modal>

        )

      )}
    </>

  );

}

/* ================= MODAL ================= */

function Modal({ children, onClose }) {

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl w-full max-w-md relative overflow-hidden">

        <button
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="w-4 h-4" />
        </button>

        {children}

      </div>

    </div>

  );

}

/* ================= BOOKING DETAILS ================= */

function BookingDetails({ booking }) {

  return (

    <div className="p-4 space-y-4">

      <h2 className="text-lg font-semibold text-green-800">
        {booking.facilityName}
      </h2>

      <div className="flex gap-2 text-sm">
        <Calendar className="w-4 h-4" />
        {fmtDate(booking.rentalDate)}
      </div>

      <div className="flex gap-2 text-sm">
        <Clock className="w-4 h-4" />
        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
      </div>

      <div className="flex gap-2 text-sm">
        <Trophy className="w-4 h-4" />
        {booking.sportName}
      </div>

      <div className="flex gap-2 text-sm">
        <MapPin className="w-4 h-4" />
        {booking.facilityName}
      </div>

      <div className="border-t pt-3 space-y-1 text-sm">

        <div className="flex justify-between">
          <span>Total</span>
          <span>₹{booking.finalAmount}</span>
        </div>

        <div className="flex justify-between text-green-700">
          <span>Paid</span>
          <span>₹{booking.totalPaid}</span>
        </div>

        {booking.dueAmount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Due</span>
            <span>₹{booking.dueAmount}</span>
          </div>
        )}

      </div>

    </div>

  );

}

/* ================= CANCEL POPUP ================= */

function CancelPopup({ booking, onCancel, onConfirm }) {

  return (

    <div>

      <div className="bg-green-800 text-white p-4 flex items-start gap-3">

        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-1" />

        <div>

          <h2 className="font-semibold text-lg">
            Cancel Turf Booking
          </h2>

          <p className="text-xs opacity-80">
            Are you sure you want to cancel this booking? You can request a refund from the admin.
          </p>

        </div>

      </div>

      <div className="p-4 space-y-5">

        <div className="bg-gray-100 rounded-xl p-4 space-y-3">

          <div className="flex justify-between text-sm">
            <span>{booking.facilityName}</span>
            <span>₹{booking.finalAmount}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>{fmtDate(booking.rentalDate)}</span>
            <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
          </div>

          <div className="text-green-700 font-medium text-sm">
            Refundable Amount: ₹{booking.totalPaid}
          </div>

        </div>

        <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm p-3 rounded-lg flex items-center gap-2">

          <AlertTriangle className="w-4 h-4" />

          Refund will be reviewed and approved by admin as per policy.

        </div>

        <div className="flex justify-end gap-3">

          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>

          <Button
            className="bg-orange-400 hover:bg-orange-500 text-white"
            onClick={onConfirm}
          >
            Request Refund
          </Button>

        </div>

      </div>

    </div>

  );

}