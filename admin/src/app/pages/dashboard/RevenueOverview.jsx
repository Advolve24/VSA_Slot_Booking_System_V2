import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const WINDOW_SIZE = 6;

export default function RevenueOverview({ data = [] }) {
  const [startIndex, setStartIndex] = useState(0);

  const totalMonths = data.length;

  const visibleData = useMemo(() => {
    return data.slice(startIndex, startIndex + WINDOW_SIZE);
  }, [data, startIndex]);

  const canPrev = startIndex > 0;
  const canNext = startIndex + WINDOW_SIZE < totalMonths;

  const handlePrev = () => {
    if (canPrev) {
      setStartIndex((prev) => Math.max(prev - WINDOW_SIZE, 0));
    }
  };

  const handleNext = () => {
    if (canNext) {
      setStartIndex((prev) =>
        Math.min(prev + WINDOW_SIZE, totalMonths - WINDOW_SIZE)
      );
    }
  };

  return (
    <Card className="rounded-xl border w-full">
      <CardContent className="p-4 sm:p-5 md:p-6">


        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          <div>
            <h2 className="text-base sm:text-lg font-semibold text-green-700">
              Revenue Overview
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monthly revenue breakdown
            </p>
          </div>


          <div className="flex gap-2 self-start sm:self-auto">
            <button
              disabled={!canPrev}
              onClick={handlePrev}
              className={`p-2 rounded-md border transition ${canPrev
                  ? "hover:bg-gray-100"
                  : "opacity-40 cursor-not-allowed"
                }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              disabled={!canNext}
              onClick={handleNext}
              className={`p-2 rounded-md border transition ${canNext
                  ? "hover:bg-gray-100"
                  : "opacity-40 cursor-not-allowed"
                }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {visibleData.length === 0 && (
          <div className="h-[220px] sm:h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            No revenue data available
          </div>
        )}
        {visibleData.length > 0 && (
          <>
            <div className="w-full h-[220px] sm:h-[260px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visibleData}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(v) => `₹${v / 1000}k`}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(v) => `₹${v}`}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />

                  <Bar
                    dataKey="coaching"
                    fill="#16a34a"
                    radius={[6, 6, 0, 0]}
                  />

                  <Bar
                    dataKey="turf"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-green-700">
                <span className="w-3 h-3 rounded bg-green-600" />
                Coaching
              </div>

              <div className="flex items-center gap-2 text-orange-600">
                <span className="w-3 h-3 rounded bg-orange-500" />
                Turf Rentals
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
