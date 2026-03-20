import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Calendar, IndianRupee } from "lucide-react";


export default function StatsCards({ stats, loading }) {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Total Enrollments",
      value: stats?.totalEnrollments ?? 0,
      icon: Users,
      link: "/admin/enrollments",
      cardBg: "bg-green-50/70",
      iconBg: "bg-green-200",
      iconColor: "text-green-700",
    },
    {
      title: "Active Enrollments",
      value: stats?.activeEnrollments ?? 0,
      icon: Activity,
      link: "/admin/enrollments?status=Active",
      cardBg: "bg-emerald-50/70",
      iconBg: "bg-emerald-200",
      iconColor: "text-emerald-700",
    },
    {
      title: "Today's Turf Rentals",
      value: stats?.todaysTurfRentals ?? 0,
      icon: Calendar,
      link: "/admin/turf-rentals?today=true",
      cardBg: "bg-orange-50/80",
      iconBg: "bg-orange-200",
      iconColor: "text-orange-700",
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats?.monthlyRevenue ?? 0}`,
      icon: IndianRupee,
      link: "/admin/reports",
      cardBg: "bg-yellow-50/80",
      iconBg: "bg-yellow-200",
      iconColor: "text-yellow-700",
      subText: stats?.revenueBreakup
        ? `Coaching ₹${stats.revenueBreakup.enrollments} • Turf ₹${stats.revenueBreakup.turfRentals}`
        : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => (
        <Card
          key={i}
          onClick={() => navigate(card.link)}
          className={`${card.cardBg} border-none rounded-xl transition-all hover:shadow-lg w-full`}
        >
          <CardContent className="p-4 sm:p-5 md:p-6 flex items-start justify-between gap-3">


            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight break-words">
                {card.title}
              </p>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-2 leading-tight break-words">
                {loading ? "—" : card.value}
              </h2>

              {card.subText && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 break-words leading-snug">
                  {card.subText}
                </p>
              )}
            </div>


            <div
              className={`flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}
            >
              <card.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
}
