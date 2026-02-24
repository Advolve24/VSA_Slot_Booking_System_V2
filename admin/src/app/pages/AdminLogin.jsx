import { useState } from "react";
import api from "../../lib/axios";
import { useAuth } from "../providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const logo = "/VSA-Logo-1.png";
const bgImage = "/sportground.webp";

export default function AdminLogin() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/admin-login", {
        email,
        password,
      });

      setAuth(res.data.token, res.data.user);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ================= IMAGE SECTION ================= */}
      <div className="relative h-[30vh] lg:h-auto lg:w-1/2">

        <img
          src={bgImage}
          alt="VSA Stadium"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-green-900/70 to-black/60" />

        <div className="relative z-10 flex flex-col justify-end h-full px-4 pb-4 lg:p-12 text-white space-y-2">

          <img src={logo} alt="VSA Logo" className="w-10 lg:w-14" />

          <h1 className="text-lg lg:text-4xl font-semibold leading-tight">
            VSA Slot Booking System
          </h1>

          <p className="text-xs lg:text-base text-gray-200 max-w-md">
           Manage sports facility bookings, schedules and availability — all from one powerful admin dashboard.
          </p>

        </div>
      </div>

      {/* ================= FORM SECTION ================= */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 lg:px-6 py-4 lg:py-12">

        <div className="w-full max-w-md bg-white p-5 lg:p-8 rounded-2xl shadow-lg border">

          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">
            Admin Login
          </h2>

          <p className="text-xs lg:text-sm text-gray-500 mb-4 lg:mb-6">
            Enter your credentials
          </p>

          {error && (
            <div className="bg-red-100 text-red-600 text-xs p-2 rounded-lg mb-3">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">

            {/* EMAIL */}
            <div>
              <label className="text-xs lg:text-sm font-medium text-gray-700">
                Email
              </label>

              <div className="relative mt-1">
                <Mail
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />

                <input
                  type="email"
                  className="w-full pl-9 pr-3 py-2.5 lg:py-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none text-sm"
                  placeholder="admin@vsa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs lg:text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative mt-1">
                <Lock
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-9 pr-9 py-2.5 lg:py-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none text-sm"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* FORGOT PASSWORD */}
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-green-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 lg:py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <p className="text-center text-[10px] lg:text-xs text-gray-400 mt-5">
            © 2026 VSA Slot Booking System
          </p>

        </div>
      </div>
    </div>
  );
}