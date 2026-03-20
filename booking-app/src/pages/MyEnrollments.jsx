import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  X,
  CalendarIcon,
  Trophy,
  Clock,
  User,
  CheckCircle,
  MoreVertical,
  ShieldCheck,
  Info,
  Pin
} from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ================= DATE ================= */

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

/* ================= TIME ================= */

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = time.split(":");
  let hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return m === "00" ? `${hour} ${ampm}` : `${hour}:${m} ${ampm}`;
}

/* ================= STATUS ================= */

function getEnrollmentUiStatus(en) {
  const today = new Date();

  // ✅ PRIORITY: LEAVE STATUS
  if (en.leaveActive && en.leaveStartDate && en.leaveEndDate) {
    const start = new Date(en.leaveStartDate);
    const end = new Date(en.leaveEndDate);

    if (today >= start && today <= end) {
      return "on-leave";
    }
  }

  const start = safeDate(en.startDate);
  const end = safeDate(en.endDate);

  if (!start || !end) return "pending";
  if (today < start) return "upcoming";
  if (today > end) return "expired";

  return "active";
}

function canApplyLeave(en) {
  return getEnrollmentUiStatus(en) === "active";
}

function statusBadge(status) {
  if (status === "on-leave") {
    return "bg-blue-100 text-blue-700";
  }
  if (status === "active") {
    return "bg-green-100 text-green-700";
  }
  if (status === "upcoming") {
    return "bg-yellow-100 text-yellow-700";
  }
  if (status === "expired") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-700";
}

function statusLabel(status) {
  if (status === "on-leave") return "On Leave";
  if (status === "active") return "Active";
  if (status === "upcoming") return "Upcoming";
  if (status === "expired") return "Expired";
  return "Pending";
}

function getLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

