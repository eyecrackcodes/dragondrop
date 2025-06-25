import React from 'react';
import { useDrag } from 'react-dnd';
import { Employee } from '../types';
import { calculateAgentCommission } from '../utils/commissionCalculator';

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
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'employee',
    item: () => {
      // Call global drag start handler
      onDragStart?.(employee);
      return { id: employee.id, employee };
    },
    end: () => {
      // Call global drag end handler
      onDragEnd?.();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [employee, onDragStart, onDragEnd]);

  // Calculate commission info for agents
  const commissionInfo = employee.role === 'Agent' ? calculateAgentCommission(employee) : null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Sales Director': return 'from-purple-500 to-indigo-600';
      case 'Sales Manager': return 'from-blue-500 to-cyan-600';
      case 'Team Lead': return 'from-green-500 to-emerald-600';
      case 'Agent': return 'from-gray-500 to-slate-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Sales Director': return '👑';
      case 'Sales Manager': return '👔';
      case 'Team Lead': return '🎯';
      case 'Agent': return '💼';
      default: return '👤';
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect?.(employee.id, e.target.checked);
  };

  if (employee.status === 'terminated') {
    return (
      <div className="relative bg-gray-100 border border-gray-200 rounded-lg p-4 opacity-75">
        <div className="absolute inset-0 bg-red-500/10 rounded-lg flex items-center justify-center">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            ❌ Terminated
          </span>
        </div>
        <div className="blur-sm">
          <div className="font-semibold text-gray-600">{employee.name}</div>
          <div className="text-sm text-gray-500">{employee.role}</div>
          <div className="text-sm text-gray-500">{employee.site}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={isDragMode ? (drag as any) : null}
      className={`group relative bg-white border rounded-md shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging 
          ? 'opacity-60 transform scale-75 rotate-2 z-50 shadow-xl p-1 max-w-[140px]' 
          : 'p-2'
      } ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-300' : 'border-gray-200 hover:border-gray-300'}`}
    >
      {/* Selection Checkbox */}
      {showBulkActions && (
        <div className="absolute top-1 left-1 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectChange}
            className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Role Badge - Compact */}
      <div className="absolute top-1 right-1">
        <div className={`inline-flex items-center rounded-full text-xs font-medium bg-gradient-to-r ${getRoleColor(employee.role)} text-white shadow-sm transition-all ${
          isDragging ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
        }`}>
          <span className="mr-0.5 text-xs">{getRoleIcon(employee.role)}</span>
          {isDragging 
            ? (employee.role === 'Sales Director' ? 'Dir' : 
               employee.role === 'Sales Manager' ? 'Mgr' :
               employee.role === 'Team Lead' ? 'Lead' : 'Agt')
            : (employee.role === 'Sales Director' ? 'Dir' : 
               employee.role === 'Sales Manager' ? 'Mgr' :
               employee.role === 'Team Lead' ? 'Lead' : 'Agent')
          }
        </div>
      </div>

      {/* Main Content - Very Compact */}
      <div className={`${showBulkActions ? 'ml-4' : ''} pr-12`}>
        {/* Name - Compact */}
        <h3 className={`font-semibold text-gray-900 mb-1 ${isDragging ? 'text-xs' : 'text-sm'} leading-tight`}>
          {isDragging ? employee.name.split(' ')[0] : employee.name}
        </h3>
        
        {/* Site - More compact */}
        {!isDragging && (
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <span className="mr-1">📍</span>
            {employee.site}
          </div>
        )}

        {/* Key Info - Simplified and compact */}
        {!isDragging && (
          <div className="space-y-1 text-xs">
            {/* Start Date - Simplified */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Start:</span>
              <span className="font-medium text-gray-900 text-xs">
                {new Date(employee.startDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
              </span>
            </div>

            {/* Manager - Only if has one */}
            {employee.managerId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reports to:</span>
                <span className="font-medium text-gray-900 text-xs">Manager</span>
              </div>
            )}

            {/* Commission Info for Agents - Compact */}
            {commissionInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Commission:</span>
                  <span className={`font-medium text-xs ${commissionInfo.willChangeToVeteran && commissionInfo.daysUntilChange && commissionInfo.daysUntilChange <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {commissionInfo.currentCommissionRate * 100}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tier:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    commissionInfo.tier === 'veteran' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  } border`}>
                    {commissionInfo.tier === 'veteran' ? 'Veteran' : 'New'}
                  </span>
                </div>
                {commissionInfo.willChangeToVeteran && commissionInfo.daysUntilChange && commissionInfo.daysUntilChange <= 7 && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-1.5 mt-1">
                    <div className="text-xs text-orange-800 font-medium">
                      🎯 {commissionInfo.daysUntilChange}d to milestone
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Minimal info when dragging */}
        {isDragging && (
          <div className="text-xs text-gray-500">
            {employee.site}
          </div>
        )}
      </div>

      {/* Action Buttons - More compact */}
      {!isDragging && (
        <div className="absolute bottom-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded border border-gray-200 p-0.5 shadow-sm">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(employee);
              }}
              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="View"
            >
              <span className="text-xs">👁️</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <span className="text-xs">✏️</span>
            </button>
          )}
          {onPromote && employee.role !== 'Sales Director' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote(employee);
              }}
              className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Promote"
            >
              <span className="text-xs">⬆️</span>
            </button>
          )}
          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(employee);
              }}
              className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Transfer"
            >
              <span className="text-xs">🔄</span>
            </button>
          )}
          {onTerminate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTerminate(employee);
              }}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Terminate"
            >
              <span className="text-xs">❌</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 