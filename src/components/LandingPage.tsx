import React from "react";
import {
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  SparklesIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  UsersIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

interface LandingPageProps {
  onNavigate: (view: "org-chart" | "commission-dashboard") => void;
  selectedSite: string;
  onSiteChange: (site: "Austin" | "Charlotte") => void;
  isConnected: boolean;
  stats?: {
    totalEmployees: number;
    totalManagers: number;
    activeAgents: number;
  };
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  selectedSite,
  onSiteChange,
  isConnected,
  stats,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-indigo-600/10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Enhanced Dragon Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-2xl p-6 shadow-2xl border border-white/30 backdrop-blur-sm">
                  <span className="text-6xl filter drop-shadow-lg block">
                    🐉
                  </span>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Dragon Drop
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Modern sales organization management with intuitive drag-and-drop
              functionality, real-time analytics, and seamless team
              coordination.
            </p>

            {/* Connection Status */}
            <div className="flex justify-center mb-12">
              <div
                className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  isConnected
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isConnected
                      ? "bg-green-500 animate-pulse"
                      : "bg-amber-500 animate-bounce"
                  }`}
                ></div>
                {isConnected ? "🔥 Firebase Connected" : "🧪 Demo Mode"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Selection */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Select Your Site
          </h2>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => onSiteChange("Austin")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center ${
                selectedSite === "Austin"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <BuildingOfficeIcon className="w-5 h-5 mr-2" />
              Austin HQ
            </button>
            <button
              onClick={() => onSiteChange("Charlotte")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center ${
                selectedSite === "Charlotte"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <BuildingOfficeIcon className="w-5 h-5 mr-2" />
              Charlotte Branch
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Employees
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalEmployees}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalManagers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrophyIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Agents
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeAgents}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Organization Chart Card */}
          <div
            onClick={() => onNavigate("org-chart")}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-105"
          >
            <div className="flex items-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Organization Chart
                </h3>
                <p className="text-gray-600">Manage team structure</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Visualize and manage your sales organization with intuitive
              drag-and-drop functionality. Assign team members, track
              hierarchies, and optimize team structure.
            </p>

            <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <span>Manage Teams</span>
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </div>
          </div>

          {/* Commission Dashboard Card */}
          <div
            onClick={() => onNavigate("commission-dashboard")}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-105"
          >
            <div className="flex items-center mb-6">
              <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <ChartBarIcon className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Commission Dashboard
                </h3>
                <p className="text-gray-600">Track performance</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Monitor sales performance, commission tiers, and agent milestones.
              Get insights into team productivity and compensation analytics.
            </p>

            <div className="flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <span>View Analytics</span>
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-4">
                <SparklesIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Drag & Drop</h3>
              <p className="text-gray-600 text-sm">
                Intuitive team management with auto-scrolling support
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-4">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Real-time Analytics
              </h3>
              <p className="text-gray-600 text-sm">
                Live performance tracking and commission insights
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-4">
                <CogIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Multi-site Support
              </h3>
              <p className="text-gray-600 text-sm">
                Manage multiple locations from one dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
