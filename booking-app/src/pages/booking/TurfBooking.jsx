import { useEffect, useState, useMemo } from "react";
import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { Check, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

const ASSETS_BASE =
  import.meta.env.VITE_ASSETS_BASE_URL || "http://localhost:5000";

/* ===================== STEPPER ===================== */

const formatTime12 = (time) => {
  if (!time) return "";

  // if already contains AM/PM, return as is
  if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
    return time;
  }

  const [hour, minute] = time.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12 || 12;

  return `${h}:${minute} ${ampm}`;
};

const timeToMinutes = (time) => {
  if (!time) return 0;

  // If time already in 24h format (from input)
  if (!time.toLowerCase().includes("am") && !time.toLowerCase().includes("pm")) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  // Convert 12h → 24h
  const [timePart, modifier] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier.toLowerCase() === "pm" && hours !== 12) hours += 12;
  if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const isTimeBetween = (value, start, end) => {
  const v = timeToMinutes(value);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);

  return v >= s && v <= e;
};

const Stepper = ({ active }) => {
  const steps = ["Sport", "Facility", "Date & Time", "Review"];

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
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
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
                    className={`text-[11px] sm:text-sm font-medium whitespace-nowrap
                      ${isCompleted || isActive
                        ? "text-green-700"
                        : "text-gray-400"
                      }`}
                  >
                    {label}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={`flex-1 h-[1px] mx-2 sm:mx-4 transition-all duration-300
                      ${active > step ? "bg-green-700" : "bg-gray-300"}`}
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
  const location = useLocation();
  const startRef = useRef(null);
  const endRef = useRef(null);
  /* ================= DATA ================= */

  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [unavailable, setUnavailable] = useState([]);

  /* ================= SELECTION ================= */

  const [sport, setSport] = useState(null);
  const [facility, setFacility] = useState(null);
  const [date, setDate] = useState(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    api.get("/sports").then((res) => setSports(res.data));

    api.get("/facilities").then((res) =>
      setFacilities(res.data.filter((f) => f.status === "active"))
    );
  }, []);

  /* ================= FILTER FACILITY ================= */

  const filteredFacilities = useMemo(() => {
    if (!sport) return [];
    return facilities.filter((f) =>
      f.sports?.some((s) => s._id === sport._id)
    );
  }, [sport, facilities]);

  /* ================= LOAD UNAVAILABLE ================= */

  useEffect(() => {
    if (!facility || !date) return;

    api
      .get(
        `/facilities/${facility._id}/unavailable?date=${format(
          date,
          "yyyy-MM-dd"
        )}`
      )
      .then((res) => {
        setUnavailable(res.data || []);
      });
  }, [facility, date]);

  /* ================= RESTORE STATE ================= */

  useEffect(() => {
    if (!location.state) return;

    const { sportId, facilityId, date, startTime, endTime } = location.state;

    if (sportId && sports.length) {
      const selectedSport = sports.find((s) => s._id === sportId);
      if (selectedSport) setSport(selectedSport);
    }

    if (facilityId && facilities.length) {
      const selectedFacility = facilities.find((f) => f._id === facilityId);
      if (selectedFacility) setFacility(selectedFacility);
    }

    if (date) setDate(new Date(date));

    if (startTime) setStartTime(startTime);
    if (endTime) setEndTime(endTime);
  }, [location.state, sports, facilities]);

  /* ================= BACK BUTTON ================= */

  const handleBack = () => {
    if (endTime) {
      setEndTime("");
      return;
    }

    if (startTime) {
      setStartTime("");
      return;
    }

    if (date) {
      setDate(null);
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

        startTime,
        endTime,

        hourlyRate: facility.hourlyRate,
      },
    });
  };

  useEffect(() => {
    if (startTime && endTime && endTime <= startTime) {
      setEndTime("");
    }
  }, [startTime]);

  /* ================= ACTIVE STEP ================= */

  const getActiveStep = () => {
    if (!sport) return 1;
    if (!facility) return 2;
    if (!date || !startTime || !endTime) return 3;
    return 4;
  };

  const activeStep = getActiveStep();

  return (
    <div className="max-w-5xl mx-auto py-2 px-2 sm:px-4 space-y-3">

      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-green-800">
          Book Your Turf
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Choose sport, facility and preferred timing.
        </p>
      </div>

      {/* STEPPER */}
      <div className="overflow-x-auto">
        <Stepper active={activeStep} />
      </div>

      {/* BACK */}
      {activeStep > 1 && (
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      )}

      {/* ================= STEP 1 ================= */}

      {!sport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sports.map((s) => (
            <div
              key={s._id}
              onClick={() => setSport(s)}
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl border hover:border-green-600 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">

                <img
                  src={`${ASSETS_BASE}${s.iconUrl}`}
                  alt={s.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover"
                />

                <div>
                  <h3 className="font-semibold text-sm sm:text-base">
                    {s.name}
                  </h3>

                  <p className="text-xs text-gray-500">
                    Click to continue
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= STEP 2 ================= */}

      {sport && !facility && (
        <div className="space-y-3">

          <h2 className="font-semibold text-base sm:text-lg">
            Select Facility
          </h2>

          {filteredFacilities.map((f) => (
            <div
              key={f._id}
              onClick={() => setFacility(f)}
              className="p-3 sm:p-4 rounded-xl border hover:border-green-600 cursor-pointer transition"
            >
              <h3 className="font-medium text-sm sm:text-base">
                {f.name}
              </h3>

              <p className="text-xs sm:text-sm text-gray-500">
                ₹{f.hourlyRate}/hour
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ================= STEP 3 ================= */}

      {sport && facility && (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* CALENDAR */}

          <div className="bg-white border rounded-xl p-4 shadow-sm h-fit">

            <h2 className="font-semibold mb-2 text-base sm:text-lg">
              Select Date
            </h2>

            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => isBefore(d, startOfDay(new Date()))}
              className="w-full"
            />

            {date && (
              <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                Selected: <span className="font-medium">{format(date, "dd MMM yyyy")}</span>
              </div>
            )}

          </div>


          {/* TIME SECTION */}

          <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-4">

            <h2 className="font-semibold text-base sm:text-lg">
              Select Time
            </h2>

            {!date && (
              <p className="text-xs sm:text-sm text-gray-400">
                Please select a date first
              </p>
            )}

            {date && (
              <>
                <div className="grid grid-cols-2 gap-3">

                  {/* START */}

                  <div>
                    <label className="text-xs sm:text-sm font-medium">
                      Start
                    </label>

                    <Input
                      ref={startRef}
                      type="time"
                      value={startTime}
                      min={facility?.openingTime}
                      max={facility?.closingTime}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (!isTimeBetween(value, facility.openingTime, facility.closingTime)) {
                          alert("Selected time is outside facility hours");
                          return;
                        }

                        setStartTime(value);
                      }}
                      onClick={() => startRef.current?.showPicker()}
                      className="mt-1 cursor-pointer"
                    />
                  </div>


                  {/* END */}

                  <div>
                    <label
                      className="text-xs sm:text-sm font-medium cursor-pointer"
                      onClick={() => {
                        if (!startTime) return;
                        endRef.current?.showPicker();
                      }}
                    >
                      End
                    </label>

                    <Input
                      ref={endRef}
                      type="time"
                      value={endTime}
                      min={startTime || facility?.openingTime}
                      max={facility?.closingTime}
                      disabled={!startTime}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (!startTime) {
                          alert("Please select start time first");
                          return;
                        }

                        // Outside facility hours
                        if (!isTimeBetween(value, facility.openingTime, facility.closingTime)) {
                          alert("Selected time is outside facility hours");
                          return;
                        }

                        const startMin = timeToMinutes(startTime);
                        const endMin = timeToMinutes(value);

                        // ❌ must be after start
                        if (endMin <= startMin) {
                          alert("End time must be after start time");
                          return;
                        }

                        // ❌ minimum 1 hour validation
                        if (endMin - startMin < 60) {
                          alert("Minimum booking duration is 1 hour");
                          return;
                        }

                        setEndTime(value);
                      }}
                      onClick={() => endRef.current?.showPicker()}
                      className="mt-1 cursor-pointer"
                    />
                  </div>

                </div>


                {/* FACILITY TIMING INFO */}

                <p className="text-xs text-gray-500">
                  Available between{" "}
                  <span className="font-medium">
                    {formatTime12(facility?.openingTime)} – {formatTime12(facility?.closingTime)}
                  </span>
                </p>



                {/* UNAVAILABLE */}

                {unavailable.length > 0 && (
                  <div>

                    <h3 className="text-xs sm:text-sm font-medium mb-2 text-red-600">
                      Unavailable Time
                    </h3>

                    <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">

                      {unavailable.map((u, i) => (
                        <span
                          key={i}
                          className="text-[10px] sm:text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                        >
                          {formatTime12(u.startTime)} - {formatTime12(u.endTime)}
                        </span>
                      ))}

                    </div>

                  </div>
                )}


                {/* CONTINUE BUTTON */}

                {startTime && endTime && (
                  <Button
                    onClick={handleContinue}
                    className="w-full bg-green-700 hover:bg-green-800 py-4 text-base rounded-xl mt-2"
                  >
                    Continue to Review
                  </Button>
                )}

              </>
            )}

          </div>

        </div>

      )}

    </div>
  );
}