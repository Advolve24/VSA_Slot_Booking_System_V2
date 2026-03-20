import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  CalendarIcon,
  IndianRupee,
  Download,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ================= DATE FORMATTER ================= */
const formatLocalDate = (date) => {
  if (!date) return "";
  return format(date, "yyyy-MM-dd"); // backend compatible
};

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#eab308", "#8b5cf6"];
const ROWS_PER_PAGE = 5;

export default function Reports() {

  const now = new Date();

  /* ================= FILTER ================= */

  const [filterType, setFilterType] = useState("monthly");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  /* ================= DATA ================= */

  const [stats, setStats] = useState({});
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [turfRentals, setTurfRentals] = useState([]);

  const [pageEnroll, setPageEnroll] = useState(1);
  const [pageTurf, setPageTurf] = useState(1);

  /* ================= FETCH ================= */

  const fetchReport = async () => {
    const params =
      filterType === "range"
        ? { from: fromDate, to: toDate }
        : { month, year };

    const res = await api.get("/reports/monthly", { params });

    const data = res.data;

    setStats(data.stats || {});
    setRevenueBreakdown(data.revenueBreakdown || []);
    setDistribution(data.distribution || []);
    setEnrollments(data.enrollmentTable || []);
    setTurfRentals(data.turfTable || []);
  };

  useEffect(() => {
    if (filterType === "range") {
      if (fromDate && toDate) fetchReport();
    } else {
      fetchReport();
    }
  }, [month, year, fromDate, toDate, filterType]);

  /* ================= FILE NAME ================= */

  const getFileName = (base) => {
    if (filterType === "range") {
      return `${base}-${fromDate}_to_${toDate}.csv`;
    }
    return `${base}-${month}-${year}.csv`;
  };

  /* ================= DOWNLOAD ================= */

  const downloadFile = async (url, baseName) => {
    try {
      const params =
        filterType === "range"
          ? { from: fromDate, to: toDate }
          : { month, year };

      const res = await api.get(url, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data]);
      const link = document.createElement("a");

      link.href = window.URL.createObjectURL(blob);
      link.download = getFileName(baseName);

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (err) {
      console.error("Download failed", err);
    }
  };

  /* ================= PAGINATION ================= */

  const paginate = (data, page) => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return data.slice(start, start + ROWS_PER_PAGE);
  };

  /* ================= YEAR OPTIONS ================= */

  const yearOptions = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i);
  }

  const selectTriggerClass = "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
  const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;
  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col md:flex-row md:justify-between gap-4">

        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            View academy performance
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">

          {/* FILTER TYPE */}
          <Select
            value={filterType}
            onValueChange={(value) => setFilterType(value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Filter" />
            </SelectTrigger>

            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="monthly" className={selectItemClass}>Monthly</SelectItem>
              <SelectItem value="range" className={selectItemClass}>Date Range</SelectItem>
            </SelectContent>
          </Select>

          {/* MONTH FILTER */}
          {filterType === "monthly" && (
            <Select
              value={String(month)}
              onValueChange={(value) => setMonth(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                {[
                  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ].map((m, i) => (
                  <SelectItem className={selectItemClass} key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filterType === "monthly" && (
            <Select
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                {yearOptions.map((y) => (
                  <SelectItem className={selectItemClass} key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* DATE RANGE */}
          {filterType === "range" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[260px] justify-start text-left font-normal rounded-md"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {fromDate && toDate
                      ? `${format(new Date(fromDate), "dd MMM yyyy")} - ${format(new Date(toDate), "dd MMM yyyy")}`
                      : "Select date range"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="p-0 w-auto">

                  <Calendar
                    mode="range"
                    numberOfMonths={1} // 🔥 shows 2 months (pro UX)
                    selected={{
                      from: fromDate ? new Date(fromDate) : undefined,
                      to: toDate ? new Date(toDate) : undefined,
                    }}
                    onSelect={(range) => {
                      setFromDate(
                        range?.from ? formatLocalDate(range.from) : ""
                      );
                      setToDate(
                        range?.to ? formatLocalDate(range.to) : ""
                      );
                    }}
                    initialFocus
                  />

                </PopoverContent>
              </Popover>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => downloadFile("/reports/download-full-csv", "academy-report")}
          >
            <Download className="w-4 h-4 mr-2" />
            Full CSV
          </Button>

        </div>

      </div>

      {/* ================= STATS ================= */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Enrollments" value={stats.totalEnrollments || 0} icon={<Users />} />
        <StatCard title="Active Students" value={stats.activeStudents || 0} icon={<Activity />} />
        <StatCard title="Turf Bookings" value={stats.turfBookings || 0} icon={<CalendarIcon />} />
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue || 0}`} icon={<IndianRupee />} />
      </div>

      {/* ================= CHARTS ================= */}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        <div className="xl:col-span-3 bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Revenue Breakdown</h3>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="coaching" fill="#16a34a" />
                <Bar dataKey="turf" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Enrollment Distribution</h3>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="count" nameKey="sport" outerRadius={100}>
                  {distribution.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ================= TABLES ================= */}

      <TableSection
        title="Enrollments"
        data={paginate(enrollments, pageEnroll)}
        total={enrollments.length}
        page={pageEnroll}
        setPage={setPageEnroll}
        onDownload={() => downloadFile("/reports/download-enrollments", "enrollments")}
      />

      <TableSection
        title="Turf Rentals"
        data={paginate(turfRentals, pageTurf)}
        total={turfRentals.length}
        page={pageTurf}
        setPage={setPageTurf}
        onDownload={() => downloadFile("/reports/download-turf", "turf")}
      />

    </div>
  );
}

/* ================= STAT CARD ================= */

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white border rounded-xl p-3 sm:p-4 flex justify-between items-center">

      <div>
        <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
        <h3 className="text-lg sm:text-xl font-bold">{value}</h3>
      </div>

      <div className="p-2 sm:p-3 bg-green-100 text-green-700 rounded-lg">
        {icon}
      </div>

    </div>
  );
}

/* ================= TABLE ================= */

function TableSection({
  title,
  data = [],
  total = 0,
  page,
  setPage,
  onDownload,
}) {
  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* HEADER */}
      <div className="px-4 sm:px-5 py-4 border-b flex justify-between items-center">
        <span className="font-semibold">{title}</span>

        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-x-auto">

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {Object.keys(data[0] || {}).map((k) => (
                <th
                  key={k}
                  className="px-4 py-3 text-left capitalize whitespace-nowrap"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                {Object.values(row).map((v, j) => (
                  <td key={j} className="px-4 py-3 whitespace-nowrap">
                    {v || "—"}
                  </td>
                ))}
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={Object.keys(data[0] || {}).length}
                  className="text-center py-10 text-muted-foreground"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>

      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="md:hidden p-3 space-y-3">

        {data.map((row, i) => (
          <div
            key={i}
            className="border rounded-xl p-4 shadow-sm bg-white"
          >
            {Object.entries(row).map(([key, value], index) => (
              <div
                key={key}
                className={`flex justify-between text-sm py-1 ${index !== 0 ? "border-t mt-1 pt-2" : ""
                  }`}
              >
                <span className="text-gray-500 capitalize">
                  {key}
                </span>

                <span className="font-medium text-right">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No data found
          </div>
        )}

      </div>

      {/* ================= PAGINATION ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-5 py-3 border-t text-sm">

        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="w-full sm:w-auto"
        >
          Prev
        </Button>

        <span className="text-gray-500">
          Page {page} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage(page + 1)}
          className="w-full sm:w-auto"
        >
          Next
        </Button>

      </div>

    </div>
  );
}