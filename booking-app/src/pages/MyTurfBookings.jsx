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
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/* ================= SAFE DATE ================= */
function safeDate(d) {
  if (!d) return null;
  const str = String(d);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(str);
}

function fmt(d, pattern = "dd MMM yyyy") {
  const dt = safeDate(d);
  return dt ? format(dt, pattern) : "-";
}

export default function MyTurfBookings() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  /* ================= RESPONSIVE CHECK ================= */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH BOOKINGS ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/users/my-turf-bookings");
        setBookings(res.data || []);
      } catch {
        toast({
          variant: "destructive",
          title: "Failed to load bookings",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const downloadInvoice = async (id) => {
    try {
      setDownloadingId(id);

      toast({
        title: "Preparing invoice...",
        description: "Generating your PDF. Please wait.",
      });

      const response = await api.get(
        `/invoice/turf/${id}/download`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `turf-invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice downloaded successfully",
      });

    } catch {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Unable to download invoice.",
      });
    } finally {
      setDownloadingId(null);
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
          <div className="bg-white border rounded-lg p-6 text-center text-gray-500 shadow-sm">
            No turf bookings found.
          </div>
        ) : (
          <>
            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block bg-white border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">Facility</th>
                      <th className="p-3">Sport</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.map((item) => {
                      const statusColor =
                        item.bookingStatus === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : item.bookingStatus === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700";

                      return (
                        <tr
                          key={item._id}
                          className="border-t hover:bg-gray-50 transition"
                        >
                          <td className="p-3 font-medium">
                            {item.facilityName}
                          </td>

                          <td className="p-3">{item.sportName}</td>

                          <td className="p-3">
                            {fmt(item.rentalDate)}
                          </td>

                          <td className="p-3 font-medium text-green-700">
                            ₹{item.finalAmount ?? item.totalAmount}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusColor}`}
                            >
                              {item.bookingStatus}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBooking(item)}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>

                              <Button
                                size="sm"
                                disabled={downloadingId === item._id}
                                className="bg-green-700 hover:bg-green-800 text-white"
                                onClick={() => downloadInvoice(item._id)}
                              >
                                {downloadingId === item._id ? "Downloading..." : "Download"}
                              </Button>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ================= MOBILE CARD VIEW ================= */}
            <div className="md:hidden space-y-4">
              {bookings.map((item) => {
                const statusColor =
                  item.bookingStatus === "confirmed"
                    ? "bg-green-100 text-green-700"
                    : item.bookingStatus === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700";

                return (
                  <div
                    key={item._id}
                    className="bg-white border rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {item.facilityName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.sportName}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusColor}`}
                      >
                        {item.bookingStatus}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-sm text-gray-600">
                      <span>
                        {fmt(item.rentalDate)}
                      </span>
                      <span className="font-medium text-green-700">
                        ₹{item.finalAmount ?? item.totalAmount}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">

                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 flex items-center justify-center"
                        onClick={() => setSelectedBooking(item)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {/* Download Button */}
                      <Button
                        size="sm"
                        disabled={downloadingId === item._id}
                        className="flex-1 flex items-center justify-center bg-green-700 hover:bg-green-800 text-white"
                        onClick={() => downloadInvoice(item._id)}
                      >
                        {downloadingId === item._id ? "Downloading..." : "Download"}
                      </Button>

                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ================= DETAILS (DESKTOP MODAL / MOBILE SHEET) ================= */}

      {isMobile ? (
        <Sheet
          open={!!selectedBooking}
          onOpenChange={() => setSelectedBooking(null)}
        >
          <SheetContent
            side="bottom"
            className="h-[80vh] rounded-t-2xl"
          >
            {selectedBooking && (
              <BookingDetails
                booking={selectedBooking}
              />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 relative">
              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>

              <BookingDetails
                booking={selectedBooking}
              />
            </div>
          </div>
        )
      )}
    </>
  );
}

/* ================= DETAILS COMPONENT ================= */
function BookingDetails({ booking }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-green-800 mb-1">
        {booking.facilityName}
      </h2>

      <p className="text-xs text-gray-500 mb-3">
        Booking ID: {booking._id}
      </p>

      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px] mb-4 capitalize">
        <CheckCircle className="w-3 h-3" />
        {booking.bookingStatus}
      </span>

      <div className="border-t mb-4"></div>

      <div className="space-y-4 text-sm">
        <div className="flex gap-2">
          <Calendar className="text-green-700 w-4 h-4 mt-1" />
          <div>
            <p className="font-medium">
              {format(new Date(booking.rentalDate), "dd MMM yyyy")}
            </p>
            <p className="text-xs text-gray-500">
              Booking Date
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <Trophy className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">
                {booking.sportName}
              </p>
              <p className="text-xs text-gray-500">
                Sport
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <MapPin className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">
                {booking.facilityName}
              </p>
              <p className="text-xs text-gray-500">
                Facility
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Clock className="text-green-700 w-4 h-4 mt-1" />
          <div>
            <p className="font-medium mb-1">
              Booked Slots
            </p>
            <div className="flex flex-wrap gap-2">
              {booking.slotLabels?.map((slot, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t my-4"></div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Duration</span>
          <span>
            {booking.durationHours} hour
            {booking.durationHours > 1 && "s"}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Rate</span>
          <span>₹{booking.hourlyRate}</span>
        </div>

        {booking.totalDiscountAmount > 0 && (
          <div className="flex justify-between text-green-600 text-xs">
            <span>Discount</span>
            <span>
              - ₹{booking.totalDiscountAmount}
            </span>
          </div>
        )}

        <div className="border-t pt-2 flex justify-between font-semibold text-base text-green-700">
          <span>Total Amount</span>
          <span>
            ₹{booking.finalAmount ??
              booking.totalAmount}
          </span>
        </div>
      </div>
    </>
  );
}