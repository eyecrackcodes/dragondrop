import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Employee } from "../types";
import { calculateAgentCommission } from "../utils/commissionCalculator";

interface EmployeeCardProps {
  employee: Employee;
  onView?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onPromote?: (employee: Employee) => void;
  onTransfer?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onSelect?: (employeeId: string, selected: boolean) => void;
  isSelected?: boolean;
  showBulkActions?: boolean;
  isDragMode?: boolean;
  onDragStart?: (employee: Employee) => void;
  onDragEnd?: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onView,
  onEdit,
  onPromote,
  onTransfer,
  onTerminate,
  onSelect,
  isSelected = false,
  showBulkActions = false,
  isDragMode = false,
  onDragStart,
  onDragEnd,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: employee.id,
      disabled: !isDragMode,
      data: {
        employee,
        type: "employee",
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Calculate commission info for agents
  const commissionInfo =
    employee.role === "Agent" ? calculateAgentCommission(employee) : null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Sales Director":
        return "from-purple-500 via-violet-500 to-indigo-600";
      case "Sales Manager":
        return "from-blue-500 via-cyan-500 to-teal-600";
      case "Team Lead":
        return "from-green-500 via-emerald-500 to-teal-600";
      case "Agent":
        return "from-gray-500 via-slate-500 to-gray-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Sales Director":
        return "👑";
      case "Sales Manager":
        return "👔";
      case "Team Lead":
        return "🎯";
      case "Agent":
        return "💼";
      default:
        return "👤";
    }
  };

  const getRoleClass = (role: string) => {
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
        return "agent";
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect?.(employee.id, e.target.checked);
  };

  if (employee.status === "terminated") {
    return (
      <div className="relative employee-card opacity-60 transform hover:scale-105 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/90 to-red-100/90 border-3 border-red-300 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border-2 border-red-400 animate-pulse">
            <span className="mr-2">❌</span>
            Terminated Employee
          </div>
        </div>
        <div className="blur-sm p-6">
          <div className="font-semibold text-gray-600 text-lg">
            {employee.name}
          </div>
          <div className="text-sm text-gray-500 mt-1">{employee.role}</div>
          <div className="text-sm text-gray-500 mt-1">📍 {employee.site}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`employee-card group ${getRoleClass(employee.role)} ${
        isDragging
          ? "dragging opacity-95 max-w-[220px] transform rotate-2 scale-110 z-50"
          : "hover:shadow-2xl hover:border-indigo-500 transform hover:scale-105"
      } ${
        isSelected
          ? "selected ring-4 ring-indigo-500 border-indigo-600 shadow-2xl bg-indigo-50/50"
          : "border-gray-400 bg-white"
      } 
      ${isDragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
      transition-all duration-300 ease-out relative overflow-hidden
      border-2 shadow-lg backdrop-blur-sm`}
      style={style}
    >
      {/* Enhanced Card Background with Subtle Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/30 to-blue-50/20 opacity-60"></div>

      {/* Role-specific left border accent */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${getRoleColor(
          employee.role
        )}`}
      ></div>

      {/* Premium Selection Checkbox */}
      {showBulkActions && (
        <div className="absolute top-4 left-4 z-20">
          <div className="relative">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectChange}
              className="w-6 h-6 text-indigo-600 bg-white border-2 border-gray-400 rounded-lg focus:ring-indigo-500 focus:ring-3 shadow-lg transition-all transform hover:scale-110"
            />
            {isSelected && (
              <div className="absolute inset-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center pointer-events-none shadow-lg">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Role Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          {/* Enhanced glow effect */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${getRoleColor(
              employee.role
            )} rounded-full blur-md opacity-60`}
          ></div>

          {/* Enhanced main badge with stronger border */}
          <div
            className={`relative inline-flex items-center rounded-full font-bold bg-gradient-to-r ${getRoleColor(
              employee.role
            )} text-white shadow-2xl border-3 border-white/80 transition-all backdrop-blur-sm ${
              isDragging ? "px-3 py-2 text-sm scale-90" : "px-4 py-2 text-sm"
            }`}
          >
            <span className="mr-2 text-lg filter drop-shadow-lg">
              {getRoleIcon(employee.role)}
            </span>
            <span className="drop-shadow-lg font-bold tracking-wide">
              {isDragging
                ? employee.role === "Sales Director"
                  ? "Dir"
                  : employee.role === "Sales Manager"
                  ? "Mgr"
                  : employee.role === "Team Lead"
                  ? "Lead"
                  : "Agt"
                : employee.role === "Sales Director"
                ? "Director"
                : employee.role === "Sales Manager"
                ? "Manager"
                : employee.role === "Team Lead"
                ? "Lead"
                : "Agent"}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div
        className={`relative z-10 ${
          showBulkActions ? "ml-12" : "ml-6"
        } mr-20 mt-6 mb-6`}
      >
        {/* Enhanced Name Typography with much darker text */}
        <h3
          className={`font-bold text-slate-900 mb-4 leading-tight break-words ${
            isDragging ? "text-lg" : "text-xl"
          } drop-shadow-sm`}
          style={{ color: "#0f172a" }} // Force very dark text
        >
          {isDragging ? employee.name.split(" ")[0] : employee.name}
        </h3>

        {/* Enhanced Info Cards with stronger borders */}
        {!isDragging && (
          <div className="space-y-3 mb-6">
            {/* Enhanced Site Info */}
            <div className="flex items-center text-sm font-medium">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-blue-300">
                <span className="text-blue-700 text-sm font-bold">📍</span>
              </div>
              <div className="flex-1">
                <span className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-800 shadow-md border-2 border-blue-200">
                  {employee.site} Site
                </span>
              </div>
            </div>

            {/* Enhanced Start Date */}
            <div className="flex items-center text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-green-300">
                <span className="text-green-700 text-sm font-bold">📅</span>
              </div>
              <div className="flex items-center">
                <span className="font-bold mr-2 text-slate-800">Started:</span>
                <span className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-xl text-sm font-bold text-green-800 shadow-md border-2 border-green-200">
                  {new Date(employee.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Enhanced Manager Info */}
            {employee.managerId && (
              <div className="flex items-center text-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-violet-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-purple-300">
                  <span className="text-purple-700 text-sm font-bold">👥</span>
                </div>
                <span className="font-bold bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-2 rounded-xl text-purple-800 shadow-md border-2 border-purple-200">
                  Reports to Manager
                </span>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Commission Info for Agents */}
        {!isDragging && commissionInfo && (
          <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-2xl p-5 border-3 border-gray-300 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <span className="text-slate-800 font-bold text-xs uppercase tracking-wider block">
                  💰 Commission Rate
                </span>
                <div className="flex items-center">
                  <span
                    className={`font-bold text-2xl ${
                      commissionInfo.willChangeToVeteran &&
                      commissionInfo.daysUntilChange &&
                      commissionInfo.daysUntilChange <= 7
                        ? "text-orange-700 animate-pulse"
                        : "text-slate-900"
                    }`}
                  >
                    {commissionInfo.currentCommissionRate * 100}%
                  </span>
                  {commissionInfo.willChangeToVeteran &&
                    commissionInfo.daysUntilChange &&
                    commissionInfo.daysUntilChange <= 7 && (
                      <span className="ml-2 text-orange-600 animate-bounce text-lg">
                        ⚡
                      </span>
                    )}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-slate-800 font-bold text-xs uppercase tracking-wider block">
                  🏆 Tier Status
                </span>
                <span
                  className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-bold border-2 shadow-lg backdrop-blur-sm ${
                    commissionInfo.tier === "veteran"
                      ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-900 border-green-400"
                      : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-blue-400"
                  }`}
                >
                  {commissionInfo.tier === "veteran" ? "🏆 Veteran" : "⭐ New"}
                </span>
              </div>
            </div>

            {commissionInfo.willChangeToVeteran &&
              commissionInfo.daysUntilChange &&
              commissionInfo.daysUntilChange <= 7 && (
                <div className="bg-gradient-to-r from-orange-100 via-yellow-100 to-amber-100 border-3 border-orange-400 rounded-xl p-4 mt-4 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center text-sm font-bold text-orange-900">
                    <span className="mr-2 text-lg">🎯</span>
                    <div>
                      <div className="font-bold text-orange-900">
                        Veteran Milestone Alert!
                      </div>
                      <div className="text-xs font-medium text-orange-800">
                        {commissionInfo.daysUntilChange} days to veteran status
                        upgrade
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Enhanced minimal dragging display */}
        {isDragging && (
          <div className="flex items-center justify-center">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full shadow-xl border-3 border-blue-300">
              <span className="text-blue-900 text-sm font-bold">
                📍 {employee.site}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Action Buttons */}
      {!isDragging && (
        <div className="absolute bottom-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-2xl border-2 border-gray-300/50">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(employee);
              }}
              className="p-3 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm border-2 border-transparent hover:border-indigo-300"
              title="View Details"
            >
              <span className="text-lg">👁️</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              className="p-3 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm border-2 border-transparent hover:border-blue-300"
              title="Edit Employee"
            >
              <span className="text-lg">✏️</span>
            </button>
          )}
          {onPromote && employee.role !== "Sales Director" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote(employee);
              }}
              className="p-3 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm border-2 border-transparent hover:border-green-300"
              title="Promote"
            >
              <span className="text-lg">⬆️</span>
            </button>
          )}
          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(employee);
              }}
              className="p-3 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm border-2 border-transparent hover:border-purple-300"
              title="Transfer Site"
            >
              <span className="text-lg">🔄</span>
            </button>
          )}
          {onTerminate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTerminate(employee);
              }}
              className="p-3 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm border-2 border-transparent hover:border-red-300"
              title="Terminate"
            >
              <span className="text-lg">❌</span>
            </button>
          )}
        </div>
      )}

      {/* Enhanced Drag Visual Feedback */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-indigo-500/30 to-purple-500/30 rounded-2xl border-4 border-dashed border-blue-600 flex items-center justify-center backdrop-blur-lg">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border-3 border-blue-400 animate-pulse">
            <span className="mr-2 text-lg">🚀</span>
            <div className="text-center">
              <div className="font-bold">Dragging...</div>
              <div className="text-xs opacity-90 font-medium">
                {employee.role}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