const formatLocalDate = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function MyEnrollments() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [leaveEnrollment, setLeaveEnrollment] = useState(null);
  const [leaveStep, setLeaveStep] = useState(0);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  /* ================= SCREEN CHECK ================= */

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    try {
      const res = await api.get("/users/my-enrollments");
      setEnrollments(res.data || []);
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to load enrollments"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= DOWNLOAD ================= */

  const downloadInvoice = async (id) => {
    try {
      const response = await api.get(`/invoice/enrollment/${id}/download`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `invoice-${id}.pdf`);

      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);

      toast({ title: "Invoice downloaded" });
    } catch {
      toast({
        variant: "destructive",
        title: "Download failed"
      });
    }
  };

  /* ================= LEAVE ================= */

  const resetLeaveState = () => {
    setLeaveEnrollment(null);
    setLeaveStep(0);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    setPolicyAccepted(false);
    setLeaveSubmitting(false);
  };

  const openLeaveFlow = (en) => {
    setLeaveEnrollment(en);
    setLeaveStep(1);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    setPolicyAccepted(false);
  };

  const leaveDays = getLeaveDays(leaveStart, leaveEnd);
  const canContinueLeaveStep =
    !!leaveStart &&
    !!leaveEnd &&
    new Date(leaveEnd) >= new Date(leaveStart) &&
    leaveDays > 0;

  const applyLeave = async () => {
    if (!leaveEnrollment) return;

    try {
      setLeaveSubmitting(true);

      await api.post(`/enrollments/${leaveEnrollment._id}/leave`, {
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason
      });

      toast({ title: "Leave applied successfully" });

      await fetchData();
      resetLeaveState();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Leave request failed",
        description: err?.response?.data?.message || "Please try again"
      });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const rows = useMemo(() => enrollments || [], [enrollments]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        Loading enrollments...
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto py-4 px-4">
        <h1 className="text-xl font-semibold mb-4 text-green-800">
          My Enrollments
        </h1>

        {/* ================= DESKTOP TABLE ================= */}

        <div className="hidden md:block bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Sport</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Batch Time</th>
                <th className="p-3">Enrolled On</th>
                <th className="p-3">Training Duration</th>
                <th className="p-3">Status</th>
                <th className="p-3">Leave</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((en) => {
                const batch = en.batchId;
                const uiStatus = getEnrollmentUiStatus(en);

                return (
                  <tr key={en._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{en.sportName}</td>

                    <td className="p-3">{en.batchName || batch?.name}</td>

                    <td className="p-3 text-xs">
                      {formatTime(batch?.startTime)} –{" "}
                      {formatTime(batch?.endTime)}
                    </td>

                    <td className="p-3">{fmt(en.createdAt)}</td>

                    <td className="p-3">
                      {fmt(en.startDate)} – {fmt(en.endDate)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(
                          uiStatus
                        )}`}
                      >
                        {statusLabel(uiStatus)}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {en.leaveActive && en.leaveStartDate && en.leaveEndDate ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {fmt(en.leaveStartDate)} – {fmt(en.leaveEndDate)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setSelected(en)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => downloadInvoice(en._id)}
                          >
                            Download
                          </DropdownMenuItem>

                          {canApplyLeave(en) && (
                            <DropdownMenuItem onClick={() => openLeaveFlow(en)}>
                              Apply Leave
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE CARDS ================= */}

        <div className="md:hidden space-y-4">
          {rows.map((en) => {
            const batch = en.batchId;
            const uiStatus = getEnrollmentUiStatus(en);

            return (
              <div
                key={en._id}
                className="bg-white border rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {en.batchName || batch?.name}
                    </h3>

                    <p className="text-sm text-gray-500">{en.sportName}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusBadge(
                        uiStatus
                      )}`}
                    >
                      {statusLabel(uiStatus)}
                    </span>
                    {en.leaveActive && en.leaveStartDate && en.leaveEndDate && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Leave</span>
                        <span className="text-right text-green-700 font-medium">
                          {fmt(en.leaveStartDate)} – {fmt(en.leaveEndDate)}
                        </span>
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setSelected(en)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => downloadInvoice(en._id)}
                        >
                          Download
                        </DropdownMenuItem>

                        {canApplyLeave(en) && (
                          <DropdownMenuItem onClick={() => openLeaveFlow(en)}>
                            Apply Leave
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Batch Time</span>
                    <span className="text-right">
                      {formatTime(batch?.startTime)} –{" "}
                      {formatTime(batch?.endTime)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Training</span>
                    <span className="text-right">
                      {fmt(en.startDate)} – {fmt(en.endDate)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Enrolled On</span>
                    <span className="text-right">{fmt(en.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MOBILE DRAWER ================= */}

      {/* ================= VIEW DETAILS MODAL ================= */}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="
      w-full 
      max-w-md md:max-w-lg 
      bg-white 
      rounded-2xl 
      shadow-2xl 
      p-5 md:p-6 
      max-h-[90vh] 
      overflow-y-auto 
      relative
    ">

            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <EnrollmentDetails en={selected} />
          </div>
        </div>
      )}
      {/* ================= LEAVE STEP 1 ================= */}

      {leaveEnrollment && leaveStep === 1 && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Apply Leave
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your leave dates and reason.
                </p>
              </div>

              <button
                onClick={resetLeaveState}
                className="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="bg-gray-50 border rounded-xl p-4">
                <p className="text-xs text-gray-500">Batch</p>
                <p className="font-medium text-gray-900">
                  {leaveEnrollment.batchName || leaveEnrollment.batchId?.name}
                </p>

                <p className="text-xs text-gray-500 mt-3">Training Period</p>
                <p className="font-medium text-gray-900">
                  {fmt(leaveEnrollment.startDate)} –{" "}
                  {fmt(leaveEnrollment.endDate)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* START DATE */}

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Start Date
                  </label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {leaveStart
                          ? format(new Date(leaveStart), "dd MMM yyyy")
                          : "Select start date"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0 z-[100]">
                      <Calendar
                        mode="single"
                        selected={
                          leaveStart ? new Date(`${leaveStart}T00:00:00`) : undefined
                        }
                        onSelect={(date) => {
                          if (!date) return;

                          const selected = new Date(date);
                          const max = leaveEnrollment?.endDate
                            ? new Date(leaveEnrollment.endDate)
                            : null;

                          if (max && selected > max) {
                            toast({
                              variant: "destructive",
                              title: "Invalid date",
                              description: "Leave cannot exceed your enrollment period",
                            });
                            return;
                          }

                          setLeaveStart(formatLocalDate(date));
                        }}
                        disabled={(date) => {
                          const enrollmentStart = leaveEnrollment?.startDate
                            ? new Date(leaveEnrollment.startDate)
                            : null;

                          const end = leaveEnd ? new Date(leaveEnd) : null;

                          return (
                            (enrollmentStart && date < enrollmentStart) ||
                            (end && date > end) // 🔥 restrict after end date
                          );
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* END DATE */}

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    End Date
                  </label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {leaveEnd
                          ? format(new Date(leaveEnd), "dd MMM yyyy")
                          : "Select end date"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0 z-[100]">
                      <Calendar
                        mode="single"
                        selected={
                          leaveEnd ? new Date(`${leaveEnd}T00:00:00`) : undefined
                        }
                        onSelect={(date) => {
                          if (!date) return;

                          const selected = new Date(date);
                          const max = leaveEnrollment?.endDate
                            ? new Date(leaveEnrollment.endDate)
                            : null;

                          if (max && selected > max) {
                            toast({
                              variant: "destructive",
                              title: "Invalid date",
                              description: "You can only select dates within your training period",
                            });
                            return;
                          }

                          setLeaveEnd(formatLocalDate(date));
                        }}
                        disabled={(date) => {
                          const start = leaveStart ? new Date(leaveStart) : null;
                          const enrollmentEnd = leaveEnrollment?.endDate
                            ? new Date(leaveEnrollment.endDate)
                            : null;

                          return (
                            (start && date < start) || // 🔥 restrict before start date
                            (enrollmentEnd && date > enrollmentEnd)
                          );
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {leaveEnd && leaveEnrollment?.endDate && new Date(leaveEnd) > new Date(leaveEnrollment.endDate) && (
                  <p className="text-red-600 text-sm mt-2">
                    ⚠ You can select dates only up to your training end date (
                    {format(new Date(leaveEnrollment.endDate), "dd MMM yyyy")})
                  </p>
                )}
              </div>


              <div>
                <label className="text-sm font-medium mb-2 block">
                  Reason
                </label>
                <Textarea
                  placeholder="Enter reason for leave"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={4}
                />
              </div>

              {leaveStart && leaveEnd && (
                <div className="rounded-xl border bg-green-50 border-green-100 p-4">
                  <p className="text-sm text-green-800">
                    Leave duration:{" "}
                    <span className="font-semibold">{leaveDays} day(s)</span>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" onClick={resetLeaveState}>
                Cancel
              </Button>

              <Button
                className="bg-green-700 hover:bg-green-800 text-white"
                disabled={!canContinueLeaveStep}
                onClick={() => setLeaveStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LEAVE STEP 2 POLICY ================= */}

      {leaveEnrollment && leaveStep === 2 && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full md:max-w-2xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-green-700" />
                  Leave & Extension Policy
                </h2>

                <p className="text-sm md:text-base text-gray-500 mt-2">
                  Understand how leaves affect your enrollment period.
                </p>
              </div>

              <button
                onClick={resetLeaveState}
                className="rounded-full border border-green-300 p-1.5 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4 md:p-5">
                <div className="flex gap-3">
                  <CalendarIcon className="w-5 h-5 text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Leave Extension
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mt-1">
                      If you take leave during your enrollment period, your
                      batch end date will be extended by the same number of
                      leave days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 md:p-5">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Approved Leaves Only
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mt-1">
                      Only leaves that are formally approved by the academy will
                      qualify for end-date extension.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 md:p-5">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Maximum Leave Limit
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mt-1">
                      A maximum of 10 leave days per enrollment cycle is
                      allowed. Leaves beyond the limit will not extend the batch
                      period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 md:p-5">
                <div className="flex gap-3">
                  <Pin className="w-5 h-5 text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800">Example</h3>
                    <p className="text-sm md:text-base text-gray-700 mt-1">
                      If your batch ends on <strong>30 June 2026</strong> and
                      you take <strong>{leaveDays} approved leave day(s)</strong>
                      , your new end date will be extended accordingly.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm md:text-base text-gray-700">
                  I understand and accept the leave policy.
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => setLeaveStep(1)}>
                Back
              </Button>

              <Button
                className="bg-green-700 hover:bg-green-800 text-white"
                disabled={!policyAccepted || leaveSubmitting}
                onClick={applyLeave}
              >
                {leaveSubmitting ? "Applying..." : "Apply Leave"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= DETAILS ================= */

function EnrollmentDetails({ en }) {
  const batch = en.batchId;
  const uiStatus = getEnrollmentUiStatus(en);

  return (
    <>
      <h2 className="text-lg font-semibold text-green-800 mb-1">
        {en.batchName || batch?.name}
      </h2>

      <p className="text-xs text-gray-500 mb-3">Enrollment ID: {en._id}</p>

      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] mb-4 ${statusBadge(
          uiStatus
        )}`}
      >
        <CheckCircle className="w-3 h-3" />
        {statusLabel(uiStatus)}
      </span>

      <div className="border-t mb-4" />

      {/* ================= TRAINING INFO ================= */}

      <div className="space-y-4 text-sm">
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
            <p className="font-medium">{en.coachName || batch?.coachName}</p>
            <p className="text-xs text-gray-500">Coach</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Clock className="text-green-700 w-4 h-4 mt-1" />
          <div>
            <p className="font-medium">
              {formatTime(batch?.startTime)} – {formatTime(batch?.endTime)}
            </p>
            <p className="text-xs text-gray-500">Batch Time</p>
          </div>
        </div>

        <div className="flex gap-2">
          <CalendarIcon className="text-green-700 w-4 h-4 mt-1" />
          <div>
            <p className="font-medium">
              {fmt(en.startDate)} – {fmt(en.endDate)}
            </p>
            <p className="text-xs text-gray-500">Training Duration</p>
          </div>
        </div>

        {en.leaveActive && en.leaveStartDate && en.leaveEndDate && (
          <>
            <div className="border-t my-4" />

            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-gray-800 mb-2">Leave Details</h3>

              <div className="flex justify-between">
                <span>Leave Period</span>
                <span className="text-green-700 font-medium">
                  {fmt(en.leaveStartDate)} – {fmt(en.leaveEndDate)}
                </span>
              </div>

              {en.leaveReason && (
                <div className="flex justify-between">
                  <span>Reason</span>
                  <span className="text-right">{en.leaveReason}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>


      <div className="border-t my-4" />

      {/* ================= PAYMENT INFO ================= */}

      <div className="space-y-2 text-sm">
        <h3 className="font-semibold text-gray-800 mb-2">Payment Details</h3>

        <div className="flex justify-between">
          <span>Plan Type</span>
          <span className="capitalize">{en.planType}</span>
        </div>

        <div className="flex justify-between">
          <span>Duration</span>
          <span>
            {en.durationMonths} month{en.durationMonths > 1 ? "s" : ""}
          </span>
        </div>

        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between">
            <span>Base Amount</span>
            <span>₹{en.baseAmount}</span>
          </div>

          {en.registrationFee > 0 && (
            <div className="flex justify-between">
              <span>Registration Fee</span>
              <span>₹{en.registrationFee}</span>
            </div>
          )}

          {en.totalDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>- ₹{en.totalDiscountAmount}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
            <span>Total Amount</span>
            <span>₹{en.finalAmount}</span>
          </div>
        </div>
      </div>
    </>
  );
}