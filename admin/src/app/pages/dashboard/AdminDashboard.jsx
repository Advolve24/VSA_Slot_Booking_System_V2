import { useEffect } from "react";
import { useAdminStore } from "../../../store/adminStore";

import StatsCards from "./StatsCards";
import SecondaryStats from "./SecondaryStats";
import QuickActions from "./QuickActions";
import Charts from "./Charts";
import RevenueOverview from "./RevenueOverview";
import UpcomingSlots from "./UpcomingSlots";
import FacilityUtilization from "./FacilityUtilization";

export default function AdminDashboard() {
  const { stats, fetchDashboard, loading } = useAdminStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 mt-3">

      <div>
        <h1 className="text-2xl font-bold text-green-800">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Academy overview
        </p>
      </div>
      <StatsCards stats={stats} loading={loading} />

      <div className="block lg:hidden">
        <UpcomingSlots slots={stats?.upcomingSlots || []} />
      </div>
      <SecondaryStats stats={stats} loading={loading} />
      <QuickActions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Charts stats={stats} />
        <RevenueOverview data={stats?.revenueSeries || []} />
      </div>
      <div className="hidden lg:grid lg:grid-cols-5 gap-6">

        <div className="lg:col-span-3">
          <UpcomingSlots slots={stats?.upcomingSlots || []} />
        </div>
        <div className="lg:col-span-2">
          <FacilityUtilization
            facilities={stats?.facilityUtilization || []}
            average={stats?.turfUtilization || 0}
          />
        </div>

      </div>

    </div>
  );
}
