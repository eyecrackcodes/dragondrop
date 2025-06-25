import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Site } from './types';
import { OrgChart } from './components/OrgChart';
import { CommissionDashboard } from './components/CommissionDashboard';
import { useFirebaseCommissionAlerts, useFirebaseEmployees, useFirebaseConnection } from './hooks/useFirebaseData';
import { useMockCommissionAlerts, useMockEmployees } from './hooks/useMockData';
import { MapPinIcon, ExclamationTriangleIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

type ActiveView = 'org-chart' | 'commission-dashboard';

function AppContent() {
  const [selectedSite, setSelectedSite] = useState<Site>('Austin');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('org-chart');
  
  // Check Firebase connection status
  const { isConnected, isConfigured } = useFirebaseConnection();
  
  // Use Firebase data if available, otherwise fall back to mock data
  const firebaseAlerts = useFirebaseCommissionAlerts();
  const mockAlerts = useMockCommissionAlerts();
  const firebaseEmployees = useFirebaseEmployees();
  const mockEmployees = useMockEmployees();
  
  // Select data source based on Firebase availability
  const { hasAlerts, agentsApproachingMilestone, agentsNeedingUpdate } = isConnected ? firebaseAlerts : mockAlerts;
  const { employees } = isConnected ? firebaseEmployees : mockEmployees;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and branding */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-3 shadow-lg">
                  <span className="text-3xl filter drop-shadow-lg">🐉</span>
                </div>
                <div className="ml-4">
                  <h1 className="text-3xl font-bold text-white drop-shadow-md">Dragon Drop</h1>
                  <p className="text-blue-200 text-sm font-medium">Sales Organization Manager</p>
                </div>
              </div>
              
              {/* Connection status */}
              <div className="ml-6">
                {isConnected ? (
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-500 text-white shadow-lg border-2 border-green-400">
                    <div className="w-3 h-3 bg-green-200 rounded-full mr-3 animate-pulse"></div>
                    🔥 Firebase Connected
                  </div>
                ) : (
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-500 text-white shadow-lg border-2 border-amber-400">
                    <div className="w-3 h-3 bg-amber-200 rounded-full mr-3 animate-pulse"></div>
                    🧪 Demo Mode
                  </div>
                )}
              </div>
            </div>
            
            {/* Site selector and controls */}
            <div className="flex items-center space-x-6">
              <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 shadow-lg border border-white/20">
                <button
                  onClick={() => setSelectedSite('Austin')}
                  className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center ${
                    selectedSite === 'Austin'
                      ? 'bg-white text-slate-900 shadow-md transform scale-105'
                      : 'text-white hover:bg-white/20 hover:scale-105'
                  }`}
                >
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  Austin
                </button>
                <button
                  onClick={() => setSelectedSite('Charlotte')}
                  className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center ${
                    selectedSite === 'Charlotte'
                      ? 'bg-white text-slate-900 shadow-md transform scale-105'
                      : 'text-white hover:bg-white/20 hover:scale-105'
                  }`}
                >
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  Charlotte
                </button>
              </div>
              
              {activeView === 'org-chart' && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 ${
                    showBulkActions
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg border-2 border-emerald-400'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md shadow-lg border border-white/30'
                  }`}
                >
                  {showBulkActions ? '✅ Bulk Mode ON' : '⚡ Enable Bulk Actions'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveView('org-chart')}
              className={`py-4 px-8 font-semibold text-sm flex items-center rounded-t-xl transition-all duration-200 relative group ${
                activeView === 'org-chart'
                  ? 'bg-gradient-to-b from-blue-50 to-white text-blue-700 shadow-lg transform -translate-y-1'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <UserGroupIcon className="w-5 h-5 mr-3" />
              Organization Chart
              {activeView === 'org-chart' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveView('commission-dashboard')}
              className={`py-4 px-8 font-semibold text-sm flex items-center rounded-t-xl transition-all duration-200 relative group ${
                activeView === 'commission-dashboard'
                  ? 'bg-gradient-to-b from-green-50 to-white text-green-700 shadow-lg transform -translate-y-1'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <ChartBarIcon className="w-5 h-5 mr-3" />
              Commission Dashboard
              {(agentsApproachingMilestone.length > 0 || agentsNeedingUpdate.length > 0) && (
                <div className="ml-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce font-bold">
                  {agentsApproachingMilestone.length + agentsNeedingUpdate.length}
                </div>
              )}
              {activeView === 'commission-dashboard' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-full"></div>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Commission Alerts */}
      {hasAlerts && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-l-4 border-amber-400 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-amber-800">⚠️ Commission Alerts</span>
                  <div className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
                    {agentsApproachingMilestone.length + agentsNeedingUpdate.length} Alert{(agentsApproachingMilestone.length + agentsNeedingUpdate.length) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  {agentsApproachingMilestone.length > 0 && (
                    <div className="flex items-center text-amber-700">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                      <span className="font-medium">{agentsApproachingMilestone.length} agent(s)</span>
                      <span className="ml-1">approaching 6-month milestone 🎯</span>
                    </div>
                  )}
                  {agentsNeedingUpdate.length > 0 && (
                    <div className="flex items-center text-amber-700">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      <span className="font-medium">{agentsNeedingUpdate.length} agent(s)</span>
                      <span className="ml-1">need commission structure update 💰</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeView === 'org-chart' ? (
            <div className="space-y-6">
              {/* Page header */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {selectedSite} Site Organization
                      </span>
                    </h2>
                    <p className="mt-2 text-gray-600">
                      Drag and drop employees to reorganize teams, or use bulk actions for multiple changes.
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                      <UserGroupIcon className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization chart */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <OrgChart 
                  site={selectedSite} 
                  showBulkActions={showBulkActions}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dashboard header */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Commission Dashboard
                      </span>
                    </h2>
                    <p className="mt-2 text-gray-600">
                      Track agent commission tiers, milestones, and performance metrics.
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                      <ChartBarIcon className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission dashboard */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <CommissionDashboard 
                  employees={employees}
                  site={selectedSite}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <AppContent />
      </DndProvider>
    </QueryClientProvider>
  );
}

export default App;
