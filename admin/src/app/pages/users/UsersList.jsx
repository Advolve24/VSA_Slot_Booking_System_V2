import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMaharashtraCities } from "@/lib/location";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function UserList() {
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 8;

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(null); // view | edit
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= FETCH ================= */
  const loadUsers = async () => {
    try {
      const res = await api.get("/users/all");

      // ❌ Hide admin users
      const filtered = (res.data || []).filter(
        (u) => u.role !== "admin"
      );

      setUsers(filtered);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* ================= SEARCH ================= */
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      `${u.fullName} ${u.email} ${u.mobile}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [users, search]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => setPage(1), [search]);

  /* ================= ACTIONS ================= */
  const openView = (u) => {
    setSelected(u);
    setForm(u);
    setDrawer("view");
  };

  const openEdit = (u) => {
    setSelected(u);
    setForm(u);
    setDrawer("edit");
  };

  const saveUser = async () => {
    try {
      await api.put(`/users/${selected._id}`, form);
      toast({ title: "User updated successfully" });
      setDrawer(null);
      loadUsers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast({ title: "User deleted" });
      loadUsers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-6 mt-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Users</h1>

        <Button variant="outline" onClick={loadUsers}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* SEARCH */}
      <Input
        placeholder="Search by name, email or mobile..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block bg-white rounded-xl border mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Joined</th>
              <th className="text-right pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="p-3 font-medium">{u.fullName}</td>
                <td>{u.email || "—"}</td>
                <td>{u.mobile || "—"}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="text-right pr-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">
                      <DropdownMenuItem onClick={() => openView(u)}>
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(u)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteUser(u._id)}
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

      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden mt-4 space-y-4">
        {paginatedUsers.map((u) => (
          <div key={u._id} className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{u.fullName}</h3>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button>
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => openView(u)}>
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(u)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => deleteUser(u._id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {u.mobile || "No phone"}
            </div>
          </div>
        ))}
      </div>

      {/* ================= DRAWER ================= */}
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
            <SheetTitle>
              {drawer === "view" ? "View User" : "Edit User"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2 mt-4">
            <div className="grid grid-cols-2 gap-3">

              {/* Full Name */}
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  disabled={drawer === "view"}
                  value={form.fullName || ""}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="text-sm font-medium">Mobile</label>
                <Input
                  disabled={drawer === "view"}
                  value={form.mobile || ""}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  disabled={drawer === "view"}
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              {/* Country (Fixed) */}
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input value="India" disabled />
              </div>

              {/* State (Fixed) */}
              <div>
                <label className="text-sm font-medium">State</label>
                <Input value="Maharashtra" disabled />
              </div>

              {/* City Select */}
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
                        country: "India",
                        state: "Maharashtra",
                        city: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>

                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-64 overflow-auto">
                    {getMaharashtraCities().map((city) => (
                      <SelectItem
                        key={city}
                        value={city}
                        className="cursor-pointer data-[highlighted]:bg-green-100 data-[highlighted]:text-green-900 data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
                      >
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Local Address (Full Width) */}
              <div className="col-span-2">
                <label className="text-sm font-medium">
                  Local Address
                </label>
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

              {/* Created At (View Only) */}
              {drawer === "view" && (
                <div className="col-span-2">
                  <label className="text-sm font-medium">
                    Joined On
                  </label>
                  <Input
                    value={
                      selected?.createdAt
                        ? new Date(selected.createdAt).toLocaleDateString()
                        : ""
                    }
                    disabled
                  />
                </div>
              )}

            </div>
          </div>

          {drawer === "edit" && (
            <Button
              className="mt-2 w-full bg-green-700"
              onClick={saveUser}
            >
              Update User
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}