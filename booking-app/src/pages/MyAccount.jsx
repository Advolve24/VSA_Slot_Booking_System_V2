import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCitiesByState } from "@/lib/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MyAccount() {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState([]);

  const countryCode = "IN";
  const stateCode = "MH";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    address: {
      country: "India",
      state: "Maharashtra",
      city: "",
      localAddress: "",
    },
  });

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/me");

        setUser(res.data);
        setOriginalData(res.data);

        setForm({
          fullName: res.data.fullName || "",
          email: res.data.email || "",
          mobile: res.data.mobile || "",
          address: {
            country: "India",
            state: "Maharashtra",
            city: res.data.address?.city || "",
            localAddress: res.data.address?.localAddress || "",
          },
        });

        setCities(getCitiesByState(countryCode, stateCode) || []);
      } catch {
        toast({ variant: "destructive", title: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    try {
      setSaving(true);

      const payload = {
        fullName: form.fullName,
        address: form.address,
      };

      const res = await api.put("/users/update", payload);

      setUser(res.data.user);
      setOriginalData(res.data.user);
      setEditing(false);

      toast({ title: "Profile updated successfully ✅" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Update failed",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ================= CANCEL EDIT ================= */
  const cancelEdit = () => {
    if (!originalData) return;

    setForm({
      fullName: originalData.fullName || "",
      email: originalData.email || "",
      mobile: originalData.mobile || "",
      address: {
        country: "India",
        state: "Maharashtra",
        city: originalData.address?.city || "",
        localAddress: originalData.address?.localAddress || "",
      },
    });

    setEditing(false);
  };

  if (loading) return <div className="py-20 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-4 px-4">

      {/* TITLE */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          My Account
        </h1>
        <p className="text-sm text-gray-500">
          Manage your personal information
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white border rounded-2xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center text-lg font-semibold">
              {form.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-lg">{form.fullName}</p>
              <p className="text-sm text-gray-500">{form.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800"
              onClick={() => (editing ? saveProfile() : setEditing(true))}
              disabled={saving}
            >
              {editing ? (saving ? "Saving..." : "Save") : "Edit"}
            </Button>
          </div>
        </div>

        <div className="border-t mb-6"></div>

        {/* FORM */}
        <div className="grid md:grid-cols-2 gap-5">

          <div>
            <Label>Name</Label>
            <Input
              disabled={!editing}
              value={form.fullName}
              onChange={(e) =>
                setForm({ ...form, fullName: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input disabled value={form.email} />
          </div>

          <div>
            <Label>Phone</Label>
            <Input disabled value={form.mobile} />
          </div>

          <div>
            <Label>State</Label>
            <Input disabled value="Maharashtra" />
          </div>

          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input
              disabled={!editing}
              value={form.address.localAddress}
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

          <div>
            <Label>City</Label>
            <Select
              disabled={!editing}
              value={form.address.city}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  address: {
                    ...form.address,
                    city: value,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city, i) => (
                  <SelectItem
                    key={i}
                    value={city.name || city}
                  >
                    {city.name || city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Country</Label>
            <Input disabled value="India" />
          </div>

        </div>

      </div>

      {/* DANGER ZONE */}
      <div className="mt-6 border border-red-200 rounded-2xl p-5 bg-red-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="font-semibold text-red-600">
            Danger Zone
          </p>
          <p className="text-sm text-gray-600">
            Permanently delete your account
          </p>
        </div>

        <Button variant="destructive">
          Delete Account
        </Button>
      </div>

    </div>
  );
}