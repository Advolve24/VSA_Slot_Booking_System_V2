import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";

import { Calendar } from "@/components/ui/calendar";

import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, CheckCircle2 } from "lucide-react";

export default function ApplyLeave() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [enrollment, setEnrollment] = useState(null);
  const [batch, setBatch] = useState(null);

  const [leaveStart, setLeaveStart] = useState();
  const [leaveEnd, setLeaveEnd] = useState();
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ================= FETCH ENROLLMENT ================= */

  useEffect(() => {

    const fetchEnrollment = async () => {

      try {

        const res = await api.get(`/enrollments/public/${id}`);

        if (!res.data.enrollment.renewLinkActive) {

          toast({
            variant: "destructive",
            title: "Link expired",
            description: "This action link is no longer active."
          });

          navigate("/", { replace: true });
          return;

        }

        setEnrollment(res.data.enrollment);
        setBatch(res.data.batch);

      } catch {

        toast({
          variant: "destructive",
          title: "Invalid or expired leave link"
        });

        navigate("/", { replace: true });

      } finally {

        setLoading(false);

      }

    };

    fetchEnrollment();

  }, [id]);

  /* ================= APPLY LEAVE ================= */

  const applyLeave = async () => {

    if (!leaveStart) {

      toast({
        variant: "destructive",
        title: "Please select leave start date"
      });

      return;

    }

    if (!reason.trim()) {

      toast({
        variant: "destructive",
        title: "Please enter leave reason"
      });

      return;

    }

    try {

      setSubmitting(true);

      await api.post(`/enrollments/${id}/renewal-leave`, {

        name: enrollment.playerName,
        startDate: leaveStart.toISOString(),
        endDate: leaveEnd ? leaveEnd.toISOString() : null,
        reason

      });

      setSuccess(true);

    } catch {

      toast({
        variant: "destructive",
        title: "Failed to submit leave"
      });

    }

    setSubmitting(false);

  };

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <div className="flex justify-center py-20">
        Loading...
      </div>
    );

  }

  if (!enrollment || !batch) {

    return (
      <div className="flex justify-center py-20 text-red-600">
        Invalid or expired leave link
      </div>
    );

  }

  /* ================= SUCCESS VIEW ================= */

  if (success) {

    return (

      <div className="max-w-xl mx-auto px-4 py-16">

        <div className="bg-white border rounded-xl p-8 text-center space-y-5">

          <CheckCircle2 className="mx-auto text-green-600 w-14 h-14" />

          <h2 className="text-2xl font-bold text-green-700">
            Leave Request Submitted
          </h2>

          <p className="text-gray-600 text-sm">
            Your leave request for <b>{batch.name}</b> has been submitted successfully.
            Our academy team will review it and contact you if required.
          </p>

          <div className="pt-3">

            <Button
              onClick={() => navigate("/")}
              className="bg-green-700 hover:bg-green-800"
            >
              Back to Home
            </Button>

          </div>

        </div>

      </div>

    );

  }

  /* ================= FORM VIEW ================= */

  return (

    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold text-orange-700">
            Apply Leave
          </h1>

          <p className="text-sm text-gray-600">
            Temporarily pause your coaching
          </p>

        </div>

        <Button
          variant="outline"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

      </div>

      {/* PLAYER INFO */}

      <div className="bg-white border rounded-xl p-5">

        <p className="font-semibold">
          {enrollment.playerName}
        </p>

        <p className="text-sm text-gray-500">
          {batch.name} • {enrollment.sportName}
        </p>

      </div>

      {/* FORM */}

      <div className="bg-white border rounded-xl p-5 space-y-5">

        <h2 className="font-semibold text-gray-800">
          Leave Details
        </h2>

        {/* DATE FIELDS */}

        <div className="grid md:grid-cols-2 gap-4">

          {/* START DATE */}

          <div className="space-y-1">

            <label className="text-sm font-medium">
              Leave Start Date
            </label>

            <Popover>

              <PopoverTrigger asChild>

                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-orange-600" />

                  {leaveStart
                    ? format(leaveStart, "PPP")
                    : "Select start date"}
                </Button>

              </PopoverTrigger>

              <PopoverContent className="w-auto p-0">

                <Calendar
                  mode="single"
                  selected={leaveStart}
                  onSelect={setLeaveStart}
                  disabled={{
                    before: new Date(enrollment.endDate)
                  }}
                  initialFocus
                  className="rounded-md border [&_.rdp-day_selected]:bg-orange-600"
                />

              </PopoverContent>

            </Popover>

          </div>

          {/* END DATE */}

          <div className="space-y-1">

            <label className="text-sm font-medium">
              Leave End Date (optional)
            </label>

            <Popover>

              <PopoverTrigger asChild>

                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-orange-600" />

                  {leaveEnd
                    ? format(leaveEnd, "PPP")
                    : "Select end date"}
                </Button>

              </PopoverTrigger>

              <PopoverContent className="w-auto p-0">

                <Calendar
                  mode="single"
                  selected={leaveEnd}
                  onSelect={setLeaveEnd}
                  disabled={{
                    before: leaveStart || new Date(enrollment.endDate)
                  }}
                  initialFocus
                  className="rounded-md border [&_.rdp-day_selected]:bg-orange-600"
                />

              </PopoverContent>

            </Popover>

          </div>

        </div>

        {/* REASON */}

        <div className="space-y-1">

          <label className="text-sm font-medium">
            Reason
          </label>

          <Textarea
            placeholder="Reason for leave..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

        </div>

        {/* BUTTON */}

        <Button
          onClick={applyLeave}
          disabled={submitting}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          Submit Leave Request
        </Button>

      </div>

    </div>

  );

}