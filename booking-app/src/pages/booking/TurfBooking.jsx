import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { Check, ArrowLeft, CalendarIcon } from "lucide-react";

import api from "@/lib/axios";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ASSETS_BASE =
  import.meta.env.VITE_ASSETS_BASE_URL || "http://localhost:5000";

/* ===================== STEPPER ===================== */

const Stepper = ({ active }) => {
  const steps = [
    "Sport",
    "Facility & Date",
    "Time Slot",
    "Review & Details",
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-center">
        <div className="flex items-center justify-between w-full max-w-3xl">

          {steps.map((label, index) => {
            const step = index + 1;
            const isCompleted = active > step;
            const isActive = active === step;
            const isLast = step === steps.length;

            return (
              <div key={step} className="flex items-center flex-1">

                {/* STEP */}
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3">

                  <div
                    className={`
                      w-8 h-8 md:w-9 md:h-9
                      rounded-full flex items-center justify-center
                      text-white text-sm font-semibold
                      transition-all duration-300
                      ${isCompleted
                        ? "bg-green-800"
                        : isActive
                          ? "bg-green-700"
                          : "bg-gray-300 text-gray-500"
                      }
                    `}
                  >
                    {isCompleted ? <Check size={16} /> : step}
                  </div>

                  <span
                    className={`
                      text-[11px] sm:text-sm font-medium whitespace-nowrap
                      ${isCompleted || isActive
                        ? "text-green-700"
                        : "text-gray-400"
                      }
                    `}
                  >
                    {label}
                  </span>
                </div>

                {/* CONNECTOR */}
                {!isLast && (
                  <div
                    className={`
                      flex-1 h-[2px] mx-2 sm:mx-4 transition-all duration-300
                      ${active > step
                        ? "bg-green-700"
                        : "bg-gray-300"
                      }
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
/* ===================== MAIN COMPONENT ===================== */

export default function TurfBooking() {
  const navigate = useNavigate();

  /* ================= DATA ================= */
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [slots, setSlots] = useState([]);

  /* ================= SELECTION ================= */
  const [sport, setSport] = useState(null);
  const [facility, setFacility] = useState(null);
  const [date, setDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);

  /* ================= LOAD INITIAL DATA ================= */
  useEffect(() => {
    api.get("/sports").then((res) => setSports(res.data));
    api.get("/facilities").then((res) =>
      setFacilities(res.data.filter((f) => f.status === "active"))
    );
  }, []);

  /* ================= FILTER FACILITY BY SPORT ================= */
  const filteredFacilities = useMemo(() => {
    if (!sport) return [];
    return facilities.filter((f) =>
      f.sports?.some((s) => s._id === sport._id)
    );
  }, [sport, facilities]);

  /* ================= LOAD SLOTS ================= */
  useEffect(() => {
    if (!facility || !date) return;

    api
      .get(
        `/facilities/${facility._id}/slots?date=${format(
          date,
          "yyyy-MM-dd"
        )}`
      )
      .then((res) => {
        setSlots(res.data || []);
        setSelectedSlots([]);
      });
  }, [facility, date]);

  /* ================= SLOT TOGGLE ================= */
  const toggleSlot = (slot) => {
    if (slot.status !== "available") return;

    setSelectedSlots((prev) =>
      prev.includes(slot.time)
        ? prev.filter((t) => t !== slot.time)
        : [...prev, slot.time]
    );
  };

  /* ================= BACK BUTTON LOGIC ================= */
  const handleBack = () => {
    if (selectedSlots.length > 0) {
      setSelectedSlots([]);
      return;
    }

    if (date) {
      setDate(null);
      setSlots([]);
      return;
    }

    if (facility) {
      setFacility(null);
      return;
    }

    if (sport) {
      setSport(null);
      return;
    }
  };

  /* ================= CONTINUE ================= */
  const handleContinue = () => {
    navigate("/book-turf/confirm", {
      state: {
        sportId: sport._id,
        sportName: sport.name,
        sportImage: sport.iconUrl,
        facilityId: facility._id,
        facilityName: facility.name,
        date: format(date, "yyyy-MM-dd"),
        slots: slots.filter((s) =>
          selectedSlots.includes(s.time)
        ),
        hourlyRate: facility.hourlyRate,
      },
    });
  };

  /* ================= ACTIVE STEP ================= */
  const getActiveStep = () => {
    if (!sport) return 1;
    if (!facility || !date) return 2;
    if (!selectedSlots.length) return 3;
    return 4;
  };

  const activeStep = getActiveStep();

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">

      {/* ================= STEPPER ================= */}
      <Stepper active={activeStep} />

      {/* ================= BACK BUTTON ================= */}
      {activeStep > 1 && (
        <div>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
        </div>
      )}

      {/* ================= TITLE ================= */}
      <div className="text-center ">
        <h1 className="text-2xl md:text-3xl font-bold text-green-800">
          Book Your Session
        </h1>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          Select sport, facility, date and time slot
        </p>
      </div>

      {/* ================= SPORT LIST ================= */}
      {!sport && (
        <div className="space-y-4">
          {sports.map((s) => (
            <div
              key={s._id}
              onClick={() => setSport(s)}
              className="flex items-center justify-between p-4 rounded-2xl border hover:border-green-600 cursor-pointer transition"
            >
              <div className="flex items-center gap-4">
                <img
                  src={`${ASSETS_BASE}${s.iconUrl}`}
                  alt={s.name}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-semibold text-base md:text-lg">
                    {s.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Click to continue
                  </p>
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= FACILITY + DATE ================= */}
      {sport && !selectedSlots.length && (
        <div className="grid md:grid-cols-2 gap-8">

          {/* FACILITIES */}
          <div>
            <h2 className="font-semibold mb-3">
              Select Facility
            </h2>

            <div className="space-y-3">
              {filteredFacilities.map((f) => (
                <div
                  key={f._id}
                  onClick={() => setFacility(f)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition",
                    facility?._id === f._id
                      ? "border-green-700 bg-green-50"
                      : "hover:border-green-500"
                  )}
                >
                  <h3 className="font-medium">{f.name}</h3>
                  <p className="text-sm text-gray-500">
                    ₹{f.hourlyRate}/hour
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* DATE */}
          <div>
            <h2 className="font-semibold mb-3">
              Select Date
            </h2>

            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) =>
                  isBefore(d, startOfDay(new Date()))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= SLOTS ================= */}
      {slots.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4 text-center">
            Pick a Time Slot
          </h2>

          <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-center gap-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={slot.status !== "available"}
                onClick={() => toggleSlot(slot)}
                className={cn(
                  "px-1 sm:px-6 py-2 sm:py-3 rounded-xl border text-sm font-medium transition",
                  selectedSlots.includes(slot.time)
                    ? "bg-green-700 text-white"
                    : "bg-white border-gray-300 hover:border-green-600",
                  slot.status !== "available" &&
                  "opacity-40 cursor-not-allowed"
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= CONTINUE ================= */}
      {selectedSlots.length > 0 && (
        <Button
          onClick={handleContinue}
          className="w-full bg-green-700 hover:bg-green-800 py-6 text-lg rounded-xl"
        >
          Continue to Review
        </Button>
      )}
    </div>
  );
}