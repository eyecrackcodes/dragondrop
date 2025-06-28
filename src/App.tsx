import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Site } from "./types";
import { OrgChart } from "./components/OrgChart";
import { CommissionDashboard } from "./components/CommissionDashboard";
import { LandingPage } from "./components/LandingPage";
import { TenureAlertsDashboard } from "./components/TenureAlertsDashboard";
import { CelebrationsDashboard } from "./components/CelebrationsDashboard";
import {
  useFirebaseCommissionAlerts,
  useFirebaseEmployees,
  useFirebaseConnection,
} from "./hooks/useFirebaseData";
import { useMockCommissionAlerts, useMockEmployees } from "./hooks/useMockData";
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  SparklesIcon,
  BellAlertIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import "./App.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

type ActiveView =
  | "landing"
  | "org-chart"
  | "commission-dashboard"
  | "tenure-alerts"
  | "celebrations";

function AppContent() {
  const [selectedSite, setSelectedSite] = useState<Site>("Austin");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("landing");

  // Check Firebase connection status
  const { isConnected, isConfigured } = useFirebaseConnection();

  // Use Firebase data if available, otherwise fall back to mock data
  const firebaseAlerts = useFirebaseCommissionAlerts();
  const mockAlerts = useMockCommissionAlerts();
  const firebaseEmployees = useFirebaseEmployees();
  const mockEmployees = useMockEmployees();

  // Select data source based on Firebase availability
  const { hasAlerts, agentsApproachingMilestone, agentsNeedingUpdate } =
    isConnected ? firebaseAlerts : mockAlerts;
  const { employees } = isConnected ? firebaseEmployees : mockEmployees;

  // Calculate stats for landing page
  const stats = {
    totalEmployees: employees.length,
    totalManagers: employees.filter((emp) => emp.role === "Sales Manager")
      .length,
    activeAgents: employees.filter(
      (emp) => emp.role === "Agent" && emp.status === "active"
    ).length,
  };

  // Handle navigation from landing page
  const handleNavigateFromLanding = (
    view: "org-chart" | "commission-dashboard"
  ) => {
    setActiveView(view);
  };

  const handleSiteChangeFromLanding = (site: "Austin" | "Charlotte") => {
    setSelectedSite(site);
  };

  // Show landing page if that's the active view
  if (activeView === "landing") {
    return (
      <LandingPage
        onNavigate={handleNavigateFromLanding}
        selectedSite={selectedSite}
        onSiteChange={handleSiteChangeFromLanding}
        isConnected={isConnected}
        stats={stats}
      />
    );
  }

  return (
    <div className="min-h-screen scroll-smooth">
      {/* Compact Premium Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 border-b border-indigo-500/30">
        {/* Subtle background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-cyan-900/20"></div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 25%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 25%)`,
          }}
        ></div>

        {/* Compact Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Cool Dragon Logo & Branding */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center group">
                {/* Enhanced Dragon Design */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-xl blur-md opacity-60 group-hover:opacity-90 transition-all duration-300 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-xl p-2.5 shadow-xl border border-white/30 backdrop-blur-sm transform group-hover:scale-110 transition-all duration-300">
                    <div className="relative">
                      <span className="text-2xl filter drop-shadow-lg block transform group-hover:rotate-12 transition-transform duration-300">
                        🐉
                      </span>
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  </div>
                </div>

                {/* Compact Branding */}
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-white drop-shadow-lg bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Dragon Drop
                  </h1>
                  <div className="flex items-center">
                    <SparklesIcon className="w-3 h-3 text-blue-300 mr-1" />
                    <p className="text-blue-200 text-xs font-medium tracking-wide">
                      Sales Org Manager
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact Connection Status */}
              <div className="ml-4">
                <div
                  className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-sm ${
                    isConnected
                      ? "bg-green-500/20 border-green-400/50 text-green-100"
                      : "bg-amber-500/20 border-amber-400/50 text-amber-100"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isConnected
                        ? "bg-green-400 animate-pulse"
                        : "bg-amber-400 animate-bounce"
                    }`}
                  ></div>
                  <span className="mr-1">{isConnected ? "🔥" : "🧪"}</span>
                  <span>{isConnected ? "Live" : "Demo"}</span>
                </div>
              </div>
            </div>

            {/* Compact Controls */}
            <div className="flex items-center space-x-3">
              {/* Compact Site Selector */}
              <div className="flex bg-white/10 rounded-lg p-1 backdrop-blur-sm border border-white/20">
                <button
                  onClick={() => setSelectedSite("Austin")}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 flex items-center ${
                    selectedSite === "Austin"
                      ? "bg-white text-slate-900 shadow-lg"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  <MapPinIcon className="w-3 h-3 mr-1.5" />
                  Austin
                </button>
                <button
                  onClick={() => setSelectedSite("Charlotte")}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 flex items-center ${
                    selectedSite === "Charlotte"
                      ? "bg-white text-slate-900 shadow-lg"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  <MapPinIcon className="w-3 h-3 mr-1.5" />
                  Charlotte
                </button>
              </div>

              {/* Compact Bulk Actions Toggle */}
              {activeView === "org-chart" && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm border ${
                    showBulkActions
                      ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-lg"
                      : "text-white hover:bg-white/20 border-white/30"
                  }`}
                >
                  <div className="flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1.5" />
                    {showBulkActions ? "Bulk On" : "Bulk Mode"}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Compact Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveView("org-chart")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === "org-chart"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Organization Chart
                  {hasAlerts && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                      {agentsApproachingMilestone.length +
                        agentsNeedingUpdate.length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveView("commission-dashboard")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === "commission-dashboard"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Commission Dashboard
                </div>
              </button>

              <button
                onClick={() => setActiveView("tenure-alerts")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === "tenure-alerts"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <BellAlertIcon className="w-4 h-4 mr-2" />
                  Tenure Alerts
                </div>
              </button>

              <button
                onClick={() => setActiveView("celebrations")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === "celebrations"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <GiftIcon className="w-4 h-4 mr-2" />
                  Celebrations
                </div>
              </button>
            </div>

            {/* Home Button */}
            <button
              onClick={() => setActiveView("landing")}
              className="py-3 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors duration-200 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              ← Home
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative min-h-screen bg-gray-50">
        {activeView === "org-chart" && (
          <OrgChart site={selectedSite} showBulkActions={showBulkActions} />
        )}
        {activeView === "commission-dashboard" && (
          <CommissionDashboard site={selectedSite} employees={employees} />
        )}
        {activeView === "tenure-alerts" && (
          <TenureAlertsDashboard site={selectedSite} />
        )}
        {activeView === "celebrations" && (
          <CelebrationsDashboard site={selectedSite} employees={employees} />
        )}
      </main>
    </div>
  );
}

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag and drop with auto-scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    console.log("🎯 Drag started:", event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log("🎯 Drag ended:", event);
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Extract the drop zone data
      const dropZoneData = over.data.current;

      if (dropZoneData && dropZoneData.onDrop) {
        // Call the drop handler with the dragged employee ID
        dropZoneData.onDrop(active.id as string);
      }
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={{
          enabled: true,
          threshold: {
            x: 0.2,
            y: 0.2,
          },
          acceleration: 10,
        }}
      >
        <div className="App">
          <AppContent />
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg opacity-90">
              Dragging employee...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </QueryClientProvider>
  );
}

export default App;
