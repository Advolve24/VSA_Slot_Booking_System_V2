import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { CalendarIcon, MoreHorizontal } from "lucide-react";
import { Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

/* ================= UTIL ================= */
const toMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

const formatTime12h = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m);
    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
};

const formatRange = (start, end) => {
    return `${formatTime12h(start)} - ${formatTime12h(end)}`;
};

const isTimeConflicting = (start, end, blockedTimes) => {

    if (!start || !end) return false;

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    return blockedTimes.some(b => {

        const bStart = toMinutes(b.startTime);
        const bEnd = toMinutes(b.endTime);

        return startMin < bEnd && endMin > bStart;

    });

};

const calcDuration = (start, end) => { if (!start || !end) return 0; return (toMinutes(end) - toMinutes(start)) / 60; };

/* ================= PAGE ================= */

export default function TurfRentals() {
    const [page, setPage] = useState(1);
    const limit = 4; // rows per page
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rentals, setRentals] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [sports, setSports] = useState([]);
    const [drawer, setDrawer] = useState(null);
    const [selected, setSelected] = useState(null);
    const [paymentDrawer, setPaymentDrawer] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        mode: "cash"
    });
    const [blockedTimes, setBlockedTimes] = useState([]);
    const [refundBooking, setRefundBooking] = useState(null);

    const emptyForm = {
        userName: "",
        phone: "",
        email: "",

        facilityId: "",
        facilityName: "",
        sportId: "",
        sportName: "",

        rentalDate: "",
        startTime: "",
        endTime: "",

        hourlyRate: 0,
        baseAmount: 0,
        finalAmount: 0,

        paymentType: "none",
        paymentMode: "cash",

        requiredAdvance: 0,
        totalPaid: 0,
        dueAmount: 0,

        advanceAmount: 0,
        remainingAmount: 0
    };

    const [form, setForm] = useState(emptyForm);

    const isView = drawer === "view" || selected?.bookingStatus === "cancelled";

    /* ================= FETCH ================= */

    const fetchAll = async () => {

        try {

            const [r, f] = await Promise.all([
                api.get("/turf-rentals"),
                api.get("/facilities")
            ]);

            setRentals(r.data || []);
            setFacilities(f.data || []);

        } catch (err) {

            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive"
            });

        }

    };

    useEffect(() => {
        fetchAll();
    }, []);

    /* ================= FACILITY ================= */

    const handleFacility = (id) => {

        const facility = facilities.find(x => x._id === id);
        if (!facility) return;
        setSports(facility.sports || []);

        setForm(prev => ({
            ...prev,
            facilityId: facility._id,
            facilityName: facility.name,
            sportId: "",
            sportName: "",
            hourlyRate: facility.hourlyRate || 0
        }));

    };

    /* ================= SPORT ================= */

    const handleSport = (id) => {

        const sport = sports.find(x => x._id === id);

        if (!sport) return;

        setForm(prev => ({
            ...prev,
            sportId: sport._id,
            sportName: sport.name
        }));

    };

    /* ================= DATE ================= */

    const handleDate = (date) => {

        const d = format(date, "yyyy-MM-dd");

        setForm(p => ({
            ...p,
            rentalDate: d
        }));

    };

    /* ================= TIME CALC ================= */

    useEffect(() => {

        const hours = calcDuration(form.startTime, form.endTime);

        if (hours <= 0) {
            setForm(p => ({
                ...p,
                baseAmount: 0,
                finalAmount: 0
            }));
            return;
        }

        const base = Math.round((form.hourlyRate || 0) * hours);

        setForm(p => ({
            ...p,
            baseAmount: base,
            finalAmount: base
        }));

    }, [form.startTime, form.endTime]);


    /* ================= SAVE ================= */

    const saveRental = async () => {

        /* ================= BASIC VALIDATION ================= */

        if (!form.startTime || !form.endTime) {

            toast({
                title: "Invalid time",
                description: "Select start and end time",
                variant: "destructive"
            });

            return;
        }

        if (toMinutes(form.endTime) <= toMinutes(form.startTime)) {

            toast({
                title: "Invalid range",
                description: "End time must be after start time",
                variant: "destructive"
            });

            return;
        }

        /* ================= CONFLICT CHECK ================= */

        const startMin = toMinutes(form.startTime);
        const endMin = toMinutes(form.endTime);

        const conflict = blockedTimes.some(t => {

            const bStart = toMinutes(t.startTime);
            const bEnd = toMinutes(t.endTime);

            return startMin < bEnd && endMin > bStart;

        });

        if (conflict) {

            toast({
                title: "Time Conflict",
                description: "Selected time conflicts with booked / batch / blocked slot",
                variant: "destructive"
            });

            return;
        }

        /* ================= SAVE ================= */

        try {

            if (drawer === "add") {

                await api.post("/turf-rentals", {
                    ...form,
                    source: "admin"
                });

                toast({ title: "Booking Created" });

            } else {

                await api.patch(`/turf-rentals/${selected._id}`, form);

                toast({ title: "Booking Updated" });

            }

            setDrawer(null);
            setForm(emptyForm);
            fetchAll();

        } catch (err) {

            toast({
                title: "Error",
                description: err?.response?.data?.message || "Failed",
                variant: "destructive"
            });

        }

    };
    /* ================= DELETE ================= */
    const deleteRental = async (id) => {

        if (!confirm("Delete this booking?")) return;

        await api.delete(`/turf-rentals/${id}`);

        toast({ title: "Booking Deleted" });

        fetchAll();
    };

    /* ================= CANCEL BOOKING ================= */

    const cancelRental = async (id) => {

        if (!confirm("Cancel this booking? Refund may apply.")) return;

        try {

            await api.patch(`/turf-rentals/${id}/cancel`, {
                source: "admin"
            });

            toast({
                title: "Booking Cancelled",
                description: "Booking cancelled by admin"
            });

            fetchAll();

        } catch (err) {

            toast({
                title: "Cancellation Failed",
                description: err?.response?.data?.message || "Error",
                variant: "destructive"
            });

        }

    };
    /* ================= APPROVE REFUND ================= */

    const approveRefund = async () => {

        if (!refundBooking) return;

        try {

            await api.patch(`/turf-rentals/${refundBooking._id}/approve-refund`);

            toast({
                title: "Refund Approved",
                description: "Customer refund has been approved"
            });

            setRefundBooking(null);

            fetchAll();

        } catch (err) {

            toast({
                title: "Refund Failed",
                description: err?.response?.data?.message || "Error",
                variant: "destructive"
            });

        }

    };

    const savePayment = async () => {

        try {

            await api.post(`/turf-rentals/${selected._id}/payments`, {
                amount: Number(paymentForm.amount),
                mode: paymentForm.mode,
                paymentType: "balance"
            });

            toast({ title: "Payment Added" });

            setPaymentDrawer(false);

            fetchAll();

        } catch (err) {

            toast({
                title: "Error",
                description: err?.response?.data?.message || "Payment failed",
                variant: "destructive"
            });

        }

    };

    const openAdd = () => {

        setForm(emptyForm);
        setSports([]);
        setDrawer("add");
    };
    const openView = async (r) => {

        try {

            const res = await api.get(`/turf-rentals/${r._id}`);
            const fullBooking = res.data;

            setSelected(fullBooking);

            const totalPaid = fullBooking.totalPaid || 0;
            const finalAmount = fullBooking.finalAmount || 0;

            const facilityId =
                fullBooking.facilityId?._id || fullBooking.facilityId;

            const facility = facilities.find(f => f._id === facilityId);

            if (facility) {
                setSports(facility.sports || []);
            }

            /* ✅ detect payment type from payments */
            let paymentType = "none";
            let paymentMode = "";

            if (fullBooking.payments?.length) {

                const firstPayment = fullBooking.payments[0];

                paymentType = firstPayment.paymentType || "advance";
                paymentMode = firstPayment.mode || "cash";

            }

            setForm({
                ...emptyForm,
                ...fullBooking,

                facilityId,
                sportId: fullBooking.sportId?._id || fullBooking.sportId,

                paymentType,
                paymentMode,

                advanceAmount: totalPaid,
                remainingAmount: finalAmount - totalPaid
            });

            setDrawer("view");

        } catch (err) {

            toast({
                title: "Error",
                description: "Failed to load booking details",
                variant: "destructive"
            });

        }

    };
    const openEdit = (r) => {

        setSelected(r);
        const totalPaid = r.totalPaid || 0;
        const finalAmount = r.finalAmount || 0;
        const facilityId = r.facilityId?._id || r.facilityId;
        const facility = facilities.find(f => f._id === facilityId);
        if (facility) {
            setSports(facility.sports || []);
        }
        setForm({
            ...emptyForm,
            ...r,
            facilityId,
            sportId: r.sportId?._id || r.sportId,

            advanceAmount: totalPaid,
            remainingAmount: finalAmount - totalPaid
        });

        setDrawer("edit");
    };


    const goToPayment = (id) => {
        navigate(`/admin/turf-rentals/${id}/payment`);
    };

    const fetchPricePreview = async (facilityId, startTime, endTime) => {

        if (!facilityId || !startTime || !endTime) return;

        try {

            const res = await api.post("/turf-rentals/preview-price", {
                facilityId,
                startTime,
                endTime
            });

            const { finalAmount, requiredAdvance } = res.data;

            setForm(prev => ({
                ...prev,
                finalAmount,
                baseAmount: finalAmount,
                requiredAdvance,
                advanceAmount: requiredAdvance,
                remainingAmount: finalAmount - requiredAdvance
            }));

        } catch (err) {

            console.error("Price preview failed", err);
        }

    };

    useEffect(() => {
        fetchPricePreview(
            form.facilityId,
            form.startTime,
            form.endTime
        );
    }, [form.facilityId, form.startTime, form.endTime]);

    const fetchBlockedTimes = async (facilityId, date) => {
        if (!facilityId || !date) return;

        try {

            const res = await api.get(
                `/facilities/${facilityId}/unavailable`,
                { params: { date } }
            );

            setBlockedTimes(res.data || []);

        } catch (err) {

            console.error("Failed to fetch unavailable times");

        }

    };
    useEffect(() => {

        fetchBlockedTimes(
            form.facilityId,
            form.rentalDate
        );

    }, [form.facilityId, form.rentalDate]);

    const stats = useMemo(() => {

        const total = rentals.length;

        const confirmed = rentals.filter(
            (r) => (r.totalPaid || 0) >= r.finalAmount
        ).length;

        const pending = rentals.filter(
            (r) => (r.dueAmount ?? r.finalAmount) > 0
        ).length;

        const revenue = rentals.reduce(
            (sum, r) => sum + (r.totalPaid || 0),
            0
        );

        return { total, confirmed, pending, revenue };

    }, [rentals]);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const upcomingSlots = useMemo(() => {

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        return rentals
            .filter((r) => {

                if (!r.rentalDate) return false;

                // ❌ Skip cancelled bookings
                if (r.bookingStatus === "cancelled") return false;

                const d = new Date(r.rentalDate);

                return (
                    d.toDateString() === today.toDateString() ||
                    d.toDateString() === tomorrow.toDateString()
                );

            })
            .sort((a, b) => {

                if (a.rentalDate === b.rentalDate) {
                    return toMinutes(a.startTime) - toMinutes(b.startTime);
                }

                return new Date(a.rentalDate) - new Date(b.rentalDate);

            });

    }, [rentals]);

    const getPaymentLabel = (r) => {
        const paid = r.totalPaid || 0;
        const total = r.finalAmount || 0;
        const due = total - paid;

        if (paid >= total) {
            return { label: "Paid", style: "bg-green-100 text-green-700" };
        }

        if (paid > 0) {
            return {
                label: `Advance ₹${paid}`,
                style: "bg-yellow-100 text-yellow-700"
            };
        }

        return {
            label: `Due ₹${due}`,
            style: "bg-red-100 text-red-700"
        };
    };
    const groupedSlots = useMemo(() => {
        const map = {};

        upcomingSlots.forEach((slot) => {
            const date = slot.rentalDate;

            if (!map[date]) {
                map[date] = [];
            }

            map[date].push(slot);
        });

        return Object.entries(map)
            .map(([date, slots]) => ({
                date,
                slots,
                facilityName: slots[0]?.facilityName
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

    }, [upcomingSlots]);
    const hasMore = upcomingSlots.length > 6;

    const totalPages = Math.ceil(rentals.length / limit);

    const paginatedRentals = useMemo(() => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return rentals.slice(start, end);
    }, [rentals, page]);

    const selectTriggerClass = "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
    const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;

    return (

        <div className="space-y-6">

            {/* HEADER */}

            <div className="flex justify-between items-center mt-4">

                <h1 className="text-xl font-semibold">
                    Turf Rentals
                </h1>

                <Button
                    className="bg-green-700 hover:bg-green-800"
                    onClick={openAdd}
                >
                    Add Booking
                </Button>

            </div>


            {/* ================= STATS ================= */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <div className="bg-white border rounded-xl p-4">
                    <p className="text-2xl font-semibold text-green-700">
                        {stats.total}
                    </p>
                    <p className="text-sm text-gray-500">
                        Total Rentals
                    </p>
                </div>

                <div className="bg-white border rounded-xl p-4">
                    <p className="text-2xl font-semibold text-green-700">
                        {stats.confirmed}
                    </p>
                    <p className="text-sm text-gray-500">
                        Confirmed
                    </p>
                </div>

                <div className="bg-white border rounded-xl p-4">
                    <p className="text-2xl font-semibold text-orange-500">
                        {stats.pending}
                    </p>
                    <p className="text-sm text-gray-500">
                        Pending
                    </p>
                </div>

                <div className="bg-white border rounded-xl p-4">
                    <p className="text-2xl font-semibold">
                        ₹{stats.revenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                        Total Revenue
                    </p>
                </div>

            </div>

            {/* ================= UPCOMING SLOTS ================= */}

            <div className="bg-white border rounded-xl p-5">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="font-semibold">Upcoming Slots</h2>
                        <p className="text-xs text-gray-500">Today & Tomorrow</p>
                    </div>

                    <span className="text-green-600 text-sm font-medium">
                        {upcomingSlots.length} slots
                    </span>
                </div>


                {/* GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {groupedSlots.map((group) => (

                        <div
                            key={group.date}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition border"
                        >

                            {/* DATE */}
                            <p className="text-xs text-gray-500 flex items-center gap-2 mb-3">
                                <CalendarIcon className="w-4 h-4" />
                                {format(new Date(group.date), "dd MMM yyyy")}
                            </p>


                            {/* SLOTS */}
                            <div className="space-y-2">
                                {group.slots.map((slot) => {
                                    const payment = getPaymentLabel(slot);
                                    return (
                                        <div
                                            key={slot._id}
                                            className="flex justify-between items-center text-sm"
                                        >
                                            <div className="flex items-center gap-2 font-medium">
                                                <Clock className="w-4 h-4" />
                                                {formatRange(slot.startTime, slot.endTime)}
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${payment.style}`}
                                            >
                                                {payment.label}
                                            </span>

                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-3">
                                <MapPin className="w-4 h-4" />
                                {group.facilityName}
                            </p>

                        </div>

                    ))}

                </div>
                {!groupedSlots.length && (
                    <p className="text-sm text-gray-500 text-center py-6">
                        No upcoming slots
                    </p>
                )}

            </div>


            {/* ================= DESKTOP TABLE ================= */}

            <div className="hidden md:block border rounded-xl bg-white overflow-x-auto">

                <table className="w-full text-sm">

                    <thead className="bg-slate-100 border-b">

                        <tr className="text-left">

                            <th className="p-3">Customer</th>
                            <th>Facility</th>
                            <th>Sport</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th className="text-right pr-3">Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {paginatedRentals.map((r) => (

                            <tr
                                key={r._id}
                                className={`border-t ${r.bookingStatus === "cancelled"
                                    ? "bg-gray-100 "
                                    : ""
                                    }`}
                            >

                                <td className="p-3 font-medium">

                                    <div className="flex flex-col">

                                        <span>{r.userName}</span>

                                        {r.bookingStatus === "cancelled" && (

                                            <span className="text-xs text-red-600 font-medium">
                                                Cancelled
                                            </span>

                                        )}

                                    </div>

                                </td>

                                <td>{r.facilityName}</td>

                                <td>{r.sportName}</td>

                                <td>{r.rentalDate}</td>

                                <td>
                                    {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)}
                                </td>

                                <td className="font-semibold">
                                    ₹ {r.finalAmount}
                                </td>

                                <td className="text-green-700 font-semibold">
                                    ₹ {r.totalPaid || 0}
                                </td>

                                <td className="text-red-600 font-semibold">
                                    {(r.dueAmount ?? r.finalAmount) > 0
                                        ? `₹ ${r.dueAmount}`
                                        : "-"}
                                </td>

                                <td className="text-right pr-3">

                                    <DropdownMenu>

                                        <DropdownMenuTrigger asChild>

                                            <button className="p-2 hover:bg-gray-100 rounded">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>

                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent className="bg-white border shadow-lg">

                                            <DropdownMenuItem onClick={() => openView(r)}>
                                                View
                                            </DropdownMenuItem>

                                            {r.bookingStatus !== "cancelled" && (
                                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                                    Edit
                                                </DropdownMenuItem>
                                            )}

                                            {/* CANCEL BOOKING */}

                                            {r.bookingStatus !== "cancelled" && (

                                                <DropdownMenuItem
                                                    className="text-orange-600"
                                                    onClick={() => cancelRental(r._id)}
                                                >
                                                    Cancel Booking
                                                </DropdownMenuItem>

                                            )}

                                            {/* APPROVE REFUND */}

                                            {r.bookingStatus === "cancelled" && r.refundStatus === "pending" && (

                                                <DropdownMenuItem
                                                    className="text-green-700"
                                                    onClick={() => setRefundBooking(r)}
                                                >
                                                    Approve Refund
                                                </DropdownMenuItem>

                                            )}

                                            {r.dueAmount > 0 && r.bookingStatus !== "cancelled" && (

                                                <DropdownMenuItem
                                                    onClick={() => goToPayment(r._id)}
                                                >
                                                    Collect Payment
                                                </DropdownMenuItem>

                                            )}

                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => deleteRental(r._id)}
                                            >
                                                Delete
                                            </DropdownMenuItem>

                                        </DropdownMenuContent>

                                    </DropdownMenu>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>
            </div>

            {/* ================= MOBILE CARDS ================= */}

            <div className="md:hidden space-y-4">

                {paginatedRentals.map((r) => (
                    <div
                        key={r._id}
                        className="bg-white border rounded-xl p-4"
                    >

                        <div className="flex justify-between items-start">

                            <div>

                                <p className="font-semibold flex items-center gap-2">

                                    {r.userName}

                                    {r.bookingStatus === "cancelled" && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                            Cancelled ({r.cancellationSource})
                                        </span>
                                    )}

                                </p>

                                <p className="text-sm text-gray-500">
                                    {r.facilityName} • {r.sportName}
                                </p>

                            </div>

                            <DropdownMenu>

                                <DropdownMenuTrigger asChild>

                                    <button className="p-1 hover:bg-gray-100 rounded">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                </DropdownMenuTrigger>

                                <DropdownMenuContent className="bg-white border shadow-lg">

                                    <DropdownMenuItem onClick={() => openView(r)}>
                                        View
                                    </DropdownMenuItem>

                                    {r.bookingStatus !== "cancelled" && (
                                        <DropdownMenuItem onClick={() => openEdit(r)}>
                                            Edit
                                        </DropdownMenuItem>
                                    )}

                                    {r.bookingStatus !== "cancelled" && (

                                        <DropdownMenuItem
                                            className="text-orange-600"
                                            onClick={() => cancelRental(r._id)}
                                        >
                                            Cancel Booking
                                        </DropdownMenuItem>

                                    )}

                                    {r.bookingStatus === "cancelled" && r.refundStatus === "pending" && (

                                        <DropdownMenuItem
                                            className="text-green-700"
                                            onClick={() => setRefundBooking(r)}
                                        >
                                            Approve Refund
                                        </DropdownMenuItem>

                                    )}

                                    {r.dueAmount > 0 && r.bookingStatus !== "cancelled" && (

                                        <DropdownMenuItem
                                            onClick={() => goToPayment(r._id)}
                                        >
                                            Collect Payment
                                        </DropdownMenuItem>

                                    )}

                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => deleteRental(r._id)}
                                    >
                                        Delete
                                    </DropdownMenuItem>

                                </DropdownMenuContent>

                            </DropdownMenu>

                        </div>


                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">

                            <p className="font-medium">
                                {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)}
                            </p>

                            <p className="text-gray-500">
                                {r.rentalDate}
                            </p>

                        </div>

                        <div className="mt-3 flex justify-between text-sm">

                            <span className="font-semibold">
                                ₹ {r.finalAmount}
                            </span>

                            <span className="text-green-700">
                                Paid ₹ {r.totalPaid || 0}
                            </span>

                        </div>

                        {(r.dueAmount ?? r.finalAmount) > 0 && (

                            <p className="text-red-600 text-sm mt-1">
                                Due ₹ {r.dueAmount}
                            </p>

                        )}

                    </div>

                ))}

            </div>
            {/* ================= PAGINATION ================= */}

            {totalPages > 1 && (

                <div className="mt-6">

                    {/* DESKTOP PAGINATION */}
                    <div className="hidden md:flex justify-between items-center">

                        <p className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </p>

                        <div className="flex gap-2 flex-wrap">

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                Previous
                            </Button>

                            {Array.from({ length: totalPages }).map((_, i) => (

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

                    {/* MOBILE PAGINATION */}
                    <div className="flex md:hidden justify-between items-center">

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
            )}
            <Sheet open={!!drawer} onOpenChange={() => setDrawer(null)}>

                <SheetContent
                    side={isMobile ? "bottom" : "right"}
                    className={
                        isMobile
                            ? "h-[80vh] rounded-t-2xl flex flex-col px-2 pt-4 pb-2"
                            : "w-[32vw] h-screen flex flex-col"
                    }
                >

                    {/* HEADER */}

                    <SheetHeader className="shrink-0">

                        <SheetTitle>

                            {drawer === "add" && "New Booking"}
                            {drawer === "edit" && "Edit Booking"}
                            {drawer === "view" && "View Booking"}

                        </SheetTitle>

                    </SheetHeader>



                    {/* BODY */}

                    <div className="flex-1 overflow-y-auto px-2">

                        <div className="grid grid-cols-2 gap-3 mt-4">

                            {/* CUSTOMER NAME */}

                            <div className="col-span-2">
                                <Label>Customer Name</Label>

                                <Input
                                    disabled={isView}
                                    value={form.userName}
                                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                                />

                            </div>



                            {/* PHONE */}

                            <div>

                                <Label>Phone</Label>

                                <Input
                                    disabled={isView}
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />

                            </div>



                            {/* EMAIL */}

                            <div>

                                <Label>Email</Label>

                                <Input
                                    disabled={isView}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />

                            </div>



                            {/* FACILITY */}

                            <div>

                                <Label>Facility</Label>

                                <Select
                                    disabled={isView}
                                    value={form.facilityId || ""}
                                    onValueChange={handleFacility}
                                >

                                    <SelectTrigger className={selectTriggerClass}>

                                        <SelectValue placeholder="Select Facility" />

                                    </SelectTrigger>

                                    <SelectContent className="z-[9999] bg-white border shadow-lg">

                                        {facilities.map(f => (
                                            <SelectItem className={selectItemClass} key={f._id} value={f._id}>
                                                {f.name}
                                            </SelectItem>
                                        ))}

                                    </SelectContent>

                                </Select>

                            </div>



                            {/* SPORT */}

                            <div>

                                <Label>Sport</Label>

                                <Select
                                    disabled={isView}
                                    value={form.sportId || ""}
                                    onValueChange={handleSport}
                                >

                                    <SelectTrigger className={selectTriggerClass}>

                                        <SelectValue placeholder="Select Sport" />

                                    </SelectTrigger>

                                    <SelectContent className="z-[9999] bg-white border shadow-lg">

                                        {sports.map(s => (
                                            <SelectItem className={selectItemClass} key={s._id} value={s._id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}

                                    </SelectContent>

                                </Select>

                            </div>



                            {/* DATE */}

                            <div className="col-span-2">

                                <Label>Date</Label>

                                <Popover>

                                    <PopoverTrigger asChild>

                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >

                                            <CalendarIcon className="mr-2 h-4 w-4" />

                                            {form.rentalDate
                                                ? format(new Date(form.rentalDate), "PPP")
                                                : "Select Date"}

                                        </Button>

                                    </PopoverTrigger>

                                    <PopoverContent className="p-0">

                                        <Calendar
                                            mode="single"
                                            selected={form.rentalDate ? new Date(form.rentalDate) : null}
                                            onSelect={handleDate}
                                        />

                                    </PopoverContent>

                                </Popover>

                            </div>

                            {/* ================= UNAVAILABLE TIMES ================= */}

                            {form.facilityId && form.rentalDate && blockedTimes.length > 0 && (

                                <div className="col-span-2 border rounded-lg p-3 bg-gray-50">

                                    <p className="text-sm font-semibold mb-2">
                                        Unavailable Slots
                                    </p>

                                    <div className="flex flex-wrap gap-2">

                                        {blockedTimes.map((t, i) => {

                                            let style = "bg-gray-200 text-gray-700";

                                            if (t.type === "booking")
                                                style = "bg-red-100 text-red-700";

                                            if (t.type === "batch")
                                                style = "bg-blue-100 text-blue-700";

                                            if (t.type === "blocked")
                                                style = "bg-gray-300 text-gray-800";

                                            return (

                                                <div
                                                    key={i}
                                                    className={`px-3 py-1 rounded-md text-xs font-medium ${style}`}
                                                >

                                                    {formatTime12h(t.startTime)} - {formatTime12h(t.endTime)}

                                                    {t.type === "batch" && " (Batch)"}
                                                    {t.type === "booking" && " (Booked)"}
                                                    {t.type === "blocked" && " (Blocked)"}

                                                </div>

                                            )

                                        })}

                                    </div>

                                </div>

                            )}

                            {/* START TIME */}

                            <div>

                                <Label>Start Time</Label>

                                <Input
                                    type="time"
                                    step="60"
                                    disabled={isView}
                                    value={form.startTime}
                                    onChange={(e) => {

                                        const value = e.target.value;

                                        if (isTimeConflicting(value, form.endTime, blockedTimes)) {

                                            toast({
                                                title: "Time Conflict",
                                                description: "This slot is already booked or blocked",
                                                variant: "destructive"
                                            });

                                            return;
                                        }

                                        setForm({ ...form, startTime: value });

                                    }}
                                />

                            </div>


                            <div>
                                {/* END TIME */}
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    step="60"
                                    disabled={isView}
                                    value={form.endTime}
                                    onChange={(e) => {

                                        const value = e.target.value;

                                        if (isTimeConflicting(form.startTime, value, blockedTimes)) {

                                            toast({
                                                title: "Time Conflict",
                                                description: "This slot is already booked or blocked",
                                                variant: "destructive"
                                            });

                                            return;
                                        }

                                        setForm({ ...form, endTime: value });

                                    }}
                                />

                            </div>

                            {/* PAYMENT TYPE */}

                            <div>

                                <Label>Payment Type</Label>

                                <Select
                                    value={form.paymentType || "none"}
                                    onValueChange={(v) => {

                                        let advance = 0;

                                        if (v === "advance") advance = form.requiredAdvance;
                                        if (v === "full") advance = form.finalAmount;

                                        setForm({
                                            ...form,
                                            paymentType: v,
                                            paymentMode: v === "none" ? "" : "cash",
                                            advanceAmount: advance,
                                            remainingAmount: form.finalAmount - advance
                                        });

                                    }}
                                >

                                    <SelectTrigger className={selectTriggerClass}>

                                        <SelectValue />

                                    </SelectTrigger>

                                    <SelectContent className="z-[9999] bg-white border shadow-lg">

                                        <SelectItem className={selectItemClass} value="none">No Payment</SelectItem>
                                        <SelectItem className={selectItemClass} value="advance">Advance</SelectItem>
                                        <SelectItem className={selectItemClass} value="full">Full</SelectItem>

                                    </SelectContent>

                                </Select>

                            </div>



                            {/* PAYMENT MODE */}

                            {form.paymentType !== "none" && (

                                <div>

                                    <Label>Payment Mode</Label>

                                    <Select
                                        value={form.paymentMode || "cash"}
                                        onValueChange={(v) => setForm({ ...form, paymentMode: v })}
                                    >

                                        <SelectTrigger className={selectTriggerClass}>

                                            <SelectValue />

                                        </SelectTrigger>

                                        <SelectContent className="z-[9999] bg-white border shadow-lg">

                                            <SelectItem className={selectItemClass} value="cash">Cash</SelectItem>
                                            <SelectItem className={selectItemClass} value="upi">UPI</SelectItem>
                                            <SelectItem className={selectItemClass} value="razorpay">Razorpay</SelectItem>

                                        </SelectContent>

                                    </Select>

                                </div>

                            )}



                            {/* SUMMARY */}

                            <div className="col-span-2 border rounded-lg p-3 bg-gray-50 text-sm space-y-1">

                                <div className="flex justify-between">
                                    <span>Total</span>
                                    <span>₹ {form.finalAmount || 0}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span>Advance</span>
                                    <span>₹ {form.advanceAmount || 0}</span>
                                </div>

                                <div className="flex justify-between font-semibold">
                                    <span>Remaining</span>
                                    <span>₹ {(form.finalAmount || 0) - (form.advanceAmount || 0)}</span>
                                </div>

                            </div>

                            {/* ================= PAYMENT HISTORY ================= */}

                            {isView && selected?.payments?.length > 0 && (() => {

                                const totalPaid = selected.payments.reduce(
                                    (sum, p) => sum + Number(p.amount || 0),
                                    0
                                );

                                return (

                                    <div className="col-span-2 border rounded-lg p-3 bg-white">

                                        {/* HEADER */}

                                        <div className="flex justify-between items-center mb-3">

                                            <p className="font-semibold text-sm">
                                                Payment History
                                            </p>

                                            <p className="text-sm font-semibold text-green-700">
                                                ₹ {totalPaid} Paid
                                            </p>

                                        </div>


                                        {/* PAYMENTS */}

                                        <div className="space-y-2">

                                            {selected.payments.map((p, i) => {

                                                const date = p.createdAt
                                                    ? new Date(p.createdAt).toLocaleDateString("en-IN")
                                                    : "";

                                                const time = p.createdAt
                                                    ? new Date(p.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })
                                                    : "";

                                                return (

                                                    <div
                                                        key={p._id}
                                                        className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-md px-3 py-2 text-sm"
                                                    >

                                                        {/* LEFT */}

                                                        <div className="flex flex-col">

                                                            <span className="font-medium">
                                                                {p.payerName || "Customer"}
                                                            </span>

                                                            <span className="text-xs text-gray-500 capitalize">

                                                                {p.paymentType === "advance" && "Advance"}
                                                                {p.paymentType === "balance" && "Due Payment"}
                                                                {p.paymentType === "full" && "Full Payment"}

                                                                {" • "} {p.mode}

                                                                {date && ` • ${date}`}
                                                                {time && ` ${time}`}

                                                            </span>

                                                        </div>

                                                        {/* AMOUNT */}

                                                        <span className="font-semibold text-green-700 mt-1 md:mt-0">
                                                            ₹ {p.amount}
                                                        </span>

                                                    </div>

                                                );

                                            })}

                                        </div>

                                    </div>

                                );

                            })()}
                            {/* ================= REFUND STATUS ================= */}

                            {isView && selected?.bookingStatus === "cancelled" && (

                                <div className="col-span-2 border rounded-lg p-3 bg-red-50 text-sm space-y-1">

                                    <p className="font-semibold text-red-700">
                                        Booking Cancelled
                                    </p>

                                    <p className="text-xs text-gray-600">
                                        Cancelled by: {selected.cancellationSource || "system"}
                                    </p>

                                    {selected.cancelledAt && (

                                        <p className="text-xs text-gray-600">
                                            On {new Date(selected.cancelledAt).toLocaleDateString("en-IN")} •
                                            {new Date(selected.cancelledAt).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </p>

                                    )}

                                    {selected.refundStatus === "pending" && (

                                        <p className="text-orange-600 mt-1 font-medium">
                                            Refund Pending Approval ₹{selected.refundAmount}
                                        </p>

                                    )}

                                    {selected.refundStatus === "approved" && (

                                        <p className="text-green-600 mt-1 font-medium">
                                            Refund Approved ₹{selected.refundAmount}
                                        </p>

                                    )}

                                </div>

                            )}

                        </div>
                    </div>

                    {/* FOOTER BUTTON */}

                    {!isView && (

                        <Button
                            className="mt-2 w-full bg-green-700"
                            onClick={saveRental}
                        >

                            {drawer === "add" ? "Create Booking" : "Update Booking"}

                        </Button>

                    )}

                </SheetContent>

            </Sheet>

            {/* ================= REFUND APPROVAL ================= */}

            {refundBooking && (

                isMobile ? (

                    <Sheet open onOpenChange={() => setRefundBooking(null)}>

                        <SheetContent
                            side="bottom"
                            className="h-[70vh] rounded-t-2xl overflow-y-auto"
                        >

                            <div className="p-4 space-y-4">

                                <h2 className="text-lg font-semibold text-green-800">
                                    Approve Refund
                                </h2>

                                <div className="text-sm space-y-2">

                                    <p>
                                        <span className="font-medium">Customer:</span>{" "}
                                        {refundBooking.userName}
                                    </p>

                                    <p>
                                        <span className="font-medium">Facility:</span>{" "}
                                        {refundBooking.facilityName}
                                    </p>

                                    <p>
                                        <span className="font-medium">Date:</span>{" "}
                                        {refundBooking.rentalDate}
                                    </p>

                                    <p>
                                        <span className="font-medium">Time:</span>{" "}
                                        {formatTime12h(refundBooking.startTime)} -{" "}
                                        {formatTime12h(refundBooking.endTime)}
                                    </p>

                                </div>

                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">

                                    Refund Amount

                                    <span className="font-semibold text-orange-600 ml-2">
                                        ₹ {refundBooking.refundAmount}
                                    </span>

                                </div>

                                <p className="text-xs text-gray-500">
                                    This action will approve the refund for the customer.
                                </p>

                                <div className="flex gap-3 pt-2">

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setRefundBooking(null)}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        className="w-full bg-green-700 hover:bg-green-800"
                                        onClick={approveRefund}
                                    >
                                        Approve Refund
                                    </Button>

                                </div>

                            </div>

                        </SheetContent>

                    </Sheet>

                ) : (

                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                        <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">

                            <h2 className="text-lg font-semibold text-green-800">
                                Approve Refund
                            </h2>

                            <div className="text-sm space-y-2">

                                <p>
                                    <span className="font-medium">Customer:</span>{" "}
                                    {refundBooking.userName}
                                </p>

                                <p>
                                    <span className="font-medium">Facility:</span>{" "}
                                    {refundBooking.facilityName}
                                </p>

                                <p>
                                    <span className="font-medium">Date:</span>{" "}
                                    {refundBooking.rentalDate}
                                </p>

                                <p>
                                    <span className="font-medium">Time:</span>{" "}
                                    {formatTime12h(refundBooking.startTime)} -{" "}
                                    {formatTime12h(refundBooking.endTime)}
                                </p>

                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">

                                Refund Amount

                                <span className="font-semibold text-orange-600 ml-2">
                                    ₹ {refundBooking.refundAmount}
                                </span>

                            </div>

                            <p className="text-xs text-gray-500">
                                This action will approve the refund for the customer.
                            </p>

                            <div className="flex justify-end gap-3">

                                <Button
                                    variant="outline"
                                    onClick={() => setRefundBooking(null)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    className="bg-green-700 hover:bg-green-800"
                                    onClick={approveRefund}
                                >
                                    Yes, Approve Refund
                                </Button>

                            </div>

                        </div>

                    </div>

                )

            )}
        </div >
    );
}