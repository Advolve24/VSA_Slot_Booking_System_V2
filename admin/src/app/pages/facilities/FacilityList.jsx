import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { MoreHorizontal, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

const formatTime12h = (time) => {

  if (!time) return "";

  // if already formatted (contains AM/PM)
  if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
    return time;
  }

  const [hours, minutes] = time.split(":");
  let h = parseInt(hours);

  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12;
  h = h ? h : 12;

  return `${h.toString().padStart(2, "0")}:${minutes} ${ampm}`;

};

export default function FacilityList() {

  const { toast } = useToast();

  const [facilities, setFacilities] = useState([]);
  const [sports, setSports] = useState([]);

  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "",
    pricingMode: "flat",
    hourlyRate: "",
    timeSlots: [],
    status: "active",
    sports: [],
    advanceType: "fixed",
    advanceValue: "",
    minBookingMinutes: 60,
    bookingStepMinutes: 30,
    openingTime: "",
    closingTime: "",
  });

  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();

  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

  useEffect(() => {
    fetchFacilities();
    fetchSports();
  }, []);

  const fetchFacilities = async () => {
    const res = await api.get("/facilities");
    setFacilities(res.data || []);
  };

  const fetchSports = async () => {
    const res = await api.get("/sports");
    setSports(res.data || []);
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "",
      pricingMode: "flat",
      hourlyRate: "",
      timeSlots: [],
      status: "active",
      sports: [],
      advanceType: "fixed",
      advanceValue: "",
      minBookingMinutes: 60,
      bookingStepMinutes: 30,
      openingTime: "",
      closingTime: "",
    });
  };

  const openAdd = () => {
    resetForm();
    setDrawer("add");
  };

  const openEdit = (f) => {

    setSelected(f);

    setForm({
      name: f.name,
      type: f.type,
      pricingMode: f.pricingMode || "flat",
      hourlyRate: f.hourlyRate || "",
      timeSlots: f.timeSlots || [],
      status: f.status,
      sports: f.sports.map((s) => s._id),
      advanceType: f.advanceType,
      advanceValue: f.advanceValue,
      minBookingMinutes: f.minBookingMinutes,
      bookingStepMinutes: f.bookingStepMinutes,
      openingTime: f.openingTime,
      closingTime: f.closingTime,
    });

    setDrawer("edit");
  };

  const toggleSport = (id) => {

    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(id)
        ? prev.sports.filter((s) => s !== id)
        : [...prev.sports, id],
    }));

  };

  const closeDrawer = () => {
    setDrawer(null);
    setSelected(null);
    resetForm();
  };

  /* ================= TIME SLOT ================= */

  const addTimeSlot = () => {

    const updated = [...form.timeSlots, { start: "", end: "", price: "" }];

    const timing = calculateFacilityTiming(updated);

    setForm({
      ...form,
      timeSlots: updated,
      openingTime: timing.openingTime,
      closingTime: timing.closingTime,
    });

  };

  const updateTimeSlot = (index, key, value) => {

    const updated = [...form.timeSlots];
    updated[index][key] = value;

    const timing = calculateFacilityTiming(updated);

    setForm({
      ...form,
      timeSlots: updated,
      openingTime: timing.openingTime,
      closingTime: timing.closingTime,
    });

  };

  const removeTimeSlot = (index) => {

    const updated = form.timeSlots.filter((_, i) => i !== index);

    const timing = calculateFacilityTiming(updated);

    setForm({
      ...form,
      timeSlots: updated,
      openingTime: timing.openingTime,
      closingTime: timing.closingTime,
    });

  };

  const calculateFacilityTiming = (slots) => {

    if (!slots || !slots.length) {
      return { openingTime: "", closingTime: "" };
    }

    if (slots.length === 1) {
      return {
        openingTime: slots[0].start,
        closingTime: slots[0].end,
      };
    }

    const first = slots[0];
    const last = slots[slots.length - 1];
    return {
      openingTime: first.start,
      closingTime: last.end,
    };

  };

  /* ================= SAVE ================= */

  const saveFacility = async () => {

    try {

      const payload = {

        ...form,

        sports: form.sports,

        hourlyRate:
          form.pricingMode === "flat"
            ? Number(form.hourlyRate)
            : undefined,

        advanceValue: Number(form.advanceValue),

        minBookingMinutes: Number(form.minBookingMinutes),

        bookingStepMinutes: Number(form.bookingStepMinutes),

        timeSlots:
          form.pricingMode === "time-based"
            ? form.timeSlots.map((t) => ({
              start: t.start,
              end: t.end,
              price: Number(t.price || 0),
            }))
            : [],

      };

      if (drawer === "add") {

        await api.post("/facilities", payload);
        toast({ title: "Facility Added" });

      } else {

        await api.put(`/facilities/${selected._id}`, payload);
        toast({ title: "Facility Updated" });

      }

      closeDrawer();
      fetchFacilities();

    } catch (err) {

      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed",
        variant: "destructive",
      });

    }

  };

  const deleteFacility = async (id) => {

    if (!confirm("Delete this facility?")) return;

    await api.delete(`/facilities/${id}`);

    toast({ title: "Facility Deleted" });

    fetchFacilities();

  };

   const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;
  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h1 className="text-xl font-semibold">Facilities</h1>

        <Button onClick={openAdd} className="bg-green-700">
          + Add Facility
        </Button>

      </div>

      {/* TABLE */}

      <div className="hidden md:block bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-slate-100 border-b  text-sm font-semibold">

            <tr>
              <th className="px-4 py-3 text-left">Facility</th>
              <th className="px-4 py-3 text-left">Sports</th>
              <th className="px-4 py-3 text-left">Pricing</th>
              <th className="px-4 py-3 text-left">Advance</th>
              <th className="px-4 py-3 text-left">Timings</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>

          </thead>

          <tbody className="text-gray-700">

            {facilities.map((f) => (

              <tr
                key={f._id}
                className="border-t hover:bg-gray-50 transition-colors"
              >

                {/* Facility */}

                <td className="px-4 py-3 font-medium text-gray-900">
                  {f.name}
                </td>

                {/* Sports */}

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {f.sports.map((s) => (
                      <span
                        key={s._id}
                        className="bg-gray-100 px-2 py-1 rounded text-xs"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Pricing */}

                <td className="px-4 py-3">

                  {f.pricingMode === "flat" ? (

                    <span className="font-medium text-gray-900">
                      ₹{f.hourlyRate} / hour
                    </span>

                  ) : (

                    <div className="space-y-1">

                      {f.timeSlots.map((slot, index) => (

                        <div
                          key={index}
                          className="flex items-center gap-4 text-sm"
                        >

                          <span className="font-medium text-gray-900">
                            ₹{slot.price} / hour
                          </span>

                          <span className="text-gray-600">
                            {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                          </span>

                        </div>

                      ))}

                    </div>

                  )}

                </td>

                {/* Advance */}

                <td className="px-4 py-3 font-medium">

                  {f.advanceType === "fixed"
                    ? `₹${f.advanceValue}`
                    : `${f.advanceValue}%`}

                </td>

                {/* Timings */}

                <td className="px-4 py-3 text-gray-600">

                  {formatTime12h(f.openingTime)} - {formatTime12h(f.closingTime)}

                </td>

                {/* Action */}

                <td className="px-4 py-3 text-right">

                  <DropdownMenu>

                    <DropdownMenuTrigger asChild>

                      <button className="p-2 rounded hover:bg-gray-100">

                        <MoreHorizontal className="w-5 h-5 text-gray-600" />

                      </button>

                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="z-[9999] bg-white border shadow-lg" align="end">

                      <DropdownMenuItem onClick={() => openEdit(f)}>
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteFacility(f._id)}
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

        {facilities.map((f) => (

          <div
            key={f._id}
            className="bg-white border rounded-xl p-4 shadow-sm"
          >

            {/* TOP */}
            <div className="flex justify-between items-start gap-3">

              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {f.name}
                </h3>

                <div className="flex flex-wrap gap-1 mt-1">
                  {f.sports.map((s) => (
                    <span
                      key={s._id}
                      className="bg-gray-100 px-2 py-0.5 rounded text-[10px]"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* ACTION */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded hover:bg-gray-100">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="z-[9999] bg-white border shadow-lg" align="end">
                  <DropdownMenuItem onClick={() => openEdit(f)}>
                    Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => deleteFacility(f._id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>

            {/* PRICING */}
            <div className="mt-3 text-sm">

              <p className="text-gray-500 text-xs">Pricing</p>

              {f.pricingMode === "flat" ? (

                <p className="font-medium text-gray-900">
                  ₹{f.hourlyRate} / hour
                </p>

              ) : (

                <div className="space-y-1 mt-1">

                  {f.timeSlots.map((slot, index) => (

                    <div key={index} className="flex justify-between text-xs">

                      <span className="font-medium text-gray-900">
                        ₹{slot.price}/hr
                      </span>

                      <span className="text-gray-600">
                        {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                      </span>

                    </div>

                  ))}

                </div>

              )}

            </div>

            {/* ADVANCE + TIMINGS */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">

              <div>
                <p className="text-gray-500 text-xs">Advance</p>
                <p className="font-medium">
                  {f.advanceType === "fixed"
                    ? `₹${f.advanceValue}`
                    : `${f.advanceValue}%`}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs">Timings</p>
                <p className="font-medium text-xs">
                  {formatTime12h(f.openingTime)} - {formatTime12h(f.closingTime)}
                </p>
              </div>

            </div>

          </div>

        ))}

      </div>
      {/* DRAWER */}

      {/* ================= FACILITY DRAWER ================= */}

      <Sheet open={!!drawer} onOpenChange={closeDrawer}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[85vh] rounded-t-2xl flex flex-col px-3 pt-4 pb-2"
              : "w-[34vw] h-screen flex flex-col"
          }
        >

          {/* HEADER */}
          <SheetHeader className="shrink-0">
            <SheetTitle>
              {drawer === "add" ? "Add Facility" : "Edit Facility"}
            </SheetTitle>
          </SheetHeader>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1">

            <div className="space-y-5">

              {/* NAME + TYPE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Facility Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Facility Type</Label>
                  <Input
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* SPORTS */}
              <div>
                <Label>Supported Sports</Label>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {sports.map((sport) => (
                    <label
                      key={sport._id}
                      className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.sports.includes(sport._id)}
                        onChange={() => toggleSport(sport._id)}
                      />
                      <span className="text-sm">{sport.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PRICING MODE */}
              <div>
                <Label>Pricing Mode</Label>

                <Select
                  value={form.pricingMode}
                  onValueChange={(v) =>
                    setForm({ ...form, pricingMode: v })
                  }
                >
                  <SelectTrigger className="w-full h-10 border">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="z-[9999] bg-white border shadow-lg">
                    <SelectItem className={selectItemClass} value="flat">Flat Hourly</SelectItem>
                    <SelectItem className={selectItemClass} value="time-based">Time Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FLAT */}
              {form.pricingMode === "flat" && (
                <div>
                  <Label>Hourly Rate (₹)</Label>
                  <Input
                    type="number"
                    value={form.hourlyRate}
                    onChange={(e) =>
                      setForm({ ...form, hourlyRate: e.target.value })
                    }
                  />
                </div>
              )}

              {/* TIME BASED */}
              {form.pricingMode === "time-based" && (
                <div className="space-y-3">
                  <Label>Time Slots</Label>

                  {form.timeSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-2 items-center"
                    >

                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          updateTimeSlot(i, "start", e.target.value)
                        }
                      />

                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) =>
                          updateTimeSlot(i, "end", e.target.value)
                        }
                      />

                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="₹"
                          value={slot.price}
                          onChange={(e) =>
                            updateTimeSlot(i, "price", e.target.value)
                          }
                        />

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeTimeSlot(i)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addTimeSlot}>
                    + Add Slot
                  </Button>
                </div>
              )}

              {/* ADVANCE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Advance Type</Label>

                  <Select
                    value={form.advanceType}
                    onValueChange={(v) =>
                      setForm({ ...form, advanceType: v })
                    }
                  >
                    <SelectTrigger className="w-full h-10 border">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent className="z-[9999] bg-white border shadow-lg">
                      <SelectItem className={selectItemClass} value="fixed">Fixed</SelectItem>
                      <SelectItem className={selectItemClass} value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Advance Value</Label>
                  <Input
                    type="number"
                    value={form.advanceValue}
                    onChange={(e) =>
                      setForm({ ...form, advanceValue: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* BOOKING RULES */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Minutes</Label>
                  <Input
                    type="number"
                    value={form.minBookingMinutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minBookingMinutes: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Step Minutes</Label>
                  <Input
                    type="number"
                    value={form.bookingStepMinutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bookingStepMinutes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* TIMINGS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Opening</Label>
                  <Input
                    type="time"
                    disabled={form.pricingMode === "time-based"}
                    value={form.openingTime}
                    onChange={(e) =>
                      setForm({ ...form, openingTime: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Closing</Label>
                  <Input
                    type="time"
                    disabled={form.pricingMode === "time-based"}
                    value={form.closingTime}
                    onChange={(e) =>
                      setForm({ ...form, closingTime: e.target.value })
                    }
                  />
                </div>
              </div>

            </div>

          </div>

          {/* FOOTER BUTTON */}
          <div className="pt-3">
            <Button
              className="w-full bg-green-700"
              onClick={saveFacility}
            >
              Save Facility
            </Button>
          </div>

        </SheetContent>
      </Sheet>

    </div>
  );
}