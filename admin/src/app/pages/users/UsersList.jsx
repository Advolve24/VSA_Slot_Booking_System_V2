import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { MoreHorizontal, RotateCcw, Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
import { useToast } from "@/hooks/use-toast";

export default function UserList() {
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 8;

  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("enrollment");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [viewContext, setViewContext] = useState(null);

  /* ================= HELPERS ================= */
  const calculateAge = (dob) => {
    if (!dob) return "";

    const birth = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const safeFormatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();

    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const openSheetWithReset = () => {
    setShowPassword(false);
  };

  /* ================= LOAD USERS ================= */

  const loadUsers = async () => {
    try {
      const res = await api.get("/users/all");
      const filtered = (res.data || []).filter((u) => u.role !== "admin");
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

  /* ================= TAB FILTER ================= */

  const tabUsers = useMemo(() => {
    if (tab === "staff") {
      return users.filter((u) => u.role === "staff");
    }

    if (tab === "turf") {
      return users.filter(
        (u) =>
          u.role === "player" &&
          (u.userTypes?.includes("turf") || u.source === "turf")
      );
    }

    return users.filter(
      (u) =>
        u.role === "player" &&
        (u.userTypes?.includes("coaching") || u.source === "enrollment")
    );
  }, [users, tab]);

  /* ================= SEARCH ================= */

  const filteredUsers = useMemo(() => {
    return tabUsers.filter((u) =>
      `${u.fullName} ${u.email} ${u.mobile}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [tabUsers, search]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => setPage(1), [search, tab]);

  /* ================= ACTIONS ================= */

  const openView = async (u) => {
    try {
      const res = await api.get(`/users/${u._id}`);
      setSelected(u);
      setUserDetails(res.data);
      setForm(res.data?.user || {});
      setViewContext(tab);
      setDrawer("view");
      openSheetWithReset();
    } catch {
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  const openEdit = async (u) => {
    try {
      const res = await api.get(`/users/${u._id}`);
      const user = res.data?.user || u;

      setSelected(u);
      setUserDetails(res.data);
      setForm({
        ...user,
        password: "",
      });
      setViewContext(tab);
      setDrawer("edit");
      openSheetWithReset();
    } catch {
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  const openCreateStaff = () => {
    setForm({
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      isActive: true,
      role: "staff",
    });
    setUserDetails(null);
    setSelected(null);
    setViewContext("staff");
    setDrawer("createStaff");
    openSheetWithReset();
  };

  const saveUser = async () => {
    try {
      await api.put(`/users/${selected._id}`, form);

      toast({ title: "User updated successfully" });

      setDrawer(null);
      setSelected(null);
      setUserDetails(null);
      loadUsers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const createStaff = async () => {
    try {
      await api.post("/users/create-staff", form);

      toast({ title: "Staff created successfully" });

      setDrawer(null);
      setUserDetails(null);
      setSelected(null);
      loadUsers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to create staff",
        variant: "destructive",
      });
    }
  };

  const toggleStaffActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, {
        isActive: !user.isActive,
      });

      loadUsers();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update staff status",
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
      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">

        <h1 className="text-xl font-semibold">Users</h1>

        <div className="flex gap-2 w-full sm:w-auto">

          {tab === "staff" && (
            <Button
              onClick={openCreateStaff}
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          )}

          <Button
            variant="outline"
            onClick={loadUsers}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

        </div>

      </div>


      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="inline-flex bg-gray-100 p-1 rounded-sm gap-1">

          <TabsTrigger
            value="enrollment"
            className="rounded-sm px-4 py-1.5 text-sm 
      data-[state=active]:bg-green-700 
      data-[state=active]:text-white"
          >
            Enrollment
          </TabsTrigger>

          <TabsTrigger
            value="turf"
            className="rounded-sm px-4 py-1.5 text-sm 
      data-[state=active]:bg-green-700 
      data-[state=active]:text-white"
          >
            Turf
          </TabsTrigger>

          <TabsTrigger
            value="staff"
            className="rounded-sm px-4 py-1.5 text-sm 
      data-[state=active]:bg-green-700 
      data-[state=active]:text-white"
          >
            Staff
          </TabsTrigger>

        </TabsList>
      </Tabs>


      {/* ================= SEARCH ================= */}
      <div className="w-full sm:max-w-md">
        <Input
          placeholder="Search by name, email, mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* TABLE */}

      <div className="mt-4">

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-100 border-b">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Mobile</th>
                {tab === "staff" && <th>Status</th>}
                <th>Joined</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u._id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{u.fullName}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.mobile || "—"}</td>

                  {tab === "staff" && (
                    <td>
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={() => toggleStaffActive(u)}
                      />
                    </td>
                  )}

                  <td>{safeFormatDate(u.createdAt)}</td>

                  <td className="text-right pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="bg-white border shadow-lg">
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

              {paginatedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={tab === "staff" ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE CARDS ================= */}
        <div className="md:hidden space-y-3">
          {paginatedUsers.map((u) => (
            <div
              key={u._id}
              className="bg-white border rounded-xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start">

                <div>
                  <p className="font-semibold text-sm">{u.fullName}</p>
                  <p className="text-xs text-gray-500">{u.email || "—"}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="bg-white border shadow-lg">
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

              <div className="mt-3 text-sm space-y-1">
                <p><span className="text-gray-500">Mobile:</span> {u.mobile || "—"}</p>

                {tab === "staff" && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status:</span>
                    <Switch
                      checked={u.isActive}
                      onCheckedChange={() => toggleStaffActive(u)}
                    />
                  </div>
                )}

                <p>
                  <span className="text-gray-500">Joined:</span>{" "}
                  {safeFormatDate(u.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {paginatedUsers.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No users found
            </div>
          )}
        </div>

      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">

          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-full sm:w-auto"
          >
            Prev
          </Button>

          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>

          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-full sm:w-auto"
          >
            Next
          </Button>

        </div>
      )}

      {/* DRAWER */}
      <Sheet
        open={!!drawer}
        onOpenChange={(open) => {
          if (!open) {
            setDrawer(null);
            setSelected(null);
            setUserDetails(null);
            setForm({});
            setShowPassword(false);
          }
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`
    bg-white overflow-y-auto

    ${isMobile
              ? "h-[60vh] rounded-t-2xl animate-in slide-in-from-bottom"
              : "w-full sm:max-w-[560px]"
            }
  `}
        >
          <SheetHeader>
            <SheetTitle>
              {drawer === "createStaff"
                ? "Add Staff"
                : drawer === "edit"
                  ? "Edit User"
                  : "View User"}
            </SheetTitle>
          </SheetHeader>

          {/* ================= STAFF VIEW ================= */}
          {drawer === "view" && userDetails?.user?.role === "staff" && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={userDetails.user.fullName || ""} disabled />
                <Input value={userDetails.user.email || ""} disabled />
                <Input value={userDetails.user.mobile || ""} disabled />
                <Input
                  value={userDetails.user.isActive ? "Active" : "Inactive"}
                  disabled
                />
              </div>

              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Current password cannot be viewed. Admin can set a new password
                from Edit User.
              </div>
            </div>
          )}

          {/* ================= PLAYER VIEW ================= */}
          {drawer === "view" && userDetails?.user?.role === "player" && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={userDetails.user.fullName || ""} disabled />
                <Input
                  value={safeFormatDate(userDetails.user.dateOfBirth)}
                  disabled
                />

                <Input value={userDetails.user.gender || "—"} disabled />
                <Input value={userDetails.user.age || ""} disabled />

                <Input value={userDetails.user.mobile || ""} disabled />
                <Input value={userDetails.user.email || ""} disabled />

                <Input value={userDetails.user.address?.city || ""} disabled />
                <Input
                  value={userDetails.user.address?.localAddress || ""}
                  disabled
                />
              </div>

              {viewContext === "enrollment" && (
                <div className="border rounded-xl p-3">
                  <h3 className="font-semibold mb-3">Enrollments</h3>

                  {userDetails.enrollments?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No enrollments
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {userDetails.enrollments.map((e) => (
                        <div
                          key={e._id}
                          className="border rounded-lg p-3 text-sm"
                        >
                          <p>
                            <b>Batch:</b> {e.batchName || "—"}
                          </p>
                          <p>
                            <b>Coach:</b> {e.coachName || "—"}
                          </p>
                          <p>
                            <b>Sport:</b> {e.sportName || "—"}
                          </p>
                          <p>
                            <b>Start:</b> {safeFormatDate(e.startDate)}
                          </p>
                          <p>
                            <b>End:</b> {safeFormatDate(e.endDate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {viewContext === "turf" && (
                <div className="border rounded-xl p-3">
                  <h3 className="font-semibold mb-3">
                    Turf Bookings ({userDetails.turfBookings?.length || 0})
                  </h3>

                  {userDetails.turfBookings?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No turf bookings
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {userDetails.turfBookings.map((t) => (
                        <div
                          key={t._id}
                          className="border rounded-lg p-3 text-sm"
                        >
                          <p>
                            <b>Date:</b>{" "}
                            {safeFormatDate(
                              t.date || t.bookingDate || t.slotDate
                            )}
                          </p>
                          <p>
                            <b>Time:</b> {t.startTime || "—"} -{" "}
                            {t.endTime || "—"}
                          </p>
                          <p>
                            <b>Status:</b> {t.status || "—"}
                          </p>
                          {t.facilityName && (
                            <p>
                              <b>Facility:</b> {t.facilityName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STAFF EDIT / CREATE ================= */}
          {(drawer === "edit" || drawer === "createStaff") &&
            (form.role === "staff" || viewContext === "staff" || tab === "staff") && (
              <div className="mt-5 space-y-4">
                <Input
                  placeholder="Full Name"
                  value={form.fullName || ""}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />

                <Input
                  placeholder="Email"
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />

                <Input
                  placeholder="Mobile"
                  value={form.mobile || ""}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                />

                <div className="relative">
                  <Input
                    placeholder="Enter new password"
                    type={showPassword ? "text" : "password"}
                    value={form.password || ""}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="pr-12"
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>

                <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                  Existing password is never shown. Enter a new password here to
                  reset it.
                </div>

                <div className="flex justify-between items-center border p-3 rounded-xl">
                  <span>Active</span>
                  <Switch
                    checked={form.isActive ?? true}
                    onCheckedChange={(v) =>
                      setForm({ ...form, isActive: v })
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={drawer === "createStaff" ? createStaff : saveUser}
                >
                  {drawer === "createStaff" ? "Create Staff" : "Save Staff"}
                </Button>
              </div>
            )}

          {/* ================= PLAYER EDIT ================= */}
          {drawer === "edit" && form.role === "player" && (
            <div className="mt-5 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* NAME */}
                <div>
                  <label className="text-sm font-medium">Player Name</label>
                  <Input
                    value={form.fullName || ""}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>

                  <DOBPicker
                    disabled={false}
                    value={form.dateOfBirth}
                    onChange={(date) => {
                      setForm({
                        ...form,
                        dateOfBirth: date,
                        age: calculateAge(date), // 🔥 AUTO AGE
                      });
                    }}
                  />
                </div>

                {/* GENDER */}
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <Select
                    value={form.gender || ""}
                    onValueChange={(v) => setForm({ ...form, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AGE */}
                <div>
                  <label className="text-sm font-medium">Age</label>
                  <Input
                    value={form.age || ""}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* MOBILE */}
                <div>
                  <label className="text-sm font-medium">Mobile</label>
                  <Input
                    value={form.mobile || ""}
                    onChange={(e) =>
                      setForm({ ...form, mobile: e.target.value })
                    }
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                {/* CITY */}
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={form.address?.city || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        address: {
                          ...form.address,
                          city: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="text-sm font-medium">Local Address</label>
                  <Input
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

              <Button className="w-full mt-3" onClick={saveUser}>
                Update User
              </Button>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DOBPicker({ value, onChange, disabled }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal h-10 bg-white border border-gray-300"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(new Date(value), "dd MMM yyyy") : "Select DOB"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={1950}
          toYear={new Date().getFullYear()}
          selected={value ? new Date(value) : undefined}
          onSelect={(date) =>
            onChange(date ? format(date, "yyyy-MM-dd") : "")
          }
          disabled={(date) => date > new Date()} // ❌ no future DOB
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}