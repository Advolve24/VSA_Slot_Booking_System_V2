import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import { Eye, Download } from "lucide-react";

/* ================= DATE ================= */
const fmt = (d) => {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return "-";
  }
};

/* ================= STATUS ================= */
const getStatusColor = (status) => {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
};

/* ================= PAGE ================= */

export default function TurfInvoiceList() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  /* ================= FETCH ================= */

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/invoice");

      const data = (res.data?.data || [])
        .filter((inv) => inv.type === "turf") // ✅ ONLY TURF
        .map((inv) => ({
          ...inv,
          _id: inv._id || inv.id,
        }));

      setInvoices(data);
    } catch (err) {
      console.error(err);

      toast({
        title: "Error",
        description: "Failed to load turf invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return invoices.slice(start, end);
  }, [invoices, page]);

  /* ================= DOWNLOAD ================= */

  const handleDownload = async (inv) => {
    try {
      const res = await api.get(`/invoice/${inv._id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoiceNo}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);

      toast({ title: "Invoice downloaded" });
    } catch (err) {
      toast({
        title: "Download failed",
        variant: "destructive",
      });
    }
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        Loading turf invoices...
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ================= EMPTY ================= */}
      {paginatedData.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No turf invoices found
        </div>
      )}

      {/* ================= DESKTOP ================= */}
      {paginatedData.length > 0 && (
        <>
          <div className="hidden md:block bg-white border rounded-xl overflow-hidden shadow-sm">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((inv) => {

                  const [title, sub] =
                    inv.itemDescription?.split(" - ") || [];

                  return (
                    <tr key={inv._id} className="border-t hover:bg-gray-50">

                      <td className="p-3 font-medium">
                        {inv.invoiceNo}
                      </td>

                      <td className="p-3">
                        {inv.user?.name || "-"}
                      </td>

                      <td className="p-3 font-medium">
                        ₹ {inv.total}
                      </td>

                      <td className="p-3">
                        {fmt(inv.createdAt)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${getStatusColor(inv.status)}`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      <td className="p-3 flex justify-center gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/admin/invoice/${inv._id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleDownload(inv)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

          {/* ================= MOBILE ================= */}
          <div className="md:hidden space-y-4">
            {paginatedData.map((inv) => {

              const [title, sub] =
                inv.itemDescription?.split(" - ") || [];

              return (
                <div
                  key={inv._id}
                  className="bg-white border rounded-xl p-4 shadow-sm"
                >

                  <div className="flex justify-between items-start">

                    <div>
                      <h3 className="font-semibold text-base">
                        {inv.invoiceNo}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {inv.user?.name}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(inv.status)}`}
                    >
                      {inv.status}
                    </span>

                  </div>

                  <div className="mt-2">
                    <p className="font-medium text-gray-800">
                      {title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sub}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span>₹ {inv.total}</span>
                    <span>{fmt(inv.createdAt)}</span>
                  </div>

                  <div className="mt-3 flex gap-2">

                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() =>
                        navigate(`/admin/invoice/${inv._id}`)
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>

                    <Button
                      className="flex-1"
                      onClick={() => handleDownload(inv)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>

                  </div>

                </div>
              );
            })}
          </div>

          {/* ================= PAGINATION ================= */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">

              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>

              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>

            </div>
          )}

        </>
      )}
    </div>
  );
}