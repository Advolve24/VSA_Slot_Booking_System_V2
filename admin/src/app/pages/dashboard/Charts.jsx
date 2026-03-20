import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

const COLORS = {
  enrollments: "#15803d",
  turf: "#f97316",
};

export default function Charts({ stats }) {
  const data = [
    {
      name: "Enrollments",
      value: stats?.totalEnrollments || 0,
      color: COLORS.enrollments,
    },
    {
      name: "Turf Rentals",
      value: stats?.totalTurfRentals || 0,
      color: COLORS.turf,
    },
  ];

  const total =
    (stats?.totalEnrollments || 0) +
    (stats?.totalTurfRentals || 0);

  return (
    <Card className="rounded-xl w-full">
      <CardContent className="p-4 sm:p-5 md:p-6">


        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-green-700">
            Top Category
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Enrollment vs Turf Rentals
          </p>
        </div>


        <div className="relative w-full h-[200px] sm:h-[290px] md:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>


          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Total
            </p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">
              {total}
            </p>
          </div>
        </div>


        <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs sm:text-sm">

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS.enrollments }}
            />
            <span>Enrollments</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS.turf }}
            />
            <span>Turf Rentals</span>
          </div>

        </div>

      </CardContent>
    </Card>
  );
}
