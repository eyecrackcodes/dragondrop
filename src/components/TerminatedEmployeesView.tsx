import React, { useState, useMemo } from "react";
import { Employee, Site, TerminationReason } from "../types";
import { format, differenceInDays } from "date-fns";
import {
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  UserMinusIcon,
  ChartBarIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { DocumentViewer } from "./DocumentViewer";

interface TerminatedEmployeesViewProps {
  employees: Employee[];
  site?: Site;
}

interface TerminationFilters {
  reason: TerminationReason | "all";
  dateRange: "last_30_days" | "last_90_days" | "last_year" | "all";
  site: Site | "all";
  searchTerm: string;
}

export const TerminatedEmployeesView: React.FC<
  TerminatedEmployeesViewProps
> = ({ employees, site }) => {
  const [filters, setFilters] = useState<TerminationFilters>({
    reason: "all",
    dateRange: "all",
    site: site || "all",
    searchTerm: "",
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentsToView, setDocumentsToView] = useState<any[]>([]);
  const [viewingEmployeeName, setViewingEmployeeName] = useState<string>("");

  // Filter terminated employees
  const terminatedEmployees = useMemo(() => {
    const terminated = employees.filter((emp) => emp.status === "terminated");

    console.log("🔍 Terminated employees analysis:", {
      totalEmployees: employees.length,
      terminatedCount: terminated.length,
      terminatedWithDetails: terminated.filter((emp) => emp.terminationDetails)
        .length,
      terminatedEmployees: terminated.map((emp) => ({
        name: emp.name,
        site: emp.site,
        hasTerminationDetails: !!emp.terminationDetails,
        documentCount: emp.terminationDetails?.documents?.length || 0,
      })),
    });

    return terminated;
  }, [employees]);

  // Apply filters
  const filteredEmployees = useMemo(() => {
    let filtered = terminatedEmployees;

    // Site filter
    if (filters.site !== "all") {
      filtered = filtered.filter((emp) => emp.site === filters.site);
    }

    // Search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm) ||
          emp.role.toLowerCase().includes(searchTerm) ||
          emp.terminationDetails?.notes.toLowerCase().includes(searchTerm)
      );
    }

    // Reason filter
    if (filters.reason !== "all") {
      filtered = filtered.filter(
        (emp) => emp.terminationDetails?.reason === filters.reason
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = Date.now();
      const daysMap = {
        last_30_days: 30,
        last_90_days: 90,
        last_year: 365,
      };
      const dayLimit = daysMap[filters.dateRange];

      filtered = filtered.filter((emp) => {
        if (!emp.terminationDetails) return false;
        const daysSince = differenceInDays(
          now,
          emp.terminationDetails.terminationDate
        );
        return daysSince <= dayLimit;
      });
    }

    // Sort by termination date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.terminationDetails?.terminationDate || 0;
      const dateB = b.terminationDetails?.terminationDate || 0;
      return dateB - dateA;
    });
  }, [terminatedEmployees, filters]);

  // Statistics
  const stats = useMemo(() => {
    const totalTerminated = terminatedEmployees.length;
    const last30Days = terminatedEmployees.filter((emp) => {
      if (!emp.terminationDetails) return false;
      return (
        differenceInDays(Date.now(), emp.terminationDetails.terminationDate) <=
        30
      );
    }).length;

    const reasonCounts = terminatedEmployees.reduce((acc, emp) => {
      const reason = emp.terminationDetails?.reason || "unknown";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalTerminated,
      recent: last30Days,
      reasons: reasonCounts,
    };
  }, [terminatedEmployees]);

  const getReasonLabel = (reason: TerminationReason): string => {
    const labels = {
      voluntary_resignation: "Voluntary Resignation",
      involuntary_termination: "Involuntary Termination",
      performance_issues: "Performance Issues",
      misconduct: "Misconduct",
      layoff: "Layoff",
      position_elimination: "Position Elimination",
      end_of_contract: "End of Contract",
      retirement: "Retirement",
      other: "Other",
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: TerminationReason): string => {
    const colors = {
      voluntary_resignation: "bg-blue-50 text-blue-700 border-blue-200",
      involuntary_termination: "bg-red-50 text-red-700 border-red-200",
      performance_issues: "bg-orange-50 text-orange-700 border-orange-200",
      misconduct: "bg-red-50 text-red-700 border-red-200",
      layoff: "bg-purple-50 text-purple-700 border-purple-200",
      position_elimination: "bg-purple-50 text-purple-700 border-purple-200",
      end_of_contract: "bg-gray-50 text-gray-700 border-gray-200",
      retirement: "bg-green-50 text-green-700 border-green-200",
      other: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return colors[reason] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getReasonIcon = (reason: TerminationReason) => {
    const icons = {
      voluntary_resignation: "👋",
      involuntary_termination: "🚫",
      performance_issues: "📉",
      misconduct: "⚠️",
      layoff: "📊",
      position_elimination: "🗂️",
      end_of_contract: "📄",
      retirement: "🎉",
      other: "📝",
    };
    return icons[reason] || "📝";
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleViewDocuments = (employee: Employee) => {
    if (
      employee.terminationDetails?.documents &&
      employee.terminationDetails.documents.length > 0
    ) {
      console.log(
        `📄 Opening document viewer for ${employee.name} with ${employee.terminationDetails.documents.length} documents`
      );
      setDocumentsToView(employee.terminationDetails.documents);
      setViewingEmployeeName(employee.name);
      setDocumentViewerOpen(true);
    } else {
      console.log(`⚠️ No documents found for ${employee.name}`);
      alert(`No documents available for ${employee.name}`);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <UserMinusIcon className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Terminated Employees
              </h2>
              <p className="text-gray-600 mt-1">
                {site ? `${site} Site` : "All Sites"} •{" "}
                {filteredEmployees.length} of {terminatedEmployees.length}{" "}
                terminated employees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Terminated
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <UserIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats.recent}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Reason</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {stats.total > 0
                  ? getReasonLabel(
                      Object.entries(stats.reasons).reduce(
                        (a, b) =>
                          stats.reasons[a[0]] > stats.reasons[b[0]] ? a : b,
                        ["none", 0]
                      )[0] as TerminationReason
                    )
                  : "None"}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Tenure</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {terminatedEmployees.length > 0
                  ? Math.round(
                      terminatedEmployees.reduce((sum, emp) => {
                        if (emp.terminationDetails?.terminationDate) {
                          return (
                            sum +
                            differenceInDays(
                              emp.terminationDetails.terminationDate,
                              emp.startDate
                            ) /
                              30
                          );
                        }
                        return sum;
                      }, 0) / terminatedEmployees.length
                    )
                  : 0}{" "}
                <span className="text-sm font-normal text-gray-600">
                  months
                </span>
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <BriefcaseIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-6">
          <FunnelIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value })
                }
                placeholder="Search employees, roles, notes..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          {/* Termination Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <select
              value={filters.reason}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  reason: e.target.value as TerminationReason | "all",
                })
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="all">All Reasons</option>
              <option value="voluntary_resignation">
                Voluntary Resignation
              </option>
              <option value="involuntary_termination">
                Involuntary Termination
              </option>
              <option value="performance_issues">Performance Issues</option>
              <option value="misconduct">Misconduct</option>
              <option value="layoff">Layoff</option>
              <option value="position_elimination">Position Elimination</option>
              <option value="end_of_contract">End of Contract</option>
              <option value="retirement">Retirement</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value as any })
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="last_year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Site Filter (if not already filtered) */}
          {!site && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <select
                value={filters.site}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    site: e.target.value as Site | "all",
                  })
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="all">All Sites</option>
                <option value="Austin">Austin</option>
                <option value="Charlotte">Charlotte</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Terminated Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Terminated Employee Records
          </h3>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <UserMinusIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">
              No terminated employees found matching the current filters.
            </p>
            {filters.searchTerm ||
            filters.reason !== "all" ||
            filters.dateRange !== "all" ? (
              <button
                onClick={() =>
                  setFilters({
                    reason: "all",
                    dateRange: "all",
                    site: site || "all",
                    searchTerm: "",
                  })
                }
                className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Termination Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tenure
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Final Payout
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.role} • {employee.site}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {employee.terminationDetails ? (
                        <div>
                          <div className="text-gray-900 font-medium">
                            {format(
                              new Date(
                                employee.terminationDetails.terminationDate
                              ),
                              "MMM dd, yyyy"
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {differenceInDays(
                              Date.now(),
                              employee.terminationDetails.terminationDate
                            )}{" "}
                            days ago
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No date</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {employee.terminationDetails ? (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getReasonColor(
                            employee.terminationDetails.reason
                          )}`}
                        >
                          <span className="mr-1.5">
                            {getReasonIcon(employee.terminationDetails.reason)}
                          </span>
                          {getReasonLabel(employee.terminationDetails.reason)}
                        </span>
                      ) : (
                        <span className="text-gray-400">No reason</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.terminationDetails ? (
                        <div>
                          <div className="font-medium">
                            {Math.round(
                              differenceInDays(
                                employee.terminationDetails.terminationDate,
                                employee.startDate
                              ) / 30
                            )}{" "}
                            months
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(employee.startDate), "MMM yyyy")} -{" "}
                            {format(
                              new Date(
                                employee.terminationDetails.terminationDate
                              ),
                              "MMM yyyy"
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        {employee.terminationDetails?.documents &&
                        employee.terminationDetails.documents.length > 0 ? (
                          <>
                            <span className="text-gray-900 font-medium">
                              {employee.terminationDetails.documents.length}
                            </span>
                            <button
                              onClick={() => handleViewDocuments(employee)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="View documents"
                            >
                              <ClipboardDocumentListIcon className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {employee.terminationDetails?.finalPayoutAmount ? (
                        <span className="font-medium text-gray-900">
                          $
                          {employee.terminationDetails.finalPayoutAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {employee.terminationDetails ? (
                        <button
                          onClick={() => handleViewDetails(employee)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4 mr-1.5" />
                          Details
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No details
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Termination Details Modal */}
      {showDetailsModal &&
        selectedEmployee &&
        selectedEmployee.terminationDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Termination Details
                  </h2>
                  <p className="text-gray-600">{selectedEmployee.name}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedEmployee.name}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span>{" "}
                      {selectedEmployee.role}
                    </div>
                    <div>
                      <span className="font-medium">Site:</span>{" "}
                      {selectedEmployee.site}
                    </div>
                    <div>
                      <span className="font-medium">Start Date:</span>{" "}
                      {format(
                        new Date(selectedEmployee.startDate),
                        "MMM dd, yyyy"
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Employment Duration:</span>{" "}
                      {Math.floor(
                        differenceInDays(
                          selectedEmployee.terminationDetails.terminationDate,
                          selectedEmployee.startDate
                        ) / 30
                      )}{" "}
                      months
                    </div>
                  </div>
                </div>

                {/* Termination Details */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-3">
                    Termination Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Termination Date:</span>
                      <div>
                        {format(
                          new Date(
                            selectedEmployee.terminationDetails.terminationDate
                          ),
                          "MMM dd, yyyy"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Last Working Day:</span>
                      <div>
                        {format(
                          new Date(
                            selectedEmployee.terminationDetails.lastWorkingDay
                          ),
                          "MMM dd, yyyy"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Reason:</span>
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(
                            selectedEmployee.terminationDetails.reason
                          )}`}
                        >
                          {getReasonLabel(
                            selectedEmployee.terminationDetails.reason
                          )}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Terminated By:</span>
                      <div>
                        {selectedEmployee.terminationDetails.terminatedBy}
                      </div>
                    </div>
                    {selectedEmployee.terminationDetails.finalPayoutAmount && (
                      <div>
                        <span className="font-medium">Final Payout:</span>
                        <div>
                          $
                          {selectedEmployee.terminationDetails.finalPayoutAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Exit Survey:</span>
                      <div>
                        {selectedEmployee.terminationDetails.exitSurveyCompleted
                          ? "✅ Completed"
                          : "❌ Not Completed"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Termination Notes */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                    Termination Notes
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedEmployee.terminationDetails.notes}
                    </p>
                  </div>
                </div>

                {/* Documents */}
                {selectedEmployee.terminationDetails.documents &&
                  selectedEmployee.terminationDetails.documents.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                        Documents (
                        {selectedEmployee.terminationDetails.documents.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedEmployee.terminationDetails.documents.map(
                          (doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <DocumentArrowDownIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {doc.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {doc.category
                                      .replace("_", " ")
                                      .toUpperCase()}{" "}
                                    • Uploaded{" "}
                                    {format(
                                      new Date(doc.uploadDate),
                                      "MMM dd, yyyy"
                                    )}{" "}
                                    by {doc.uploadedBy}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setDocumentsToView([doc]);
                                    setViewingEmployeeName(
                                      selectedEmployee.name
                                    );
                                    setDocumentViewerOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                  title="View document"
                                >
                                  <EyeIcon className="w-4 h-4 mr-1" />
                                  View
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end p-6 border-t bg-gray-50">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Document Viewer */}
      <DocumentViewer
        documents={documentsToView}
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        employeeName={viewingEmployeeName}
      />
    </div>
  );
};
