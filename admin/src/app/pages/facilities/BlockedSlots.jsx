import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import {
  Plus,
  MoreHorizontal,
  CalendarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";

/* ================= UTILS ================= */

const toDateOnly = (d) => format(new Date(d), "yyyy-MM-dd");

const generateTimeOptions = () => {
  const times = [];
  for (let h = 6; h <= 23; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
    times.push(`${String(h).padStart(2, "0")}:30`);
  }
  return times;
};

const formatTime12H = (time) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export default function BlockedTime() {

  const { toast } = useToast();

  const [facilities, setFacilities] = useState([]);
  const [tableData, setTableData] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [form, setForm] = useState({
    facilityId: "",
    date: toDateOnly(new Date()),
    startTime: "",
    endTime: "",
    reason: "admin",
  });

  const timeOptions = generateTimeOptions();

  /* ================= LOAD ================= */

  useEffect(() => {
    loadFacilities();
    loadTable();
  }, []);

  const loadFacilities = async () => {
    const res = await api.get("/facilities");
    setFacilities(res.data || []);
  };

  const loadTable = async () => {
    const res = await api.get("/blocked-times");
    setTableData(res.data || []);
  };

  /* ================= ACTIONS ================= */

  const openAdd = () => {
    const d = new Date();
    setSelectedDate(d);

    setForm({
      facilityId: "",
      date: toDateOnly(d),
      startTime: "",
      endTime: "",
      reason: "admin",
    });

    setDrawerOpen(true);
  };

  const saveBlockedTime = async () => {

    if (!form.facilityId || !form.startTime || !form.endTime) {
      return toast({
        title: "Missing fields",
        variant: "destructive",
      });
    }

    if (toMinutes(form.endTime) <= toMinutes(form.startTime)) {
      return toast({
        title: "Invalid time",
        variant: "destructive",
      });
    }

    try {
      setLoading(true);

      await api.post("/blocked-times", form);

      toast({ title: "Blocked Successfully" });

      loadTable();
      setDrawerOpen(false);

    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBlock = async (id) => {
    if (!confirm("Delete this blocked slot?")) return;

    await api.delete(`/blocked-times/${id}`);
    toast({ title: "Deleted" });
    loadTable();
  };

  const selectItemClass = `cursor-pointer transition-colors data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white`;
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Blocked Time</h1>
        <Button onClick={openAdd} className="bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Block Time
        </Button>
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Facility</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {tableData.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="px-4 py-3">{row.facilityId?.name}</td>
                <td className="px-4 py-3">
                  {format(new Date(row.date), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  {formatTime12H(row.startTime)} - {formatTime12H(row.endTime)}
                </td>
                <td className="px-4 py-3 capitalize">{row.reason}</td>

                <td className="px-4 py-3 text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="z-[9999] bg-white border shadow-lg" align="end">
                      <DropdownMenuItem
                        onClick={() => deleteBlock(row._id)}
                        className="text-red-600"
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
        {tableData.map((row) => (
          <div key={row._id} className="bg-white border rounded-xl p-4 shadow-sm">

            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{row.facilityId?.name}</h3>
                <p className="text-xs text-gray-500">
                  {format(new Date(row.date), "dd MMM yyyy")}
                </p>
              </div>

              <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="z-[9999] bg-white border shadow-lg" align="end">
                      <DropdownMenuItem
                        onClick={() => deleteBlock(row._id)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
            </div>

            <div className="mt-3 text-sm">
              <p className="text-gray-500 text-xs">Time</p>
              <p className="font-medium">
                {formatTime12H(row.startTime)} - {formatTime12H(row.endTime)}
              </p>
            </div>

            <div className="mt-2 text-sm">
              <p className="text-gray-500 text-xs">Reason</p>
              <p className="capitalize">{row.reason}</p>
            </div>

          </div>
        ))}
      </div>

      {/* ================= DRAWER ================= */}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[75vh] rounded-t-2xl px-4 pt-4"
              : "w-[400px]"
          }
        >
          <SheetHeader>
            <SheetTitle>Block Time</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">

            {/* FACILITY */}
            <Select
              value={form.facilityId}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, facilityId: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                {facilities.map((f) => (
                  <SelectItem className={selectItemClass} key={f._id} value={f._id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* DATE */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>

              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (!d) return;
                    setSelectedDate(d);
                    setForm((f) => ({
                      ...f,
                      date: toDateOnly(d),
                    }));
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* START TIME */}
            <Select
              value={form.startTime}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, startTime: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Start Time" />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                {timeOptions.map((t) => (
                  <SelectItem  className={selectItemClass} key={t} value={t}>
                    {formatTime12H(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* END TIME */}
            <Select
              value={form.endTime}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, endTime: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="End Time" />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                {timeOptions.map((t) => (
                  <SelectItem className={selectItemClass} key={t} value={t}>
                    {formatTime12H(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* REASON */}
            <Select
              value={form.reason}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, reason: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="z-[9999] bg-white border shadow-lg">
                <SelectItem className={selectItemClass} value="admin">Admin</SelectItem>
                <SelectItem className={selectItemClass} value="maintenance">Maintenance</SelectItem>
                <SelectItem className={selectItemClass} value="event">Event</SelectItem>
                <SelectItem className={selectItemClass} value="coaching">Coaching</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={saveBlockedTime}
              className="w-full bg-green-700"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>

          </div>

        </SheetContent>
      </Sheet>

    </div>
  );
}