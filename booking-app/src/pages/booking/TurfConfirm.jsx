import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Check, ArrowLeft } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendOtp } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";

const ASSETS_BASE =
  import.meta.env.VITE_ASSETS_BASE_URL || "http://localhost:5000";

const onlyDigits = (v) => (v || "").replace(/\D/g, "");
const normalize10 = (v) => onlyDigits(v).slice(-10);

const formatTime12h = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":");

  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12 || 12;

  return `${h}:${minute} ${ampm}`;
};

export default function TurfConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const setAuth = useUserStore((s) => s.setAuth);
  const user = useUserStore((s) => s.user);

  if (!state) {
    navigate("/book-turf");
    return null;
  }

  const {
    sportId,
    sportName,
    sportImage,
    facilityId,
    facilityName,
    date,
    startTime,
    endTime,
    hourlyRate,
  } = state;

  /* ================= AMOUNT ================= */
  const [baseAmount, setBaseAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [requiredAdvance, setRequiredAdvance] = useState(0);

  const [discountCode, setDiscountCode] = useState("");
  const [discountData, setDiscountData] = useState(null);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [paymentType, setPaymentType] = useState("");

  const coverImage = sportImage
    ? `${ASSETS_BASE}${sportImage}`
    : "/placeholder-sport.jpg";

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    userName: "",
    email: "",
    mobile: "",
    notes: "",
  });

  /* ================= OTP ================= */
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const verifiedMobile = localStorage.getItem("verifiedMobile");
    if (verifiedMobile && !user) {
      setForm((prev) => ({
        ...prev,
        mobile: normalize10(verifiedMobile),
      }));
      setPhoneVerified(true);
      setIsExistingUser(false);
    }
  }, [user]);

  /* =========================================================
     ✅ 2) PREFILL IF LOGGED IN (SAME STYLE AS ENROLLMENT)
  ========================================================= */
  useEffect(() => {
    if (!user) return;

    setForm((prev) => ({
      ...prev,
      userName: user.fullName || "",
      email: user.email || "",
      mobile: normalize10(user.mobile || ""),
    }));

    setPhoneVerified(true);
    setIsExistingUser(true);

    // If user is logged-in, clean any temp mobile
    localStorage.removeItem("verifiedMobile");
  }, [user]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (timer === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timer]);

  const startTimer = () => {
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
  };

  /* ================= SEND OTP ================= */
  const handleSendOtp = async () => {
    const mobile10 = normalize10(form.mobile);

    if (!/^[6-9]\d{9}$/.test(mobile10)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Enter a valid 10-digit Indian mobile number",
      });
      return;
    }

    if (timer > 0) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: `You can resend OTP in ${timer}s`,
      });
      return;
    }

    try {
      setSendingOtp(true);

      const result = await sendOtp(`+91${mobile10}`);
      setConfirmResult(result);

      setOtpSent(true);
      setOtp("");
      startTimer();

      toast({
        title: "OTP Sent",
        description: "Check your phone for the OTP",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "OTP Failed",
        description: err?.message || "Try again",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  /* ================= AUTO VERIFY OTP (SAME AS ENROLLMENT) ================= */
  useEffect(() => {
    if (otp.length === 6 && confirmResult && !phoneVerified) {
      verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, confirmResult]);

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (!confirmResult) return;

    try {
      setVerifyingOtp(true);

      await confirmResult.confirm(otp);

      setPhoneVerified(true);
      setOtpSent(false);

      const mobile10 = normalize10(form.mobile);

      // Check if user exists
      const res = await api.get(`/users/check-mobile/${mobile10}`);

      if (res.data.exists) {
        // Existing user -> login
        const loginRes = await api.post("/auth/player-login", {
          mobile: mobile10,
        });

        const { token, user } = loginRes.data;

        setAuth({ token, user });
        setIsExistingUser(true);

        setForm((prev) => ({
          ...prev,
          userName: user.fullName || "",
          email: user.email || "",
          mobile: normalize10(user.mobile || mobile10),
        }));

        toast({ title: "Welcome Back 👋" });

        localStorage.removeItem("verifiedMobile");
      } else {
        // New user flow (same as enrollment)
        localStorage.setItem("verifiedMobile", mobile10);
        setIsExistingUser(false);

        toast({
          title: "Mobile verified ✅",
          description: "Please complete your details.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter correct OTP",
      });
      setOtp("");
    } finally {
      setVerifyingOtp(false);
    }
  };

  useEffect(() => {

    const fetchPreview = async () => {

      if (!facilityId || !startTime || !endTime) return;

      try {

        const res = await api.post("/turf-rentals/preview-price", {
          facilityId,
          startTime,
          endTime,
        });

        const { baseAmount, finalAmount, requiredAdvance } = res.data;

        setBaseAmount(baseAmount);
        setFinalAmount(finalAmount);
        setRequiredAdvance(requiredAdvance);

      } catch (err) {

        console.error("Preview price failed", err);

      }

    };

    fetchPreview();

  }, [facilityId, startTime, endTime]);

  /* ================= DISCOUNT ================= */
  const applyDiscountCode = async () => {
    if (!discountCode) return;

    try {
      const res = await api.post("/discounts/preview", {
        type: "turf",
        amount: finalAmount,
        discountCodes: [discountCode],
      });

      setDiscountData(res.data);
      toast({ title: "Discount Applied 🎉" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Invalid Coupon",
      });
    }
  };

  /* ================= LOAD RAZORPAY ================= */

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });


  /* ================= HANDLE PAYMENT ================= */

  const handleSubmit = async () => {

    if (!phoneVerified) {
      toast({
        variant: "destructive",
        title: "Verify mobile first",
      });
      return;
    }

    if (!paymentType) {
      toast({
        variant: "destructive",
        title: "Please select payment type",
      });
      return;
    }

    try {

      setProcessingPayment(true);

      /* ================= CREATE RENTAL ================= */

      const rentalRes = await api.post("/turf-rentals", {
        source: "website",
        userName: form.userName?.trim(),
        phone: normalize10(form.mobile),
        email: form.email?.trim(),
        notes: form.notes,
        facilityId,
        sportId,
        rentalDate: date,
        startTime,
        endTime,
        paymentType,
        discountCodes: discountCode ? [discountCode] : [],
        paymentMode: "razorpay",
      });

      const rental = rentalRes.data;


      /* ================= LOAD RAZORPAY ================= */

      const loaded = await loadRazorpay();

      if (!loaded) {

        setProcessingPayment(false);

        toast({
          variant: "destructive",
          title: "Failed to load payment gateway",
        });

        return;

      }


      /* ================= CALCULATE AMOUNT ================= */

      const payableAmount =
        paymentType === "advance"
          ? requiredAdvance
          : (discountData?.finalAmount || finalAmount);


      /* ================= CREATE ORDER ================= */

      const orderRes = await api.post("/payments/create-order", {
        purpose: "turf",
        turfRentalId: rental._id,
        paymentType,
        amount: payableAmount,
      });

      const { orderId, key, paymentId } = orderRes.data;


      /* ================= RAZORPAY OPTIONS ================= */

      const options = {

        key,

        order_id: orderId,

        amount: payableAmount * 100,

        currency: "INR",

        name: "Turf Booking",

        description: `${facilityName} – ${sportName}`,

        prefill: {
          name: form.userName,
          email: form.email,
          contact: normalize10(form.mobile),
        },

        notes: {
          bookingId: rental._id,
          facility: facilityName,
          sport: sportName,
        },

        theme: {
          color: "#15803d",
        },


        /* ================= PAYMENT SUCCESS ================= */

        handler: async (response) => {

          try {

            if (!response?.razorpay_payment_id) return;

            await api.post("/payments/verify", {

              razorpay_order_id: response.razorpay_order_id,

              razorpay_payment_id: response.razorpay_payment_id,

              razorpay_signature: response.razorpay_signature,

              paymentId,

            });


            toast({
              title: "Payment Successful 🎉",
            });


            /* ================= AUTO LOGIN ================= */

            if (!isExistingUser) {

              const loginRes = await api.post("/auth/player-login", {
                mobile: normalize10(form.mobile),
              });

              if (loginRes.data) {

                const { token, user } = loginRes.data;

                setAuth({ token, user });

                localStorage.removeItem("verifiedMobile");

              }

            }


            /* ================= SUCCESS PAGE ================= */

            navigate("/turf-success", {
              state: {
                userName: form.userName,
                email: form.email,
              },
              replace: true,
            });

          }

          catch (err) {

            console.error("Payment verification failed:", err);

            toast({
              variant: "destructive",
              title: "Payment verification failed",
            });

            setProcessingPayment(false);

          }

        },


        /* ================= PAYMENT CANCEL ================= */

        modal: {

          ondismiss: async function () {

            setProcessingPayment(false);

            toast({
              variant: "destructive",
              title: "Payment cancelled",
            });

            /* optional: notify backend */

            try {

              await api.post("/payments/cancel", {
                paymentId
              });

            } catch (e) { }

          }

        }

      };


      /* ================= OPEN RAZORPAY ================= */

      const razor = new window.Razorpay(options);

      razor.open();

    }

    catch (err) {

      console.error(err);

      setProcessingPayment(false);

      toast({
        variant: "destructive",
        title: "Something went wrong",
      });

    }

  };
  const activeStep = 4;

  const handleBack = () => {
    navigate("/book-turf", {
      state: { sportId, facilityId, date, startTime, endTime },
    });
  };

  return (
    <>
      {processingPayment && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>

            <p className="text-green-800 font-semibold">
              Confirming your booking...
            </p>

            <p className="text-sm text-gray-500">
              Please do not close this page
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-0 sm:py-2 space-y-4"></div>
      <div className="max-w-7xl mx-auto py-0 sm:py-2 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">
            Book Your Turf
          </h1>
          <p className="text-sm text-gray-600">
            Choose the sport and facility that best fits your needs.
          </p>
        </div>
        {/* ================= HEADER WITH STEPS ================= */}
        <div className="w-full mb-6">
          <div className="rounded-xl py-3 px-2 md:px-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center justify-between w-full max-w-3xl">
                {["Sport", "Facility", "Time Slot", "Review"].map((step, index) => {
                  const stepNumber = index + 1;
                  const isCompleted = activeStep > stepNumber;
                  const isActive = activeStep === stepNumber;
                  const isLast = stepNumber === 4;

                  return (
                    <div key={index} className="flex items-center flex-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                        <div
                          className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          text-white text-sm font-semibold
                          ${isCompleted
                              ? "bg-green-700"
                              : isActive
                                ? "bg-green-600"
                                : "bg-gray-300 text-gray-500"
                            }
                        `}
                        >
                          {isCompleted ? <Check size={16} /> : stepNumber}
                        </div>

                        <span
                          className={`text-[11px] sm:text-sm whitespace-nowrap
                          ${isCompleted || isActive ? "text-green-700" : "text-gray-400"}
                        `}
                        >
                          {step}
                        </span>
                      </div>

                      {!isLast && (
                        <div
                          className={`flex-1 h-[2px] mx-2 sm:mx-4
                          ${activeStep > stepNumber ? "bg-green-700" : "bg-gray-300"}
                        `}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-green-700 font-medium text-sm hover:opacity-80 transition"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <div />
          </div>
        </div>

        {/* ================= MAIN GRID ================= */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ================= LEFT FORM ================= */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow border p-4 sm:p-8 space-y-6">
            <h2 className="text-xl font-semibold">Player Details</h2>

            {/* ================= MOBILE + OTP ================= */}
            <div className="space-y-2">
              <Label>Mobile Number</Label>

              {/* MAIN ROW */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">

                {/* MOBILE INPUT */}
                <div className="relative w-full md:flex-1">
                  <Input
                    disabled={phoneVerified}
                    value={form.mobile}
                    placeholder="Enter 10 digit mobile number"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        mobile: normalize10(e.target.value),
                      }))
                    }
                  />

                  {phoneVerified && (
                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* DESKTOP VERIFY BUTTON */}
                {!phoneVerified && !otpSent && (
                  <Button
                    onClick={handleSendOtp}
                    className="hidden md:block bg-green-700"
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? "Sending..." : "Verify"}
                  </Button>
                )}

                {/* DESKTOP OTP INPUT + BUTTON */}
                {otpSent && !phoneVerified && (
                  <div className="hidden md:flex items-center gap-3">
                    <Input
                      className="w-28"
                      value={otp}
                      maxLength={6}
                      onChange={(e) =>
                        setOtp(onlyDigits(e.target.value).slice(0, 6))
                      }
                      placeholder="OTP"
                    />

                    <Button
                      onClick={verifyOtp}
                      className="bg-green-700 whitespace-nowrap"
                      disabled={verifyingOtp}
                    >
                      {verifyingOtp ? "Verifying..." : "Verify OTP"}
                    </Button>

                    {timer > 0 && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {timer}s
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ================= MOBILE ONLY SECTION ================= */}

              {/* MOBILE VERIFY BUTTON */}
              {!phoneVerified && !otpSent && (
                <Button
                  onClick={handleSendOtp}
                  className="md:hidden w-full bg-green-700"
                  disabled={sendingOtp}
                >
                  {sendingOtp ? "Sending..." : "Verify"}
                </Button>
              )}

              {/* MOBILE OTP ROW */}
              {otpSent && !phoneVerified && (
                <div className="md:hidden flex gap-3 items-center">
                  <Input
                    className="flex-1"
                    value={otp}
                    maxLength={6}
                    onChange={(e) =>
                      setOtp(onlyDigits(e.target.value).slice(0, 6))
                    }
                    placeholder="Enter OTP"
                  />

                  <Button
                    onClick={verifyOtp}
                    className="bg-green-700 whitespace-nowrap"
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              )}
            </div>

            {/* NAME + EMAIL */}
            <div
              className={`grid grid-cols-2 gap-4 ${!phoneVerified ? "opacity-50 pointer-events-none" : ""
                }`}
            >
              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.userName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, userName: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className={!phoneVerified ? "opacity-50 pointer-events-none" : ""}>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {/* ================= RIGHT PAYMENT SUMMARY ================= */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow border overflow-hidden sticky top-24">
              <div className="p-6 space-y-5">
                <h3 className="text-lg font-semibold">Payment Summary</h3>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Sport</span>
                    <span className="font-medium text-gray-900">{sportName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Facility</span>
                    <span className="font-medium text-gray-900">{facilityName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(date), "dd MMM yyyy")}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Booked Slots</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                       {formatTime12h(startTime)} - {formatTime12h(endTime)}
                      </span>
                    </div>
                  </div>

                  <hr />

                  <div className="flex justify-between">
                    <span>Base Price</span>
                    <span>₹{baseAmount}</span>
                  </div>

                  {discountData && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- ₹{baseAmount - finalAmount}</span>
                    </div>
                  )}
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium">Select Payment Type</p>

                    <div className="flex gap-3">

                      <button
                        type="button"
                        onClick={() => setPaymentType("full")}
                        className={`flex-1 border rounded-lg py-2 text-sm font-medium ${paymentType === "full"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300"
                          }`}
                      >
                        Pay Full
                        <div className="text-xs text-gray-500">
                          ₹{finalAmount}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentType("advance")}
                        className={`flex-1 border rounded-lg py-2 text-sm font-medium ${paymentType === "advance"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300"
                          }`}
                      >
                        Pay Advance
                        <div className="text-xs text-gray-500">
                          ₹{requiredAdvance}
                        </div>
                      </button>

                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t">
                    <span>Total</span>
                    <span>₹{discountData?.finalAmount || finalAmount}</span>
                  </div>
                  {paymentType === "advance" && (
                    <p className="text-xs text-gray-500">
                      Remaining amount will be paid at the turf.
                    </p>
                  )}

                  <Button
                    className="w-full py-6 bg-green-600 hover:bg-green-700 text-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                    disabled={!phoneVerified || processingPayment}
                    onClick={handleSubmit}
                  >
                    {processingPayment && (
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    )}

                    {processingPayment
                      ? "Processing Payment..."
                      : `Proceed to Pay – ₹${paymentType === "advance"
                        ? requiredAdvance
                        : discountData?.finalAmount || finalAmount
                      }`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
