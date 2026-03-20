import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import QRCode from "react-qr-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  MapPin,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  CreditCard,
  Copy
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function StaffPayment() {

  const { id: rentalId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rental, setRental] = useState(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("");
  const [payerName, setPayerName] = useState("");
  const [loading, setLoading] = useState(false);

  const upiId = import.meta.env.VITE_UPI_ID;

  function formatTime12(time) {
    if (!time) return "-";

    const [hour, minute] = time.split(":").map(Number);

    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  /* ================= LOAD BOOKING ================= */

  const loadRental = async () => {
    try {

      const res = await api.get(`/turf-rentals/${rentalId}`);
      setRental(res.data);

    } catch {

      toast({
        title: "Error",
        description: "Failed to load booking",
        variant: "destructive"
      });

    }
  };

  useEffect(() => {
    if (!rentalId) return;
    loadRental();
  }, [rentalId]);

  /* ================= PAYMENT ================= */

  const collectPayment = async () => {

    if (!payerName) {
      toast({
        title: "Enter payer name",
        variant: "destructive"
      });
      return;
    }

    if (!amount) {
      toast({
        title: "Enter amount",
        variant: "destructive"
      });
      return;
    }

    if (!mode) {
      toast({
        title: "Select payment method",
        variant: "destructive"
      });
      return;
    }

    if (Number(amount) > rental.dueAmount) {
      toast({
        title: "Invalid amount",
        description: `Remaining is ₹${rental.dueAmount}`,
        variant: "destructive"
      });
      return;
    }

    try {

      setLoading(true);

      await api.post(`/turf-rentals/${rentalId}/payments`, {
        payerName,
        amount: Number(amount),
        mode,
        paymentType: "balance"
      });

      toast({ title: "Payment recorded" });

      setAmount("");
      setPayerName("");

      loadRental();

    } catch (err) {

      toast({
        title: "Payment failed",
        description: err.response?.data?.message || "Error",
        variant: "destructive"
      });

    } finally {

      setLoading(false);

    }

  };

  if (!rental) return null;

  const remaining = rental.dueAmount;

  const upiLink = `upi://pay?pa=${upiId}&pn=VSA Turf&am=${remaining}&cu=INR&tn=Booking-${rental._id}`;

  const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;

  return (

    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* HEADER */}

      <div className="flex items-center gap-3 text-sm text-gray-500">

        <button
          onClick={() => navigate("/admin/turf-rentals")}
          className="hover:underline"
        >
          ← Back to Turf Rentals
        </button>

        <span>|</span>

        <span className="font-semibold text-gray-900">
          Turf Payment
        </span>

      </div>

      {/* MAIN GRID */}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT SIDE */}

        <div className="space-y-6">

          {/* SCAN & PAY */}

          <div className="bg-white border rounded-xl p-6 text-center">

            <h3 className="font-semibold text-green-700 flex justify-center items-center gap-2 mb-4">

              <CreditCard size={18} />

              Scan & Pay

            </h3>

            <div className="inline-block p-4 bg-white border rounded-xl">

              <QRCode value={upiLink} size={200} />

            </div>

            <p className="text-sm text-gray-500 mt-3">
              Scan using any UPI app to complete payment
            </p>

            <div className="mt-3 flex justify-center">

              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg text-sm">

                {upiId}

                <Copy
                  size={14}
                  className="cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(upiId);
                    toast({ title: "UPI copied" });
                  }}
                />

              </div>

            </div>

          </div>

          {/* PAYMENT SUMMARY */}

          <div className="grid grid-cols-3 gap-4">

            <div className="bg-white border rounded-xl p-4 text-center">

              <IndianRupee className="mx-auto text-gray-500 mb-1" />

              <p className="text-xs text-gray-500">Total</p>

              <p className="font-semibold text-lg">
                ₹{rental.finalAmount}
              </p>

            </div>

            <div className="bg-white border rounded-xl p-4 text-center">

              <CheckCircle className="mx-auto text-green-600 mb-1" />

              <p className="text-xs text-gray-500">Paid</p>

              <p className="font-semibold text-lg text-green-600">
                ₹{rental.totalPaid}
              </p>

            </div>

            <div className="bg-white border rounded-xl p-4 text-center">

              <Clock className="mx-auto text-orange-500 mb-1" />

              <p className="text-xs text-gray-500">Remaining</p>

              <p className="font-semibold text-lg text-orange-500">
                ₹{remaining}
              </p>

            </div>

          </div>

        </div>

        {/* RIGHT SIDE */}

        <div className="space-y-6">

          {/* BOOKING DETAILS */}

          <div className="bg-white border rounded-xl p-6">

            <h3 className="font-semibold mb-4">
              Booking Details
            </h3>

            <div className="space-y-3 text-sm">

              <div className="flex items-center gap-3">

                <User size={16} className="text-gray-400" />

                <div>
                  <p className="text-gray-500 text-xs">Player Name</p>
                  <p className="font-medium">{rental.userName}</p>
                </div>

              </div>

              <div className="flex items-center gap-3">

                <MapPin size={16} className="text-gray-400" />

                <div>
                  <p className="text-gray-500 text-xs">Facility</p>
                  <p className="font-medium">{rental.facilityName}</p>
                </div>

              </div>

              <div className="flex items-center gap-3">

                <Calendar size={16} className="text-gray-400" />

                <div>
                  <p className="text-gray-500 text-xs">Rental Date & Time</p>
                  <p className="font-medium">

                    {new Date(rental.rentalDate).toLocaleDateString("en-IN")}
                    {" • "}
                    {formatTime12(rental.startTime)} - {formatTime12(rental.endTime)}

                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* MANUAL PAYMENT */}

          {remaining > 0 && (

            <div className="bg-white border rounded-xl p-6 space-y-4">

              <h3 className="font-semibold">
                Add Payment Manually
              </h3>

              <Input
                placeholder="Payer Name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">

                <Input
                  placeholder={`₹${remaining}`}
                  value={amount}
                  type="number"
                  max={remaining}
                  onChange={(e) => {

                    const val = Number(e.target.value);

                    if (val > remaining) return;

                    setAmount(e.target.value);

                  }}
                />

                <Select value={mode} onValueChange={(value) => setMode(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>

                  <SelectContent className="z-[9999] bg-white border shadow-lg">
                    <SelectItem className={selectItemClass} value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>

              </div>

              <Button
                className="w-full bg-green-700 hover:bg-green-800"
                disabled={loading}
                onClick={collectPayment}
              >
                {loading ? "Recording..." : "Record Payment"}
              </Button>

            </div>

          )}

        </div>

      </div>

      {/* PAYMENT HISTORY */}

      <div className="bg-white border rounded-xl p-6">

        <h3 className="font-semibold mb-4">
          Payment History
        </h3>

        {/* ================= DESKTOP TABLE ================= */}

        <div className="hidden md:block overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="text-gray-500">

              <tr className="border-b">

                <th className="text-left py-2">Payer</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Date & Time</th>

              </tr>

            </thead>

            <tbody>

              {rental.payments?.map((p) => (

                <tr key={p._id} className="border-b">

                  <td className="py-2">
                    {p.payerName || "Customer"}
                  </td>

                  <td>
                    ₹{p.amount}
                  </td>

                  <td className="capitalize">
                    {p.mode}
                  </td>

                  <td>
                    {new Date(p.createdAt).toLocaleString("en-IN")}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* ================= MOBILE CARD ================= */}

        <div className="md:hidden space-y-3">

          {rental.payments?.map((p) => (

            <div
              key={p._id}
              className="border rounded-lg p-4 bg-gray-50 space-y-2"
            >

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">Payer</span>

                <span className="font-medium">
                  {p.payerName || "Customer"}
                </span>

              </div>

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">Amount</span>

                <span className="font-semibold text-green-700">
                  ₹{p.amount}
                </span>

              </div>

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">Method</span>

                <span className="capitalize">
                  {p.mode}
                </span>

              </div>

              <div className="flex justify-between text-sm">

                <span className="text-gray-500">Date</span>

                <span>
                  {new Date(p.createdAt).toLocaleString("en-IN")}
                </span>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}