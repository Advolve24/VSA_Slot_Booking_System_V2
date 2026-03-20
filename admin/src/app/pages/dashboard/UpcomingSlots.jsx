import { Clock, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function UpcomingSlots({ slots = [] }) {
  const navigate = useNavigate();
  const now = new Date();

  const formatTime12h = (time) => {
    if (!time) return "";

    const [h, m] = time.split(":").map(Number);
    const hour12 = h % 12 || 12;
    const suffix = h >= 12 ? "PM" : "AM";

    return m === 0
      ? `${hour12} ${suffix}`
      : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
  };

  const formatRange = (start, end) => {
    if (!start || !end) return "";
    return `${formatTime12h(start)} – ${formatTime12h(end)}`;
  };

  const processedSlots = slots
    .map((s) => {

      const rentalDate = new Date(s.rentalDate);
      rentalDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 3);

      if (rentalDate < today || rentalDate > maxDate) return null;

      const start = s.startTime;
      const end = s.endTime;

      const [h, m] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

      const slotStart = new Date(s.rentalDate);
      slotStart.setHours(h, m, 0, 0);

      const slotEnd = new Date(s.rentalDate);
      slotEnd.setHours(eh, em, 0, 0);

      let bookingLabel = "Upcoming";

      if (rentalDate.getTime() === today.getTime()) {

        if (slotEnd <= now) return null;

        bookingLabel =
          now >= slotStart && now < slotEnd
            ? "Live Now"
            : "Upcoming Today";
      }

      return {
        ...s,
        bookingLabel
      };

    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.rentalDate) - new Date(b.rentalDate));

  const visibleSlots = processedSlots.slice(0, 2);
  const hasMore = processedSlots.length > 2;

  const labelStyles = {
    "Live Now": "bg-orange-100 text-orange-700",
    "Upcoming Today": "bg-green-100 text-green-700",
    Tomorrow: "bg-purple-100 text-indigo-700",
  };

  return (
    <div className="bg-white border rounded-xl p-5">


      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold">Upcoming Slots</h2>
          <p className="text-xs text-muted-foreground">
            Today & Tomorrow
          </p>
        </div>

        <span className="text-green-600 text-sm font-medium">
          {processedSlots.length} slots
        </span>
      </div>


      <div className="space-y-4">
        {visibleSlots.map((s) => (
          <div
            key={s._id}
            className="flex justify-between bg-gray-50 rounded-lg p-4"
          >
            <div>


              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(s.rentalDate), "dd MMM yyyy")}
              </p>


              <p className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatRange(s.startTime, s.endTime)}
              </p>


              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {s.facilityName}
              </p>

            </div>


            <div className="flex flex-col items-end gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full capitalize ${labelStyles[s.bookingLabel]}`}
              >
                {s.bookingLabel}
              </span>
            </div>
          </div>
        ))}

        {!processedSlots.length && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming slots
          </p>
        )}
      </div>

      {hasMore && (
        <div className="mt-5 text-center">
          <button
            onClick={() => navigate("/admin/turf-rentals")}
            className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline transition"
          >
            View More →
          </button>
        </div>
      )}
    </div>
  );
}