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
} from "@heroicons/react/24/outline";

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
    dateRange: "last_90_days",
    site: site || "all",
    searchTerm: "",
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filter terminated employees
  const terminatedEmployees = useMemo(() => {
    return employees.filter(
      (emp) => emp.status === "terminated" && emp.termination
    );
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
          emp.termination?.notes.toLowerCase().includes(searchTerm)
      );
    }

    // Reason filter
    if (filters.reason !== "all") {
      filtered = filtered.filter(
        (emp) => emp.termination?.reason === filters.reason
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
        if (!emp.termination) return false;
        const daysSince = differenceInDays(
          now,
          emp.termination.terminationDate
        );
        return daysSince <= dayLimit;
      });
    }

    // Sort by termination date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.termination?.terminationDate || 0;
      const dateB = b.termination?.terminationDate || 0;
      return dateB - dateA;
    });
  }, [terminatedEmployees, filters]);

  // Statistics
  const stats = useMemo(() => {
    const totalTerminated = terminatedEmployees.length;
    const last30Days = terminatedEmployees.filter((emp) => {
      if (!emp.termination) return false;
      return (
        differenceInDays(Date.now(), emp.termination.terminationDate) <= 30
      );
    }).length;

    const reasonCounts = terminatedEmployees.reduce((acc, emp) => {
      const reason = emp.termination?.reason || "unknown";
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
      voluntary_resignation: "bg-blue-100 text-blue-800",
      involuntary_termination: "bg-red-100 text-red-800",
      performance_issues: "bg-orange-100 text-orange-800",
      misconduct: "bg-red-100 text-red-800",
      layoff: "bg-purple-100 text-purple-800",
      position_elimination: "bg-purple-100 text-purple-800",
      end_of_contract: "bg-gray-100 text-gray-800",
      retirement: "bg-green-100 text-green-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[reason] || "bg-gray-100 text-gray-800";
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleDownloadDocument = (docUrl: string, fileName: string) => {
    // In a real implementation, this would download from storage
    console.log(`Downloading document: ${fileName} from ${docUrl}`);
    alert(`Document download initiated: ${fileName}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Terminated Employees
          </h2>
          <p className="text-gray-600">
            {site ? `${site} Site` : "All Sites"} • {filteredEmployees.length}{" "}
            of {stats.total} terminated employees
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserIcon className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                Total Terminated
              </p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CalendarIcon className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Top Reason</p>
              <p className="text-lg font-bold text-gray-900">
                {
                  Object.entries(stats.reasons).reduce(
                    (a, b) =>
                      stats.reasons[a[0]] > stats.reasons[b[0]] ? a : b,
                    ["none", 0]
                  )[0]
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value })
                }
                placeholder="Search employees, roles, notes..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Termination Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Terminated Employee Records
          </h3>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No terminated employees found matching the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Termination Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Payout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.role} • {employee.site}
                        </div>
                        <div className="text-xs text-gray-400">
                          Hired:{" "}
                          {format(new Date(employee.startDate), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {employee.termination && (
                        <div>
                          <div className="text-gray-900">
                            {format(
                              new Date(employee.termination.terminationDate),
                              "MMM dd, yyyy"
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {differenceInDays(
                              Date.now(),
                              employee.termination.terminationDate
                            )}{" "}
                            days ago
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {employee.termination && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(
                            employee.termination.reason
                          )}`}
                        >
                          {getReasonLabel(employee.termination.reason)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.termination?.documents.length || 0} files
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.termination?.finalPayoutAmount
                        ? `$${employee.termination.finalPayoutAmount.toLocaleString()}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(employee)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Termination Details Modal */}
      {showDetailsModal && selectedEmployee && selectedEmployee.termination && (
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
                        selectedEmployee.termination.terminationDate,
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
                        new Date(selectedEmployee.termination.terminationDate),
                        "MMM dd, yyyy"
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Last Working Day:</span>
                    <div>
                      {format(
                        new Date(selectedEmployee.termination.lastWorkingDay),
                        "MMM dd, yyyy"
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Reason:</span>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(
                          selectedEmployee.termination.reason
                        )}`}
                      >
                        {getReasonLabel(selectedEmployee.termination.reason)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Terminated By:</span>
                    <div>{selectedEmployee.termination.terminatedBy}</div>
                  </div>
                  {selectedEmployee.termination.finalPayoutAmount && (
                    <div>
                      <span className="font-medium">Final Payout:</span>
                      <div>
                        $
                        {selectedEmployee.termination.finalPayoutAmount.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Exit Survey:</span>
                    <div>
                      {selectedEmployee.termination.exitSurveyCompleted
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
                    {selectedEmployee.termination.notes}
                  </p>
                </div>
              </div>

              {/* Documents */}
              {selectedEmployee.termination.documents.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Documents ({selectedEmployee.termination.documents.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedEmployee.termination.documents.map((doc) => (
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
                              {doc.category.replace("_", " ").toUpperCase()} •
                              Uploaded{" "}
                              {format(new Date(doc.uploadDate), "MMM dd, yyyy")}{" "}
                              by {doc.uploadedBy}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleDownloadDocument(doc.fileUrl, doc.fileName)
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Download
                        </button>
                      </div>
                    ))}
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
    </div>
  );
};
