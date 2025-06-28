import React, { useState, useEffect } from "react";
import { Employee, Site } from "../types";
import {
  celebrationsService,
  CelebrationConfig,
} from "../services/celebrationsService";
import { format } from "date-fns";
import {
  GiftIcon,
  CakeIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { database } from "../services/firebase";
import { ref, update } from "firebase/database";

interface CelebrationsDashboardProps {
  employees: Employee[];
  site?: Site;
}

export const CelebrationsDashboard: React.FC<CelebrationsDashboardProps> = ({
  employees,
  site,
}) => {
  const [loading, setLoading] = useState(false);
  const [injectionResult, setInjectionResult] = useState<string | null>(null);
  const [config, setConfig] = useState<CelebrationConfig>({
    channelId: localStorage.getItem("celebrationsChannelId") || "",
    enableBirthdays: localStorage.getItem("enableBirthdays") !== "false",
    enableAnniversaries:
      localStorage.getItem("enableAnniversaries") !== "false",
    advanceNoticeDays: parseInt(
      localStorage.getItem("advanceNoticeDays") || "0"
    ),
  });
  const [showConfig, setShowConfig] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Birthday data to inject
  const birthdayData = [
    { firstName: "Adelina", lastInitial: "G", month: 8, day: 20 },
    { firstName: "Alana", lastInitial: "T", month: 7, day: 17 },
    { firstName: "Andy", lastInitial: "N", month: 10, day: 24 },
    { firstName: "Aquil", lastInitial: "M", month: 4, day: 22 },
    { firstName: "Ashley", lastInitial: "M", month: 12, day: 28 },
    { firstName: "Autra", lastInitial: "O", month: 5, day: 22 },
    { firstName: "Camryn", lastInitial: "A", month: 4, day: 30 },
    { firstName: "Chris", lastInitial: "C", month: 6, day: 25 },
    { firstName: "David", lastInitial: "D", month: 9, day: 25 },
    { firstName: "Gee", lastInitial: "G", month: 3, day: 10 },
    { firstName: "Ilya", lastInitial: "M", month: 11, day: 22 },
    { firstName: "Jaime", lastInitial: "V", month: 3, day: 14 },
    { firstName: "Jenny", lastInitial: "D", month: 12, day: 9 },
    { firstName: "John", lastInitial: "P", month: 9, day: 7 },
    { firstName: "John", lastInitial: "S", month: 4, day: 3 },
    { firstName: "Karlee", lastInitial: "B", month: 11, day: 15 },
    { firstName: "Katelyn", lastInitial: "H", month: 2, day: 23 },
    { firstName: "Kevin", lastInitial: "G", month: 3, day: 23 },
    { firstName: "Khadijia", lastInitial: "E", month: 11, day: 15 },
    { firstName: "Keyanna", lastInitial: "H", month: 8, day: 3 },
    { firstName: "Kyle", lastInitial: "W", month: 6, day: 6 },
    { firstName: "Marc", lastInitial: "G", month: 10, day: 23 },
    { firstName: "Mario", lastInitial: "H", month: 2, day: 22 },
    { firstName: "Mark", lastInitial: "G", month: 10, day: 23 },
    { firstName: "Melisa", lastInitial: "H", month: 2, day: 16 },
    { firstName: "Melisa", lastInitial: "S", month: 10, day: 9 },
    { firstName: "Miguel", lastInitial: "P", month: 5, day: 10 },
    { firstName: "Monica", lastInitial: "A", month: 10, day: 17 },
    { firstName: "Montrell", lastInitial: "M", month: 2, day: 15 },
    { firstName: "Romey", lastInitial: "K", month: 1, day: 18 },
    { firstName: "Sandi", lastInitial: "D", month: 3, day: 19 },
    { firstName: "Sara", lastInitial: "G", month: 7, day: 21 },
    { firstName: "Shanaya", lastInitial: "A", month: 8, day: 16 },
    { firstName: "Sonya", lastInitial: "K", month: 8, day: 17 },
    { firstName: "Steve", lastInitial: "B", month: 4, day: 25 },
    { firstName: "Tesha", lastInitial: "J", month: 10, day: 30 },
    { firstName: "Wenny", lastInitial: "G", month: 9, day: 19 },
    { firstName: "Krystal", lastInitial: "R", month: 9, day: 26 },
  ];

  const handleInjectBirthdays = async () => {
    if (!database) {
      setInjectionResult("❌ Firebase not configured. Using mock data mode.");
      return;
    }

    setLoading(true);
    let updateCount = 0;
    let notFound: string[] = [];
    let matched: string[] = [];
    const updates: { [key: string]: any } = {};

    birthdayData.forEach((birthday) => {
      const employee = employees.find((emp) => {
        const empName = emp.name.toLowerCase();
        const firstName = birthday.firstName.toLowerCase();
        const lastInitial = birthday.lastInitial.toLowerCase();
        return (
          empName.startsWith(firstName) &&
          empName.split(" ").pop()?.[0].toLowerCase() === lastInitial
        );
      });

      if (employee) {
        // Create birthdate (using year 2000 as placeholder)
        const birthDate = new Date(
          2000,
          birthday.month - 1,
          birthday.day,
          12,
          0,
          0
        ).getTime();
        updates[`employees/${employee.id}/birthDate`] = birthDate;
        matched.push(`${employee.name} → ${birthday.month}/${birthday.day}`);
        updateCount++;
      } else {
        notFound.push(`${birthday.firstName} ${birthday.lastInitial}.`);
      }
    });

    try {
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      let resultMessage = `✅ Updated ${updateCount} employees with birthdays!\n\n`;
      if (matched.length > 0) {
        resultMessage += `Matched:\n${matched.join("\n")}\n\n`;
      }
      if (notFound.length > 0) {
        resultMessage += `Not found (${notFound.length}):\n${notFound.join(
          ", "
        )}`;
      }

      setInjectionResult(resultMessage);
    } catch (error) {
      setInjectionResult(`❌ Error updating birthdays: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees by site if specified
  const filteredEmployees = site
    ? employees.filter((emp) => emp.site === site)
    : employees;

  // Get celebration summary
  const summary = celebrationsService.getCelebrationSummary(filteredEmployees);
  const upcomingCelebrations = celebrationsService.getUpcomingCelebrations(
    filteredEmployees,
    30
  );

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem("celebrationsChannelId", config.channelId);
    localStorage.setItem("enableBirthdays", config.enableBirthdays.toString());
    localStorage.setItem(
      "enableAnniversaries",
      config.enableAnniversaries.toString()
    );
    localStorage.setItem(
      "advanceNoticeDays",
      config.advanceNoticeDays.toString()
    );
  }, [config]);

  const handleSendNotifications = async () => {
    setLoading(true);
    setSendResult(null);

    try {
      const result = await celebrationsService.sendCelebrationNotifications(
        filteredEmployees,
        config
      );
      setSendResult(result);
    } catch (error) {
      setSendResult({
        success: false,
        message: `Error: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const todayCount =
    summary.todayBirthdays.length + summary.todayAnniversaries.length;
  const upcomingCount =
    summary.upcomingBirthdays.length + summary.upcomingAnniversaries.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Celebrations</h1>
            <p className="mt-2 text-sm text-gray-600">
              {site ? `${site} Site` : "All Sites"} • Birthdays and Work
              Anniversaries
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Cog6ToothIcon className="w-5 h-5 inline-block mr-2" />
            Configure
          </button>
        </div>
      </div>

      {/* Development Mode Birthday Injection Button */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">
            Development Tool: Inject Birthdays
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            This button will inject birthdays for 38 employees based on first
            name and last initial matching.
          </p>
          <button
            onClick={handleInjectBirthdays}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            🎂 Inject All Birthdays
          </button>
          {injectionResult && (
            <pre className="mt-3 text-xs text-yellow-800 whitespace-pre-wrap bg-yellow-100 p-3 rounded">
              {injectionResult}
            </pre>
          )}
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Slack Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Celebrations Channel ID
              </label>
              <input
                type="text"
                value={config.channelId}
                onChange={(e) =>
                  setConfig({ ...config, channelId: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="e.g., C08LZUW73EF"
              />
              <p className="mt-1 text-xs text-gray-500">
                Slack channel where celebration notifications will be sent
              </p>
            </div>

            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableBirthdays}
                  onChange={(e) =>
                    setConfig({ ...config, enableBirthdays: e.target.checked })
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable Birthday Notifications
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableAnniversaries}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      enableAnniversaries: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable Anniversary Notifications
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Advance Notice (days)
              </label>
              <select
                value={config.advanceNoticeDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    advanceNoticeDays: parseInt(e.target.value),
                  })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value={0}>Same day</option>
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={7}>1 week before</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CakeIcon className="w-8 h-8 text-pink-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                Today's Birthdays
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.todayBirthdays.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <GiftIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                Today's Anniversaries
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.todayAnniversaries.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Next 7 Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {upcomingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <button
            onClick={handleSendNotifications}
            disabled={loading || !config.channelId}
            className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
              config.channelId
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <BellIcon className="w-5 h-5 inline-block mr-2" />
            {loading ? "Sending..." : "Send to Slack"}
          </button>
          {!config.channelId && (
            <p className="text-xs text-gray-500 mt-2">
              Configure channel first
            </p>
          )}
        </div>
      </div>

      {/* Send Result Alert */}
      {sendResult && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            sendResult.success
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="text-sm">{sendResult.message}</p>
        </div>
      )}

      {/* Today's Celebrations */}
      {todayCount > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Today's Celebrations 🎉
          </h2>
          <div className="bg-purple-50 rounded-lg p-6 space-y-3">
            {summary.todayBirthdays.map((alert) => (
              <div
                key={`bday-${alert.employee.id}`}
                className="flex items-center"
              >
                <CakeIcon className="w-6 h-6 text-pink-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {alert.employee.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {alert.employee.role} • {alert.employee.site}
                  </p>
                </div>
              </div>
            ))}
            {summary.todayAnniversaries.map((alert) => (
              <div
                key={`anniv-${alert.employee.id}`}
                className="flex items-center"
              >
                <GiftIcon className="w-6 h-6 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {alert.employee.name} - {alert.yearsCount} year
                    {alert.yearsCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    {alert.employee.role} • {alert.employee.site}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Celebrations */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Upcoming Celebrations
        </h2>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Until
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {upcomingCelebrations.slice(0, 10).map((alert, index) => (
                <tr key={`${alert.type}-${alert.employee.id}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {alert.employee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alert.employee.role} • {alert.employee.site}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {alert.type === "birthday" ? (
                        <CakeIcon className="w-5 h-5 text-pink-600 mr-2" />
                      ) : (
                        <GiftIcon className="w-5 h-5 text-purple-600 mr-2" />
                      )}
                      <span className="text-sm text-gray-900">
                        {alert.type === "birthday"
                          ? "Birthday"
                          : `${alert.yearsCount} Year Anniversary`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(alert.date, "MMMM d")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        alert.daysUntil === 0
                          ? "bg-green-100 text-green-800"
                          : alert.daysUntil <= 3
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {alert.daysUntil === 0
                        ? "Today"
                        : alert.daysUntil === 1
                        ? "Tomorrow"
                        : `${alert.daysUntil} days`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Schedule Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">
          Automated Notifications
        </h3>
        <p className="text-sm text-blue-700">
          Celebrations are automatically sent to Slack on weekdays at 9 AM. You
          can also send manual notifications using the button above.
        </p>
      </div>
    </div>
  );
};
