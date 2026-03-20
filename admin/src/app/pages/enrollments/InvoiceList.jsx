import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* ICONS */
import { Eye, Download } from "lucide-react";

export default function InvoiceList() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [invoices, setInvoices] = useState([]);
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 5;

    /* ================= FETCH ================= */

    const fetchInvoices = async () => {
        try {
            const res = await api.get("/invoice");

            const data = (res.data?.data || [])
                .filter((inv) => inv.type === "enrollment") // 🔥 FILTER HERE
                .map((inv) => ({
                    ...inv,
                    _id: inv._id || inv.id,
                }));

            setInvoices(data);

        } catch (err) {
            console.error("Invoice fetch error:", err);

            toast({
                title: "Error",
                description: "Failed to load invoices",
                variant: "destructive",
            });
        }
    };
    useEffect(() => {
        fetchInvoices();
    }, []);

    /* ================= PAGINATION ================= */

    const totalPages = Math.ceil(invoices.length / PAGE_SIZE);

    const paginatedData = useMemo(() => {
        return invoices.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE
        );
    }, [invoices, page]);

    /* ================= HELPERS ================= */

    const formatDate = (d) =>
        d ? format(new Date(d), "dd MMM yyyy") : "-";

    const getStatusColor = (status) => {
        if (status === "paid")
            return "bg-green-100 text-green-700";
        if (status === "pending")
            return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-600";
    };

    /* ================= DOWNLOAD ================= */

    const handleDownload = async (id, invoiceNo) => {
        try {
            const res = await api.get(
                `/invoice/${id}/download`,
                { responseType: "blob" }
            );

            const blob = new Blob([res.data], {
                type: "application/pdf",
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${invoiceNo}.pdf`;
            a.click();

        } catch (err) {
            toast({
                title: "Download Failed",
                description: "Something went wrong",
                variant: "destructive",
            });
        }
    };
    return (
        <div className="space-y-4">

            {/* ================= DESKTOP ================= */}

            <div className="hidden md:block bg-white border rounded-xl overflow-x-auto">

                <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b">
                        <tr className="text-left">
                            <th className="p-3">Invoice No</th>
                            <th>Name</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedData.map((inv) => (
                            <tr key={inv._id} className="border-t">

                                <td className="p-3 font-medium">
                                    {inv.invoiceNo}
                                </td>

                                <td>{inv.user?.name}</td>

                                <td className="font-medium">
                                    ₹ {inv.total}
                                </td>

                                <td>{formatDate(inv.createdAt)}</td>

                                <td>
                                    <span
                                        className={`px-2 py-1 text-xs rounded ${getStatusColor(inv.status)}`}
                                    >
                                        {inv.status}
                                    </span>
                                </td>

                                {/* ACTION */}
                                <td className="flex gap-2 justify-center p-2">

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            navigate(`/admin/invoice/${inv._id}`) // ✅ FIXED
                                        }
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            handleDownload(inv._id, inv.invoiceNo)
                                        }
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>

                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* PAGINATION */}
                <div className="flex justify-between items-center p-4 border-t">
                    <p className="text-sm text-gray-500">
                        Page {page} of {totalPages || 1}
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
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* ================= MOBILE ================= */}

            <div className="md:hidden space-y-4">

                {paginatedData.map((inv) => (
                    <div
                        key={inv._id}
                        className="bg-white border rounded-xl p-4 shadow-sm"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-base">
                                    {inv.user?.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {inv.invoiceNo}
                                </p>
                            </div>

                            <span className="px-3 py-1 rounded-full text-xs bg-gray-100 capitalize">
                                {inv.type}
                            </span>
                        </div>

                        <div className="mt-3 flex justify-between text-sm">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-semibold">₹ {inv.total}</span>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(inv.createdAt)}
                        </div>

                        <div className="mt-1">
                            <span
                                className={`px-2 py-1 text-xs rounded ${getStatusColor(inv.status)}`}
                            >
                                {inv.status}
                            </span>
                        </div>

                        {/* ACTIONS */}
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
                                onClick={() =>
                                    handleDownload(inv._id, inv.invoiceNo)
                                }
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>

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
                        {page} / {totalPages || 1}
                    </span>

                    <Button
                        variant="outline"
                        disabled={page === totalPages || totalPages === 0}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>

            </div>

        </div>
    );
}