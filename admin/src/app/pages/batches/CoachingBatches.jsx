import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { MoreHorizontal, RotateCcw, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/* -------------------------------- */
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const formatTime12h = (time) => {
  if (!time) return "-";
  const [h, m] = String(time).split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

const formatDays = (days = []) => {
  if (!Array.isArray(days) || !days.length) return "-";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS.find((x) => x.value === d)?.label || d)
    .join(", ");
};

export default function CoachingBatches() {
  const ITEMS_PER_PAGE = 5;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [unavailableSlots, setUnavailableSlots] = useState([]);

  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    coach: "",
    status: "",
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const [isMobile, setIsMobile] = useState(false);

  const emptyForm = {
    name: "",
    sportName: "",
    facilityId: "",
    level: "",
    coachName: "",
    daysOfWeek: [],
    startTime: "",
    endTime: "",
    registrationFee: "",
    monthlyFee: "",
    quarterlyFee: "",
    capacity: "",
    hasQuarterly: false,
    isActive: true,
  };

  const [form, setForm] = useState(emptyForm);

  const isView = drawer === "view";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchAll = async () => {
    try {
      const [bRes, sRes, fRes] = await Promise.all([
        api.get("/batches"),
        api.get("/sports"),
        api.get("/facilities"),
      ]);

      setBatches(bRes.data || []);
      setSports(sRes.data || []);
      setFacilities(fRes.data || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: err.response?.data?.message || "Server error",
      });
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters, batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const sportName =
        b.sportName || b.sportId?.name || "";
      const facilityName =
        b.facilityName || b.facilityId?.name || "";
      const coachName = b.coachName || "";
      const status = b.isActive ? "active" : "inactive";

      return (
        (!filters.sport || sportName === filters.sport) &&
        (!filters.level || b.level === filters.level) &&
        (!filters.coach ||
          coachName.toLowerCase().includes(filters.coach.toLowerCase())) &&
        (!filters.status || status === filters.status) &&
        facilityName !== undefined
      );
    });
  }, [batches, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBatches.length / ITEMS_PER_PAGE)
  );

  const paginatedBatches = filteredBatches.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const sportStats = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      const key = b.sportName || b.sportId?.name || "-";
      if (!map[key]) map[key] = { batches: 0, enrolled: 0 };
      map[key].batches += 1;
      map[key].enrolled += Math.max(0, b.enrolledCount || 0);
    });
    return map;
  }, [batches]);

  const selectTriggerClass =
    "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";

  const selectItemClass =
    "cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white";

  const getStatusBadge = (batch) => {
    return batch.isActive
      ? { label: "Active", color: "bg-green-100 text-green-700" }
      : { label: "Inactive", color: "bg-gray-100 text-gray-700" };
  };

  const toggleDay = (dayValue) => {
    const exists = form.daysOfWeek.includes(dayValue);
    if (exists) {
      setForm({
        ...form,
        daysOfWeek: form.daysOfWeek.filter((d) => d !== dayValue),
      });
    } else {
      setForm({
        ...form,
        daysOfWeek: [...form.daysOfWeek, dayValue],
      });
    }
  };

  const getNextDateForDay = (dayIndex) => {
    const today = new Date();
    const result = new Date(today);

    const diff = (dayIndex + 7 - today.getDay()) % 7;
    result.setDate(today.getDate() + diff);

    return result.toISOString().slice(0, 10);
  };

  const openAdd = () => {
    setSelected(null);
    setForm(emptyForm);
    setDrawer("add");
  };

  const openEdit = (batch) => {
    setSelected(batch);

    setForm({
      name: batch.name || "",
      sportName: batch.sportName || batch.sportId?.name || "",
      facilityId: batch.facilityId?._id || batch.facilityId || "",
      level: batch.level || "",
      coachName: batch.coachName || "",
      daysOfWeek: batch.daysOfWeek || "",
      startTime: batch.startTime || "",
      endTime: batch.endTime || "",
      monthlyFee: batch.monthlyFee || "",
      registrationFee: batch.registrationFee || "",
      quarterlyFee: batch.quarterlyFee || "",
      capacity: batch.capacity || "",
      hasQuarterly: !!batch.hasQuarterly,
      isActive: batch.isActive !== false,
    });

    setDrawer("edit");
  };

  const openView = (batch) => {
    setSelected(batch);
    setForm({
      name: batch.name || "",
      sportName: batch.sportName || batch.sportId?.name || "",
      facilityId: batch.facilityId?._id || batch.facilityId || "",
      level: batch.level || "",
      coachName: batch.coachName || "",
      daysOfWeek: batch.daysOfWeek || [],
      startTime: batch.startTime || "",
      endTime: batch.endTime || "",
      monthlyFee: batch.monthlyFee || "",
      registrationFee: batch.registrationFee || "",
      quarterlyFee: batch.quarterlyFee || "",
      capacity: batch.capacity || "",
      hasQuarterly: !!batch.hasQuarterly,
      quarterlyMultiplier: batch.quarterlyMultiplier || 3,
      isActive: batch.isActive !== false,
    });
    setDrawer("view");
  };

  const saveBatch = async () => {
    if (loading) return;

    if (
      !form.name ||
      !form.sportName ||
      !form.facilityId ||
      !form.level ||
      !form.coachName ||
      !form.startTime ||
      !form.endTime ||
      !form.daysOfWeek?.length ||
      !form.monthlyFee ||
      !form.capacity
    ) {
      return toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill all required fields",
      });
    }

    if (form.endTime <= form.startTime) {
      return toast({
        variant: "destructive",
        title: "Invalid time range",
        description: "End time must be after start time",
      });
    }

    setLoading(true);

    try {
      const payload = {

        name: form.name,
        sportName: form.sportName,
        facilityId: form.facilityId,
        level: form.level,
        coachName: form.coachName,

        daysOfWeek: form.daysOfWeek.map(Number),

        startTime: form.startTime,
        endTime: form.endTime,

        monthlyFee: Number(form.monthlyFee),
        registrationFee: Number(form.registrationFee || 0),
        hasQuarterly: !!form.hasQuarterly,
        quarterlyFee: form.hasQuarterly
          ? Number(form.quarterlyFee || 0)
          : 0,

        capacity: Number(form.capacity),

        isActive: !!form.isActive

      };
      if (drawer === "add") {
        await api.post("/batches", payload);
        toast({ title: "Batch added successfully" });
      } else {
        await api.patch(`/batches/${selected._id}`, payload);
        toast({ title: "Batch updated successfully" });
      }

      setDrawer(null);
      setSelected(null);
      setForm(emptyForm);
      fetchAll();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err.response?.data?.message || "Server error",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (id) => {
    if (!confirm("Delete this batch?")) return;

    try {
      await api.delete(`/batches/${id}`);
      toast({
        title: "Batch deleted",
        description: "Batch removed successfully",
      });
      fetchAll();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.response?.data?.message || "Server error",
      });
    }
  };

  useEffect(() => {

    const fetchUnavailable = async () => {

      if (!form.facilityId || !form.daysOfWeek.length) {
        setUnavailableSlots([]);
        return;
      }

      try {

        const allSlots = [];

        for (const day of form.daysOfWeek) {

          const date = getNextDateForDay(day);

          const res = await api.get(
            `/facilities/${form.facilityId}/unavailable-times?date=${date}`
          );

          (res.data || []).forEach(slot => {
            allSlots.push({
              ...slot,
              day
            });
          });

        }

        setUnavailableSlots(allSlots);

      } catch (err) {

        console.error("Failed to load unavailable times");

      }

    };

    fetchUnavailable();

  }, [form.facilityId, form.daysOfWeek]);

  const handleRefresh = async () => {
    setFilters({
      sport: "",
      level: "",
      coach: "",
      status: "",
    });
    setPage(1);
    await fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-green-800">
            Coaching Batches
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage coaching batches, schedules, and coach assignments.
          </p>
        </div>

        <div className="flex flex-row gap-2 w-[50%] md:w-auto">
          <Button className="bg-orange-500 flex-1 md:flex-none" onClick={openAdd}>
            <span className="md:hidden">+ Add</span>
            <span className="hidden md:inline">+ Add New Batch</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(sportStats).map(([sport, s], idx) => (
          <div key={sport + idx} className="bg-white border rounded-xl p-4">
            <div className="text-xl font-bold text-green-700">{s.batches}</div>
            <div className="font-medium">{sport}</div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Users className="w-4 h-4" /> {s.enrolled} enrolled
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="hidden md:grid grid-cols-4 gap-3 mb-3">
          <Select
            value={filters.sport || "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                sport: v === "all" ? "" : v,
              }))
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Sports
              </SelectItem>
              {sports.map((s) => (
                <SelectItem key={s._id} value={s.name} className={selectItemClass}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.level || "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                level: v === "all" ? "" : v,
              }))
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Levels
              </SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l} className={selectItemClass}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search coach"
            value={filters.coach}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                coach: e.target.value,
              }))
            }
          />

          <Select
            value={filters.status || "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                status: v === "all" ? "" : v,
              }))
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg">
              <SelectItem value="all" className={selectItemClass}>
                All Status
              </SelectItem>
              <SelectItem value="active" className={selectItemClass}>
                Active
              </SelectItem>
              <SelectItem value="inactive" className={selectItemClass}>
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden flex justify-between gap-3 mb-3">
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

        <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b">
              <tr className="text-left">
                <th className="p-3">Batch Name</th>
                <th>Sport</th>
                <th>Facility</th>
                <th>Coach</th>
                <th>Days</th>
                <th>Time</th>
                <th>Fee</th>
                <th>Status</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedBatches.map((b) => {
                const status = getStatusBadge(b);

                return (
                  <tr key={b._id} className="border-t">

                    <td className="p-3 font-medium">{b.name}</td>

                    <td>{b.sportName || b.sportId?.name || "-"}</td>

                    <td>{b.facilityId?.name || "-"}</td>

                    <td>{b.coachName}</td>

                    <td>{formatDays(b.daysOfWeek)}</td>

                    <td>
                      {formatTime12h(b.startTime)} - {formatTime12h(b.endTime)}
                    </td>

                    <td className="py-3">

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-[2px] text-[11px] rounded bg-gray-100 text-gray-700">
                            Monthly
                          </span>

                          <span className="font-semibold text-sm">
                            ₹{b.monthlyFee}
                          </span>
                        </div>


                        {b.registrationFee > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-[2px] text-[11px] rounded bg-orange-100 text-orange-700">
                              Reg
                            </span>

                            <span className="text-sm">
                              ₹{b.registrationFee}
                            </span>
                          </div>
                        )}

                        {b.hasQuarterly && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-[2px] text-[11px] rounded bg-green-100 text-green-700">
                              Quarterly
                            </span>

                            <span className="text-sm">
                              ₹{b.quarterlyFee}
                            </span>
                          </div>
                        )}

                      </div>
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td className="text-right pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="z-[9999] bg-white border shadow-lg cursor-pointer">

                          <DropdownMenuItem onClick={() => openView(b)}>
                            View
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openEdit(b)}>
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteBatch(b._id)}
                          >
                            Delete
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                  </tr>
                );
              })}

              {!paginatedBatches.length && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    No batches found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4 mt-4">
          {paginatedBatches.map((b) => {
            const status = getStatusBadge(b);

            return (
              <div
                key={b._id}
                className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
              >

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{b.name}</h3>

                    <p className="text-sm text-muted-foreground">
                      {b.sportName || b.sportId?.name} • {b.level}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* DETAILS */}
                <div className="text-sm text-muted-foreground space-y-1">

                  <div>
                    <span className="text-gray-500">Coach:</span> {b.coachName}
                  </div>

                  <div>
                    <span className="text-gray-500">Facility:</span>{" "}
                    {b.facilityId?.name || "-"}
                  </div>

                  <div>
                    <span className="text-gray-500">Days:</span>{" "}
                    {formatDays(b.daysOfWeek)}
                  </div>

                  <div>
                    <span className="text-gray-500">Time:</span>{" "}
                    {formatTime12h(b.startTime)} - {formatTime12h(b.endTime)}
                  </div>

                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">

                  <span className="px-2 py-1 text-xs rounded bg-gray-100">
                    Monthly ₹{b.monthlyFee}
                  </span>

                  {b.registrationFee > 0 && (
                    <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">
                      Reg ₹{b.registrationFee}
                    </span>
                  )}

                  {b.hasQuarterly && (
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                      Quarterly ₹{b.quarterlyFee}
                    </span>
                  )}

                </div>
                <div className="flex justify-end pt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">
                      <DropdownMenuItem onClick={() => openView(b)}>
                        View
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => openEdit(b)}>
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteBatch(b._id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

              </div>
            );
          })}


          {!paginatedBatches.length && (
            <div className="text-center text-gray-500 py-8">No batches found</div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(page * ITEMS_PER_PAGE, filteredBatches.length)} of{" "}
            {filteredBatches.length}
          </p>

          <div className="flex gap-2">
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
      </div>

      <Sheet open={!!drawer} onOpenChange={() => setDrawer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[90vh] rounded-t-2xl flex flex-col"
              : "w-[32vw] h-screen flex flex-col"
          }
        >
          <SheetHeader className="px-4 pt-4 shrink-0">
            <SheetTitle>
              {drawer === "add"
                ? "Add Coaching Batch"
                : drawer === "edit"
                  ? "Edit Coaching Batch"
                  : "View Coaching Batch"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2 py-4">
            <div className="space-y-5 mt-4 pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Batch Name</Label>
                  <Input
                    placeholder="e.g. Cricket Beginners Morning"
                    disabled={isView}
                    value={form.name || ""}
                    className="text-sm"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Level</Label>
                  <Select
                    disabled={isView}
                    value={form.level || ""}
                    onValueChange={(v) => setForm({ ...form, level: v })}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l} className={selectItemClass}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Sport</Label>
                  <Select
                    disabled={isView}
                    value={form.sportName || ""}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        sportName: v,
                        facilityId: "",
                      })
                    }
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {sports.map((s) => (
                        <SelectItem key={s._id} value={s.name} className={selectItemClass}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Facility</Label>
                  <Select
                    disabled={isView || !form.sportName}
                    value={form.facilityId || ""}
                    onValueChange={(id) => setForm({ ...form, facilityId: id })}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue
                        placeholder={
                          form.sportName ? "Select facility" : "Select sport first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {facilities
                        .filter((f) =>
                          f.sports?.some((s) => s.name === form.sportName)
                        )
                        .map((f) => (
                          <SelectItem key={f._id} value={f._id} className={selectItemClass}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Coach Name</Label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  disabled={isView}
                  value={form.coachName || ""}
                  className="text-sm"
                  onChange={(e) => setForm({ ...form, coachName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map((day) => {
                    const checked = form.daysOfWeek?.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        disabled={isView}
                        onClick={() => toggleDay(day.value)}
                        className={`h-10 rounded-md border text-sm transition ${checked
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300"
                          } ${isView ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    disabled={isView}
                    value={form.startTime || ""}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    disabled={isView}
                    value={form.endTime || ""}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
                </div>
                {unavailableSlots.length > 0 && (
                  <div className="border rounded-lg p-3 bg-red-50 mt-2">
                    <p className="text-sm font-semibold text-red-700 mb-2">
                      Unavailable Timings
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {unavailableSlots.map((slot, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 text-xs rounded
          ${slot.type === "batch"
                              ? "bg-purple-100 text-purple-700"
                              : slot.type === "booking"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {DAYS.find(d => d.value === slot.day)?.label} •{" "}
                          {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)} ({slot.type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Capacity</Label>
                  <Input
                    placeholder="e.g. 20"
                    disabled={isView}
                    type="number"
                    value={form.capacity || ""}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Registration Fee </Label>

                  <Input
                    placeholder="e.g. 500"
                    disabled={isView}
                    type="number"
                    value={form.registrationFee || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationFee: e.target.value
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Monthly Fee </Label>
                  <Input
                    placeholder="e.g. 2500"
                    disabled={isView}
                    type="number"
                    value={form.monthlyFee || ""}
                    onChange={(e) =>
                      setForm({ ...form, monthlyFee: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">

                <div className="flex items-center justify-between">

                  <Label>Enable Quarterly Plan</Label>

                  <input
                    type="checkbox"
                    disabled={isView}
                    checked={form.hasQuarterly || false}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasQuarterly: e.target.checked,
                        quarterlyFee: ""
                      })
                    }
                    className="w-4 h-4 accent-green-600"
                  />

                </div>

                {form.hasQuarterly && (

                  <div className="space-y-1">

                    <Label>Quarterly Fee (₹)</Label>

                    <Input
                      type="number"
                      placeholder="e.g. 6500"
                      disabled={isView}
                      value={form.quarterlyFee || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quarterlyFee: e.target.value
                        })
                      }
                    />

                  </div>

                )}

              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Batch Active</Label>
                  <input
                    type="checkbox"
                    disabled={isView}
                    checked={form.isActive || false}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-green-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {drawer !== "view" && (
            <div className="shrink-0 border-t bg-white px-4 py-4">
              <div className="flex gap-3">
                <Button
                  disabled={loading}
                  className="bg-green-700 w-full md:w-[50%]"
                  onClick={saveBatch}
                >
                  {loading
                    ? "Saving..."
                    : drawer === "add"
                      ? "Add Batch"
                      : "Save Changes"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full md:w-[50%]"
                  onClick={() => setDrawer(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[50vh] rounded-t-2xl p-4">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>

          <div className="space-y-4">
            <Select
              value={tempFilters.sport || "all"}
              onValueChange={(v) =>
                setTempFilters((p) => ({
                  ...p,
                  sport: v === "all" ? "" : v,
                }))
              }
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {sports.map((s) => (
                  <SelectItem key={s._id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={tempFilters.level || "all"}
              onValueChange={(v) =>
                setTempFilters((p) => ({
                  ...p,
                  level: v === "all" ? "" : v,
                }))
              }
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search coach"
              value={tempFilters.coach}
              onChange={(e) =>
                setTempFilters((p) => ({
                  ...p,
                  coach: e.target.value,
                }))
              }
            />

            <Select
              value={tempFilters.status || "all"}
              onValueChange={(v) =>
                setTempFilters((p) => ({
                  ...p,
                  status: v === "all" ? "" : v,
                }))
              }
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                setTempFilters({
                  sport: "",
                  level: "",
                  coach: "",
                  status: "",
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