import React, { useState, useEffect } from "react";
import { Employee, Site, Role, Status, CommissionTier } from "../types";
import {
  XMarkIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CakeIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import {
  calculateAgentCommission,
  getCompensationInfo,
  validateCommissionTierChange,
  canPromoteToVeteran,
} from "../utils/commissionCalculator";

interface EmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: Employee) => void;
  onDelete?: (employeeId: string) => void;
  onReassign?: (employeeId: string, newManagerId: string) => void;
  mode: "view" | "edit" | "create";
  availableManagers?: Employee[];
  defaultSite?: Site;
}

const roles: Role[] = ["Sales Director", "Sales Manager", "Team Lead", "Agent"];
const sites: Site[] = ["Austin", "Charlotte"];

interface FormData {
  name?: string;
  role?: Role;
  site?: Site;
  startDate?: number;
  birthDate?: number;
  status?: Status;
  commissionTier?: CommissionTier;
  notes?: string;
  managerId?: string;
  teamId?: string;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onReassign,
  mode,
  availableManagers,
  defaultSite = "Austin",
}) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: "",
    role: "Agent",
    site: defaultSite,
    startDate: Date.now(),
    status: "active",
    commissionTier: "new",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        name: employee.name,
        role: employee.role,
        site: employee.site,
        startDate: employee.startDate,
        birthDate: employee.birthDate,
        status: employee.status,
        commissionTier: employee.commissionTier,
        notes: employee.notes || "",
        managerId: employee.managerId,
        teamId: employee.teamId,
      });
    } else if (mode === "create" && isOpen) {
      // Set default start date to 6 months ago for new employees
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      setFormData({
        name: "",
        role: "Agent",
        site: defaultSite,
        startDate: sixMonthsAgo.getTime(),
        birthDate: undefined,
        status: "active",
        commissionTier: "new",
        notes: "",
        managerId: undefined, // Explicitly set to undefined initially
      });
    }
    setErrors({});
  }, [employee, isOpen, mode]);

  // Clear manager selection when site changes in create mode
  useEffect(() => {
    if (mode === "create" && formData.site) {
      setFormData((prev) => ({ ...prev, managerId: undefined }));
    }
  }, [formData.site, mode]);

  // Set commission tier when role changes in create mode
  useEffect(() => {
    if (mode === "create" && formData.role) {
      if (formData.role === "Agent" || formData.role === "Team Lead") {
        setFormData((prev) => ({ ...prev, commissionTier: "new" }));
      } else {
        setFormData((prev) => ({ ...prev, commissionTier: undefined }));
      }
    }
  }, [formData.role, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (!formData.site) {
      newErrors.site = "Site is required";
    }

    // Require manager assignment for Team Leads and Agents
    if (
      (formData.role === "Team Lead" || formData.role === "Agent") &&
      !formData.managerId
    ) {
      newErrors.managerId =
        "Manager assignment is required for Team Leads and Agents";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Create employee object without undefined values (Firebase doesn't accept them)
    const baseEmployeeData = {
      name: formData.name!,
      role: formData.role!,
      site: formData.site!,
      startDate: formData.startDate!,
      status: formData.status || "active",
    };

    // Create full employee object with proper ID handling
    const updatedEmployee: Employee = {
      ...baseEmployeeData,
      id: employee?.id || `temp-${Date.now()}`, // Temp ID for new employees, Firebase will replace
    };

    // Only add properties that have values
    if (formData.managerId) {
      updatedEmployee.managerId = formData.managerId;
    }
    if (formData.teamId) {
      updatedEmployee.teamId = formData.teamId;
    }
    if (formData.birthDate) {
      updatedEmployee.birthDate = formData.birthDate;
    }

    // Set commission tier for Agents and Team Leads
    if (formData.role === "Agent" || formData.role === "Team Lead") {
      updatedEmployee.commissionTier = formData.commissionTier || "new";
    }

    if (formData.notes && formData.notes.trim()) {
      updatedEmployee.notes = formData.notes.trim();
    }

    onSave(updatedEmployee);
    onClose();
  };

  const handleDelete = () => {
    if (employee && onDelete) {
      if (
        window.confirm(
          `Are you sure you want to delete ${employee.name}? This action cannot be undone.`
        )
      ) {
        onDelete(employee.id);
        onClose();
      }
    }
  };

  const getCommissionDetails = () => {
    if (!employee || employee.role !== "Agent") return null;
    return calculateAgentCommission(employee);
  };

  if (!isOpen) return null;

  const isViewMode = mode === "view";
  const isCreateMode = mode === "create";
  const commissionDetails = getCommissionDetails();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isCreateMode
              ? "Add New Employee"
              : isViewMode
              ? "Employee Details"
              : "Edit Employee"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              {isViewMode ? (
                <div className="flex items-center">
                  <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">{employee?.name}</span>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter employee name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              {isViewMode ? (
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    employee?.role === "Sales Director"
                      ? "bg-sales-director text-white"
                      : employee?.role === "Sales Manager"
                      ? "bg-sales-manager text-white"
                      : employee?.role === "Team Lead"
                      ? "bg-team-lead text-white"
                      : "bg-agent text-white"
                  }`}
                >
                  {employee?.role}
                </span>
              ) : (
                <div>
                  <select
                    value={formData.role || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as Role })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.role ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                  )}
                </div>
              )}
            </div>

            {/* Site */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site *
              </label>
              {isViewMode ? (
                <span className="text-gray-900">{employee?.site}</span>
              ) : (
                <div>
                  <select
                    value={formData.site || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, site: e.target.value as Site })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.site ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    {sites.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                  {errors.site && (
                    <p className="mt-1 text-sm text-red-600">{errors.site}</p>
                  )}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              {isViewMode ? (
                <div className="flex items-center">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">
                    {employee
                      ? format(new Date(employee.startDate), "MMM dd, yyyy")
                      : ""}
                  </span>
                </div>
              ) : (
                <input
                  type="date"
                  value={
                    formData.startDate
                      ? format(new Date(formData.startDate), "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      // Create date at noon to avoid timezone issues
                      const selectedDate = new Date(
                        e.target.value + "T12:00:00"
                      );
                      setFormData({
                        ...formData,
                        startDate: selectedDate.getTime(),
                      });
                    }
                  }}
                  min="2020-01-01" // Allow dates from 2020 onwards
                  max="2030-12-31" // Allow dates up to 2030
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              {!isViewMode && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Select the employee's start date (any date from 2020 to
                    2030)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setFormData({
                          ...formData,
                          startDate: today.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const oneMonth = new Date();
                        oneMonth.setMonth(oneMonth.getMonth() - 1);
                        setFormData({
                          ...formData,
                          startDate: oneMonth.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      1 Month Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const threeMonths = new Date();
                        threeMonths.setMonth(threeMonths.getMonth() - 3);
                        setFormData({
                          ...formData,
                          startDate: threeMonths.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      3 Months Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sixMonths = new Date();
                        sixMonths.setMonth(sixMonths.getMonth() - 6);
                        setFormData({
                          ...formData,
                          startDate: sixMonths.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      6 Months Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nineMonths = new Date();
                        nineMonths.setMonth(nineMonths.getMonth() - 9);
                        setFormData({
                          ...formData,
                          startDate: nineMonths.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      9 Months Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const oneYear = new Date();
                        oneYear.setFullYear(oneYear.getFullYear() - 1);
                        setFormData({
                          ...formData,
                          startDate: oneYear.getTime(),
                        });
                      }}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      1 Year Ago
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Date
              </label>
              {isViewMode ? (
                <div className="flex items-center">
                  <CakeIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">
                    {employee?.birthDate
                      ? format(new Date(employee.birthDate), "MMMM d")
                      : "Not specified"}
                  </span>
                </div>
              ) : (
                <input
                  type="date"
                  value={
                    formData.birthDate
                      ? format(new Date(formData.birthDate), "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedDate = new Date(
                        e.target.value + "T12:00:00"
                      );
                      setFormData({
                        ...formData,
                        birthDate: selectedDate.getTime(),
                      });
                    } else {
                      setFormData({
                        ...formData,
                        birthDate: undefined,
                      });
                    }
                  }}
                  min="1950-01-01"
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              {!isViewMode && (
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Used for birthday celebrations (only month and day
                  are displayed)
                </p>
              )}
            </div>
          </div>

          {/* Commission Information (for Agents) */}
          {employee?.role === "Agent" && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                Commission Information
              </h3>

              {isViewMode ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Current Tier:</strong>{" "}
                    {employee.commissionTier === "new"
                      ? "New Agent"
                      : "Veteran Agent"}
                  </div>
                  <div>
                    <strong>Compensation:</strong>{" "}
                    {getCompensationInfo(employee)}
                  </div>
                  {commissionDetails && (
                    <>
                      <div>
                        <strong>Commission Rate:</strong>{" "}
                        {commissionDetails.currentCommissionRate * 100}%
                      </div>
                      {commissionDetails.willChangeToVeteran && (
                        <div className="text-amber-600">
                          <strong>Status Change:</strong> Will become veteran in{" "}
                          {commissionDetails.daysUntilChange} days
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Tier
                  </label>
                  <select
                    value={formData.commissionTier || "new"}
                    onChange={(e) => {
                      const newTier = e.target.value as CommissionTier;

                      // In edit mode, allow data corrections with a warning for veteran→new changes
                      if (
                        employee?.commissionTier === "veteran" &&
                        newTier === "new"
                      ) {
                        const confirmed = window.confirm(
                          "⚠️ DATA CORRECTION MODE ⚠️\n\n" +
                            "You are changing this agent from Veteran back to New status. " +
                            "This should only be done to correct incorrect data.\n\n" +
                            "Are you sure this is a data correction and not a demotion?"
                        );
                        if (!confirmed) return;
                      }

                      // For manual promotion to veteran, add confirmation (but allow it)
                      if (
                        newTier === "veteran" &&
                        employee?.commissionTier !== "veteran"
                      ) {
                        const confirmed = window.confirm(
                          "Are you sure you want to promote this agent to veteran status? " +
                            "This will give them the 30k base + 20% commission structure. " +
                            "This change cannot be undone through normal operations."
                        );
                        if (!confirmed) return;
                      }

                      setFormData({
                        ...formData,
                        commissionTier: newTier,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">
                      New Agent - $60k + 5% commission
                    </option>
                    <option value="veteran">
                      Veteran Agent - $30k + 20% commission
                    </option>
                  </select>

                  {/* Show data correction info */}
                  {!isViewMode && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-700">
                        <strong>Data Correction Mode:</strong> You can adjust
                        both start dates and commission tiers to correct any
                        incorrect data. This includes changing veteran agents
                        back to new status if needed.
                      </p>
                    </div>
                  )}

                  {/* Show promotion eligibility info */}
                  {employee && employee.commissionTier !== "veteran" && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Manual Promotion Available:</strong> This agent
                        can be promoted to veteran status early based on
                        performance. Once promoted, they cannot return to the
                        new agent structure through normal operations.
                      </p>
                    </div>
                  )}

                  {/* Show early promotion status */}
                  {commissionDetails?.isEarlyPromotion && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Early Promotion:</strong> This agent was
                        promoted to veteran status before completing 6 months of
                        service.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manager Assignment (for Team Leads and Agents) */}
          {((employee &&
            (employee.role === "Team Lead" || employee.role === "Agent")) ||
            (isCreateMode &&
              (formData.role === "Team Lead" || formData.role === "Agent"))) &&
            availableManagers &&
            availableManagers.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Manager Assignment
                </h3>

                <div className="space-y-3">
                  {!isCreateMode && employee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Manager
                      </label>
                      <div className="bg-gray-50 rounded-md p-3">
                        {employee.managerId ? (
                          (() => {
                            const currentManager = availableManagers.find(
                              (m) => m.id === employee.managerId
                            );
                            return currentManager ? (
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-sales-manager rounded mr-2"></div>
                                <span className="font-medium text-gray-900">
                                  {currentManager.name}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({currentManager.site})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">
                                Manager not found
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-red-600 font-medium">
                            ⚠️ Unassigned - Needs Manager
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {isCreateMode ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign Manager *
                      </label>
                      <select
                        value={formData.managerId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            managerId: e.target.value,
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.managerId
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        required
                      >
                        <option value="" disabled>
                          Choose a manager...
                        </option>
                        {availableManagers
                          .filter((manager) => manager.site === formData.site) // Only show managers from same site
                          .map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} - {manager.role}
                            </option>
                          ))}
                      </select>
                      {errors.managerId && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.managerId}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        This employee will report to the selected manager
                      </p>
                    </div>
                  ) : (
                    !isViewMode &&
                    onReassign &&
                    employee && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reassign to Manager
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value && employee) {
                              if (
                                window.confirm(
                                  `Reassign ${employee.name} to ${
                                    availableManagers.find(
                                      (m) => m.id === e.target.value
                                    )?.name
                                  }?`
                                )
                              ) {
                                onReassign(employee.id, e.target.value);
                              }
                              e.target.value = ""; // Reset selection
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose a new manager...
                          </option>
                          {availableManagers
                            .filter(
                              (manager) => manager.id !== employee.managerId
                            )
                            .map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name} - {manager.site}
                              </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          This will immediately move the employee to the
                          selected manager's team
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            {isViewMode ? (
              <div className="bg-gray-50 rounded-md p-3 text-gray-900">
                {employee?.notes || "No notes available"}
              </div>
            ) : (
              <textarea
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about this employee..."
              />
            )}
          </div>

          {/* Status (for terminated employees) */}
          {employee?.status === "terminated" && isViewMode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Employee Status
              </h3>
              <span className="inline-block px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                TERMINATED
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <div>
            {!isViewMode && !isCreateMode && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:text-red-800 font-medium"
              >
                Delete Employee
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {isViewMode ? "Close" : "Cancel"}
            </button>

            {!isViewMode && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isCreateMode ? "Create Employee" : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
