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
/* ================= CONSTANTS ================= */
const PAYMENT_MODES = ["cash", "upi", "razorpay"];
const PAYMENT_STATUS = ["paid", "pending"];
/* ================= UTIL ================= */
const addMonths = (dateStr, months) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

/* ================= COMPONENT ================= */
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
    totalDiscountAmount: 0,   // ✅ NEW
    finalAmount: 0,           // ✅ IMPORTANT
    paymentMode: "cash",
    paymentStatus: "paid",
  });

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
    const final = Math.max(0, Math.round(runningTotal));
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
        finalAmount: prev.baseAmount,
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

    const final = Math.max(0, form.baseAmount - discountValue);

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


  /* ================= DATE PICKER ================= */
  function DatePicker({ value, onChange, disabled }) {
    // ✅ normalize today to 00:00
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

              // normalize selected date
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);

              if (d < today) return; // ⛔ safety guard

              onChange(format(d, "yyyy-MM-dd"));
            }}
            disabled={(date) => {
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);

              return d < today; // ⛔ disable past dates
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
  /* ================= MAP BACKEND → FORM ================= */
  const mapEnrollmentToForm = (e) => {
    return {
      playerName: e.playerName,
      age: e.age,
      mobile: e.mobile,
      email: e.email,

      address: {
        country: e.address?.country || "India",
        state: e.address?.state || "Maharashtra",
        city: e.address?.city || "",
        localAddress: e.address?.localAddress || "",
      },

      batchName: e.batchName,
      coachName: e.coachName,
      monthlyFee: e.monthlyFee,
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
  /* ================= ACTIONS ================= */
  const openAdd = () => {
    setForm({
      planType: "monthly",
      paymentMode: "cash",
      paymentStatus: "paid", // default admin behavior
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
  /* ================= BATCH & PLAN CHANGE ================= */
  const handleBatchChange = (batchName) => {
    const b = batches.find((x) => x.name === batchName);
    if (!b) return;
    const months = form.planType === "quarterly" ? 3 : 1;
    const base = (b.monthlyFee || 0) * months;
    setAppliedDiscounts([]);
    setForm((prev) => ({
      ...prev,
      batchName: b.name,
      coachName: b.coachName,
      monthlyFee: b.monthlyFee,
      baseAmount: base,
      finalAmount: base,
      totalDiscountAmount: 0,
      endDate: addMonths(prev.startDate, months),
    }));
  };

  const handlePlanChange = (plan) => {
    const b = batches.find((x) => x.name === form.batchName);
    if (!b) return;
    const months = plan === "quarterly" ? 3 : 1;
    const base = (form.monthlyFee || 0) * months;
    setAppliedDiscounts([]);
    setForm((prev) => ({
      ...prev,
      planType: plan,
      baseAmount: base,
      finalAmount: base,
      totalDiscountAmount: 0,
      endDate: addMonths(prev.startDate, months),
    }));
  };

  /* ================= SAVE ================= */
  const saveEnrollment = async () => {
    try {
      const payload = {
        ...form,
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
          ...payload,
        });
        toast({ title: "Enrollment Added" });
      } else {
        await api.put(`/enrollments/${selected._id}`, payload);
        toast({ title: "Enrollment Updated" });
      }

      setDrawer(null);
      fetchAll();

    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed",
        variant: "destructive",
      });
    }
  };

  /* ================= DELETE ================= */
  const deleteEnrollment = async (id) => {
    try {
      await api.delete(`/enrollments/${id}`);
      toast({ title: "Deleted", description: "Enrollment removed" });
      fetchAll();
    } catch {
      toast({ title: "Error", description: "Failed to delete enrollment", variant: "destructive" });
    }
  };
  /* ================= INVOICE HANDLER ================= */
  const navigate = useNavigate();
  const handleInvoiceAction = async (id, action) => {
    if (action === "view") {
      navigate(`/admin/invoice/${id}`);
    }
    if (action === "download") {
      try {
        const res = await api.get(
          `/invoice/enrollment/${id}/download`,
          { responseType: "blob" }
        );
        const blob = new Blob([res.data], {
          type: "application/pdf",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        toast({
          title: "Error",
          description: "Failed to download invoice",
          variant: "destructive",
        });
      }
    }
  };
  /* ================= GET STATUS ================= */
  const getEnrollmentStatus = (e) => {
    if (e.paymentStatus !== "paid") return { label: "Pending", color: "bg-orange-100 text-orange-700" };
    if (!e.endDate) return { label: "Active", color: "bg-green-100 text-green-700" };

    const diffDays = Math.ceil((new Date(e.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Expired", color: "bg-gray-300 text-gray-800" };
    if (diffDays <= 7) return { label: "Expiring", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Active", color: "bg-green-100 text-green-700" };
  };

  /* ================= FILTER & PAGINATION ================= */
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

  /* ================= UI ================= */
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold"> Overview</h1>
        <Button onClick={openAdd} className="bg-green-700">+ Add New Enrollment</Button>
      </div>

      <div className="bg-white border rounded-xl p-3 sm:p-4 mb-4">

        {/* ================= DESKTOP FILTERS ================= */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-6 gap-3">

          {/* SPORTS */}
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

          {/* BATCH */}
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

          {/* COACH */}
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

          {/* STATUS */}
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
        {/* ================= MOBILE ICON ROW ================= */}

        <div className="md:hidden flex justify-between gap-3">
          {/* FILTER ICON */}
          <button
            onClick={() => {
              setTempFilters(filters);
              setMobileFilterOpen(true);
            }}
            className="h-8 w-8 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
          </button>
          {/* REFRESH ICON */}
          <button
            onClick={handleRefresh}
            className="h-8 w-8 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
          >
            <RotateCcw className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block bg-white rounded-xl border mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Student</th>
                <th>Age</th>
                <th>Sport</th>
                <th>Batch</th>
                <th>Start Date</th>
                <th>Status</th>
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
                    <td className="max-w-[220px] truncate">{e.batchName}</td>
                    <td>{e.startDate?.slice(0, 10)}</td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="text-right pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">
                          <DropdownMenuItem onClick={() => openView(e)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(e)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInvoiceAction(e._id, "view")}>
                            View Invoice
                          </DropdownMenuItem>
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
                className="bg-white border rounded-xl p-2 shadow-sm"
              >
                {/* Top Section */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{e.playerName}</h3>
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
                        <DropdownMenuItem onClick={() => openView(e)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(e)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInvoiceAction(e._id, "view")}>
                          View Invoice
                        </DropdownMenuItem>
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

                {/* Batch Section */}
                <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  {e.batchName}
                </div>

                {/* Bottom Info */}
                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <span>{e.startDate?.slice(0, 10)}</span>
                  <span>{e.sportName}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredEnrollments.length)} of {filteredEnrollments.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button key={i} size="sm" variant={page === i + 1 ? "default" : "outline"} onClick={() => setPage(i + 1)}>{i + 1}</Button>
            ))}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
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
              : "w-[30vw] h-screen flex flex-col"
          }
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>{drawer === "add" ? "Add Enrollment" : drawer === "edit" ? "Edit Enrollment" : "View Enrollment"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="grid grid-cols-2 gap-3">

              {/* ================= PLAYER NAME (SMART) ================= */}
              <div>
                <label className="text-sm font-medium">Player Name</label>
                <Input
                  placeholder="Player Name"
                  disabled={drawer === "view"}
                  value={form.playerName || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const existing = findExistingPlayer(name);

                    if (existing) {
                      setForm((prev) => ({
                        ...prev,
                        playerName: name,
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

              {/* ================= AGE ================= */}
              <div>
                <label className="text-sm font-medium">Age</label>
                <Input
                  placeholder="Age"
                  disabled={drawer === "view"}
                  value={form.age || ""}
                  onChange={(e) =>
                    setForm({ ...form, age: e.target.value })
                  }
                />
              </div>

              {/* ================= MOBILE ================= */}
              <div>
                <label className="text-sm font-medium">Mobile</label>
                <Input
                  placeholder="Mobile"
                  disabled={drawer === "view"}
                  value={form.mobile || ""}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                />
              </div>

              {/* ================= EMAIL ================= */}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  placeholder="Email"
                  disabled={drawer === "view"}
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              {/* ================= CITY ================= */}
              <div>
                <label className="text-sm font-medium">City</label>
                <Select
                  disabled={drawer === "view"}
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

              {/* ================= LOCAL ADDRESS ================= */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Local Address</label>
                <Input
                  disabled={drawer === "view"}
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


              {/* Batch */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Batch</label>
                <Select disabled={drawer === "view"} value={form.batchName || ""} onValueChange={(value) => handleBatchChange(value)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] bg-white border shadow-lg">
                    {batches.map((b) => <SelectItem key={b._id} value={b.name} className={selectItemClass}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Plan */}
              <div>
                <label className="text-sm font-medium">Plan</label>
                <Select disabled={drawer === "view"} value={form.planType} onValueChange={(value) => handlePlanChange(value)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] bg-white border shadow-lg">
                    <SelectItem value="monthly" className={selectItemClass}>Monthly</SelectItem>
                    {batches
                      .find((b) => b.name === form.batchName)
                      ?.hasQuarterly && (
                        <SelectItem
                          value="quarterly"
                          className={selectItemClass}
                        >
                          Quarterly
                        </SelectItem>
                      )}

                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <DatePicker
                  disabled={drawer === "view"}
                  value={form.startDate}
                  onChange={(date) => {
                    const b = batches.find((x) => x.name === form.batchName);
                    const months =
                      form.planType === "quarterly"
                        ? b?.quarterlyMultiplier || 3
                        : 1;

                    setForm({
                      ...form,
                      startDate: date,
                      endDate: addMonths(date, months),
                    });
                  }}
                />
              </div>
              {/* Coach */}
              <div>
                <label className="text-sm font-medium">Coach</label>
                <Input disabled value={form.coachName || ""} />
              </div>

              {/* Monthly Fee */}
              <div>
                <label className="text-sm font-medium">Monthly Fee</label>
                <Input disabled value={form.monthlyFee || ""} />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-sm font-medium">Payment Mode</label>
                <Select
                  disabled={drawer === "view"}
                  value={form.paymentMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentMode: value,
                      paymentStatus: "paid", // force paid
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

              {/* ================= PAYMENT STATUS ================= */}
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
              {/* ================= DISCOUNT ================= */}
              <div className="col-span-2 space-y-3 mt-4 border-t pt-4">
                <label className="text-sm font-medium">Apply Discount</label>

                <Select
                  disabled={drawer === "view"}
                  value={selectedDiscountCode}
                  onValueChange={(value) => setSelectedDiscountCode(value)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select Discount (optional)" />
                  </SelectTrigger>

                  <SelectContent className="z-[9999] bg-white border shadow-lg">
                    <SelectItem value="none" className={selectItemClass}>
                      No Discount
                    </SelectItem>

                    {discountsList
                      .filter((d) => d.isActive && d.applicableFor === "enrollment")
                      .map((d) => (
                        <SelectItem
                          key={d._id}
                          value={d.code}
                          className={selectItemClass}
                        >
                          {d.code || d.title} —{" "}
                          {d.type === "percentage"
                            ? `${d.value}%`
                            : `₹${d.value}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* ================= AMOUNT BREAKDOWN ================= */}
                <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-2 mt-3">

                  <div className="flex justify-between">
                    <span>Base Amount</span>
                    <span>₹ {form.baseAmount || 0}</span>
                  </div>

                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>- ₹ {form.totalDiscountAmount || 0}</span>
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

      {/* Mobile Filter dropdown */}
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
    </div>
  );
}
