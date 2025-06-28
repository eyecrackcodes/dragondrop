import React, { useState, useEffect } from "react";
import { tenureAlertService, TenureAlert } from "../services/tenureAlerts";
import { Site } from "../types";
import {
  BellAlertIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface TenureAlertsDashboardProps {
  site?: Site;
}

export const TenureAlertsDashboard: React.FC<TenureAlertsDashboardProps> = ({
  site,
}) => {
  const [alerts, setAlerts] = useState<TenureAlert[]>([]);
  const [summary, setSummary] = useState({
    totalNewAgents: 0,
    totalVeteranAgents: 0,
    upcomingTransitions: 0,
    overdueTransitions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [site]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [alertsData, summaryData] = await Promise.all([
        tenureAlertService.getUpcomingTenureAlerts(site),
        tenureAlertService.getTenureSummary(site),
      ]);

      setAlerts(alertsData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading tenure alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlerts = async () => {
    if (alerts.length === 0) return;

    setSendingAlert(true);
    try {
      await tenureAlertService.sendTenureAlerts(alerts);
      alert("✅ Tenure alerts sent successfully to Slack!");
    } catch (error) {
      console.error("Error sending alerts:", error);
      alert("❌ Failed to send alerts. Please check Slack configuration.");
    } finally {
      setSendingAlert(false);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "overdue":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case "imminent":
        return <BellAlertIcon className="w-5 h-5 text-yellow-500" />;
      case "upcoming":
        return <CalendarDaysIcon className="w-5 h-5 text-green-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBgColor = (alertType: string) => {
    switch (alertType) {
      case "overdue":
        return "bg-red-50 border-red-200";
      case "imminent":
        return "bg-yellow-50 border-yellow-200";
      case "upcoming":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BellAlertIcon className="w-8 h-8 text-blue-600" />
            Tenure Alerts Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor employees approaching their 6-month commission tier
            eligibility
          </p>
        </div>

        <button
          onClick={handleSendAlerts}
          disabled={alerts.length === 0 || sendingAlert}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            alerts.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {sendingAlert
            ? "Sending..."
            : `Send ${alerts.length} Alert${
                alerts.length !== 1 ? "s" : ""
              } to Slack`}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-blue-600 text-sm font-medium">New Agents</div>
          <div className="text-2xl font-bold text-blue-800">
            {summary.totalNewAgents}
          </div>
          <div className="text-xs text-blue-600">$60k + 5% commission</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-purple-600 text-sm font-medium">
            Veteran Agents
          </div>
          <div className="text-2xl font-bold text-purple-800">
            {summary.totalVeteranAgents}
          </div>
          <div className="text-xs text-purple-600">$30k + 20% commission</div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-yellow-700 text-sm font-medium">
            Upcoming (7 days)
          </div>
          <div className="text-2xl font-bold text-yellow-800">
            {summary.upcomingTransitions}
          </div>
          <div className="text-xs text-yellow-700">Approaching eligibility</div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-red-600 text-sm font-medium">Overdue</div>
          <div className="text-2xl font-bold text-red-800">
            {summary.overdueTransitions}
          </div>
          <div className="text-xs text-red-600">Need immediate attention</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>

        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No tenure alerts at this time</p>
            <p className="text-sm text-gray-500 mt-1">
              All agents are properly classified
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.employee.id}-${index}`}
                className={`border rounded-lg p-4 ${getAlertBgColor(
                  alert.alertType
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.alertType)}
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {alert.employee.name}
                      </h4>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Site: {alert.employee.site}</span>
                        <span>
                          Start Date:{" "}
                          {new Date(
                            alert.employee.startDate
                          ).toLocaleDateString()}
                        </span>
                        <span>
                          Eligibility:{" "}
                          {alert.eligibilityDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {alert.alertType === "overdue"
                        ? `${alert.daysUntilEligible} days overdue`
                        : alert.daysUntilEligible === 1
                        ? "Tomorrow"
                        : `${alert.daysUntilEligible} days`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Schedule Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5" />
          Automated Alert Schedule
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 7 days before eligibility - First notification</li>
          <li>• 1 day before eligibility - Urgent reminder</li>
          <li>• After eligibility date - Overdue alerts until resolved</li>
          <li>• Alerts sent weekdays at 9:00 AM to configured Slack channel</li>
        </ul>
      </div>
    </div>
  );
};
