import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Plus, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ================= STYLES ================= */
const selectTriggerClass =
  "w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600";

const selectItemClass = `
  cursor-pointer
  transition-colors
  data-[highlighted]:bg-green-100
  data-[highlighted]:text-green-900
  data-[state=checked]:bg-green-600
  data-[state=checked]:text-white
`;

export default function SlotAllocation() {
  const { toast } = useToast();

  const [facilities, setFacilities] = useState([]);
  const [facilitySlotDocs, setFacilitySlotDocs] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [slotRows, setSlotRows] = useState([]);

  const [isMobile, setIsMobile] = useState(false);

  /* ================= RESPONSIVE (LIKE ENROLLMENT) ================= */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH ================= */
  const loadFacilities = async () => {
    const res = await api.get("/facilities");
    setFacilities(res.data || []);
  };

  const loadAllFacilitySlots = async () => {
    const res = await api.get("/facility-slots/all");
    setFacilitySlotDocs(res.data || []);
  };

  const loadSlotsForFacility = async (facilityId) => {
    const res = await api.get(`/facility-slots?facilityId=${facilityId}`);
    setSlotRows(res.data || []);
  };

  useEffect(() => {
    loadFacilities();
    loadAllFacilitySlots();
  }, []);

  /* ================= ACTIONS ================= */
  const openAdd = () => {
    setSelectedFacility("");
    setSlotRows([]);
    setDrawerOpen(true);
  };

  const openEditFacility = async (facilityId) => {
    setSelectedFacility(facilityId);
    await loadSlotsForFacility(facilityId);
    setDrawerOpen(true);
  };

  const addSlotRow = () => {
    setSlotRows((prev) => [
      ...prev,
      { startTime: "", endTime: "", isActive: true },
    ]);
  };

  const updateSlotRow = (index, key, value) => {
    setSlotRows((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  };

  const removeSlotRow = (index) => {
    setSlotRows((prev) => prev.filter((_, i) => i !== index));
  };

  /* ================= SAVE ================= */
  const saveAllSlots = async () => {
    if (!selectedFacility) {
      toast({ title: "Select facility", variant: "destructive" });
      return;
    }

    const validSlots = slotRows.filter((s) => s.startTime && s.endTime);

    try {
      await api.post("/facility-slots", {
        facilityId: selectedFacility,
        slots: validSlots,
      });

      toast({ title: "Slots saved successfully" });
      setDrawerOpen(false);
      loadAllFacilitySlots();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err.response?.data?.message || "Server error",
        variant: "destructive",
      });
    }
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-md sm:text-xl font-semibold text-green-800">Slot Allocation</h1>
        <Button onClick={openAdd} className="bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Slot
        </Button>
      </div>

      {/* ================= DESKTOP TABLE (UNCHANGED) ================= */}
      <div className="hidden md:block bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left w-[220px]">Facility</th>
              <th className="text-left">Allocated Slots</th>
              <th className="text-center w-[110px]">Status</th>
              <th className="text-center w-[70px]">Action</th>
            </tr>
          </thead>

          <tbody>
            {facilities.map((f) => {
              const doc = facilitySlotDocs.find(
                (d) => String(d.facilityId) === String(f._id)
              );

              const slots = doc?.slots || [];

              return (
                <tr key={f._id} className="border-t align-top">
                  {/* Facility */}
                  <td className="p-3 font-medium">{f.name}</td>

                  {/* Slots */}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-full">
                      {slots.length ? (
                        slots.map((s) => (
                          <span
                            key={s._id}
                            className={`text-[11px] px-2 py-[2px] rounded-full border whitespace-nowrap ${s.isActive
                                ? "bg-green-50 text-green-700 border-green-300"
                                : "bg-gray-100 text-gray-500 border-gray-300"
                              }`}
                          >
                            {s.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No slots
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="text-center pt-3">
                    <span className="inline-block px-3 py-[2px] rounded-full text-[11px] bg-green-100 text-green-700">
                      {slots.filter((s) => s.isActive).length} Active
                    </span>
                  </td>

                  {/* Action */}
                  <td className="text-center pt-3">
                    <button
                      onClick={() => openEditFacility(f._id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-100"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARD VIEW (LIKE ENROLLMENT) ================= */}
      <div className="md:hidden space-y-4">
        {facilities.map((f) => {
          const doc = facilitySlotDocs.find(
            (d) => String(d.facilityId) === String(f._id)
          );
          const slots = doc?.slots || [];
          const activeCount = slots.filter((s) => s.isActive).length;

          return (
            <div
              key={f._id}
              className="bg-white border rounded-xl p-3 shadow-sm"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">{f.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeCount} Active Slots
                  </p>
                </div>

                <button
                  onClick={() => openEditFacility(f._id)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md border hover:bg-gray-100"
                >
                  <Pencil size={16} />
                </button>
              </div>

              {/* Slots Chips */}
              <div className="mt-3 flex flex-wrap gap-1">
                {slots.length ? (
                  slots.map((s) => (
                    <span
                      key={s._id}
                      className={`text-[11px] px-2 py-[3px] rounded-full border whitespace-nowrap ${s.isActive
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-gray-100 text-gray-500 border-gray-300"
                        }`}
                    >
                      {s.label}
                    </span>
                  ))
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No slots allocated
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DRAWER (RESPONSIVE LIKE ENROLLMENT) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[80vh] rounded-t-2xl flex flex-col pt-4 pb-2"
              : "w-[480px] h-screen flex flex-col"
          }
        >
          {/* FIXED HEADER */}
          <SheetHeader className="shrink-0">
            <SheetTitle>Manage Slots</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {/* FACILITY */}
            <Select
              value={selectedFacility}
              onValueChange={(v) => {
                setSelectedFacility(v);
                loadSlotsForFacility(v);
              }}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg z-[9999]">
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

            {/* SLOT ROWS */}
            <div className="space-y-3">
              {slotRows.map((slot, i) => (
                <div
                  key={i}
                  className={
                    isMobile
                      ? "grid grid-cols-2 gap-2 items-center border rounded-lg p-2"
                      : "grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
                  }
                >
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateSlotRow(i, "startTime", e.target.value)
                    }
                  />
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateSlotRow(i, "endTime", e.target.value)
                    }
                  />

                  <div className="col-span-2 md:col-span-1 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                    <Select
                      value={slot.isActive ? "active" : "disabled"}
                      onValueChange={(v) =>
                        updateSlotRow(i, "isActive", v === "active")
                      }
                    >
                      <SelectTrigger className="h-10 w-full md:flex-1">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="z-[9999] bg-white border shadow-lg">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>

                    <button
                      onClick={() => removeSlotRow(i)}
                      className="text-red-500 w-full md:w-10 h-10 flex items-center justify-center border rounded-md hover:bg-red-50 shrink-0 transition"
                      aria-label="Remove slot"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addSlotRow} className="w-full">
              + Add Slot
            </Button>
          </div>

          {/* FIXED FOOTER */}
          <div className="shrink-0 pt-3 border-t bg-white">
            <Button onClick={saveAllSlots} className="w-full bg-green-700">
              Save Slots
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
