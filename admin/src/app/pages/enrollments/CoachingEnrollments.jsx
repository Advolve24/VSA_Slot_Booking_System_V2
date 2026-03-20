import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { CalendarIcon, MoreHorizontal, SlidersHorizontal, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getMaharashtraCities } from "@/lib/location";
import { useNavigate } from "react-router-dom";

const PAYMENT_MODES = ["cash", "upi", "razorpay"];
const PAYMENT_STATUS = ["paid", "pending"];

const addMonths = (dateStr, months) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const normalize = (d) => {
  if (!d) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const getLeaveStatus = (e) => {
  if (!e.leaveActive || !e.leaveStartDate || !e.leaveEndDate) {
    return { isOnLeave: false, };
  }
  const today = normalize(new Date());
  const start = normalize(e.leaveStartDate);
  const end = normalize(e.leaveEndDate);
  return {
    isOnLeave: today >= start && today <= end,
  };
};

export default function CoachingEnrollment() {
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 8;
  const [page, setPage] = useState(1);
  const [enrollments, setEnrollments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ sport: "", batch: "", coach: "", status: "" });
  const [drawer, setDrawer] = useState(null); // add | view | edit
  const [selected, setSelected] = useState(null);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [discountsList, setDiscountsList] = useState([]);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState("none");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const [leaveDrawer, setLeaveDrawer] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveStartDate: "",
    leaveEndDate: "",
    reason: "",
  });

  const openLeave = (e) => {
    setSelected(e);
    setLeaveForm({
      leaveStartDate: "",
      leaveEndDate: "",
      reason: "",
    });
    setLeaveDrawer(true);
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [form, setForm] = useState({
    playerName: "",
    age: "",
    mobile: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    address: {
      country: "India",
      state: "Maharashtra",
      city: "",
      localAddress: "",
    },
    batchName: "",
    coachName: "",
    monthlyFee: "",
    planType: "monthly",
    startDate: "",
    endDate: "",
    baseAmount: 0,
    registrationFee: 0,
    totalDiscountAmount: 0,
    finalAmount: 0,         // ✅ IMPORTANT
    paymentMode: "cash",
    paymentStatus: "paid",
  });

  useEffect(() => {
    if (!form.dateOfBirth) return;
    const diff = Date.now() - new Date(form.dateOfBirth).getTime();
    const ageDt = new Date(diff);
    const calculatedAge = Math.abs(ageDt.getUTCFullYear() - 1970);
    setForm((prev) => ({
      ...prev,
      age: calculatedAge,
    }));
  }, [form.dateOfBirth]);

  const normalize = (str = "") =>
    str.trim().toLowerCase();
  const findExistingPlayer = (name) => {
    if (!name) return null;
    return enrollments
      .slice()
      .reverse() // latest record first
      .find(
        (e) =>
          normalize(e.playerName) === normalize(name)
      );
  };
  /* ================= FETCH ================= */
  const fetchAll = async () => {
    try {
      const [eRes, bRes, dRes] = await Promise.all([
        api.get("/enrollments"),
        api.get("/batches"),
        api.get("/discounts"),
      ]);
      setEnrollments(eRes.data || []);
      setBatches(bRes.data || []);
      setDiscountsList(dRes.data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    if (!drawer) {
      fetchAll();
    }
  }, [drawer]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const recalculateAmounts = (discounts) => {
    let runningTotal = form.baseAmount;
    let totalDiscount = 0;
    discounts.forEach((d) => {
      let discountValue = 0;
      if (d.type === "percentage") {
        discountValue = (runningTotal * d.value) / 100;
      } else {
        discountValue = d.value;
      }
      runningTotal -= discountValue;
      totalDiscount += discountValue;
    });
    const final =
      Math.max(0, Math.round(runningTotal + (form.registrationFee || 0)));
    setForm((prev) => ({
      ...prev,
      totalDiscountAmount: Math.round(totalDiscount),
      finalAmount: final,
    }));
  };

  useEffect(() => {
    if (!form.baseAmount) return;
    if (selectedDiscountCode === "none") {
      setForm((prev) => ({
        ...prev,
        totalDiscountAmount: 0,
        finalAmount: prev.baseAmount + (prev.registrationFee || 0),
      }));
      return;
    }

    const discount = discountsList.find(
      (d) =>
        d.code === selectedDiscountCode &&
        d.isActive &&
        d.applicableFor === "enrollment"
    );

    if (!discount) return;
    let discountValue = 0;
    if (discount.type === "percentage") {
      discountValue = (form.baseAmount * discount.value) / 100;
    } else {
      discountValue = discount.value;
    }

    const final =
      Math.max(
        0,
        (form.baseAmount - discountValue) + (form.registrationFee || 0)
      );
    setForm((prev) => ({
      ...prev,
      totalDiscountAmount: Math.round(discountValue),
      finalAmount: Math.round(final),
    }));
  }, [selectedDiscountCode, form.baseAmount, discountsList]);

  useEffect(() => {
    if (["cash", "upi"].includes(form.paymentMode)) {
      setForm((prev) => ({
        ...prev,
        paymentStatus: "paid",
      }));
    }
  }, [form.paymentMode]);

  const [cities, setCities] = useState([]);
  useEffect(() => {
    setCities(getMaharashtraCities());
  }, []);
  const applyDiscountCode = () => {
    if (!discountCodeInput) return;

    const code = discountCodeInput.trim().toUpperCase();

    const discount = discountsList.find(
      (d) =>
        d.code?.toUpperCase() === code &&
        d.isActive &&
        d.applicableFor === "enrollment"
    );

    if (!discount) {
      toast({
        title: "Invalid Code",
        variant: "destructive",
      });
      return;
    }

    if (appliedDiscounts.some((d) => d.code === discount.code)) {
      toast({
        title: "Already Applied",
        variant: "destructive",
      });
      return;
    }
    const newDiscounts = [...appliedDiscounts, discount];
    recalculateAmounts(newDiscounts);
    setAppliedDiscounts(newDiscounts);
    setDiscountCodeInput("");
  };

  const removeDiscount = (code) => {
    const updated = appliedDiscounts.filter(
      (d) => d.code !== code
    );
    recalculateAmounts(updated);
    setAppliedDiscounts(updated);
  };

  function DatePicker({ value, onChange, disabled }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start text-left font-normal h-10 bg-white border border-gray-300 truncate"
          >
            <CalendarIcon className="mr-0 h-4 w-4" />
            {value ? format(new Date(value), "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 z-[9999]" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => {
              if (!date) return;
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);

              if (d < today) return;

              onChange(format(d, "yyyy-MM-dd"));
            }}
            disabled={(date) => {
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);

              return d < today;
            }}
            initialFocus
            classNames={{
              day: "h-7 w-7 p-0 font-normal rounded-md transition-colors hover:bg-green-100 hover:text-green-900",
              day_selected:
                "bg-green-600 text-white hover:bg-green-600 hover:text-white",
              day_today:
                "border border-green-600 text-green-700 font-semibold",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const mapEnrollmentToForm = (e) => {
    return {
      playerName: e.playerName,
      age: e.age,
      dateOfBirth: e.dateOfBirth?.slice(0, 10) || "",
      gender: e.gender || "",
      mobile: e.mobile,
      email: e.email,

      address: {
        country: e.address?.country || "India",
        state: e.address?.state || "Maharashtra",
        city: e.address?.city || "",
        localAddress: e.address?.localAddress || "",
      },
      batchId: e.batchId?._id || e.batchId || "",
      batchName: e.batchName,
      coachName: e.coachName,
      monthlyFee: e.monthlyFee,
      registrationFee: e.registrationFee || 0,
      planType: e.planType || "monthly",

      startDate: e.startDate?.slice(0, 10),
      endDate: e.endDate?.slice(0, 10),

      baseAmount: e.baseAmount || 0,
      totalDiscountAmount: e.totalDiscountAmount || 0,
      finalAmount: e.finalAmount || 0,

      paymentMode: e.paymentMode || "cash",
      paymentStatus: e.paymentStatus || "unpaid",
    };
  };
  const sports = [...new Set(enrollments.map((e) => e.sportName).filter(Boolean))];
  const batchOptions = [...new Set(enrollments.map((e) => e.batchName).filter(Boolean))];
  const coaches = [...new Set(enrollments.map((e) => e.coachName).filter(Boolean))];

  const openAdd = () => {
    setForm({
      playerName: "",
      age: "",
      mobile: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      address: {
        country: "India",
        state: "Maharashtra",
        city: "",
        localAddress: "",
      },
      batchId: "",
      batchName: "",
      coachName: "",
      monthlyFee: "",
      planType: "monthly",
      startDate: "",
      endDate: "",
      baseAmount: 0,
      totalDiscountAmount: 0,
      finalAmount: 0,
      paymentMode: "cash",
      paymentStatus: "paid",
    });
    setSelected(null);
    setDrawer("add");
  };
  const openView = (e) => {
    setSelected(e);
    setForm(mapEnrollmentToForm(e));
    setAppliedDiscounts(e.discounts || []);
    setDrawer("view");
  };
  const openEdit = (e) => {
    setSelected(e);
    setForm(mapEnrollmentToForm(e));
    setDrawer("edit");
  };

  const openRenew = (e) => {

    const batchId = e.batchId?._id || e.batchId;
    const batch = batches.find((b) => b._id === batchId);

    const months = e.planType === "quarterly" ? 3 : 1;

    const planAmount =
      e.planType === "quarterly"
        ? batch?.quarterlyFee || 0
        : batch?.monthlyFee || 0;

    setSelected(e);

    setForm({
      playerName: e.playerName,
      age: e.age,
      mobile: e.mobile,
      email: e.email,
      dateOfBirth: e.dateOfBirth?.slice(0, 10),
      gender: e.gender,

      address: e.address,

      batchId: batchId,
      batchName: batch?.name || e.batchName,
      coachName: batch?.coachName || e.coachName,

      monthlyFee: batch?.monthlyFee || 0,

      planType: e.planType,

      startDate: new Date().toISOString().slice(0, 10),
      endDate: addMonths(new Date().toISOString().slice(0, 10), months),

      baseAmount: planAmount,
      totalDiscountAmount: 0,
      finalAmount: planAmount,

      paymentMode: "cash",
      paymentStatus: "paid"
    });

    setAppliedDiscounts([]);
    setDrawer("renew");
  };

  const handleBatchChange = (batchId) => {
    const b = batches.find((x) => x._id === batchId);
    if (!b) return;

    let planAmount = b.monthlyFee || 0;

    if (form.planType === "quarterly" && b.hasQuarterly) {
      planAmount = b.quarterlyFee || planAmount;
    }
    const registrationFee = b.registrationFee || 0;
    setAppliedDiscounts([]);

    setForm((prev) => ({
      ...prev,
      batchId: b._id,
      batchName: b.name,
      coachName: b.coachName,
      monthlyFee: b.monthlyFee,
      baseAmount: planAmount,
      registrationFee: registrationFee,
      totalDiscountAmount: 0,
      finalAmount: planAmount + registrationFee,
      endDate: addMonths(prev.startDate, form.planType === "quarterly" ? 3 : 1),
    }));
  };

  const handlePlanChange = (plan) => {
    const b = batches.find((x) => x._id === form.batchId);
    if (!b) return;
    let planAmount = b.monthlyFee || 0;
    if (plan === "quarterly" && b.hasQuarterly) {
      planAmount = b.quarterlyFee || planAmount;
    }
    const registrationFee = b.registrationFee || 0;
    setAppliedDiscounts([]);
    setForm((prev) => ({
      ...prev,
      planType: plan,
      baseAmount: planAmount,
      registrationFee,
      totalDiscountAmount: 0,
      finalAmount: planAmount + registrationFee,
      endDate: addMonths(prev.startDate, plan === "quarterly" ? 3 : 1),
    }));
  };

  const getBatchTime = (batchName) => {
    const batch = batches.find((b) => b.name === batchName);
    if (!batch) return "-";
    const formatTime = (time) => {
      if (!time) return "";
      const [h, m] = time.split(":");
      const hour = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      return `${hour}:${m} ${ampm}`;
    };
    return `${formatTime(batch.startTime)} - ${formatTime(batch.endTime)}`;
  };

  const saveEnrollment = async () => {
    try {
      const payload = {
        ...form,
        registrationFee: form.registrationFee,
        discounts: appliedDiscounts.map((d) => ({
          discountId: d._id,
          code: d.code,
          title: d.title,
          type: d.type,
          value: d.value,
        })),
      };

      if (drawer === "add") {

        await api.post("/enrollments", {
          source: "admin",
          ...payload
        });

        toast({ title: "Enrollment Added" });

      }

      else if (drawer === "edit") {

        await api.put(`/enrollments/${selected._id}`, payload);

        toast({ title: "Enrollment Updated" });

      }

      else if (drawer === "renew") {

        await api.patch(`/enrollments/admin/${selected._id}/renew`, {
          planType: form.planType,
          paymentMode: form.paymentMode
        });

        toast({
          title: "Enrollment Renewed"
        });

      }

      setDrawer(null);
      fetchAll();

    } catch (err) {

      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed",
        variant: "destructive"
      });

    }

  };

  const deleteEnrollment = async (id) => {
    try {
      await api.delete(`/enrollments/${id}`);
      toast({ title: "Deleted", description: "Enrollment removed" });
      fetchAll();
    } catch {
      toast({ title: "Error", description: "Failed to delete enrollment", variant: "destructive" });
    }
  };

  const applyLeave = async (id, leaveData) => {
    try {
      await api.post(`/enrollments/admin/${id}/leave`, {
        startDate: leaveData.leaveStartDate,
        endDate: leaveData.leaveEndDate,
        reason: leaveData.reason,
      });

      toast({
        title: "Leave Applied",
        description: "Leave added successfully",
      });

      setLeaveDrawer(false);
      fetchAll();

    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to apply leave",
        variant: "destructive",
      });
    }
  };


  const cancelLeave = async (id) => {
    try {
      await api.patch(`/enrollments/admin/${id}/cancel-leave`);

      toast({
        title: "Leave Cancelled",
      });

      fetchAll();

    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel leave",
        variant: "destructive",
      });
    }
  };

  const getEnrollmentStatus = (e) => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = e.endDate ? new Date(e.endDate) : null;

    const { isOnLeave } = getLeaveStatus(e);

    if (isOnLeave) {
      return {
        label: "On Leave",
        color: "bg-blue-100 text-blue-700",
      };
    }


    if (e.paymentStatus !== "paid") {
      return {
        label: "Pending",
        color: "bg-orange-100 text-orange-700"
      };
    }

    if (!end) {
      return {
        label: "Active",
        color: "bg-green-100 text-green-700"
      };
    }

    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "Expired",
        color: "bg-gray-300 text-gray-800"
      };
    }

    if (diffDays <= 7) {
      return {
        label: "Expiring",
        color: "bg-yellow-100 text-yellow-700"
      };
    }

    return {
      label: "Active",
      color: "bg-green-100 text-green-700"
    };
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const statusLabel = getEnrollmentStatus(e).label;
      return (!filters.sport || e.sportName === filters.sport) &&
        (!filters.batch || e.batchName === filters.batch) &&
        (!filters.coach || e.coachName === filters.coach) &&
        (!filters.status || statusLabel === filters.status);
    });
  }, [enrollments, filters]);

  const totalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE);
  const paginatedEnrollments = filteredEnrollments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [filters]);
  const filterTriggerClass = "h-9 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
  const selectTriggerClass = "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
  const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;

  const handleRefresh = async () => {
    setFilters({
      sport: "",
      batch: "",
      coach: "",
      status: "",
    });
    setPage(1);
    await fetchAll();
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold"> Overview</h1>
        <Button onClick={openAdd} className="bg-green-700">+ Add New Enrollment</Button>
      </div>

      <div className="bg-white border rounded-xl p-3 sm:p-4 mb-4">
        <div className="hidden md:grid grid-cols-2 md:grid-cols-6 gap-3">
          <Select
            value={filters.sport || "all"}
            onValueChange={(value) =>
              setFilters((p) => ({
                ...p,
                sport: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className={filterTriggerClass}>
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Sports
              </SelectItem>
              {sports.map((s) => (
                <SelectItem key={s} value={s} className={selectItemClass}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.batch || "all"}
            onValueChange={(value) =>
              setFilters((p) => ({
                ...p,
                batch: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className={filterTriggerClass}>
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Batches
              </SelectItem>
              {batchOptions.map((b) => (
                <SelectItem key={b} value={b} className={selectItemClass}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.coach || "all"}
            onValueChange={(value) =>
              setFilters((p) => ({
                ...p,
                coach: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className={filterTriggerClass}>
              <SelectValue placeholder="All Coaches" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Coaches
              </SelectItem>
              {coaches.map((c) => (
                <SelectItem key={c} value={c} className={selectItemClass}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              setFilters((p) => ({
                ...p,
                status: value === "all" ? "" : value,
              }))
            }
          >
            <SelectTrigger className={filterTriggerClass}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Status
              </SelectItem>
              {["Pending", "Active", "Expiring", "Expired"].map((s) => (
                <SelectItem key={s} value={s} className={selectItemClass}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden flex justify-between gap-3">

          <button
            onClick={() => {
              setTempFilters(filters);
              setMobileFilterOpen(true);
            }}
            className="h-8 w-8 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
          </button>

          <button
            onClick={handleRefresh}
            className="h-8 w-8 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
          >
            <RotateCcw className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="hidden md:block bg-white rounded-xl border mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b">
              <tr className="text-left">
                <th className="p-3">Student</th>
                <th>Age</th>
                <th>Sport</th>
                <th>Batch</th>
                <th>Batch Time</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Leave</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedEnrollments.map((e) => {
                const status = getEnrollmentStatus(e);

                return (
                  <tr key={e._id} className="border-t">
                    <td className="p-3 font-medium">{e.playerName}</td>
                    <td>{e.age}</td>
                    <td>{e.sportName}</td>
                    <td className="max-w-[220px] truncate">
                      {e.batchName}
                    </td>
                    <td className="text-gray-600">
                      {getBatchTime(e.batchName)}
                    </td>
                    <td>{e.startDate?.slice(0, 10)}</td>
                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td>
                      {(() => {
                        const { isOnLeave, isUpcoming } = getLeaveStatus(e);
                        if (!e.leaveStartDate || !e.leaveEndDate) {
                          return <span className="text-gray-400 text-xs">—</span>;
                        }
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="text-[0.65rem] text-gray-500">
                              {format(new Date(e.leaveStartDate), "dd MMM")} →{" "}
                              {format(new Date(e.leaveEndDate), "dd MMM")}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* ACTION MENU */}
                    <td className="text-right pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">

                          <DropdownMenuItem onClick={() => openView(e)}>
                            View
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openLeave(e)}>
                            Add Leave
                          </DropdownMenuItem>
                          {e.leaveStartDate && (
                            <DropdownMenuItem
                              onClick={() => cancelLeave(e._id)}
                              className="text-red-600"
                            >
                              Cancel Leave
                            </DropdownMenuItem>
                          )}

                          {["Expired", "Expiring"].includes(getEnrollmentStatus(e).label) && (
                            <DropdownMenuItem
                              onClick={() => openRenew(e)}
                            >
                              Renew Enrollment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteEnrollment(e._id)}
                          >
                            Delete
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* ================= MOBILE CARD VIEW ================= */}
        <div className="md:hidden mt-4 space-y-4">
          {filteredEnrollments.map((e) => {
            const status = getEnrollmentStatus(e);

            return (
              <div
                key={e._id}
                className="bg-white border rounded-xl p-3 shadow-sm"
              >
                <div className="flex justify-between items-start">

                  <div>
                    <h3 className="font-semibold text-base">
                      {e.playerName}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      Age {e.age} • {e.sportName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">


                    <span
                      className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}
                    >
                      {status.label}
                    </span>


                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">

                        <DropdownMenuItem onClick={() => openView(e)}>
                          View
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => openEdit(e)}>
                          Edit
                        </DropdownMenuItem>


                        <DropdownMenuItem onClick={() => openLeave(e)}>
                          Add Leave
                        </DropdownMenuItem>


                        {e.leaveStartDate && (
                          <DropdownMenuItem
                            onClick={() => cancelLeave(e._id)}
                            className="text-red-600"
                          >
                            Cancel Leave
                          </DropdownMenuItem>
                        )}
                        {["Expired", "Expiring"].includes(getEnrollmentStatus(e).label) && (
                          <DropdownMenuItem
                            onClick={() => openRenew(e)}
                          >
                            Renew Enrollment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteEnrollment(e._id)}
                        >
                          Delete
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>


                <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">

                  <div className="font-medium">
                    {e.batchName}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {getBatchTime(e.batchName)}
                  </div>

                </div>


                {(() => {
                  if (!e.leaveStartDate || !e.leaveEndDate) return null;

                  const { isOnLeave } = getLeaveStatus(e);

                  const formatShort = (date) =>
                    format(new Date(date), "dd MMM");

                  return (
                    <div className="mt-2 flex flex-col gap-1">


                      {isOnLeave && (
                        <span className="px-2 py-1 text-[0.65rem] rounded-full bg-blue-100 text-blue-700 w-fit">
                          On Leave
                        </span>
                      )}


                      <span className="text-[0.65rem] text-gray-500">
                        {formatShort(e.leaveStartDate)} → {formatShort(e.leaveEndDate)}
                      </span>

                    </div>
                  );
                })()}


                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <span>{e.startDate?.slice(0, 10)}</span>
                  <span>{e.sportName}</span>
                </div>

              </div>
            );
          })}
        </div>

        <div className="mt-4">


          <div className="hidden md:flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredEnrollments.length)} of {filteredEnrollments.length}
            </p>

            <div className="flex gap-2 flex-wrap">

              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>

              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={page === i + 1 ? "default" : "outline"}
                  className={
                    page === i + 1
                      ? "bg-green-700 hover:bg-green-800 text-white"
                      : ""
                  }
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>

            </div>
          </div>


          <div className="flex md:hidden flex-col gap-3">


            <p className="text-xs text-muted-foreground text-center">
              {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredEnrollments.length)} of {filteredEnrollments.length}
            </p>

            <div className="flex items-center justify-between">

              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>

              <span className="text-sm font-medium text-gray-600">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>

            </div>

          </div>

        </div>
      </div>

      {/* DRAWER */}
      <Sheet open={!!drawer} onOpenChange={() => setDrawer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[80vh] rounded-t-2xl flex flex-col px-2 pt-4 pb-2"
              : "w-[32vw] h-screen flex flex-col"
          }
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>
              {drawer === "add"
                ? "Add Enrollment"
                : drawer === "edit"
                  ? "Edit Enrollment"
                  : drawer === "renew"
                    ? "Renew Enrollment"
                    : "View Enrollment"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-sm font-medium">Player Name</label>
                <Input
                  placeholder="Player Name"
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.playerName || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const existing = findExistingPlayer(name);

                    if (existing) {
                      setForm((prev) => ({
                        ...prev,
                        playerName: name,
                        dateOfBirth: existing.dateOfBirth?.slice(0, 10) || "",
                        gender: existing.gender || "",
                        age: existing.age || "",
                        mobile: existing.mobile || "",
                        email: existing.email || "",
                        address: {
                          country: existing.address?.country || "India",
                          state: existing.address?.state || "Maharashtra",
                          city: existing.address?.city || "",
                          localAddress: existing.address?.localAddress || "",
                        },
                      }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        playerName: name,
                      }));
                    }
                  }}
                />

                {findExistingPlayer(form.playerName) && (
                  <p className="text-xs text-green-600 mt-1">
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <DOBPicker
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.dateOfBirth}
                  onChange={(date) =>
                    setForm({ ...form, dateOfBirth: date })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.gender || ""}
                  onValueChange={(value) =>
                    setForm({ ...form, gender: value })
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white border shadow-lg">
                    <SelectItem value="male" className={selectItemClass}>
                      Male
                    </SelectItem>
                    <SelectItem value="female" className={selectItemClass}>
                      Female
                    </SelectItem>
                    <SelectItem value="other" className={selectItemClass}>
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Age</label>
                <Input
                  disabled
                  value={form.age || ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mobile</label>
                <Input
                  placeholder="Mobile"
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.mobile || ""}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  placeholder="Email"
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Select
                  disabled={drawer === "view" || drawer === "renew"}
                  value={form.address?.city || ""}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      address: {
                        ...form.address,
                        city: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>

                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-64 overflow-auto">
                    {cities.map((city) => (
                      <SelectItem
                        key={city}
                        value={city}
                        className={selectItemClass}
                      >
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Local Address</label>
                <Input
                  disabled={drawer === "view" || drawer === "renew"}
                  placeholder="Area / Street / Landmark"
                  value={form.address?.localAddress || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: {
                        ...form.address,
                        localAddress: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Batch</label>
                <Select disabled={drawer === "view" || drawer === "renew"} value={form.batchId || ""}
                  onValueChange={(id) => handleBatchChange(id)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] bg-white border shadow-lg">
                    {batches.map((b) => <SelectItem key={b._id} value={b._id} className={selectItemClass}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>


              <div>
                <label className="text-sm font-medium">Plan</label>
                <Select disabled={drawer === "view"} value={form.planType} onValueChange={(value) => handlePlanChange(value)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] bg-white border shadow-lg">
                    <SelectItem value="monthly" className={selectItemClass}>Monthly</SelectItem>
                    {batches
                      .find((b) => b._id === form.batchId)
                      ?.hasQuarterly && (
                        <SelectItem value="quarterly" className={selectItemClass}>
                          Quarterly
                        </SelectItem>
                      )}

                  </SelectContent>
                </Select>
              </div>


              <div>
                <label className="text-sm font-medium">Start Date</label>
                <DatePicker
                  disabled={drawer === "view"}
                  value={form.startDate}
                  onChange={(date) => {
                    const b = batches.find((x) => x._id === form.batchId);
                    const months = form.planType === "quarterly" ? 3 : 1;

                    setForm({
                      ...form,
                      startDate: date,
                      endDate: addMonths(date, months),
                    });
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Coach</label>
                <Input disabled value={form.coachName || ""} />
              </div>


              <div>
                <label className="text-sm font-medium">
                  {form.planType === "quarterly" ? "Quarterly Fee" : "Monthly Fee"}
                </label>

                <Input
                  disabled
                  value={
                    form.planType === "quarterly"
                      ? batches.find((b) => b._id === form.batchId)?.quarterlyFee || 0
                      : form.monthlyFee || 0
                  }
                />
              </div>


              <div>
                <label className="text-sm font-medium">Payment Mode</label>
                <Select
                  disabled={drawer === "view"}
                  value={form.paymentMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentMode: value,
                      paymentStatus: "paid",
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent position="popper" className="z-[9999] bg-white border shadow-lg">
                    {PAYMENT_MODES.map((p) => (
                      <SelectItem key={p} value={p} className={selectItemClass}>
                        {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>


              <div>
                <label className="text-sm font-medium">Payment Status</label>
                <Select
                  disabled={drawer === "view"}
                  value={form.paymentStatus}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentStatus: value,
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="z-[9999] bg-white border shadow-lg"
                  >
                    <SelectItem value="paid" className={selectItemClass}>
                      PAID
                    </SelectItem>
                    <SelectItem value="unpaid" className={selectItemClass}>
                      UNPAID
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* ================= TOTAL AMOUNT ================= */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Total Amount</label>
                <Input disabled value={`₹ ${form.finalAmount || 0}`} />
              </div>

              <div className="col-span-2 space-y-3 mt-4 border-t pt-4">

                <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-2 mt-3">

                  <div className="flex justify-between">
                    <span>Plan Fee</span>
                    <span>₹ {form.baseAmount || 0}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Registration Fee</span>
                    <span>₹ {form.registrationFee || 0}</span>
                  </div>

                  <div className="flex justify-between font-semibold text-green-700 pt-2 border-t">
                    <span>Final Amount</span>
                    <span>₹ {form.finalAmount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {drawer !== "view" && (
            <Button className="mt-2 w-full bg-green-700" onClick={saveEnrollment}>
              {drawer === "add" ? "Add Enrollment" : "Update Enrollment"}
            </Button>
          )}
        </SheetContent>
      </Sheet>


      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent
          side="bottom"
          className="h-[50vh] rounded-t-2xl p-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="space-y-4">

            {/* SPORTS */}
            <Select
              value={tempFilters.sport || "all"}
              onValueChange={(value) =>
                setTempFilters((p) => ({
                  ...p,
                  sport: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg rounded-lg">
                <SelectItem value="all" className={selectItemClass}>All Sports</SelectItem>
                {sports.map((s) => (
                  <SelectItem key={s} value={s} className={selectItemClass}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* BATCH */}
            <Select
              value={tempFilters.batch || "all"}
              onValueChange={(value) =>
                setTempFilters((p) => ({
                  ...p,
                  batch: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg rounded-lg">
                <SelectItem value="all" className={selectItemClass}>All Batches</SelectItem>
                {batchOptions.map((b) => (
                  <SelectItem key={b} value={b} className={selectItemClass}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* COACH */}
            <Select
              value={tempFilters.coach || "all"}
              onValueChange={(value) =>
                setTempFilters((p) => ({
                  ...p,
                  coach: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All Coaches" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg rounded-lg">
                <SelectItem value="all" className={selectItemClass}>All Coaches</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c} value={c} className={selectItemClass}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* STATUS */}
            <Select
              value={tempFilters.status || "all"}
              onValueChange={(value) =>
                setTempFilters((p) => ({
                  ...p,
                  status: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg rounded-lg">
                <SelectItem value="all" className={selectItemClass}>All Status</SelectItem>
                {["Pending", "Active", "Expiring", "Expired"].map((s) => (
                  <SelectItem key={s} value={s} className={selectItemClass}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* FOOTER */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                setTempFilters({
                  sport: "",
                  batch: "",
                  coach: "",
                  status: "",
                })
              }
            >
              Clear all
            </Button>
            <Button
              className="flex-1 bg-green-700"
              onClick={() => {
                setFilters(tempFilters);
                setMobileFilterOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ================= LEAVE DRAWER ================= */}
      <Sheet open={leaveDrawer} onOpenChange={setLeaveDrawer}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[60vh] rounded-t-2xl px-4 pt-4"
              : "w-[400px]"
          }
        >
          <SheetHeader>
            <SheetTitle>Apply Leave</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">

            {/* START DATE */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <DatePicker
                value={leaveForm.leaveStartDate}
                onChange={(date) =>
                  setLeaveForm({ ...leaveForm, leaveStartDate: date })
                }
              />
            </div>

            {/* END DATE */}
            <div>
              <label className="text-sm font-medium">End Date</label>
              <DatePicker
                value={leaveForm.leaveEndDate}
                onChange={(date) =>
                  setLeaveForm({ ...leaveForm, leaveEndDate: date })
                }
              />
            </div>

            {/* REASON */}
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                placeholder="Optional reason"
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
              />
            </div>

            {/* SUBMIT */}
            <Button
              className="w-full bg-green-700 mt-4"
              onClick={() => applyLeave(selected._id, leaveForm)}
            >
              Apply Leave
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DOBPicker({ value, onChange, disabled }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal h-10 bg-white border border-gray-300"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(new Date(value), "dd MMM yyyy") : "Select DOB"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={1950}
          toYear={new Date().getFullYear()}
          selected={value ? new Date(value) : undefined}
          onSelect={(date) =>
            onChange(date ? format(date, "yyyy-MM-dd") : "")
          }
          disabled={(date) => date > new Date()} // ❌ no future DOB
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}