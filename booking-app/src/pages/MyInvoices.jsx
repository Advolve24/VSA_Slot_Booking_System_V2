import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Download, Eye } from "lucide-react";


/* ================= DATE ================= */

function fmt(d) {
    if (!d) return "-";
    try {
        return format(new Date(d), "dd MMM yyyy");
    } catch {
        return "-";
    }
}

/* ================= STATUS ================= */

function getStatusColor(status) {
    if (status === "paid") return "bg-green-100 text-green-700";
    if (status === "pending") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
}

export default function MyInvoices() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    /* ================= FETCH ================= */

    const fetchInvoices = async () => {
        try {
            const res = await api.get("/users/my-invoices"); // ✅ FIXED

            const data = (res.data || []).map((inv) => ({
                ...inv,
                _id: inv._id || inv.id,
            }));

            setInvoices(data);
        } catch (err) {
            console.error("Invoice fetch error:", err);

            toast({
                variant: "destructive",
                title: "Failed to load invoices",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

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
            a.download = `${inv.invoiceNo || "invoice"}.pdf`;
            a.click();

            window.URL.revokeObjectURL(url);

            toast({ title: "Invoice downloaded" });
        } catch (err) {
            console.error("Download error:", err);

            toast({
                variant: "destructive",
                title: "Download failed",
            });
        }
    };

    /* ================= FILTER + SEARCH ================= */

    const filteredData = useMemo(() => {
        let data = invoices;

        if (filter !== "all") {
            data = data.filter((inv) => inv.type === filter);
        }

        if (search) {
            data = data.filter((inv) =>
                inv.invoiceNo?.toLowerCase().includes(search.toLowerCase())
            );
        }

        return data;
    }, [invoices, search, filter]);

    /* ================= LOADING ================= */

    if (loading) {
        return (
            <div className="py-20 text-center text-gray-500">
                Loading invoices...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-4 px-4">

            {/* ================= HEADER ================= */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h1 className="text-xl font-semibold text-green-800">
                    My Invoices
                </h1>

                <Input
                    placeholder="Search invoice..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="md:w-64"
                />
            </div>

            {/* ================= FILTER ================= */}

            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-fit">

                {["all", "enrollment", "turf"].map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all
        ${filter === t
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-gray-600 hover:bg-white hover:text-gray-900"
                            }`}
                    >
                        {t}
                    </button>
                ))}

            </div>

            {/* ================= EMPTY ================= */}

            {filteredData.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    No invoices found
                </div>
            )}

            {/* ================= TABLE ================= */}

            {filteredData.length > 0 && (
                <>
                    {/* DESKTOP */}
                    <div className="hidden md:block bg-white border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="p-3">Invoice No</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredData.map((inv) => (
                                    <tr key={inv._id} className="border-t hover:bg-gray-50">

                                        <td className="p-3 font-medium">
                                            {inv.invoiceNo}
                                        </td>

                                        <td className="p-3 capitalize">
                                            {inv.type}
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
                                                onClick={() => navigate(`/invoice/view/${inv._id}`)}
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
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE */}
                    <div className="md:hidden space-y-4">
                        {filteredData.map((inv) => (
                            <div
                                key={inv._id}
                                className="bg-white border rounded-xl p-4 shadow-sm"
                            >
                                <div className="flex justify-between items-start">

                                    <div>
                                        <h3 className="font-semibold text-base">
                                            {inv.invoiceNo}
                                        </h3>

                                        <p className="text-sm text-gray-500 capitalize">
                                            {inv.type}
                                        </p>
                                    </div>

                                    <span
                                        className={`px-2 py-1 text-xs rounded ${getStatusColor(inv.status)}`}
                                    >
                                        {inv.status}
                                    </span>

                                </div>

                                <div className="mt-3 flex justify-between text-sm">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-semibold">
                                        ₹ {inv.total}
                                    </span>
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                    {fmt(inv.createdAt)}
                                </div>

                                <div className="mt-3 flex gap-2">
                                    <Button
                                        className="flex-1"
                                        variant="outline"
                                        onClick={() => navigate(`/invoice/view/${inv._id}`)}
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
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}