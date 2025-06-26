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
      console.log('🎯 ===== EMPLOYEE CARD DRAG START =====');
      console.log('🎯 Employee:', employee.name, employee.role);
      console.log('🎯 isDragMode:', isDragMode);
      console.log('🎯 Calling onDragStart...');
      // Call global drag start handler
      onDragStart?.(employee);
      console.log('🎯 onDragStart called');
      return { 
        id: employee.id, 
        employee: employee,
        type: 'employee'
      };
    },

    end: (item, monitor) => {
      console.log('🎯 ===== EMPLOYEE CARD DRAG END =====');
      console.log('🎯 Drop result:', monitor.getDropResult());
      console.log('🎯 Did drop:', monitor.didDrop());
      console.log('🎯 Calling onDragEnd...');
      // Call global drag end handler
      onDragEnd?.();
    },
    canDrag: () => {
      console.log('🎯 Can drag check - isDragMode:', isDragMode);
      return isDragMode;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [employee, onDragStart, onDragEnd, isDragMode]);

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
      ref={(el) => {
        if (isDragMode && drag) {
          drag(el);
        }
      }}
      className={`group relative bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging 
          ? 'opacity-70 transform scale-95 rotate-1 z-50 shadow-xl p-3 max-w-[180px] border-blue-400' 
          : 'p-4 hover:border-blue-200 border-gray-200'
      } ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}`}
      style={{ cursor: isDragMode ? 'grab' : 'default' }}
    >
      {/* Selection Checkbox */}
      {showBulkActions && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectChange}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Role Badge - Fixed contrast and positioning */}
      <div className="absolute top-2 right-2">
        <div className={`inline-flex items-center rounded-full font-semibold bg-gradient-to-r ${getRoleColor(employee.role)} text-white shadow-sm transition-all ${
          isDragging ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-xs'
        }`}>
          <span className="mr-1">{getRoleIcon(employee.role)}</span>
          {isDragging 
            ? (employee.role === 'Sales Director' ? 'Dir' : 
               employee.role === 'Sales Manager' ? 'Mgr' :
               employee.role === 'Team Lead' ? 'Lead' : 'Agt')
            : (employee.role === 'Sales Director' ? 'Director' : 
               employee.role === 'Sales Manager' ? 'Manager' :
               employee.role === 'Team Lead' ? 'Lead' : 'Agent')
          }
        </div>
      </div>

      {/* Main Content - Fixed spacing and overflow */}
      <div className={`${showBulkActions ? 'ml-6' : ''} pr-20`}>
        {/* Name - Properly sized and contained */}
        <h3 className={`font-bold text-gray-900 mb-2 leading-tight break-words ${
          isDragging ? 'text-sm' : 'text-base'
        }`}>
          {isDragging ? employee.name.split(' ')[0] : employee.name}
        </h3>
        
        {/* Site and basic info */}
        {!isDragging && (
          <div className="mb-3">
            <div className="flex items-center text-sm text-gray-700 mb-2">
              <span className="mr-1">📍</span>
              <span className="font-medium">{employee.site} Site</span>
            </div>
            
            {/* Start Date */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Started:</span> {new Date(employee.startDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: '2-digit' 
              })}
            </div>
            
            {/* Manager Info */}
            {employee.managerId && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Reports to:</span> Manager
              </div>
            )}
          </div>
        )}

        {/* Commission Info for Agents - Better organized */}
        {!isDragging && commissionInfo && (
          <div className="bg-gray-50 rounded-lg p-3 mt-3 border">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 font-medium block">Commission:</span>
                <span className={`font-bold ${commissionInfo.willChangeToVeteran && commissionInfo.daysUntilChange && commissionInfo.daysUntilChange <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {commissionInfo.currentCommissionRate * 100}%
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium block">Tier:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  commissionInfo.tier === 'veteran' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {commissionInfo.tier === 'veteran' ? 'Veteran' : 'New'}
                </span>
              </div>
            </div>
            
            {commissionInfo.willChangeToVeteran && commissionInfo.daysUntilChange && commissionInfo.daysUntilChange <= 7 && (
              <div className="bg-orange-100 border border-orange-200 rounded-md p-2 mt-2">
                <div className="text-xs text-orange-900 font-semibold">
                  🎯 {commissionInfo.daysUntilChange} days to milestone
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minimal info when dragging */}
        {isDragging && (
          <div className="text-sm text-gray-700 font-medium">
            {employee.site}
          </div>
        )}
      </div>

      {/* Action Buttons - Better positioned and visible */}
      {!isDragging && (
        <div className="absolute bottom-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(employee);
              }}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors duration-150"
              title="View Details"
            >
              <span className="text-sm">👁️</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150"
              title="Edit Employee"
            >
              <span className="text-sm">✏️</span>
            </button>
          )}
          {onPromote && employee.role !== 'Sales Director' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote(employee);
              }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors duration-150"
              title="Promote"
            >
              <span className="text-sm">⬆️</span>
            </button>
          )}
          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(employee);
              }}
              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors duration-150"
              title="Transfer Site"
            >
              <span className="text-sm">🔄</span>
            </button>
          )}
          {onTerminate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTerminate(employee);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
              title="Terminate"
            >
              <span className="text-sm">❌</span>
            </button>
          )}
        </div>
      )}
      
      {/* Drag visual feedback - Better contrast */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600 bg-opacity-20 rounded-lg border-2 border-dashed border-blue-500 flex items-center justify-center">
          <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
            Dragging...
          </div>
        </div>
      )}
    </div>
  );
}; 