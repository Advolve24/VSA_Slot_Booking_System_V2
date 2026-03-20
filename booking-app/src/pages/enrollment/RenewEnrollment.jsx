import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function RenewEnrollment() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [enrollment, setEnrollment] = useState(null);
  const [batch, setBatch] = useState(null);

  const [planType, setPlanType] = useState("monthly");

  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  /* ================= FETCH ENROLLMENT ================= */

 useEffect(() => {

  const fetchEnrollment = async () => {

    try {

      const res = await api.get(`/enrollments/public/${id}`);

      /* ===== LINK VALIDATION ===== */

      if (!res.data.enrollment.renewLinkActive) {

        toast({
          variant: "destructive",
          title: "Link expired",
          description: "This action link is no longer active."
        });

        navigate("/", { replace: true });
        return;

      }

      setEnrollment(res.data.enrollment);
      setBatch(res.data.batch);

      setPlanType(res.data.enrollment.planType || "monthly");

    } catch (err) {

      toast({
        variant: "destructive",
        title: "Invalid or expired renewal link"
      });

      navigate("/", { replace: true });

    } finally {

      setLoading(false);

    }

  };

  fetchEnrollment();

}, [id]);
  /* ================= PRICE ================= */

  const priceDetails = useMemo(() => {

    if (!batch) return null;

    const monthlyFee = batch.monthlyFee || 0;
    const quarterlyFee = batch.quarterlyFee || monthlyFee * 3;

    const basePrice =
      planType === "quarterly"
        ? quarterlyFee
        : monthlyFee;

    return {
      basePrice,
      finalPrice: basePrice
    };

  }, [batch, planType]);

  /* ================= RAZORPAY ================= */

  const loadRazorpay = () =>
    new Promise((resolve) => {

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);

      document.body.appendChild(script);

    });

  /* ================= PAYMENT ================= */

  const handlePayment = async () => {

    if (!enrollment) return;

    setProcessingPayment(true);

    const loaded = await loadRazorpay();

    if (!loaded) {

      toast({
        variant: "destructive",
        title: "Payment gateway failed"
      });

      return;

    }

    try {

      const orderRes = await api.post("/payments/create-order", {
        purpose: "renewal",
        enrollmentId: enrollment._id,
        planType,
        amount: priceDetails.finalPrice
      });

      const { orderId, amount, key, paymentId } = orderRes.data;

      const options = {

        key,
        amount: amount * 100,
        currency: "INR",
        order_id: orderId,

        name: "Enrollment Renewal",
        description: batch.name,

        handler: async function (response) {

          await api.post("/payments/verify", {

            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentId

          });

          toast({
            title: "Renewal Successful 🎉"
          });

          navigate("/renewal-success", {
            replace: true,
            state: {
              playerName: enrollment.playerName,
              batchName: batch.name,
              sportName: enrollment.sportName,
              planType
            }
          });

        },

        theme: {
          color: "#15803d"
        }

      };

      const razor = new window.Razorpay(options);
      razor.open();

    } catch (err) {

      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Payment failed"
      });

    }

    setProcessingPayment(false);

  };

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <div className="flex justify-center py-20">
        Loading...
      </div>
    );

  }

  if (!enrollment || !batch) {

    return (
      <div className="flex justify-center py-20 text-red-600">
        Invalid or expired renewal link
      </div>
    );

  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold text-green-800">
            Renew Enrollment
          </h1>

          <p className="text-sm text-gray-600">
            Extend your coaching plan
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

      </div>

      {/* PLAYER INFO */}

      <div className="bg-white border rounded-xl p-5">

        <div className="flex items-center gap-3">

          <CheckCircle2 className="text-green-600" />

          <div>

            <p className="font-semibold">
              {enrollment.playerName}
            </p>

            <p className="text-sm text-gray-500">
              {batch.name} • {enrollment.sportName}
            </p>

          </div>

        </div>

      </div>

      {/* PLAN SELECTION */}

      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold text-gray-800">
          Select Plan
        </h2>

        <div className="flex gap-4">

          <button
            onClick={() => setPlanType("monthly")}
            className={`flex-1 border rounded-lg p-4 text-center ${
              planType === "monthly"
                ? "border-green-700 bg-green-50"
                : ""
            }`}
          >
            Monthly
            <div className="text-lg font-bold">
              ₹{batch.monthlyFee}
            </div>
          </button>

          {batch.hasQuarterly && (

            <button
              onClick={() => setPlanType("quarterly")}
              className={`flex-1 border rounded-lg p-4 text-center ${
                planType === "quarterly"
                  ? "border-green-700 bg-green-50"
                  : ""
              }`}
            >
              Quarterly
              <div className="text-lg font-bold">
                ₹{batch.quarterlyFee}
              </div>
            </button>

          )}

        </div>

      </div>

      {/* PAYMENT SUMMARY */}

      <div className="bg-white border rounded-xl p-5 space-y-4">

        <h2 className="font-semibold">
          Payment Summary
        </h2>

        <div className="flex justify-between text-sm">
          <span>Plan</span>
          <span className="capitalize">
            {planType}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Amount</span>
          <span>
            ₹{priceDetails.basePrice}
          </span>
        </div>

        <hr />

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span className="text-green-700">
            ₹{priceDetails.finalPrice}
          </span>
        </div>

        <Button
          onClick={handlePayment}
          className="w-full bg-green-700 hover:bg-green-800"
        >
          Renew & Pay
        </Button>

      </div>

      {processingPayment && (

        <div className="fixed inset-0 bg-white/80 flex items-center justify-center">

          <div className="text-center space-y-4">

            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto" />

            <p className="text-green-800 font-semibold">
              Processing Payment...
            </p>

          </div>

        </div>

      )}

    </div>
  );

}