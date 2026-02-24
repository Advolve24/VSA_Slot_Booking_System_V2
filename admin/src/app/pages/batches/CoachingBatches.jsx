import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { RotateCcw, Users, MoreHorizontal, CalendarIcon, SlidersHorizontal } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/* -------------------------------- */
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
/* -------------------------------- */

export default function CoachingBatches() {
  const [loading, setLoading] = useState(false);
  const ITEMS_PER_PAGE = 5;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [batches, setBatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [filters, setFilters] = useState({ sport: "", level: "", coach: "", status: "" });
  const [facilitySlots, setFacilitySlots] = useState([]);
  const [slotAction, setSlotAction] = useState(null); // "activate" | "deactivate"
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);


  // Reset page on filters/data change
  useEffect(() => setPage(1), [batches, filters]);

  // Date picker component
  function DatePicker({
    value,
    onChange,
    disabled,
    drawerKey,
    placeholder = "Pick a date",
    minDate,
  }) {
    const [calendarKey, setCalendarKey] = useState(0);

    useEffect(() => {
      setCalendarKey((k) => k + 1);
    }, [drawerKey]);

    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedMinDate = minDate
      ? new Date(new Date(minDate).setHours(0, 0, 0, 0))
      : null;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start text-left font-normal h-10"
          >
            <CalendarIcon className=" h-4 w-4" />
            {value ? format(new Date(value), "dd MMM yyyy") : placeholder}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 z-[9999]" align="start">
          <Calendar
            key={calendarKey}
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => {
              if (!date) return;

              const d = new Date(date.setHours(0, 0, 0, 0));

              if (normalizedMinDate && d < normalizedMinDate) return;

              onChange(format(d, "yyyy-MM-dd"));
            }}
            disabled={(date) => {
              const d = new Date(date.setHours(0, 0, 0, 0));

              // ⛔ block past dates INCLUDING time issue
              if (d < today) return true;

              // ⛔ block before minDate (used for end date)
              if (normalizedMinDate && d < normalizedMinDate) return true;

              return false;
            }}
            initialFocus
            classNames={{
              day_disabled: "opacity-40 cursor-not-allowed",
              day_selected:
                "bg-green-600 text-white hover:bg-green-600 hover:text-white",
              day_today:
                "border border-green-600 text-green-700 font-semibold",
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const fetchFacilitySlots = async (facilityId) => {
    if (!facilityId) return;
    try {
      const res = await api.get(`/facility-slots?facilityId=${facilityId}`);
      setFacilitySlots(res.data || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load slots",
        description: err.response?.data?.message || "Server error",
      });
    }
  };


  // Fetch batches and sports
  const fetchAll = async () => {
    try {
      const [bRes, sRes, fRes] = await Promise.all([
        api.get("/batches"),
        api.get("/sports"),
        api.get("/facilities"), // ✅ THIS WAS MISSING
      ]);

      setBatches(bRes.data || []);
      setSports(sRes.data || []);
      setFacilities(fRes.data || []); // ✅ IMPORTANT
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

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      return (
        (!filters.sport || b.sportName === filters.sport) &&
        (!filters.level || b.level === filters.level) &&
        (!filters.coach || b.coachName.includes(filters.coach)) &&
        (!filters.status || b.status === filters.status)
      );
    });
  }, [batches, filters]);

  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);
  const paginatedBatches = filteredBatches.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Sport stats
  const sportStats = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      const key = b.sportName || "-";
      if (!map[key]) map[key] = { batches: 0, enrolled: 0 };
      map[key].batches += 1;
      map[key].enrolled += b.enrolledCount || 0;
    });
    return map;
  }, [batches]);

  // Drawer actions
  const openAdd = () => {
    setForm({});
    setSlotAction("activate"); // slot required on create
    setSelected(null);
    setDrawer("add");
  };

  const openEdit = (b) => {
    setSelected(b);
    setForm(b);
    setSlotAction(null); // admin decides
    fetchFacilitySlots(b.facilityId);
    setDrawer("edit");
  };

  const openView = (b) => {
    setSelected(b);
    setForm(b);
    setSlotAction(null);
    fetchFacilitySlots(b.facilityId);
    setDrawer("view");
  };

  const saveBatch = async () => {
    if (loading) return; // 🚫 prevent double click

    setLoading(true);

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        monthlyFee: Number(form.monthlyFee),
        hasQuarterly: !!form.hasQuarterly,
        quarterlyMultiplier: form.hasQuarterly
          ? Number(form.quarterlyMultiplier || 3)
          : 3,
      };

      if (drawer === "edit") {
        if (slotAction === "deactivate") {
          payload.slotAction = "deactivate";
          delete payload.slotId;
        }

        if (slotAction === "activate") {
          payload.slotAction = "activate";
          if (!payload.slotId) {
            setLoading(false);
            return toast({
              variant: "destructive",
              title: "Slot required",
            });
          }
        }

        await api.put(`/batches/${selected._id}`, payload);

      } else {
        if (!payload.slotId) {
          setLoading(false);
          return toast({
            variant: "destructive",
            title: "Slot required",
          });
        }

        await api.post("/batches", payload);
      }

      toast({
        title: drawer === "add"
          ? "Batch added successfully"
          : "Batch updated successfully",
      });

      setDrawer(null);
      setForm({});
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
      toast({ title: "Batch deleted", description: "Batch removed successfully" });
      fetchAll();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.response?.data?.message || "Server error"
      });
    }
  };

  const getStatusBadge = (b) => {
    if (b.status === "expired") return { label: "Expired", color: "bg-red-100 text-red-700" };
    if (b.status === "upcoming") return { label: "Upcoming", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Active", color: "bg-green-100 text-green-700" };
  };

  const selectTriggerClass =
    "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";
  const selectItemClass =
    "cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white";

  const handleRefresh = async () => {
    setFilters({ sport: "", level: "", coach: "", status: "" });
    setPage(1);
    await fetchAll();
  };
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-4">

        {/* LEFT SIDE */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-green-800">
            Coaching Batches
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage coaching batches, schedules, and coach assignments.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-row gap-2 w-[50%] md:w-auto">
          <Button
            className="bg-orange-500 flex-1 md:flex-none"
            onClick={openAdd}
          >
            <span className="md:hidden">+ Add</span>
            <span className="hidden md:inline">+ Add New Batch</span>
          </Button>
        </div>
      </div>
      {/* SPORT CARDS */}
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

      {/* FILTERS */}
      <div className="bg-white border rounded-xl p-4">
        {/* ================= DESKTOP FILTERS ================= */}
        <div className="hidden md:grid grid-cols-4 gap-3 mb-3">
          {/* SPORT */}
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
                <SelectItem
                  key={s._id}
                  value={s.name}
                  className={selectItemClass}
                >
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* LEVEL */}
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

          {/* STATUS */}
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
              <SelectItem value="upcoming" className={selectItemClass}>
                Upcoming
              </SelectItem>
              <SelectItem value="expired" className={selectItemClass}>
                Expired
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* ================= MOBILE ICON ROW ================= */}
        <div className="md:hidden flex justify-between gap-3 mb-3">
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
          <button
            onClick={handleRefresh}
            className="h-8 w-8 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
          >
            <RotateCcw className="w-5 h-5 text-gray-700" />
          </button>
        </div>


        {/* TABLE */}
        <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Batch Name</th>
                <th>Sport</th>
                <th>Level</th>
                <th>Coach</th>
                <th>Schedule</th>
                <th>Start Date</th>
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
                    <td>{b.sportName || "-"}</td>
                    <td><Badge variant="outline">{b.level}</Badge></td>
                    <td>{b.coachName}</td>
                    <td>{b.schedule} {b.time ? (
                      <div className="text-xs text-green-700 font-medium">
                        {b.time}
                      </div>
                    ) : (
                      <div className="inline-block mt-1 px-2 py-[2px] text-[0.65rem] rounded-full bg-gray-100 text-gray-600">
                        No slot assigned
                      </div>
                    )}</td>

                    <td> {b.startDate ? format(new Date(b.startDate), "dd-MM-yyyy") : "-"}</td>
                    <td><span className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}>{status.label}</span></td>
                    <td className="text-right pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-[9999] bg-white border shadow-lg cursor-pointer">
                          <DropdownMenuItem onClick={() => openView(b)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(b)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteBatch(b._id)}>Delete</DropdownMenuItem>
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
        <div className="md:hidden space-y-4 mt-4">
          {paginatedBatches.map((b) => {
            const status = getStatusBadge(b);

            return (
              <div
                key={b._id}
                className="bg-white border rounded-xl p-4 shadow-sm"
              >
                {/* TOP */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {b.sportName} • {b.level}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[0.65rem] ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* MIDDLE */}
                <div className="mt-3 text-sm text-muted-foreground">
                  <div>Coach: {b.coachName}</div>
                  <div>
                    Start:{" "}
                    {b.startDate
                      ? new Date(b.startDate).toLocaleDateString()
                      : "-"}
                  </div>
                </div>

                {/* ACTION */}
                <div className="mt-3 flex justify-end">
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
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredBatches.length)} of {filteredBatches.length}
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

      {/* BATCH DRAWER */}
      <Sheet open={!!drawer} onOpenChange={() => setDrawer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[85vh] rounded-t-2xl flex flex-col"
              : "w-[30vw] h-screen flex flex-col"
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

              {/* Batch Name + Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Batch Name</Label>
                  <Input
                    placeholder="e.g. Cricket Beginners Morning"
                    disabled={drawer === "view"}
                    value={form.name || ""}
                    className="text-sm"
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Level</Label>
                  <Select
                    disabled={drawer === "view"}
                    value={form.level || ""}
                    onValueChange={(v) =>
                      setForm({ ...form, level: v })
                    }
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

              {/* Sport + Facility */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Sport</Label>
                  <Select
                    disabled={drawer === "view"}
                    value={form.sportName || ""}
                    onValueChange={(v) => {
                      setForm({
                        ...form,
                        sportName: v,
                        facilityId: "",
                        slotId: "",
                        time: "",
                      });
                      setFacilitySlots([]);
                    }}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {sports.map((s) => (
                        <SelectItem className={selectItemClass} key={s._id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Facility</Label>
                  <Select
                    disabled={drawer === "view" || !form.sportName}
                    value={form.facilityId || ""}
                    onValueChange={(id) => {
                      setForm({
                        ...form,
                        facilityId: id,
                        slotId: "",
                        time: "",
                      });
                      setFacilitySlots([]);
                      fetchFacilitySlots(id);
                    }}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue
                        placeholder={
                          form.sportName
                            ? "Select facility"
                            : "Select sport first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {facilities
                        .filter((f) =>
                          f.sports?.some((s) => s.name === form.sportName)
                        )
                        .map((f) => (
                          <SelectItem className={selectItemClass} key={f._id} value={f._id}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Slot (single row – full width) */}
              {form.facilityId && drawer !== "view" && (
                <div className="space-y-1">
                  <Label>Slot</Label>
                  <Select
                    value={form.slotId || ""}
                    onValueChange={(v) => {
                      setForm({ ...form, slotId: v });
                      setSlotAction("activate");
                    }}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select available slot" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      {facilitySlots
                        .filter((s) => s.isActive || s._id === form.slotId)
                        .map((s) => (
                          <SelectItem
                            key={s._id}
                            value={s._id}
                            className={selectItemClass}
                          >
                            {s.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Coach + Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Coach Name</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    disabled={drawer === "view"}
                    value={form.coachName || ""}
                    className="text-sm"
                    onChange={(e) =>
                      setForm({ ...form, coachName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Schedule</Label>
                  <Input
                    placeholder="Mon – Sat"
                    disabled={drawer === "view"}
                    value={form.schedule || ""}
                    className="text-sm"
                    onChange={(e) =>
                      setForm({ ...form, schedule: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <DatePicker
                    disabled={drawer === "view"}
                    placeholder="Start date"
                    value={form.startDate}
                    minDate={new Date()} // ✅ today & future only
                    onChange={(date) =>
                      setForm({ ...form, startDate: date, endDate: "" })
                    }
                    drawerKey={drawer}
                  />

                </div>

                <div className="space-y-1">
                  <Label>End Date</Label>
                  <DatePicker
                    disabled={drawer === "view" || !form.startDate}
                    placeholder={
                      form.startDate ? "End date" : "Select start date first"
                    }
                    value={form.endDate}
                    minDate={
                      form.startDate
                        ? new Date(
                          new Date(form.startDate).setDate(
                            new Date(form.startDate).getDate() + 1
                          )
                        )
                        : new Date()
                    }
                    onChange={(date) =>
                      setForm({ ...form, endDate: date })
                    }
                    drawerKey={drawer}
                  />

                </div>
              </div>

              {/* Capacity + Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Capacity</Label>
                  <Input
                    placeholder="e.g. 20"
                    disabled={drawer === "view"}
                    type="number"
                    value={form.capacity || ""}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Monthly Fee (₹)</Label>
                  <Input
                    placeholder="e.g. 2500"
                    disabled={drawer === "view"}
                    type="number"
                    value={form.monthlyFee || ""}
                    onChange={(e) =>
                      setForm({ ...form, monthlyFee: e.target.value })
                    }
                  />
                </div>
              </div>
              {/* Quarterly Plan Settings */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Quarterly Plan</Label>
                  <input
                    type="checkbox"
                    disabled={drawer === "view"}
                    checked={form.hasQuarterly || false}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasQuarterly: e.target.checked,
                        quarterlyMultiplier: e.target.checked
                          ? form.quarterlyMultiplier || 3
                          : 3,
                      })
                    }
                    className="w-4 h-4 accent-green-600"
                  />
                </div>
                {form.hasQuarterly && (
                  <div className="space-y-1">
                    <Label>Quarterly Multiplier</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      disabled={drawer === "view"}
                      value={form.quarterlyMultiplier || 3}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quarterlyMultiplier: Number(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Quarterly price = Monthly × Multiplier
                    </p>
                  </div>
                )}
              </div>
              {/* ================= FOOTER (FIXED) ================= */}
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
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent
          side="bottom"
          className="h-[50vh] rounded-t-2xl p-4"
        >
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
