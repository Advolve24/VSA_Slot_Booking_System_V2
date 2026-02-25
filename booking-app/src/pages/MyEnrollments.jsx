import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  X,
  Calendar,
  Trophy,
  Clock,
  User,
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

export default function MyEnrollments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/users/my-enrollments");
        setEnrollments(res.data || []);
      } catch {
        toast({
          variant: "destructive",
          title: "Failed to load enrollments",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const downloadInvoice = async (id) => {
  try {
    // 🔄 Show loading toast
    toast({
      title: "Preparing invoice...",
      description: "Please wait while we generate your PDF.",
    });

    const response = await api.get(
      `/invoice/enrollment/${id}/download`,
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(
      new Blob([response.data])
    );

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice-${id}.pdf`);
    document.body.appendChild(link);
    link.click();

    window.URL.revokeObjectURL(url);

    // ✅ Success toast
    toast({
      title: "Invoice downloaded",
      description: "Your invoice has been downloaded successfully.",
    });

  } catch (error) {
    // ❌ Error toast
    toast({
      variant: "destructive",
      title: "Download failed",
      description: "Unable to download invoice. Please try again.",
    });
  }
};

  const rows = useMemo(() => enrollments || [], [enrollments]);
  if (loading) return <div className="py-20 text-center">Loading...</div>;
  return (
    <>
      <div className="max-w-6xl mx-auto py-4 px-4">
        <h1 className="text-xl font-semibold mb-4 text-green-800">
          My Enrollments
        </h1>

        {rows.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center text-gray-500 shadow-sm">
            No enrollments found
          </div>
        ) : (
          <>
            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">Sport</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3">Enrolled On</th>
                      <th className="p-3">Batch Duration</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((en) => {
                      const batch = en.batchId;
                      return (
                        <tr
                          key={en._id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="p-3 font-medium">
                            {en.sportName || "-"}
                          </td>

                          <td className="p-3">
                            {en.batchName || batch?.name || "-"}
                          </td>

                          <td className="p-3 text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {batch?.schedule || "-"}
                              </span>
                              {en.slotLabel && (
                                <span className="text-green-600 font-semibold mt-1">
                                  {en.slotLabel}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            {fmt(en.createdAt)}
                          </td>

                          <td className="p-3">
                            {fmt(batch?.startDate)} –{" "}
                            {fmt(batch?.endDate)}
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">

                              {/* View Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelected(en)}
                              >
                                <Eye className="h-4 w-4" />
                                view
                              </Button>

                              {/* Download Invoice Button */}
                              <Button
                                size="sm"
                                className="bg-green-700 hover:bg-green-800 text-white"
                                onClick={() => downloadInvoice(en._id)}
                              >
                                Download
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
              {rows.map((en) => {
                const batch = en.batchId;
                return (
                  <div
                    key={en._id}
                    className="bg-white border rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {en.batchName || batch?.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {en.sportName}
                        </p>
                      </div>
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      <div>
                        {fmt(batch?.startDate)} –{" "}
                        {fmt(batch?.endDate)}
                      </div>
                      <div>{batch?.schedule}</div>
                      {en.slotLabel && (
                        <div className="text-green-600 font-semibold">
                          {en.slotLabel}
                        </div>
                      )}
                    </div>

                    {/* ================= INVOICE ACTIONS (MOBILE) ================= */}
                    <div className="border-t pt-4 mt-4 flex gap-3">

                      {/* View Details Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 flex items-center justify-center"
                        onClick={() => setSelected(en)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {/* Download Invoice Button */}
                      <Button
                        size="sm"
                        className="flex-1 flex items-center justify-center bg-green-700 hover:bg-green-800 text-white"
                        onClick={() => downloadInvoice(en._id)}
                      >
                        Download
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
          open={!!selected}
          onOpenChange={() => setSelected(null)}
        >
          <SheetContent
            side="bottom"
            className="h-[85vh] rounded-t-2xl"
          >
            {selected && <EnrollmentDetails en={selected} />}
          </SheetContent>
        </Sheet>
      ) : (
        selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 relative">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>

              <EnrollmentDetails en={selected} />
            </div>
          </div>
        )
      )}
    </>
  );
}

/* ================= DETAILS COMPONENT ================= */
function EnrollmentDetails({ en }) {
  const batch = en.batchId;

  return (
    <>
      <h2 className="text-lg font-semibold text-green-800 mb-1">
        {en.batchName || batch?.name}
      </h2>

      <p className="text-xs text-gray-500 mb-3">
        Enrollment ID: {en._id}
      </p>

      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px] mb-4">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>

      <div className="border-t mb-4"></div>

      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <Trophy className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">{en.sportName}</p>
              <p className="text-xs text-gray-500">Sport</p>
            </div>
          </div>

          <div className="flex gap-2">
            <User className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">
                {en.coachName || batch?.coachName}
              </p>
              <p className="text-xs text-gray-500">Coach</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Clock className="text-green-700 w-4 h-4 mt-1" />
          <div>
            <p className="font-medium">
              {batch?.schedule}
            </p>
            {en.slotLabel && (
              <div className="text-green-600 font-semibold">
                {en.slotLabel}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Batch Schedule
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <Calendar className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">
                {fmt(en.createdAt)}
              </p>
              <p className="text-xs text-gray-500">
                Enrollment Date
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Calendar className="text-green-700 w-4 h-4 mt-1" />
            <div>
              <p className="font-medium">
                {fmt(batch?.startDate)} –{" "}
                {fmt(batch?.endDate)}
              </p>
              <p className="text-xs text-gray-500">
                Batch Duration
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t my-4"></div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Plan Type</span>
          <span className="capitalize">
            {en.planType}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Duration</span>
          <span>{en.durationMonths || 0} month</span>
        </div>

        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between">
            <span>Base Amount</span>
            <span>₹{en.baseAmount || 0}</span>
          </div>

          {en.totalDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600 text-xs">
              <span>Total Discount</span>
              <span>- ₹{en.totalDiscountAmount}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between font-semibold text-base text-green-700">
            <span>Total Amount</span>
            <span>
              ₹{en.finalAmount ?? en.baseAmount ?? 0}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}