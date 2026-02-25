import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useMemo, useState, useRef } from "react";
import api from "@/lib/axios";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCitiesByState } from "@/lib/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Users, User, ArrowLeft, Phone, CheckCircle2, Check } from "lucide-react";
import { sendOtp } from "@/lib/firebase";
import { Label } from "@/components/ui/label";
const COUNTRY_NAME = "India";
const STATE_NAME = "Maharashtra";
const COUNTRY_CODE = "IN";
const STATE_CODE = "MH";
const ASSETS_BASE =
  import.meta.env.VITE_ASSETS_BASE_URL || "http://localhost:5000";

export default function EnrollCoaching() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const setAuth = useUserStore((s) => s.setAuth);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [sports, setSports] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchPlans, setBatchPlans] = useState({});
  const [discounts, setDiscounts] = useState([]);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  /* ================= OTP STATES ================= */
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  /* ================= CHECK VERIFIED MOBILE (NEW USER FLOW) ================= */
  useEffect(() => {
    const verifiedMobile = localStorage.getItem("verifiedMobile");
    if (verifiedMobile && !user) {
      setForm((prev) => ({
        ...prev,
        mobile: verifiedMobile,
      }));
      setPhoneVerified(true);
    }
  }, []);
  /* ================= ADDRESS ================= */
  const [cities, setCities] = useState([]);
  useEffect(() => {
    const mhCities = getCitiesByState(COUNTRY_CODE, STATE_CODE);
    setCities(mhCities);
  }, []);

  const [form, setForm] = useState({
    playerName: "",
    age: "",
    mobile: "",
    email: "",
    city: "",
    localAddress: "",
    notes: "",
  });
  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchData = async () => {
      const sportsRes = await api.get("/sports");
      const batchesRes = await api.get("/batches");
      const discountRes = await api.get("/discounts");
      const sortedSports = [...sportsRes.data].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setSports(sortedSports);
      setBatches(batchesRes.data);
      setDiscounts(discountRes.data || []);
      if (sortedSports.length) setSelectedSport(sortedSports[0]);
    };
    fetchData();
  }, []);
  /* ================= PREFILL USER IF LOGGED IN ================= */
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      playerName: user.fullName || "",
      age: user.age ? String(user.age) : "",
      mobile: user.mobile || "",
      email: user.email || "",
      city: user.address?.city || "",
      localAddress: user.address?.localAddress || "",
    }));
    setPhoneVerified(true);
    setIsExistingUser(true);
  }, [user]);
  /* ================= FILTER ================= */
  const filteredBatches = useMemo(() => {
    if (!selectedSport) return [];

    return batches.filter(
      (b) =>
        String(b.sportId) === String(selectedSport._id) &&
        b.status === "active"
    );
  }, [selectedSport, batches]);


  /* ================= PRICE HELPERS ================= */

  const calculateStackedDiscount = (baseAmount, discountsArray) => {
    let running = baseAmount;

    discountsArray.forEach((d) => {
      if (d.type === "percentage") {
        running -= (running * d.value) / 100;
      } else if (d.type === "flat") {
        running -= d.value;
      }
    });

    return Math.max(0, Math.round(running));
  };

  const getAutoEnrollmentDiscounts = (planType, batch, sport) => {
    const now = new Date();

    return discounts.filter((d) => {
      if (!d.isActive) return false;
      if (d.applicableFor !== "enrollment") return false;

      // 🚨 IMPORTANT RULE
      // If discount has a CODE → it is a COUPON → never auto apply
      if (d.code) return false;

      // plan match
      if (d.planType && d.planType !== planType) return false;

      // sport match
      if (d.sportId && sport) {
        const ds =
          typeof d.sportId === "object"
            ? d.sportId._id
            : d.sportId;

        if (String(ds) !== String(sport._id)) return false;
      }

      // batch match
      if (d.batchId && batch) {
        const db =
          typeof d.batchId === "object"
            ? d.batchId._id
            : d.batchId;

        if (String(db) !== String(batch._id)) return false;
      }

      if (d.validFrom && new Date(d.validFrom) > now) return false;
      if (d.validTill && new Date(d.validTill) < now) return false;

      return true;
    });
  };


  /* ================= PRICE CALCULATION ================= */
  const priceDetails = useMemo(() => {
    if (!selectedBatch) return null;
    const monthlyFee = selectedBatch.monthlyFee || 0;
    const basePrice =
      selectedBatch.selectedPlan === "monthly"
        ? monthlyFee
        : monthlyFee * 3;
    // 1️⃣ Auto DB discounts
    const autoDiscounts = getAutoEnrollmentDiscounts(
      selectedBatch.selectedPlan,
      selectedBatch,
      selectedSport
    );
    // 2️⃣ Coupon discounts
    const allDiscounts = [...autoDiscounts, ...appliedDiscounts];
    // 3️⃣ Final calculation
    const finalPrice = calculateStackedDiscount(
      basePrice,
      allDiscounts
    );
    return {
      basePrice,
      finalPrice,
      totalDiscount: basePrice - finalPrice,
      discounts: allDiscounts,
    };
  }, [selectedBatch, appliedDiscounts, discounts, selectedSport]);

  const hasQuarterlyDiscount = (batch, sport) => {
    const now = new Date();

    return discounts.some((d) => {
      if (!d.isActive) return false;
      if (d.applicableFor !== "enrollment") return false;

      // must be quarterly AND valid
      if (d.planType !== "quarterly") return false;

      // sport filter
      if (d.sportId && sport) {
        const ds =
          typeof d.sportId === "object"
            ? d.sportId._id
            : d.sportId;
        if (String(ds) !== String(sport._id)) return false;
      }

      // batch filter
      if (d.batchId && batch) {
        const db =
          typeof d.batchId === "object"
            ? d.batchId._id
            : d.batchId;
        if (String(db) !== String(batch._id)) return false;
      }

      // date validity
      if (d.validFrom && new Date(d.validFrom) > now) return false;
      if (d.validTill && new Date(d.validTill) < now) return false;

      return true;
    });
  };

  /* ================= OTP TIMER ================= */
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
  const loadRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });
  /* ================= SEND OTP ================= */
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Enter a valid 10-digit Indian mobile number",
      });
      return;
    }

    try {
      setSendingOtp(true);
      const result = await sendOtp(`+91${form.mobile}`);
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
        description: err.message || "Try again",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  /* ================= AUTO VERIFY OTP ================= */
  useEffect(() => {
    if (otp.length === 6 && confirmResult && !phoneVerified) {
      verifyOtp();
    }
  }, [otp, confirmResult]);


  const verifyOtp = async () => {
    try {
      setVerifyingOtp(true);

      await confirmResult.confirm(otp);

      setPhoneVerified(true);
      setOtpSent(false);

      // Check if user exists
      const res = await api.get(
        `/users/check-mobile/${form.mobile}`
      );

      if (res.data.exists) {
        // Existing user → login
        const loginRes = await api.post(
          "/auth/player-login",
          { mobile: form.mobile }
        );

        const { token, user } = loginRes.data;

        setAuth({ token, user });
        setIsExistingUser(true);

        setForm((prev) => ({
          ...prev,
          playerName: user.fullName || "",
          age: user.age ? String(user.age) : "",
          email: user.email || "",
          city: user.address?.city || "",
          localAddress: user.address?.localAddress || "",
        }));

        toast({ title: "Welcome Back 👋" });

        // Clean temp mobile
        localStorage.removeItem("verifiedMobile");

      } else {
        // 🔥 NEW USER FLOW
        localStorage.setItem("verifiedMobile", form.mobile);

        setIsExistingUser(false);

        toast({
          title: "Mobile verified ✅",
          description: "Please complete your details.",
        });
      }

    } catch {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
      });
      setOtp("");
    } finally {
      setVerifyingOtp(false);
    }
  };
  const submitEnrollment = async () => {
    if (!phoneVerified) {
      toast({
        variant: "destructive",
        title: "Verify mobile first",
      });
      return;
    }

    if (!selectedBatch) {
      toast({
        variant: "destructive",
        title: "Select a batch first",
      });
      return;
    }

    setSubmitting(true);

    let enrollment;

    try {
      /* ================= CREATE ENROLLMENT ================= */

      const plan = selectedBatch.selectedPlan || "monthly";

      const enrollRes = await api.post("/enrollments/website", {
        source: "website",
        playerName: form.playerName.trim(),
        age: Number(form.age),
        mobile: form.mobile,
        email: form.email?.toLowerCase() || "",
        address: {
          country: COUNTRY_NAME,
          state: STATE_NAME,
          city: form.city,
          localAddress: form.localAddress,
        },
        batchId: selectedBatch._id,
        batchName: selectedBatch.name,
        planType: plan,
        startDate: new Date().toISOString().slice(0, 10),
        discountCodes:
          priceDetails?.discounts
            ?.map((d) => d.code)
            .filter(Boolean) || [],
        paymentMode: "razorpay",
      });

      /* ================= HANDLE RETRY CASE ================= */

      if (enrollRes.data.retry) {
        enrollment = enrollRes.data.enrollment;

        toast({
          title: "Retrying payment",
          description: "Your previous payment was incomplete. Please complete it now.",
        });
      } else {
        enrollment = enrollRes.data;
      }

    } catch (err) {
      setSubmitting(false);

      let message =
        err?.response?.data?.message || "";

      // 🔒 Fallback if raw Mongo slips through
      if (message.includes("duplicate key")) {
        message = "You are already enrolled in this batch.";
      }

      toast({
        variant: "destructive",
        title: "Enrollment Failed",
        description:
          message ||
          "Something went wrong. Please try again.",
      });
        return;
    }

    /* ================= LOAD RAZORPAY ================= */

    const isLoaded = await loadRazorpay();

    if (!isLoaded) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Payment gateway failed to load",
      });
      return;
    }

    try {
      /* ================= CREATE ORDER ================= */

      const orderRes = await api.post("/payments/create-order", {
        purpose: "enrollment",
        enrollmentId: enrollment._id,
      });

      const { orderId, amount, key, paymentId } = orderRes.data;

      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        order_id: orderId,
        name: "Coaching Enrollment",
        description: selectedBatch.name,

        handler: async function (response) {
          try {
            setProcessingPayment(true);

            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId,
            });
            toast({ title: "Payment Successful 🎉" });

            /* ================= SUCCESS NAVIGATION ================= */
            navigate("/enrollment-success", {
              state: {
                userName: form.userName,
                email: form.email,
                batchName: selectedBatch.name,
                sportName: selectedSport.name,
              },
              replace: true,
            });


            if (!isExistingUser) {
              const loginRes = await api.post("/auth/player-login", {
                mobile: form.mobile,
              });

              if (loginRes.data.exists) {
                const { token, user } = loginRes.data;
                setAuth({ token, user });
                localStorage.removeItem("verifiedMobile");
              }
            }

          } catch {
            toast({
              variant: "destructive",
              title: "Payment verification failed",
            });
          }
        },

        modal: {
          ondismiss: function () {
            toast({
              variant: "destructive",
              title: "Payment cancelled",
            });
          },
        },

        theme: {
          color: "#15803d",
        },
      };

      const razor = new window.Razorpay(options);
      razor.open();

    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to initiate payment",
      });
    }

    setSubmitting(false);
  };

  const applyDiscountCode = () => {
    if (!discountCodeInput) return;

    const code = discountCodeInput.trim().toUpperCase();
    const now = new Date();

    const normalize = (str) =>
      str.replace(/\s+/g, "").toUpperCase();

    const discount = discounts.find((d) => {
      if (!d.code) return false;

      if (normalize(d.code) !== normalize(code))
        return false;

      if (!d.isActive) return false;
      if (d.applicableFor !== "enrollment") return false;

      if (d.planType && d.planType !== selectedBatch.selectedPlan)
        return false;

      if (d.sportId && selectedSport) {
        const discountSportId =
          typeof d.sportId === "object"
            ? d.sportId._id
            : d.sportId;

        if (String(discountSportId) !== String(selectedSport._id))
          return false;
      }

      if (d.batchId && selectedBatch) {
        const discountBatchId =
          typeof d.batchId === "object"
            ? d.batchId._id
            : d.batchId;

        if (String(discountBatchId) !== String(selectedBatch._id))
          return false;
      }

      if (d.validFrom && new Date(d.validFrom) > now)
        return false;

      if (d.validTill && new Date(d.validTill) < now)
        return false;

      return true;
    });

    if (!discount) {
      toast({
        variant: "destructive",
        title: "Invalid or Not Applicable Code",
      });
      return;
    }
    if (appliedDiscounts.some((d) => d.code === discount.code)) {
      toast({
        variant: "destructive",
        title: "Already Applied",
      });
      return;
    }
    setAppliedDiscounts((prev) => [...prev, discount]);
    setDiscountCodeInput("");
    toast({ title: "Discount Applied 🎉" });
  };
  const removeDiscount = (code) => {
    setAppliedDiscounts((prev) =>
      prev.filter((d) => d.code !== code)
    );
    toast({
      title: "Coupon Removed",
    });
  };

  {
    processingPayment && (
      <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="text-green-800 font-semibold">
            Confirming your enrollment...
          </p>
          <p className="text-sm text-gray-500">
            Please do not close this page
          </p>
        </div>
      </div>
    )
  }

  const currentStep = selectedBatch ? 3 : selectedSport ? 2 : 1;


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ================= TITLE ================= */}
      <div>
        <h1 className="text-2xl font-bold text-green-800">
          Enroll for Coaching
        </h1>
        <p className="text-sm text-gray-600">
          Choose the sport and batch that best fits your child's training goals.
        </p>
      </div>
      {/* ================= STEP HEADER ================= */}
      <div className="rounded-xl py-3 px-4 mb-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-between w-full max-w-2xl">

            {/* STEP 1 */}
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all
          ${currentStep > 1
                    ? "bg-green-700"
                    : currentStep === 1
                      ? "bg-green-700"
                      : "bg-gray-400"
                  }`}
              >
                {currentStep > 1 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  1
                )}
              </div>

              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${currentStep >= 1 ? "text-gray-800" : "text-gray-400"
                  }`}
              >
                Select Sport
              </span>
            </div>

            {/* LINE */}
            <div
              className={`flex-1 h-[2px] mx-2 sm:mx-4 transition-all ${currentStep > 1 ? "bg-green-700" : "bg-gray-300"
                }`}
            />

            {/* STEP 2 */}
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all
          ${currentStep > 2
                    ? "bg-green-700"
                    : currentStep === 2
                      ? "bg-green-700"
                      : "bg-gray-400"
                  }`}
              >
                {currentStep > 2 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  2
                )}
              </div>

              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${currentStep >= 2 ? "text-gray-800" : "text-gray-400"
                  }`}
              >
                Choose Batch
              </span>
            </div>

            {/* LINE */}
            <div
              className={`flex-1 h-[2px] mx-2 sm:mx-4 transition-all ${currentStep > 2 ? "bg-green-700" : "bg-gray-300"
                }`}
            />

            {/* STEP 3 */}
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all
          ${currentStep === 3
                    ? "bg-green-700"
                    : "bg-gray-400"
                  }`}
              >
                3
              </div>

              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${currentStep >= 3 ? "text-gray-800" : "text-gray-400"
                  }`}
              >
                Enroll
              </span>
            </div>

          </div>
        </div>
      </div>
      {/* ================= SPORT + BATCH SELECTION ================= */}
      {!selectedBatch && (
        <>
          <h2 className="font-semibold text-green-700">Select a Sport</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
            {sports.map((s) => (
              <button
                key={s._id}
                onClick={() => setSelectedSport(s)}
                className={`relative h-36 rounded-xl overflow-hidden border transition
          ${selectedSport?._id === s._id
                    ? "ring-4 ring-green-800"
                    : "hover:ring-4 hover:ring-green-500"
                  }`}
              >
                <img
                  src={`${ASSETS_BASE}${s.iconUrl}`}
                  alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 w-full bg-black/60 text-white text-sm font-semibold py-2 text-center">
                  {s.name}
                </div>
              </button>
            ))}
          </div>
          {/* ================= BATCHES ================= */}
          {selectedSport && (
            <>
              <h2 className="font-semibold text-green-700 mt-8">
                Available Coaching Batches
              </h2>

              <div className="space-y-6">
                {filteredBatches.map((b) => {
                  const plan = batchPlans[b._id] || "monthly";

                  /* ================= BASE PRICE ================= */
                  const monthlyFee = b.monthlyFee || 0;
                  const basePrice =
                    plan === "monthly"
                      ? monthlyFee
                      : monthlyFee * 3;

                  /* ================= AUTO DISCOUNTS ================= */
                  const autoDiscounts = getAutoEnrollmentDiscounts(
                    plan,
                    b,
                    selectedSport
                  );

                  /* ================= FINAL PRICE (STACKED) ================= */
                  const finalPrice = calculateStackedDiscount(
                    basePrice,
                    autoDiscounts
                  );

                  const discountAmount = Math.max(
                    basePrice - finalPrice,
                    0
                  );

                  const discountPercent =
                    discountAmount > 0
                      ? Math.round(
                        (discountAmount / basePrice) * 100
                      )
                      : 0;

                  /* ================= SEAT LOGIC ================= */
                  const seatsLeft = b.capacity - b.enrolledCount;
                  const isLowSeats = seatsLeft <= 5;

                  return (
                    <div
                      key={b._id}
                      className="bg-white rounded-2xl border shadow-sm p-5 space-y-6"
                    >
                      {/* ================= HEADER ================= */}
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

                        {/* LEFT INFO */}
                        <h3 className="text-lg font-semibold text-gray-800">
                          {b.name}
                        </h3>

                        {/* RIGHT SECTION */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto">

                          {/* ================= PLAN TOGGLE ================= */}
                          <div className="relative w-[200px] h-9 bg-gray-100 rounded-full p-1 flex items-center text-sm font-medium overflow-hidden">

                            {hasQuarterlyDiscount(b, selectedSport) ? (
                              <>
                                <div
                                  className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-green-600 shadow transition-all duration-300 ${plan === "monthly" ? "left-1" : "left-[50%]"
                                    }`}
                                />

                                <button
                                  onClick={() => {
                                    setBatchPlans((prev) => ({
                                      ...prev,
                                      [b._id]: "monthly",
                                    }));
                                    setAppliedDiscounts([]);
                                  }}
                                  className={`relative z-10 w-1/2 text-center ${plan === "monthly" ? "text-white" : "text-gray-600"
                                    }`}
                                >
                                  Monthly
                                </button>

                                <button
                                  onClick={() => {
                                    setBatchPlans((prev) => ({
                                      ...prev,
                                      [b._id]: "quarterly",
                                    }));
                                    setAppliedDiscounts([]);
                                  }}
                                  className={`relative z-10 w-1/2 text-center ${plan === "quarterly" ? "text-white" : "text-gray-600"
                                    }`}
                                >
                                  Quarterly
                                </button>
                              </>
                            ) : (
                              // Only Monthly if no quarterly discount
                              <div className="w-full text-center font-medium text-gray-700">
                                Monthly
                              </div>
                            )}
                          </div>


                          {/* ================= PRICE BLOCK ================= */}
                          <div className="flex items-center gap-3 flex-wrap">

                            {/* ORIGINAL PRICE */}
                            {discountAmount > 0 && (
                              <span className="text-gray-400 line-through text-sm">
                                ₹{basePrice.toLocaleString()}
                              </span>
                            )}

                            {/* FINAL PRICE */}
                            <span className="text-lg font-bold text-orange-600">
                              ₹{finalPrice.toLocaleString()}
                            </span>

                            {/* DISCOUNT BADGE */}
                            {discountAmount > 0 && (
                              <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-semibold">
                                {discountPercent}% OFF
                              </span>
                            )}
                          </div>

                          {/* ================= ENROLL BUTTON ================= */}
                          <Button
                            className="bg-orange-500 hover:bg-orange-600 rounded-full px-6"
                            onClick={() =>
                              setSelectedBatch({
                                ...b,
                                selectedPlan: plan,
                                selectedBasePrice: basePrice,
                                selectedPrice: finalPrice,
                                discountAmount: discountAmount,
                                discountPercent: discountPercent,
                              })
                            }
                          >
                            Enroll
                          </Button>
                        </div>
                      </div>

                      {/* ================= DETAILS GRID ================= */}
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

                        <div className="bg-gray-50 rounded-xl p-3 text-sm">
                          <p className="text-gray-500 text-xs uppercase">Time</p>
                          <p className="font-medium">{b.time}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 text-sm">
                          <p className="text-gray-500 text-xs uppercase">Days</p>
                          <p className="font-medium">{b.schedule}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 text-sm">
                          <p className="text-gray-500 text-xs uppercase">Age</p>
                          <p className="font-medium">6 – 16 years</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 text-sm">
                          <p className="text-gray-500 text-xs uppercase">Coach</p>
                          <p className="font-medium">{b.coachName}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 text-sm">
                          <p className="text-gray-500 text-xs uppercase">Duration</p>
                          <p className="font-medium">
                            {format(new Date(b.startDate), "MMM d")} –{" "}
                            {format(new Date(b.endDate), "MMM d")}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl p-3 text-sm ${isLowSeats
                            ? "bg-orange-50 text-orange-700"
                            : "bg-green-50 text-green-700"
                            }`}
                        >
                          <p className="text-xs uppercase">Seats</p>
                          <p className="font-semibold">
                            {b.enrolledCount}/{b.capacity}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {/* ================= FORM + SUMMARY ================= */}
      {selectedBatch && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ================= LEFT : FORM ================= */}
          <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm p-4 sm:p-8 space-y-2">

            {/* HEADER ROW */}
            <div className="flex items-center justify-between">

              {/* LEFT : TITLE */}
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">
                Player Details
              </h2>

              {/* RIGHT : BACK BUTTON */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBatch(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

            </div>

            {/* ================= MOBILE + OTP ================= */}
            <div className="space-y-2">
              <Label>Mobile Number</Label>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter 10 digit mobile number"
                    disabled={phoneVerified}
                    value={form.mobile}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                  />
                  {phoneVerified && (
                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                  )}
                </div>

                {!phoneVerified && !otpSent && (
                  <Button
                    type="button"
                    className="bg-green-700 hover:bg-green-800"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? "Sending OTP..." : "Verify Number"}
                  </Button>
                )}

                {!phoneVerified && otpSent && (
                  <>
                    <Input
                      placeholder="OTP"
                      className="w-28"
                      value={otp}
                      maxLength={6}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                    />
                    <Button onClick={verifyOtp}>
                      Verify OTP
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ================= OTHER FIELDS ================= */}
            <div
              className={`grid sm:grid-cols-2 gap-2 sm:gap-6 transition-opacity ${!phoneVerified ? "opacity-50 pointer-events-none" : ""
                }`}
            >
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={form.playerName}
                  onChange={(e) =>
                    setForm({ ...form, playerName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Age</Label>
                <Input
                  type="number"
                  placeholder="Enter age"
                  value={form.age}
                  onChange={(e) =>
                    setForm({ ...form, age: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>City</Label>
                <Select
                  value={form.city}
                  onValueChange={(value) =>
                    setForm({ ...form, city: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {cities.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label>Local Address</Label>
                <Textarea
                  placeholder="Area / Landmark"
                  value={form.localAddress}
                  onChange={(e) =>
                    setForm({ ...form, localAddress: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* ================= RIGHT : PAYMENT SUMMARY ================= */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">

              <div className="bg-white rounded-2xl shadow-md border p-6 space-y-6">

                <h2 className="text-lg sm:text-xl font-semibold">
                  Payment Summary
                </h2>

                <div className="space-y-4 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">Sport</span>
                    <span className="font-medium">
                      {selectedSport.name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Batch</span>
                    <span className="font-medium">
                      {selectedBatch.name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <span className="capitalize font-medium">
                      {selectedBatch.selectedPlan}
                    </span>
                  </div>

                  <hr />

                  <div className="flex justify-between">
                    <span>
                      {selectedBatch.selectedPlan === "monthly"
                        ? "Monthly Fee"
                        : "Quarterly Fee"}
                    </span>
                    <span>
                      ₹ {priceDetails?.basePrice?.toLocaleString()}
                    </span>
                  </div>

                  {priceDetails?.totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>
                        - ₹ {priceDetails?.totalDiscount?.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <hr />

                  <div className="flex justify-between text-base sm:text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-green-700">
                      ₹ {priceDetails?.finalPrice?.toLocaleString()}
                    </span>
                  </div>

                  {/* COUPON */}
                  <div className="pt-4 space-y-3">
                    <Label>Have a Coupon?</Label>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={discountCodeInput}
                        onChange={(e) =>
                          setDiscountCodeInput(e.target.value.toUpperCase())
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyDiscountCode}
                      >
                        Apply
                      </Button>
                    </div>

                    {appliedDiscounts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {appliedDiscounts.map((d) => (
                          <div
                            key={d.code}
                            className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs flex items-center gap-2"
                          >
                            {d.code}
                            <button
                              onClick={() => removeDiscount(d.code)}
                              className="text-red-600 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    disabled={!phoneVerified || submitting}
                    className="w-full py-4 bg-green-700 hover:bg-green-800 text-white font-semibold"
                    onClick={submitEnrollment}
                  >
                    Proceed to Pay
                  </Button>

                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
