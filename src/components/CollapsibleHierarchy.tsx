import React, { useState } from "react";
import {
  ChevronDownIcon,
  UserIcon,
  UsersIcon,
  BuildingOfficeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Employee, Role } from "../types";
import { EmployeeCard } from "./EmployeeCard";

interface CollapsibleHierarchyProps {
  employees: Employee[];
  site: string;
  showBulkActions: boolean;
  onEmployeeUpdate?: (employee: Employee) => void;
  onEmployeeDelete?: (employeeId: string) => void;
}

interface HierarchySection {
  role: Role;
  title: string;
  icon: string;
  employees: Employee[];
  defaultExpanded: boolean;
}

export const CollapsibleHierarchy: React.FC<CollapsibleHierarchyProps> = ({
  employees,
  site,
  showBulkActions,
  onEmployeeUpdate,
  onEmployeeDelete,
}) => {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<Role>>(
    new Set<Role>(["Sales Director", "Sales Manager"]) // Directors and Managers expanded by default
  );

  // Filter employees by site
  const siteEmployees = employees.filter((emp) => emp.site === site);

  // Group employees by role
  const hierarchySections: HierarchySection[] = [
    {
      role: "Sales Director",
      title: "Sales Directors",
      icon: "👑",
      employees: siteEmployees.filter((emp) => emp.role === "Sales Director"),
      defaultExpanded: true,
    },
    {
      role: "Sales Manager",
      title: "Sales Managers",
      icon: "🎯",
      employees: siteEmployees.filter((emp) => emp.role === "Sales Manager"),
      defaultExpanded: true,
    },
    {
      role: "Team Lead",
      title: "Team Leads",
      icon: "⭐",
      employees: siteEmployees.filter((emp) => emp.role === "Team Lead"),
      defaultExpanded: false,
    },
    {
      role: "Agent",
      title: "Sales Agents",
      icon: "🚀",
      employees: siteEmployees.filter((emp) => emp.role === "Agent"),
      defaultExpanded: false,
    },
  ];

  const toggleSection = (role: Role) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (role: Role) => expandedSections.has(role);

  const getRoleIconClass = (role: Role) => {
    switch (role) {
      case "Sales Director":
        return "director";
      case "Sales Manager":
        return "manager";
      case "Team Lead":
        return "lead";
      case "Agent":
        return "agent";
      default:
        return "";
    }
  };

  const getHierarchyLevel = (role: Role) => {
    switch (role) {
      case "Sales Director":
        return "level-1";
      case "Sales Manager":
        return "level-2";
      case "Team Lead":
        return "level-3";
      case "Agent":
        return "level-4";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header with Global Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Organization Hierarchy - {site}
          </h2>
          <p className="text-gray-600 mt-1">
            {siteEmployees.length} employees across{" "}
            {hierarchySections.filter((s) => s.employees.length > 0).length}{" "}
            levels
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setExpandedSections(
                new Set<Role>([
                  "Sales Director",
                  "Sales Manager",
                  "Team Lead",
                  "Agent",
                ])
              )
            }
            className="btn-modern btn-small"
          >
            <UsersIcon className="w-4 h-4 mr-2" />
            Expand All
          </button>
          <button
            onClick={() => setExpandedSections(new Set())}
            className="btn-secondary btn-small"
          >
            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Hierarchy Sections */}
      {hierarchySections.map((section) => {
        if (section.employees.length === 0) return null;

        const expanded = isExpanded(section.role);

        return (
          <div
            key={section.role}
            className={`collapsible-section ${
              expanded ? "" : "collapsed"
            } hierarchy-level ${getHierarchyLevel(section.role)}`}
          >
            {/* Section Header */}
            <div
              className={`collapsible-header ${expanded ? "active" : ""}`}
              onClick={() => toggleSection(section.role)}
            >
              <div className="collapsible-title">
                <div className={`role-icon ${getRoleIconClass(section.role)}`}>
                  {section.icon}
                </div>
                <span>{section.title}</span>
                <div className="employee-count">{section.employees.length}</div>
              </div>

              <div className={`collapse-toggle ${expanded ? "expanded" : ""}`}>
                <span>{expanded ? "Hide" : "Show"}</span>
                <ChevronDownIcon className="toggle-icon" />
              </div>
            </div>

            {/* Section Content */}
            <div
              className={`collapsible-content ${expanded ? "expanded" : ""}`}
            >
              <div className="collapsible-inner">
                {expanded ? (
                  // Full employee cards when expanded
                  <div className="collapsible-employee-grid">
                    {section.employees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        showBulkActions={showBulkActions}
                        onEdit={onEmployeeUpdate}
                        onTerminate={
                          onEmployeeDelete
                            ? (emp) => onEmployeeDelete(emp.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  // Mini preview when collapsed (this won't show since content is hidden when collapsed)
                  <div className="text-gray-500 text-center py-4">
                    Click to expand and view {section.employees.length}{" "}
                    {section.title.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary Stats */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hierarchy Summary</h3>
              <p className="text-gray-600 text-sm">
                Complete organizational structure
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6 text-center">
            {hierarchySections.map((section) => (
              <div key={section.role} className="min-w-0">
                <div className="text-2xl font-bold text-gray-900">
                  {section.employees.length}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {section.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
