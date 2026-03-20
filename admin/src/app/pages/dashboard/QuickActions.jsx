import { IndianRupee, Ban, UserPlus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Turf Pricing ",
      icon: IndianRupee,
      color: "bg-green-700",
      onClick: () =>
        navigate("/admin/facilities", {
          state: { tab: "facilities" },
        }),
    },
    {
      label: "New Enrollment",
      icon: UserPlus,
      color: "bg-[#47426d]",
      onClick: () => navigate("/admin/enrollments"),
    },
    {
      label: "Rent Facility",
      icon: FileText,
      color: "bg-orange-500 text-gray-800",
      onClick: () =>
        navigate("/admin/turf-rentals", {
          state: { tab: "turf-rental" },
        }),
    },
    {
      label: "Block Slots",
      icon: Ban,
      color: "bg-red-600",
      onClick: () =>
        navigate("/admin/facilities", {
          state: { tab: "blocked" },
        }),
    },

  ];

  return (
    <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 w-full">
      <h2 className="font-semibold text-base sm:text-lg mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl font-medium text-sm sm:text-base transition w-full
              ${a.color} text-white hover:opacity-90`}
          >
            <a.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-center leading-tight break-words">
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
