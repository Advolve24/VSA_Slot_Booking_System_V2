import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function FacilityUtilization({
  facilities = [],
  average = 0,
}) {
  const safeAverage =
    typeof average === "number" ? average : 0;

  return (
    <Card className="rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">
            Facility Utilization
          </h2>
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="space-y-4">
          {facilities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No facility data available
            </p>
          )}

          {facilities.map((f) => (
            <div key={f.facilityId} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {f.name}
                </span>
                <span className="text-muted-foreground">
                  {f.utilization}%
                </span>
              </div>

              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-500"
                  style={{ width: `${f.utilization}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t mt-5 pt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">
            Average Utilization
          </span>
          <span className="font-semibold text-green-700">
            {safeAverage}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
