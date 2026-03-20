import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import FacilityList from "./FacilityList";
import BlockedSlots from "./BlockedSlots";
import SlotAllocation from "./SlotAllocation";

export default function FacilitiesPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("facilities");

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const tabClass = (tab) =>
    `px-2 md:px-5 py-2 rounded-md text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
      activeTab === tab
        ? "bg-green-700 text-white shadow"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="p-0 space-y-4 mt-4">

      {/* HEADER */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-green-800">
          Facility Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage Facility, Slot allocation and Blocking slots.
        </p>
      </div>

      {/* ================= TABS ================= */}

      {/* Desktop Tabs (unchanged) */}
      <div className="hidden md:inline-flex gap-2 bg-gray-100 p-2 rounded-lg">
        <button
          className={tabClass("facilities")}
          onClick={() => setActiveTab("facilities")}
        >
          Facilities
        </button>


        <button
          className={tabClass("blocked")}
          onClick={() => setActiveTab("blocked")}
        >
          Blocked Slots
        </button>
      </div>

      {/* Mobile Scrollable Tabs */}
      <div className="md:hidden overflow-x-auto no-scrollbar">
        <div className="flex gap-2 bg-gray-100 p-2 rounded-lg w-max">
          <button
            className={tabClass("facilities")}
            onClick={() => setActiveTab("facilities")}
          >
            Facilities
          </button>

          <button
            className={tabClass("blocked")}
            onClick={() => setActiveTab("blocked")}
          >
            Blocked Slots
          </button>
        </div>
      </div>

      {/* ================= TAB CONTENT ================= */}
      <div>
        {activeTab === "facilities" && <FacilityList />}
        {activeTab === "blocked" && <BlockedSlots />}
      </div>

    </div>
  );
}
