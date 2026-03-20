import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BACKEND_BASE } from "@/lib/env";

export default function SportsPage() {
  const { toast } = useToast();

  const [sports, setSports] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(null);
  const [preview, setPreview] = useState(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH ================= */
  const fetchSports = async () => {
    const res = await api.get("/sports");
    setSports(res.data);
  };

  useEffect(() => {
    fetchSports();
  }, []);

  /* ================= OPEN ================= */
  const openAdd = () => {
    setEditing(null);
    setName("");
    setIcon(null);
    setPreview(null);
    setOpen(true);
  };

  const openEdit = (sport) => {
    setEditing(sport);
    setName(sport.name);
    setIcon(null);
    setPreview(`${BACKEND_BASE}${sport.iconUrl}`);
    setOpen(true);
  };

  /* ================= SAVE ================= */
  const submitSport = async () => {
    if (!name) {
      toast({ variant: "destructive", title: "Sport name required" });
      return;
    }

    const fd = new FormData();
    fd.append("name", name);
    if (icon) fd.append("icon", icon);

    try {
      if (editing) {
        await api.put(`/sports/${editing._id}`, fd);
        toast({ title: "Sport updated" });
      } else {
        if (!icon) {
          toast({ variant: "destructive", title: "Sport icon required" });
          return;
        }
        await api.post("/sports", fd);
        toast({ title: "Sport added" });
      }

      setOpen(false);
      fetchSports();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err?.response?.data?.message,
      });
    }
  };

  /* ================= DELETE ================= */
  const removeSport = async (id) => {
    if (!confirm("Delete this sport?")) return;

    await api.delete(`/sports/${id}`);
    toast({ title: "Sport deleted" });
    fetchSports();
  };

  return (
    <div className="space-y-6 px-1 sm:px-0">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mt-4">
        <h2 className="text-2xl font-bold text-green-800">Sports</h2>

        <Button
          onClick={openAdd}
          className="w-[50%] sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Sport
        </Button>
      </div>

      {/* GRID */}
      <div className="
        grid 
        grid-cols-2 
        sm:grid-cols-2 
        md:grid-cols-3 
        lg:grid-cols-5 
        gap-4 sm:gap-6
      ">
        {sports.map((s) => (
          <div
            key={s._id}
            className="
              relative 
              h-[160px] sm:h-[200px] 
              rounded-xl 
              overflow-hidden 
              shadow-md 
              border
              transition-transform 
              hover:scale-[1.02]
            "
          >
            {/* IMAGE */}
            <img
              src={`${BACKEND_BASE}${s.iconUrl}`}
              alt={s.name}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* GRADIENT */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* BOTTOM BAR */}
            <div className="absolute bottom-0 left-0 right-0 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between text-white">
              <span className="font-semibold text-sm sm:text-base truncate">
                {s.name}
              </span>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => openEdit(s)}
                  className="hover:text-blue-300"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* <button
                  onClick={() => removeSport(s._id)}
                  className="hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button> */}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SHEET */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[70vh] rounded-t-2xl px-4 pt-4"
              : "w-[420px]"
          }
        >
          <h3 className="text-lg font-semibold mb-4">
            {editing ? "Edit Sport" : "Add Sport"}
          </h3>

          <Input
            placeholder="Sport Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3"
          />

          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              setIcon(file);
              setPreview(URL.createObjectURL(file));
            }}
          />

          {preview && (
            <img
              src={preview}
              className="w-full h-32 mt-3 object-cover rounded"
            />
          )}

          <Button className="w-full mt-6" onClick={submitSport}>
            {editing ? "Update Sport" : "Save Sport"}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
