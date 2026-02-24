import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { IndianRupee } from "lucide-react";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  /* ================= RESPONSIVE ================= */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    api.get("/reports").then((res) => setData(res.data));
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-6 mt-4">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-green-800">
          Reports
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          View analytics and generate reports for academy operations.
        </p>
      </div>

      {/* ================= REVENUE CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RevenueCard title="Total Revenue" value={data.totalRevenue} />
        <RevenueCard title="Enrollment Revenue" value={data.enrollmentRevenue} />
        <RevenueCard title="Rental Revenue" value={data.rentalRevenue} />
      </div>

      {/* ================= ANALYTICS SECTION ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ENROLLMENT BY SPORT */}
        <div className="bg-white rounded-xl border p-4 md:p-6">
          <h3 className="font-semibold mb-4">Enrollments by Sport</h3>

          <div className="space-y-4">
            {data.enrollmentsBySport.map((s) => (
              <BarRow
                key={s.name}
                label={s.name}
                value={`${s.count} (${s.percentage}%)`}
                percentage={s.percentage}
                color="green"
              />
            ))}
          </div>
        </div>

        {/* BATCH UTILIZATION */}
        <div className="bg-white rounded-xl border p-4 md:p-6">
          <h3 className="font-semibold mb-4">Batch Utilization</h3>

          <div className="space-y-4">
            {data.batchUtilization.map((b) => (
              <BarRow
                key={b.name}
                label={b.name}
                value={`${b.enrolled}/${b.capacity}`}
                percentage={b.percentage}
                color={b.percentage === 100 ? "green" : "orange"}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ================= QUICK STATS ================= */}
      <div className="bg-white border rounded-xl p-4 md:p-6">
        <h3 className="font-semibold mb-4">Quick Stats</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Enrollments" value={data.quickStats.totalStudents} />
          <StatCard label="Turf Rentals" value={data.quickStats.totalTurfRentals} />
          <StatCard label="Active Batches" value={data.quickStats.activeBatches} />
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function RevenueCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl border p-4 md:p-5 flex justify-between items-center">
      <div>
        <p className="text-xs md:text-sm text-gray-500">{title}</p>
        <p className="text-xl md:text-2xl font-semibold mt-1">
          ₹{value?.toLocaleString()}
        </p>
      </div>

      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
        <IndianRupee className="w-4 h-4 md:w-5 md:h-5 text-green-700" />
      </div>
    </div>
  );
}

function BarRow({ label, value, percentage, color }) {
  const barColor =
    color === "green"
      ? "bg-green-700"
      : "bg-orange-500";

  return (
    <div>
      <div className="flex justify-between text-xs md:text-sm mb-1">
        <span className="truncate max-w-[60%]">{label}</span>
        <span>{value}</span>
      </div>

      <div className="h-2 md:h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center md:text-left">
      <p className="text-xl md:text-2xl font-semibold text-green-700">
        {value}
      </p>
      <p className="text-xs md:text-sm text-gray-500 mt-1">
        {label}
      </p>
    </div>
  );
}
