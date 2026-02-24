import { useRef, useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, X, CalendarIcon, Check, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { getMaharashtraCities } from "@/lib/location";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* ================= PAYMENT STATUS ================= */
const PAYMENT_STATUS_STYLES = { paid: "bg-green-100 text-green-700", pending: "bg-orange-100 text-orange-700", unpaid: "bg-red-100 text-red-700" };

const getSlotRange = (slots = []) => {
    if (!slots.length) return "";
    const sorted = [...slots].sort();
    const start = formatTime12h(sorted[0]);
    const [h, m] = sorted[sorted.length - 1].split(":").map(Number);
    const endHour = h + 1; // slots are hourly
    const end = formatTime12h(
        `${endHour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );
    return `${start} – ${end}`;
};
/* ================= FORMAT HELPERS ================= */
const formatDateDMY = (date) => {
    if (!date) return "—";
    return format(new Date(date), "dd-MM-yyyy");
};

const formatTime12h = (time) => {
    if (!time) return "";

    const [h, m] = time.split(":").map(Number);
    const hour12 = h % 12 || 12;
    const suffix = h >= 12 ? "PM" : "AM";

    return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
};


export default function TurfRentals() {
    const navigate = useNavigate();

    const ITEMS_PER_PAGE = 3; // change to 3/10 if needed
    const { toast } = useToast();
    /* ================= DATA ================= */
    const [rentals, setRentals] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [sports, setSports] = useState([]);
    const [slots, setSlots] = useState([]);
    const [page, setPage] = useState(1);
    /* ================= UI ================= */

    const [menu, setMenu] = useState(null);
    const [selected, setSelected] = useState(null);
    const [dateOpen, setDateOpen] = useState(false);
    const [hourlyRate, setHourlyRate] = useState(0);
    const [discountCode, setDiscountCode] = useState("");
    const [availableDiscounts, setAvailableDiscounts] = useState([]);
    const [drawer, setDrawer] = useState(null);
    /* ================= FILTERS ================= */
    const [filters, setFilters] = useState({ sport: "all", facility: "all", status: "all" });
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [tempFilters, setTempFilters] = useState(filters);

    /* ================= FORM ================= */
    const [form, setForm] = useState({
        userName: "",
        phone: "",
        email: "",

        facilityId: "",
        facilityName: "",

        sportId: "",
        sportName: "",

        rentalDate: null,
        slots: [],

        paymentStatus: "pending",
        paymentMode: "cash",

        /* ================= AMOUNT FIELDS ================= */
        hourlyRate: 0,
        baseAmount: 0,
        totalDiscountAmount: 0,
        finalAmount: 0,

        /* ================= DISCOUNT ================= */
        discountCodes: [],
        discounts: [],

        /* ================= ADDRESS ================= */
        address: {
            country: "India",
            state: "Maharashtra",
            city: "",
            localAddress: "",
        },
    });

    const selectedFacility = useMemo(
        () => facilities.find((f) => f._id === form.facilityId),
        [form.facilityId, facilities]
    );
    const allowedSports = selectedFacility?.sports || [];

    const cities = useMemo(() => getMaharashtraCities(), []);

    useEffect(() => {
        if (!form.facilityId) return;

        const f = facilities.find(x => x._id === form.facilityId);
        if (f?.hourlyRate) setHourlyRate(f.hourlyRate);
    }, [form.facilityId, facilities]);

    useEffect(() => {
        if (drawer === "view") return;
        if (!hourlyRate) return;
        const baseAmount = form.slots.length * hourlyRate;
        let discountAmount = 0;
        const selectedDiscount = availableDiscounts.find(
            (d) => d.code === discountCode
        );
        if (selectedDiscount) {
            if (selectedDiscount.type === "percentage") {
                discountAmount = (baseAmount * selectedDiscount.value) / 100;
            } else {
                discountAmount = selectedDiscount.value;
            }
        }
        const finalAmount = baseAmount - discountAmount;

        setForm((prev) => ({
            ...prev,
            baseAmount,
            totalDiscountAmount: discountAmount,
            finalAmount,
        }));
    }, [form.slots, hourlyRate, discountCode, availableDiscounts, drawer]);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    /* ================= LOAD DATA ================= */
    const loadRentals = async () => {
        const res = await api.get("/turf-rentals");
        setRentals(res.data);
    };
    const loadFacilities = async () => {
        const res = await api.get("/facilities");
        setFacilities(res.data.filter((f) => f.status === "active"));
    };
    const loadSports = async () => {
        const res = await api.get("/sports");
        setSports(res.data);
    };
    useEffect(() => {
        loadRentals();
        loadFacilities();
        loadSports();
    }, []);

    useEffect(() => {
        const loadDiscounts = async () => {
            const res = await api.get("/discounts?type=turf");
            setAvailableDiscounts(res.data || []);
        };
        loadDiscounts();
    }, []);

    /* ================= SLOTS ================= */
    const loadSlots = async (facilityId, date) => {
        if (!facilityId || !date) return;
        const res = await api.get(
            `/facilities/${facilityId}/slots?date=${date}`
        );
        setSlots(res.data);
    };
    const toggleSlot = (slot) => {
        if (slot.status !== "available") return;
        setForm((prev) => {
            const exists = prev.slots.includes(slot.time);
            return {
                ...prev,
                slots: exists
                    ? prev.slots.filter((t) => t !== slot.time)
                    : [...prev.slots, slot.time],
            };
        });
    };

    const resetForm = () => ({
        userName: "",
        phone: "",
        email: "",

        facilityId: "",
        sportId: "",
        rentalDate: null,
        slots: [],

        paymentStatus: "pending",
        paymentMode: "cash",

        /* ===== AMOUNT STRUCTURE ===== */
        hourlyRate: 0,
        baseAmount: 0,
        totalDiscountAmount: 0,
        finalAmount: 0,

        /* ===== DISCOUNTS ===== */
        discountCodes: [],
        discounts: [],

        /* ===== ADDRESS ===== */
        address: {
            country: "India",
            state: "Maharashtra",
            city: "",
            localAddress: "",
        },
    });

    /* ================= ADD ================= */

    const openAdd = () => {
        setForm(resetForm());
        setSlots([]);
        setDiscountCode("");
        setSelected(null);
        setDrawer("add");
    };

    /* ================= VIEW ================= */

    const openView = async (r) => {
        try {
            setSelected(r);

            setForm({
                userName: r.userName,
                phone: r.phone,
                email: r.email,

                facilityId: r.facilityId?._id,
                sportId: r.sportId,
                rentalDate: new Date(r.rentalDate),

                slots: r.slots || [],

                paymentStatus: r.paymentStatus,
                paymentMode: r.paymentMode,

                hourlyRate: r.hourlyRate || 0,
                baseAmount: r.baseAmount || 0,
                totalDiscountAmount: r.totalDiscountAmount || 0,
                finalAmount: r.finalAmount || r.baseAmount || 0,

                discountCodes:
                    r.discounts?.map((d) => d.code).filter(Boolean) || [],
                discounts: r.discounts || [],

                address: r.address || {
                    country: "India",
                    state: "Maharashtra",
                    city: "",
                    localAddress: "",
                },
            });

            if (r.facilityId?._id && r.rentalDate) {
                await loadSlots(
                    r.facilityId._id,
                    format(new Date(r.rentalDate), "yyyy-MM-dd")
                );
            }

            setDrawer("view");
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to open rental",
                variant: "destructive",
            });
        }
    };

    /* ================= EDIT ================= */

    const openEdit = async (r) => {
        try {
            setSelected(r);
            setDiscountCode(r.discounts?.[0]?.code || "");

            setForm({
                userName: r.userName,
                phone: r.phone,
                email: r.email,

                facilityId: r.facilityId?._id,
                sportId: r.sportId,
                rentalDate: new Date(r.rentalDate),

                slots: r.slots || [],

                paymentStatus: r.paymentStatus,
                paymentMode: r.paymentMode,

                hourlyRate: r.hourlyRate || 0,
                baseAmount: r.baseAmount || 0,
                totalDiscountAmount: r.totalDiscountAmount || 0,
                finalAmount: r.finalAmount || r.baseAmount || 0,

                discountCodes:
                    r.discounts?.map((d) => d.code).filter(Boolean) || [],
                discounts: r.discounts || [],

                address: r.address || {
                    country: "India",
                    state: "Maharashtra",
                    city: "",
                    localAddress: "",
                },
            });

            if (r.facilityId?._id && r.rentalDate) {
                await loadSlots(
                    r.facilityId._id,
                    format(new Date(r.rentalDate), "yyyy-MM-dd")
                );
            }

            setDrawer("edit");
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to edit rental",
                variant: "destructive",
            });
        }
    };

    /* ================= SAVE ================= */

    const saveRental = async () => {
        try {
            if (!form.slots.length) {
                toast({
                    title: "Select at least one slot",
                    variant: "destructive",
                });
                return;
            }

            if (!form.facilityId || !form.sportId || !form.rentalDate) {
                toast({
                    title: "Please fill all required fields",
                    variant: "destructive",
                });
                return;
            }

            const payload = {
                source: "admin", // ✅ IMPORTANT

                userName: form.userName,
                phone: form.phone,
                email: form.email,

                facilityId: form.facilityId,
                sportId: form.sportId,
                rentalDate: format(form.rentalDate, "yyyy-MM-dd"),
                slots: form.slots,

                paymentStatus: form.paymentStatus,
                paymentMode: form.paymentMode,

                address: form.address,

                /* ===== DISCOUNT SUPPORT ===== */

                // If using coupon codes
                discountCodes: form.discountCodes || [],

                // If using manual admin discounts
                discounts: form.discounts || [],
            };

            let res;

            if (drawer === "add") {
                res = await api.post("/turf-rentals", payload);
                toast({ title: "Rental added successfully" });
            } else {
                res = await api.patch(`/turf-rentals/${selected._id}`, payload);
                toast({ title: "Rental updated successfully" });
            }

            closeDrawer();
            loadRentals();

        } catch (err) {
            toast({
                title: "Action failed",
                description: err?.response?.data?.message || "Server error",
                variant: "destructive",
            });
        }
    };
    const deleteRental = async (id) => {
        if (!confirm("Delete this rental?")) return;
        await api.delete(`/turf-rentals/${id}`);
        toast({ title: "Rental deleted" });
        loadRentals();
    };
    const normalize = (v = "") => v.trim().toLowerCase();
    const findExistingTurfUser = (name) => {
        if (!name) return null;

        return [...rentals]
            .reverse() // prefer latest booking
            .find(
                (r) => normalize(r.userName) === normalize(name)
            );
    };
    /* ================= SHADCN THEME ================= */
    const selectTriggerClass =
        "w-full h-11 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
    const selectContentClass =
        "z-[9999] bg-white border shadow-lg rounded-md";
    const selectItemClass = ` cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;
    /* ================= STATS ================= */
    const total = rentals.length;
    const confirmed = rentals.filter(
        (r) => r.bookingStatus === "confirmed"
    ).length;

    const pending = rentals.filter(
        (r) => r.bookingStatus === "pending"
    ).length;
    const revenue = rentals.reduce(
        (sum, r) => sum + (Number(r.finalAmount) || 0),
        0
    );

    const renderSlot = (slot) => {
        const isSelected = form.slots.includes(slot.time);
        if (drawer === "view") {
            if (!isSelected) return null;
            return (
                <div
                    key={slot.time}
                    className="px-4 py-2 rounded-xl border text-sm bg-green-50 text-green-700 border-green-300"
                >
                    {slot.label}
                </div>
            );
        }
        let style = "";
        if (isSelected) {
            style = "bg-green-700 text-white border-green-700";
        } else if (slot.status === "available") {
            style = "bg-green-50 text-green-700 border-green-300 hover:bg-green-100";
        } else if (slot.status === "booked") {
            style = "bg-orange-50 text-orange-500 border-orange-300 cursor-not-allowed";
        } else {
            style = "bg-red-50 text-red-500 border-red-300 cursor-not-allowed";
        }
        return (
            <button
                key={slot.time}
                disabled={slot.status !== "available"}
                onClick={() => toggleSlot(slot)}
                className={`px-4 py-2 rounded-xl border text-sm transition ${style}`}
            >
                {slot.label}
            </button>
        );
    };
    const renderSlotPills = (slots = []) => {
        const visible = slots.slice(0, 4);
        const extra = slots.length - 4;
        return (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
                {visible.map((time) => (
                    <span
                        key={time}
                        className="px-2 py-0.5 rounded-full text-[11px]
                     bg-green-100 text-green-700 border border-green-300"
                    >
                        {formatTime12h(time)}
                    </span>
                ))}
                {extra > 0 && (
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-200 text-gray-600">
                        +{extra} more
                    </span>
                )}
            </div>
        );
    };
    const upcomingBookings = useMemo(() => {
        const now = new Date();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return rentals
            .map((r) => {
                const rentalDate = new Date(r.rentalDate);
                rentalDate.setHours(0, 0, 0, 0);

                // ❌ Only today & tomorrow
                if (
                    rentalDate.getTime() !== today.getTime() &&
                    rentalDate.getTime() !== tomorrow.getTime()
                ) {
                    return null;
                }

                let label = "Tomorrow";

                // ✅ If today → filter expired slots
                if (rentalDate.getTime() === today.getTime()) {
                    const validSlots = (r.slots || []).filter((time) => {
                        const [h, m] = time.split(":").map(Number);

                        const slotStart = new Date(r.rentalDate);
                        slotStart.setHours(h, m, 0, 0);

                        const slotEnd = new Date(r.rentalDate);
                        slotEnd.setHours(h + 1, m, 0, 0);

                        return slotEnd > now;
                    });

                    if (!validSlots.length) return null;

                    // 🔵 Check if currently running
                    const isLive = validSlots.some((time) => {
                        const [h, m] = time.split(":").map(Number);

                        const slotStart = new Date(r.rentalDate);
                        slotStart.setHours(h, m, 0, 0);

                        const slotEnd = new Date(r.rentalDate);
                        slotEnd.setHours(h + 1, m, 0, 0);

                        return now >= slotStart && now < slotEnd;
                    });

                    label = isLive ? "Live Now" : "Upcoming Today";

                    return {
                        ...r,
                        slots: validSlots,
                        bookingLabel: label,
                    };
                }

                // Tomorrow booking
                return {
                    ...r,
                    bookingLabel: "Tomorrow",
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.rentalDate) - new Date(b.rentalDate))
            .reduce((acc, r) => {
                const key = format(new Date(r.rentalDate), "yyyy-MM-dd");
                acc[key] = acc[key] || [];
                acc[key].push(r);
                return acc;
            }, {});
    }, [rentals]);

    /* ================= FILTER LOGIC ================= */
    const filteredRentals = useMemo(() => {
        return rentals.filter((r) => {
            // SPORT FILTER
            if (filters.sport !== "all" && r.sportId !== filters.sport) {
                return false;
            }

            // FACILITY FILTER
            if (filters.facility !== "all" && r.facilityId?._id !== filters.facility) {
                return false;
            }
            // PAYMENT STATUS FILTER
            if (filters.status !== "all" && r.paymentStatus !== filters.status) {
                return false;
            }

            return true;
        });
    }, [rentals, filters]);

    useEffect(() => {
        setPage(1);
    }, [filters, rentals]);
    /* ================= PAGINATION ================= */
    const totalPages = Math.ceil(filteredRentals.length / ITEMS_PER_PAGE);
    const paginatedRentals = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredRentals.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRentals, page]);

    useEffect(() => {
        if (drawer === "add") {
            if (form.paymentMode === "cash" || form.paymentMode === "upi") {
                setForm((prev) => ({
                    ...prev,
                    paymentStatus: "paid",
                }));
            }
        }
    }, [form.paymentMode]);
    /* ================= SHADCN FILTER STYLES ================= */
    const filterTriggerClass =
        "h-9 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
    const filterContentClass =
        "z-[9999] bg-white border shadow-lg rounded-md";
    const filterItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white `;
    useEffect(() => {
        if (!menu) return;
        const closeMenu = () => setMenu(null);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [menu]);

    return (
        <div className="text-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 mt-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-green-800">Turf Rentals</h1>
                    <p className="text-gray-500">
                        Manage turf rental bookings and schedules.
                    </p>
                </div>

                <button
                    onClick={openAdd}
                    className="flex items-center justify-center gap-2 bg-green-700 text-white px-4 py-2 rounded-md w-[50%] md:w-auto"
                >
                    <Plus size={16} /> Add Turf Rental
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Stat label="Total Rentals" value={total} />
                <Stat label="Confirmed" value={confirmed} />
                <Stat label="Pending" value={pending} />
                <Stat label="Total Revenue" value={`₹${revenue}`} />
            </div>

            <UpcomingBookings data={upcomingBookings} />
            {/* ================= FILTER BAR ================= */}
            <div className="bg-white border rounded-xl p-3 sm:p-4 mb-4">

                {/* ================= DESKTOP FILTERS ================= */}
                <div className="hidden md:grid grid-cols-3 gap-4">

                    {/* SPORT */}
                    <Select
                        value={filters.sport}
                        onValueChange={(v) =>
                            setFilters((p) => ({ ...p, sport: v }))
                        }
                    >
                        <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="All Sports" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white border shadow-lg">
                            <SelectItem value="all" className={filterItemClass}>
                                All Sports
                            </SelectItem>
                            {sports.map((s) => (
                                <SelectItem key={s._id} value={s._id} className={filterItemClass}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* FACILITY */}
                    <Select
                        value={filters.facility}
                        onValueChange={(v) =>
                            setFilters((p) => ({ ...p, facility: v }))
                        }
                    >
                        <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="All Facilities" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white border shadow-lg">
                            <SelectItem value="all" className={filterItemClass}>
                                All Facilities
                            </SelectItem>
                            {facilities.map((f) => (
                                <SelectItem key={f._id} value={f._id} className={filterItemClass}>
                                    {f.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* STATUS */}
                    <Select
                        value={filters.status}
                        onValueChange={(v) =>
                            setFilters((p) => ({ ...p, status: v }))
                        }
                    >
                        <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white border shadow-lg">
                            <SelectItem value="all" className={filterItemClass}>
                                All Status
                            </SelectItem>
                            <SelectItem value="paid" className={filterItemClass}>
                                Paid
                            </SelectItem>
                            <SelectItem value="pending" className={filterItemClass}>
                                Pending
                            </SelectItem>
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
                        className="h-9 w-9 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
                    >
                        <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                    </button>

                    {/* REFRESH */}
                    <button
                        onClick={() =>
                            setFilters({
                                sport: "all",
                                facility: "all",
                                status: "all",
                            })
                        }
                        className="h-9 w-9 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
                    >
                        <RotateCcw className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
                <div className="bg-white border rounded-lg overflow-visible mt-4">

                    {/* ================= DESKTOP TABLE ================= */}
                    <div className="hidden md:block">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr className="text-left">
                                    <th className="p-4 text-left">User Name</th>
                                    <th className="p-4">Facility</th>
                                    <th className="p-4">Sport</th>
                                    <th className="p-4">Rental Date</th>
                                    <th className="p-4">Slots</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRentals.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-6 text-center text-gray-500">
                                            No turf rentals found
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRentals.map((r) => (
                                        <tr key={r._id} className="border-t hover:bg-gray-50">
                                            <td className="p-4">{r.userName}</td>
                                            <td className="p-4">{r.facilityName}</td>
                                            <td className="p-4">{r.sportName}</td>
                                            <td className="p-4">{formatDateDMY(r.rentalDate)}</td>
                                            <td className="p-4">{renderSlotPills(r.slots)}</td>
                                            <td className="p-4">₹{r.finalAmount}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_STYLES[r.paymentStatus]}`}
                                                >
                                                    {r.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenu(menu === r._id ? null : r._id);
                                                    }}
                                                >
                                                    <MoreVertical />
                                                </button>

                                                {menu === r._id && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-0 mt-0 w-40 bg-white border rounded-md shadow z-[60]"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                openView(r);
                                                                setMenu(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                                        >
                                                            View
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                openEdit(r);
                                                                setMenu(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                navigate(`/admin/turf-rentals/invoice/${r._id}`);
                                                                toast({ title: "Opening invoice view" });
                                                                setMenu(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                                        >
                                                            View Invoice
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                deleteRental(r._id);
                                                                setMenu(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ================= MOBILE CARD VIEW ================= */}
                    <div className="md:hidden divide-y">
                        {paginatedRentals.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                No turf rentals found
                            </div>
                        ) : (
                            paginatedRentals.map((r) => (
                                <div key={r._id} className="p-4 space-y-3">

                                    {/* Top Row */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {r.userName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {r.facilityName} • {r.sportName}
                                            </div>
                                        </div>

                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_STYLES[r.paymentStatus]}`}
                                        >
                                            {r.paymentStatus}
                                        </span>
                                    </div>

                                    {/* Date + Slots */}
                                    <div className="text-sm text-gray-600">
                                        {formatDateDMY(r.rentalDate)}
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {renderSlotPills(r.slots)}
                                    </div>

                                    {/* Bottom Row */}
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="font-semibold text-green-700">
                                            ₹{r.finalAmount}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenu(menu === r._id ? null : r._id);
                                            }}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    {/* Mobile Menu */}
                                    {menu === r._id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="mt-2 w-full bg-white border rounded-md shadow z-[60]"
                                        >
                                            <button
                                                onClick={() => {
                                                    openView(r);
                                                    setMenu(null);
                                                }}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                            >
                                                View
                                            </button>

                                            <button
                                                onClick={() => {
                                                    openEdit(r);
                                                    setMenu(null);
                                                }}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() => {
                                                    navigate(`/admin/turf-rentals/invoice/${r._id}`);
                                                    toast({ title: "Opening invoice view" });
                                                    setMenu(null);
                                                }}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                            >
                                                View Invoice
                                            </button>

                                            <button
                                                onClick={() => {
                                                    deleteRental(r._id);
                                                    setMenu(null);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ================= PAGINATION ================= */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-4 py-3  bg-white">
                        <span className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </span>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            >
                                Previous
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT SHEET */}
            <Sheet open={!!drawer} onOpenChange={() => setDrawer(null)}>
                <SheetContent
                    side={isMobile ? "bottom" : "right"}
                    className={
                        isMobile
                            ? "h-[88vh] rounded-t-2xl flex flex-col px-4 pt-4 pb-2"
                            : "w-[420px] h-screen flex flex-col"
                    }
                >
                    <SheetHeader className="shrink-0">
                        <SheetTitle>
                            {drawer === "add"
                                ? "Add Turf Rental"
                                : drawer === "edit"
                                    ? "Edit Turf Rental"
                                    : "View Turf Rental"}
                        </SheetTitle>
                    </SheetHeader>

                    {/* ================= BODY ================= */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-sm">
                        {/* USER INFO */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>User / Group Name</Label>
                                <Input
                                    disabled={drawer === "view"}
                                    placeholder="User or Group Name"
                                    value={form.userName}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const existing = findExistingTurfUser(name);

                                        if (existing) {
                                            setForm((prev) => ({
                                                ...prev,
                                                userName: name,
                                                phone: existing.phone || "",
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
                                                userName: name,
                                            }));
                                        }
                                    }}
                                />

                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    disabled={drawer === "view"}
                                    placeholder="Phone Number"
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({ ...form, phone: e.target.value })
                                    }
                                />
                            </div>

                            {/* EMAIL */}
                            <div className="col-span-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="example@gmail.com"
                                    disabled={drawer === "view"}
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({ ...form, email: e.target.value })
                                    }
                                />
                            </div>
                        </div>


                        {/* ADDRESS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>City</Label>
                                <Select
                                    disabled={drawer === "view"}
                                    value={form.address?.city || ""}
                                    onValueChange={(city) =>
                                        setForm({
                                            ...form,
                                            address: { ...form.address, city },
                                        })
                                    }
                                >
                                    <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>

                                    <SelectContent className={selectContentClass}>
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


                            <div>
                                <Label>Local Address</Label>
                                <Input
                                    disabled={drawer === "view"}
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
                        </div>



                        {/* Facility + Sport */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* ================= FACILITY ================= */}
                            <div>
                                <Label>Facility</Label>

                                <Select
                                    disabled={drawer === "view"}
                                    value={form.facilityId}
                                    onValueChange={(facilityId) => {
                                        const facility = facilities.find((f) => f._id === facilityId);

                                        setForm((prev) => ({
                                            ...prev,
                                            facilityId,
                                            sportId: "",
                                            selectedSlots: [],
                                            totalAmount: 0,
                                        }));

                                        if (form.rentalDate) {
                                            loadSlots(
                                                facilityId,
                                                format(form.rentalDate, "yyyy-MM-dd")
                                            );
                                        }

                                        setHourlyRate(facility?.hourlyRate || 0);
                                    }}
                                >
                                    <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue placeholder="Select Facility" />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        sideOffset={4}
                                        className={selectContentClass}
                                    >
                                        {facilities.map((f) => (
                                            <SelectItem
                                                key={f._id}
                                                value={f._id}
                                                className={selectItemClass}
                                            >
                                                {f.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ================= SPORT ================= */}
                            <div>
                                <Label>Sport</Label>

                                <Select
                                    disabled={drawer === "view" || !form.facilityId}
                                    value={form.sportId}
                                    onValueChange={(sportId) =>
                                        setForm((prev) => ({ ...prev, sportId }))
                                    }
                                >
                                    <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue
                                            placeholder={
                                                form.facilityId
                                                    ? "Select Sport"
                                                    : "Select facility first"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        sideOffset={4}
                                        className={selectContentClass}
                                    >
                                        {allowedSports.length > 0 ? (
                                            allowedSports.map((s) => (
                                                <SelectItem
                                                    key={s._id}
                                                    value={s._id}
                                                    className={selectItemClass}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                                No sports available
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        {/* Date */}
                        {/* ================= RENTAL DATE ================= */}
                        <div>
                            <Label>Rental Date</Label>

                            <Popover
                                open={drawer === "add" ? dateOpen : false}
                                onOpenChange={(open) => {
                                    if (drawer === "add") setDateOpen(open);
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={drawer !== "add"} // 🔒 disable in edit & view
                                        className="
                                                        w-full h-11 justify-start text-left font-normal
                                                        bg-white border border-gray-300
                                                        focus:ring-2 focus:ring-green-600
                                                        "
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {form.rentalDate
                                            ? format(form.rentalDate, "dd MMM yyyy")
                                            : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>

                                {drawer === "add" && (
                                    <PopoverContent
                                        align="start"
                                        className="p-0 z-[9999] bg-white border shadow-lg"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={form.rentalDate}
                                            onSelect={(d) => {
                                                if (!d) return;

                                                setForm((prev) => ({
                                                    ...prev,
                                                    rentalDate: d,
                                                    selectedSlots: [],
                                                    totalAmount: 0,
                                                }));

                                                if (form.facilityId) {
                                                    loadSlots(
                                                        form.facilityId,
                                                        format(d, "yyyy-MM-dd")
                                                    );
                                                }

                                                setDateOpen(false); // ✅ close after select
                                            }}
                                            initialFocus
                                            classNames={{
                                                day: `
              h-9 w-9 p-0 font-normal rounded-md
              transition-colors
              hover:bg-green-100 hover:text-green-900
            `,
                                                day_selected: `
              bg-green-600 text-white
              hover:bg-green-600 hover:text-white
            `,
                                                day_today: `
              border border-green-600
              text-green-700 font-semibold
            `,
                                                day_outside: "text-muted-foreground opacity-50",
                                                day_disabled: "text-muted-foreground opacity-30",
                                            }}
                                        />
                                    </PopoverContent>
                                )}
                            </Popover>
                        </div>

                        {/* Start Time + Duration */}
                        <div className="grid grid-cols-1 gap-4">
                            {slots.length > 0 && (
                                <div className="mt-6 border rounded-xl p-5 bg-white">

                                    <h3 className="font-semibold text-green-700 mb-4">
                                        Available Slots
                                    </h3>

                                    {/* ================= MORNING ================= */}
                                    <div className="mb-6">
                                        <p className="text-sm text-gray-600 mb-3">
                                            Morning (7 AM – 11 AM)
                                        </p>

                                        <div className="flex flex-wrap gap-3">
                                            {slots
                                                .filter((s) => Number(s.time.slice(0, 2)) < 11)
                                                .map(renderSlot)}
                                        </div>
                                    </div>

                                    {/* ================= EVENING ================= */}
                                    <div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Evening (2 PM – 9 PM)
                                        </p>

                                        <div className="flex flex-wrap gap-3">
                                            {slots
                                                .filter((s) => Number(s.time.slice(0, 2)) >= 14)
                                                .map(renderSlot)}
                                        </div>
                                    </div>

                                    {/* ================= LEGEND ================= */}
                                    <div className="flex flex-wrap gap-6 text-xs text-gray-600 mt-6">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-green-400" />
                                            Available
                                        </span>

                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-orange-400" />
                                            Booked
                                        </span>

                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-red-400" />
                                            Blocked
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* ================= PAYMENT ================= */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* PAYMENT STATUS */}
                            <div>
                                <Label>Payment Status</Label>
                                <Select
                                    disabled={drawer === "view"}
                                    value={form.paymentStatus}
                                    onValueChange={(v) =>
                                        setForm({ ...form, paymentStatus: v })
                                    }
                                >
                                    <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        sideOffset={4}
                                        className={selectContentClass}
                                    >
                                        <SelectItem value="paid" className={selectItemClass}>
                                            Paid
                                        </SelectItem>
                                        <SelectItem value="pending" className={selectItemClass}>
                                            Pending
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* PAYMENT METHOD */}
                            <div>
                                <Label>Payment Method</Label>

                                <Select
                                    disabled={drawer === "view"}
                                    value={form.paymentMode}
                                    onValueChange={(v) =>
                                        setForm({ ...form, paymentMode: v })
                                    }
                                >
                                    <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        sideOffset={4}
                                        className={selectContentClass}
                                    >
                                        <SelectItem value="cash" className={selectItemClass}>
                                            Cash
                                        </SelectItem>
                                        <SelectItem value="upi" className={selectItemClass}>
                                            UPI
                                        </SelectItem>
                                        <SelectItem value="razorpay" className={selectItemClass}>Razorpay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* ================= DISCOUNT ================= */}
                        <div className="space-y-3 border-t pt-4">
                            <Label>Apply Discount</Label>
                            <Select
                                disabled={drawer === "view"}
                                value={discountCode}
                                onValueChange={(code) => setDiscountCode(code)}
                            >
                                <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder="Select Discount (optional)" />
                                </SelectTrigger>

                                <SelectContent className={selectContentClass}>
                                    <SelectItem value="none" className={selectItemClass}>
                                        No Discount
                                    </SelectItem>
                                    {availableDiscounts.map((d) => (
                                        <SelectItem
                                            key={d._id}
                                            value={d.code}
                                            className={selectItemClass}
                                        >
                                            {d.code} — {d.type === "percentage"
                                                ? `${d.value}%`
                                                : `₹${d.value}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Show applied discount */}
                            {form.totalDiscountAmount > 0 && (
                                <div className="text-sm text-green-600">
                                    Discount Applied: ₹{form.totalDiscountAmount}
                                </div>
                            )}
                        </div>
                        {/* ================= AMOUNT BREAKDOWN ================= */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Base Amount</span>
                                <span>₹{form.baseAmount || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount</span>
                                <span>- ₹{form.totalDiscountAmount || 0}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg text-green-700 border-t pt-2">
                                <span>Final Amount</span>
                                <span>₹{form.finalAmount || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    {drawer !== "view" && (
                        <div className="mt-3">
                            <Button
                                className="w-full bg-green-700 hover:bg-green-800"
                                onClick={saveRental}
                            >
                                {drawer === "add" ? "Add Rental" : "Update Rental"}
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetContent
                    side="bottom"
                    className="h-[50vh] rounded-t-2xl p-4"
                >
                    <h2 className="text-lg font-semibold mb-4">Filters</h2>

                    <div className="space-y-4">

                        {/* SPORT */}
                        <Select
                            value={tempFilters.sport}
                            onValueChange={(v) =>
                                setTempFilters((p) => ({ ...p, sport: v }))
                            }
                        >
                            <SelectTrigger className={filterTriggerClass}>
                                <SelectValue placeholder="All Sports" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] bg-white border shadow-lg">
                                <SelectItem value="all" className={filterItemClass}>
                                    All Sports
                                </SelectItem>
                                {sports.map((s) => (
                                    <SelectItem key={s._id} value={s._id} className={filterItemClass}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* FACILITY */}
                        <Select
                            value={tempFilters.facility}
                            onValueChange={(v) =>
                                setTempFilters((p) => ({ ...p, facility: v }))
                            }
                        >
                            <SelectTrigger className={filterTriggerClass}>
                                <SelectValue placeholder="All Facilities" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] bg-white border shadow-lg">
                                <SelectItem value="all" className={filterItemClass}>
                                    All Facilities
                                </SelectItem>
                                {facilities.map((f) => (
                                    <SelectItem key={f._id} value={f._id} className={filterItemClass}>
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* STATUS */}
                        <Select
                            value={tempFilters.status}
                            onValueChange={(v) =>
                                setTempFilters((p) => ({ ...p, status: v }))
                            }
                        >
                            <SelectTrigger className={filterTriggerClass}>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] bg-white border shadow-lg">
                                <SelectItem value="all" className={filterItemClass}>
                                    All Status
                                </SelectItem>
                                <SelectItem value="paid" className={filterItemClass}>
                                    Paid
                                </SelectItem>
                                <SelectItem value="pending" className={filterItemClass}>
                                    Pending
                                </SelectItem>
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
                                    sport: "all",
                                    facility: "all",
                                    status: "all",
                                })
                            }
                        >
                            Clear
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

/* ================= SMALL COMPONENT ================= */
function Stat({ label, value }) {
    return (
        <div className="bg-white border rounded-lg p-4">
            <div className="text-xl font-semibold text-green-700">{value}</div>
            <div className="text-gray-500">{label}</div>
        </div>
    );
}

function UpcomingBookings({ data }) {
  if (!Object.keys(data).length) return null;

  const labelStyles = {
    "Live Now": "bg-blue-100 text-blue-700",
    "Upcoming Today": "bg-green-100 text-green-700",
    "Tomorrow": "bg-purple-100 text-indigo-700",
  };

  return (
    <div className="bg-white border rounded-xl p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <CalendarIcon className="text-green-700" size={18} />
        Upcoming Bookings
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(data).map(([date, bookings]) => (
          <div
            key={date}
            className="bg-gray-50 rounded-lg p-4 space-y-3"
          >
            <div className="font-semibold text-sm">
              {format(new Date(date), "dd MMM yyyy")}
            </div>

            {bookings.map((b) => (
              <div
                key={b._id}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <div className="font-medium">
                    {getSlotRange(b.slots)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {b.facilityName}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    labelStyles[b.bookingLabel]
                  }`}
                >
                  {b.bookingLabel}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
