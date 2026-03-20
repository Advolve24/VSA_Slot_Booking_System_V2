// src/app/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Grid,
  Layers,
  Building2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Trophy,
  LogOut,
} from "lucide-react";

const menu = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Enrollments", to: "/admin/enrollments", icon: Users },
  { label: "Turf Rentals", to: "/admin/turf-rentals", icon: Grid },
  { label: "Sports", to: "/admin/sports", icon: Trophy },
  { label: "Coaching Batches", to: "/admin/batches", icon: Layers },
  { label: "Facilities", to: "/admin/facilities", icon: Building2 },
  { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
  { label: "Users", to: "/admin/users", icon: Users },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, admin } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* 🔒 Lock body scroll on mobile */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [mobileOpen]);

  return (
    <>
      {/* ================= MOBILE TOP BAR ================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0F6B2F] text-white ">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-white border flex items-center justify-center p-1 ">
            <img
              src="/VSA-Logo-1.png"        
              alt="VSA Logo"
              className="w-full h-full object-contain cursor-pointer"
                onClick={() => navigate("/admin")}
            />
          </div>

          <span className="font-semibold">VSA Admin</span>
        </div>


        <button onClick={() => setMobileOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ================= OVERLAY ================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
          z-50 bg-[#0F6B2F] text-white flex flex-col h-screen
          transition-all duration-300 ease-in-out

          /* MOBILE */
          fixed top-0 left-0
          ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}

          /* DESKTOP */
          md:static md:translate-x-0
          ${collapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border flex items-center justify- p-1">
            <img
              src="/VSA-Logo-1.png"        
              alt="VSA Logo"
              className="w-full h-full object-contain"
            />
          </div>

            {!collapsed && (
              <span className="text-lg font-semibold">VSA Admin</span>
            )}
          </div>

          {/* Close (mobile) */}
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {menu.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-lg
                transition-all
                ${isActive
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700/60"}
                ${collapsed ? "md:justify-center" : ""}
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* LOGOUT */}
        <div className="border-t border-green-800 px-3 py-4">
          <button
            onClick={() => {
              setMobileOpen(false);
              logout();
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg
              text-white hover:text-white hover:bg-green-700
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>

        {/* COLLAPSE (DESKTOP) */}
        <div className="hidden md:block border-t border-green-800 px-3 py-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 text-green-100 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Push content below mobile top bar */}
      <div className="md:hidden h-14" />
    </>
  );
}
