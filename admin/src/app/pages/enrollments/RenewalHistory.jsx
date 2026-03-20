import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function RenewalHistory() {
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  /* ================= MOBILE CHECK ================= */

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH ================= */

  const fetchRenewals = async () => {
    try {
      const res = await api.get("/enrollments");
      setEnrollments(res.data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load renewal history",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  /* ================= FLATTEN ================= */

  const renewals = useMemo(() => {
    const list = [];

    enrollments.forEach((e) => {
      if (!e.renewalHistory?.length) return;

      e.renewalHistory.forEach((r) => {
        list.push({
          enrollmentId: e._id,
          playerName: e.playerName,
          sportName: e.sportName,
          batchName: e.batchName,
          ...r,
        });
      });
    });

    return list.sort(
      (a, b) => new Date(b.renewedAt) - new Date(a.renewedAt)
    );
  }, [enrollments]);

  /* ================= PAGINATION LOGIC ================= */

  const totalPages = Math.ceil(renewals.length / PAGE_SIZE);

  const paginatedData = renewals.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= DATE ================= */

  const formatDate = (d) =>
    d ? format(new Date(d), "dd MMM yyyy") : "-";

  /* ================= UI ================= */

  return (
    <div className="space-y-4">

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white border rounded-xl overflow-x-auto">

        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b">
            <tr className="text-left">
              <th className="p-3">Student</th>
              <th>Sport</th>
              <th>Batch</th>
              <th>Plan</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Amount</th>
              <th>Renewed On</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3 font-medium">{r.playerName}</td>
                <td>{r.sportName}</td>
                <td>{r.batchName}</td>
                <td className="capitalize">{r.planType}</td>
                <td>{formatDate(r.startDate)}</td>
                <td>{formatDate(r.endDate)}</td>
                <td>₹ {r.amount}</td>
                <td>{formatDate(r.renewedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-between items-center p-4 border-t">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>

            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4">

        {paginatedData.map((r, i) => (
          <div
            key={i}
            className="bg-white border rounded-xl p-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-base">
                  {r.playerName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {r.sportName}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-[0.65rem] bg-green-100 text-green-700 capitalize">
                {r.planType}
              </span>
            </div>

            <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium">
              {r.batchName}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Start</p>
                <p>{formatDate(r.startDate)}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs">End</p>
                <p>{formatDate(r.endDate)}</p>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold">₹ {r.amount}</span>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Renewed on {formatDate(r.renewedAt)}
            </div>
          </div>
        ))}

        {/* MOBILE PAGINATION */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>

          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>

      </div>

    </div>
  );
}