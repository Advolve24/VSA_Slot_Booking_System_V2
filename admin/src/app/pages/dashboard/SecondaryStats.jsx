import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock } from "lucide-react";

export default function SecondaryStats({ stats, loading }) {
  const items = [
    {
      title: "Total Turf Rentals",
      value: stats?.totalTurfRentals ?? 0,
      icon: BarChart3,
    },
    {
      title: "Total Revenue",
      value: stats?.totalRevenue ? `₹${stats.totalRevenue}` : 0,
      icon: TrendingUp,
    },
    {
      title: "Turf Utilization",
      value: stats?.turfUtilization
        ? `${stats.turfUtilization}%`
        : 0,
      icon: Clock,
    },
  ];

  return (
    <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {items.map((item, i) => (
        <Card
          key={i}
          className="hover:shadow-sm transition w-full rounded-xl"
        >
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5 md:p-6">

            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight break-words">
                {item.title}
              </p>

              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mt-2 break-words leading-tight">
                {loading ? "—" : item.value}
              </h2>
            </div>
            <div className="flex-shrink-0">
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
}
