import { NavLink, Outlet } from "react-router-dom";

export default function TurfRentalLayout() {

  const tabClass =
    "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200";

  const activeClass =
    "bg-green-700 text-white shadow-sm";

  const inactiveClass =
    "text-gray-600 hover:bg-gray-100";

  return (
    <div className="flex flex-col overflow-hidden px-0 sm:px-2 py-4">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-green-800">
            Turf Rental Management
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground">
            Manage turf bookings, payments and invoices.
          </p>
        </div>

      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b pb-3">

        {/* BOOKINGS */}
        <NavLink
          to="/admin/turf-rentals"
          end
          className={({ isActive }) =>
            `${tabClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Turf Rentals
        </NavLink>

        {/* INVOICES */}
        <NavLink
          to="/admin/turf-rentals/invoices"
          className={({ isActive }) =>
            `${tabClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Invoices
        </NavLink>

      </div>

      {/* CONTENT */}
      <div className="flex-1 pt-4">
        <Outlet />
      </div>

    </div>
  );
}