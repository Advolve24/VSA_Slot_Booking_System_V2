import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoice/${id}`);
      setInvoice(res.data?.data || null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load invoice.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const res = await api.get(`/invoice/${id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNo}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);

    } catch {
      toast({
        title: "Download Failed",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6">Loading invoice...</div>;
  if (!invoice) return <div className="p-6 text-red-500">Invoice not found</div>;

  const issueDate = invoice.createdAt
    ? format(new Date(invoice.createdAt), "dd MMM yyyy")
    : "-";
  const registrationFee = invoice.registrationFee || 0;
  const subTotal = invoice.subTotal || 0;
  const discount = invoice.discount || 0;
  const total = invoice.total || 0;
  const qty = invoice.qty || 1;

  const statusClass =
    invoice.status === "paid"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  const isEnrollment = invoice.type === "enrollment" || invoice.type === "renewal";
  const isTurf = invoice.type === "turf";

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-6">

      {/* ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button onClick={handleDownload} disabled={downloading} className="bg-green-700">
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Downloading..." : "Download PDF"}
        </Button>
      </div>

      {/* CARD */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow border">

        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/VSA-Logo-1.png" className="h-8 sm:h-10" />
            <h2 className="text-sm sm:text-lg font-semibold">
              Vidyanchal Sports Academy
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-lg sm:text-xl font-bold">INVOICE</h2>
            <p className="text-green-600 text-xs sm:text-sm">
              {invoice.invoiceNo}
            </p>

            <span className={`text-xs px-3 py-1 rounded ${statusClass}`}>
              {invoice.status?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* BILL */}
        <div className="p-4 sm:p-6 border-b grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* FROM */}
          <div>
            <p className="text-xs text-gray-500 mb-1">BILLED FROM</p>
            <p className="font-semibold">Vidyanchal Sports Academy</p>
            <p className="text-sm">Baner, Pune</p>
            <p className="text-sm mt-2">+91 9922143210</p>
            <p className="text-sm">vidyanchalsportsacademy@gmail.com</p>
          </div>

          {/* TO */}
          <div className="sm:text-right">
            <p className="text-xs text-gray-500 mb-1">BILLED TO</p>
            <p className="font-semibold">{invoice.user?.name}</p>
            <p className="text-sm">{invoice.user?.mobile}</p>
            <p className="text-sm">{invoice.user?.email || "-"}</p>

            <p className="mt-3 text-sm">
              Payment Date: <strong>{issueDate}</strong>
            </p>
          </div>

        </div>

        {/* DETAILS BASED ON TYPE */}
        <div className="p-4 sm:p-6 border-b text-sm">

          <p className="text-xs text-gray-500 mb-3">
            {isEnrollment ? "ENROLLMENT DETAILS" : "BOOKING DETAILS"}
          </p>

          <div className="space-y-1">

            {isEnrollment && (
              <>
                <p>Type: Coaching Enrollment</p>
                <p>{invoice.itemDescription}</p>
              </>
            )}

            {isTurf && (
              <>
                <p>Type: Turf Booking</p>
                <p>{invoice.itemDescription}</p>
              </>
            )}

          </div>

        </div>

        {/* ITEMS */}
        <div className="p-4 sm:p-6 border-b">
          <p className="text-xs text-gray-500 mb-3">ITEMS & SERVICES</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-600">
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="p-2">1</td>

                  <td className="p-2">
                    {invoice.itemDescription}
                    <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block mt-1">
                      {invoice.type.toUpperCase()}
                    </div>
                  </td>

                  <td className="p-2 text-right">{qty}</td>
                  <td className="p-2 text-right">₹{subTotal}</td>
                  <td className="p-2 text-right font-medium">₹{subTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTALS */}
        <div className="p-4 sm:p-6 flex justify-end">
          <div className="w-full sm:w-80 space-y-2 text-sm">
             {registrationFee > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Registration Fee</span>
                <span>₹{registrationFee}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subTotal}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>- ₹{discount}</span>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between font-bold text-green-700 text-lg">
              <span>Grand Total</span>
              <span>₹{total}</span>
            </div>

          </div>
        </div>

        {/* PAYMENT */}
        <div className="p-4 sm:p-6 border-t text-sm">
          <p className="text-xs text-gray-500 mb-2">PAYMENT INFO</p>
          <p>Method: {invoice.paymentMode?.toUpperCase()}</p>
        </div>

        {/* FOOTER */}
        <div className="p-4 text-center text-xs text-gray-500 border-t">
          Thank you for choosing Vidyanchal Sports Academy.
        </div>

      </div>
    </div>
  );
}