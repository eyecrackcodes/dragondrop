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

  const getRoleBorderColor = (role: string) => {
    switch (role) {
      case "Sales Director":
        return "border-purple-200 shadow-purple-100";
      case "Sales Manager":
        return "border-blue-200 shadow-blue-100";
      case "Team Lead":
        return "border-green-200 shadow-green-100";
      case "Agent":
        return "border-gray-200 shadow-gray-100";
      default:
        return "border-gray-200 shadow-gray-100";
    }
  };

  const getRoleAccentColor = (role: string) => {
    switch (role) {
      case "Sales Director":
        return "bg-purple-50 border-purple-100";
      case "Sales Manager":
        return "bg-blue-50 border-blue-100";
      case "Team Lead":
        return "bg-green-50 border-green-100";
      case "Agent":
        return "bg-gray-50 border-gray-100";
      default:
        return "bg-gray-50 border-gray-100";
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
      className={`employee-card group relative overflow-hidden ${getRoleClass(employee.role)} ${
        isDragging
          ? "dragging opacity-95 max-w-[240px] transform rotate-2 scale-110 z-50"
          : `hover:shadow-2xl hover:-translate-y-1 transform transition-all duration-300 ${getRoleBorderColor(employee.role)}`
      } ${
        isSelected
          ? "selected ring-4 ring-indigo-500 border-indigo-600 shadow-2xl bg-indigo-50/30"
          : `bg-white ${getRoleBorderColor(employee.role)}`
      } 
      ${isDragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
      border-2 shadow-xl backdrop-blur-sm rounded-2xl min-h-[320px] max-w-[280px]`}
      style={style}
    >
      {/* Enhanced Card Background with role-specific accent */}
      <div className={`absolute inset-0 ${getRoleAccentColor(employee.role)} opacity-40 rounded-2xl`}></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 rounded-2xl"></div>

      {/* Enhanced role-specific left border accent - thicker for hierarchy */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${getRoleColor(
          employee.role
        )} rounded-l-2xl shadow-lg`}
      ></div>

      {/* Header Section - Enhanced with better spacing */}
      <div className="relative z-10 h-20 flex items-center justify-between p-5">
        {/* Selection Checkbox - Enhanced touch target */}
        {showBulkActions && (
          <div className="flex-shrink-0">
            <div className="relative p-2 -m-2"> {/* 44px touch target */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleSelectChange}
                className="w-6 h-6 text-indigo-600 bg-white border-2 border-gray-400 rounded-lg focus:ring-indigo-500 focus:ring-3 shadow-lg transition-all hover:scale-110"
              />
              {isSelected && (
                <div className="absolute inset-2 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center pointer-events-none shadow-lg">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Enhanced Role Badge with better hierarchy */}
        <div className="flex-shrink-0">
          <div className="relative group/badge">
            {/* Glow effect for hierarchy emphasis */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${getRoleColor(
                employee.role
              )} rounded-full blur-sm opacity-60 group-hover/badge:opacity-80 transition-opacity`}
            ></div>
            <div
              className={`relative inline-flex items-center rounded-full font-bold bg-gradient-to-r ${getRoleColor(
                employee.role
              )} text-white shadow-xl border-2 border-white/90 transition-all backdrop-blur-sm ${
                isDragging ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              }`}
              title={`${employee.role} - ${employee.name}`}
            >
              <span className="mr-2 text-base filter drop-shadow-lg">
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
      </div>

            {/* Enhanced Main Content Section */}
      <div className="relative z-10 px-5 pb-4 flex flex-col h-full">
        {/* Enhanced Employee Name - Stronger hierarchy */}
        <h3
          className={`font-black text-slate-900 mb-3 leading-tight break-words tracking-tight ${
            isDragging ? "text-lg" : "text-xl"
          } drop-shadow-sm`}
          style={{ color: "#0f172a" }}
          title={employee.name}
        >
          {isDragging ? employee.name.split(" ")[0] : employee.name}
        </h3>

        {/* Enhanced Info Cards with consistent spacing */}
        {!isDragging && (
          <div className="space-y-3 mb-3">
            {/* Enhanced Site Info */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-blue-300 flex-shrink-0">
                <span className="text-blue-700 text-sm font-bold">📍</span>
              </div>
              <span className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-800 shadow-md border-2 border-blue-200 flex-1">
                {employee.site} Site
              </span>
            </div>

            {/* Enhanced Start Date */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-green-300 flex-shrink-0">
                <span className="text-green-700 text-sm font-bold">📅</span>
              </div>
              <div className="flex items-center flex-1">
                <span className="font-bold mr-3 text-slate-700 text-sm">Started:</span>
                <span className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-xl text-sm font-bold text-green-800 shadow-md border-2 border-green-200">
                  {new Date(employee.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Compact Manager Info - Streamlined reporting structure */}
            {employee.managerId && (
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-violet-200 rounded-full flex items-center justify-center mr-3 shadow-md border-2 border-purple-300 flex-shrink-0">
                  <span className="text-purple-700 text-sm font-bold">👥</span>
                </div>
                <span className="font-bold text-purple-800 text-sm bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-2 rounded-xl shadow-md border-2 border-purple-200 flex-1">
                  Reports to Manager
                </span>
              </div>
            )}
          </div>
        )}



        {/* Enhanced minimal dragging display */}
        {isDragging && (
          <div className="flex items-center justify-center">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full shadow-xl border-2 border-blue-300">
              <span className="text-blue-900 text-sm font-bold">
                📍 {employee.site}
              </span>
            </div>
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1"></div>

        {/* Action Buttons - Always visible at card bottom */}
        {!isDragging && (
          <div className="mt-4 flex justify-center z-20">
            <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-xl border-2 border-gray-400/60">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(employee);
              }}
              className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-indigo-300"
              title="View Details"
            >
              <span className="text-base">👁️</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-blue-300"
              title="Edit Employee"
            >
              <span className="text-base">✏️</span>
            </button>
          )}
          {onPromote && employee.role !== "Sales Director" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote(employee);
              }}
              className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-green-300"
              title="Promote Employee"
            >
              <span className="text-base">⬆️</span>
            </button>
          )}
          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(employee);
              }}
              className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-purple-300"
              title="Transfer Site"
            >
              <span className="text-base">🔄</span>
            </button>
          )}
          {onTerminate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTerminate(employee);
              }}
              className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-red-300"
              title="Terminate Employee"
            >
              <span className="text-base">❌</span>
            </button>
          )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Drag Visual Feedback */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-indigo-500/40 to-purple-500/40 rounded-2xl border-4 border-dashed border-blue-600 flex items-center justify-center backdrop-blur-lg z-30">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl text-base font-bold shadow-2xl border-3 border-blue-400 animate-pulse">
            <span className="mr-3 text-xl">🚀</span>
            <div className="text-center">
              <div className="font-black text-base">Dragging...</div>
              <div className="text-sm opacity-90 font-bold">
                {employee.role}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
