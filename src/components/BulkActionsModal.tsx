import React, { useState } from 'react';
import { Employee, Site, Role, CommissionTier } from '../types';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: Employee[];
  onBulkTransfer: (employeeIds: string[], newSite: Site) => Promise<void>;
  onBulkPromote: (employeeIds: string[], newRole: Role) => Promise<void>;
  onBulkUpdateCommission: (employeeIds: string[], tier: CommissionTier) => Promise<void>;
  onBulkTerminate: (employeeIds: string[]) => Promise<void>;
  onBulkReassign: (employeeIds: string[], newManagerId: string) => Promise<void>;
}

type BulkActionType = 'transfer' | 'promote' | 'commission' | 'terminate' | 'reassign';

export const BulkActionsModal: React.FC<BulkActionsModalProps> = ({
  isOpen,
  onClose,
  selectedEmployees,
  onBulkTransfer,
  onBulkPromote,
  onBulkUpdateCommission,
  onBulkTerminate,
  onBulkReassign
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkActionType>('transfer');
  const [transferSite, setTransferSite] = useState<Site>('Austin');
  const [promoteRole, setPromoteRole] = useState<Role>('Team Lead');
  const [commissionTier, setCommissionTier] = useState<CommissionTier>('veteran');
  const [newManagerId, setNewManagerId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get potential managers (directors, managers, team leads)
  const potentialManagers = selectedEmployees.filter(emp => 
    ['Sales Director', 'Sales Manager', 'Team Lead'].includes(emp.role)
  );

  // Validate bulk actions based on selected employees
  const validateAction = (action: BulkActionType): { valid: boolean; reason?: string } => {
    const employeeRoles = selectedEmployees.map(emp => emp.role);
    
    switch (action) {
      case 'promote':
        // Can't promote Sales Directors
        if (employeeRoles.includes('Sales Director')) {
          return { valid: false, reason: 'Cannot promote Sales Directors' };
        }
        break;
      
      case 'commission':
        // Commission updates only for agents
        const nonAgents = selectedEmployees.filter(emp => emp.role !== 'Agent');
        if (nonAgents.length > 0) {
          return { valid: false, reason: 'Commission updates only apply to Agents' };
        }
        break;
      
      case 'reassign':
        // Need a valid manager selected
        if (!newManagerId) {
          return { valid: false, reason: 'Please select a manager' };
        }
        // Can't reassign directors
        if (employeeRoles.includes('Sales Director')) {
          return { valid: false, reason: 'Cannot reassign Sales Directors' };
        }
        break;
    }
    
    return { valid: true };
  };

  const getActionDescription = (): string => {
    switch (selectedAction) {
      case 'transfer':
        return `Transfer ${selectedEmployees.length} employee(s) to ${transferSite} site`;
      case 'promote':
        return `Promote ${selectedEmployees.length} employee(s) to ${promoteRole}`;
      case 'commission':
        return `Update ${selectedEmployees.length} agent(s) to ${commissionTier} commission tier`;
      case 'terminate':
        return `Terminate ${selectedEmployees.length} employee(s)`;
      case 'reassign':
        const manager = potentialManagers.find(emp => emp.id === newManagerId);
        return `Reassign ${selectedEmployees.length} employee(s) to ${manager?.name || 'selected manager'}`;
      default:
        return '';
    }
  };

  const handleExecuteAction = async () => {
    const validation = validateAction(selectedAction);
    if (!validation.valid) {
      setError(validation.reason || 'Invalid action');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      const employeeIds = selectedEmployees.map(emp => emp.id);

      switch (selectedAction) {
        case 'transfer':
          await onBulkTransfer(employeeIds, transferSite);
          break;
        case 'promote':
          await onBulkPromote(employeeIds, promoteRole);
          break;
        case 'commission':
          await onBulkUpdateCommission(employeeIds, commissionTier);
          break;
        case 'terminate':
          await onBulkTerminate(employeeIds);
          break;
        case 'reassign':
          await onBulkReassign(employeeIds, newManagerId);
          break;
      }

      setShowConfirmation(true);
      setTimeout(() => {
        onClose();
        setShowConfirmation(false);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute bulk action');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-center text-gray-900 mb-2">
            Bulk Action Completed!
          </h3>
          <p className="text-center text-gray-600">
            {getActionDescription()} completed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Actions ({selectedEmployees.length} selected)
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
          {/* Selected Employees Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Selected Employees:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedEmployees.map(emp => (
                <div key={emp.id} className="text-sm text-gray-600">
                  <span className="font-medium">{emp.name}</span> - {emp.role} ({emp.site})
                </div>
              ))}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Action:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedAction('transfer')}
                className={`p-3 text-left rounded-lg border ${
                  selectedAction === 'transfer'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">Transfer Sites</div>
                <div className="text-xs text-gray-500">Move employees to different location</div>
              </button>

              <button
                onClick={() => setSelectedAction('promote')}
                className={`p-3 text-left rounded-lg border ${
                  selectedAction === 'promote'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">Promote</div>
                <div className="text-xs text-gray-500">Advance employees to higher roles</div>
              </button>

              <button
                onClick={() => setSelectedAction('commission')}
                className={`p-3 text-left rounded-lg border ${
                  selectedAction === 'commission'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">Update Commission</div>
                <div className="text-xs text-gray-500">Change commission tiers for agents</div>
              </button>

              <button
                onClick={() => setSelectedAction('reassign')}
                className={`p-3 text-left rounded-lg border ${
                  selectedAction === 'reassign'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">Reassign Manager</div>
                <div className="text-xs text-gray-500">Change reporting structure</div>
              </button>

              <button
                onClick={() => setSelectedAction('terminate')}
                className={`p-3 text-left rounded-lg border ${
                  selectedAction === 'terminate'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">Terminate</div>
                <div className="text-xs text-gray-500">End employment (irreversible)</div>
              </button>
            </div>
          </div>

          {/* Action-specific Options */}
          <div className="space-y-4">
            {selectedAction === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer to Site:
                </label>
                <select
                  value={transferSite}
                  onChange={(e) => setTransferSite(e.target.value as Site)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Austin">Austin</option>
                  <option value="Charlotte">Charlotte</option>
                </select>
              </div>
            )}

            {selectedAction === 'promote' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promote to Role:
                </label>
                <select
                  value={promoteRole}
                  onChange={(e) => setPromoteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Team Lead">Team Lead</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Director">Sales Director</option>
                </select>
              </div>
            )}

            {selectedAction === 'commission' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Tier:
                </label>
                <select
                  value={commissionTier}
                  onChange={(e) => setCommissionTier(e.target.value as CommissionTier)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="new">New Agent (First 6 months)</option>
                  <option value="veteran">Veteran Agent (6+ months)</option>
                </select>
              </div>
            )}

            {selectedAction === 'reassign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Manager:
                </label>
                <select
                  value={newManagerId}
                  onChange={(e) => setNewManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a manager...</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} - {manager.role} ({manager.site})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedAction === 'terminate' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-800 font-medium">Warning: Irreversible Action</h4>
                    <p className="text-red-700 text-sm mt-1">
                      This will permanently terminate {selectedEmployees.length} employee(s). 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Action Preview:</h4>
            <p className="text-blue-800 text-sm">{getActionDescription()}</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          
          <button
            onClick={handleExecuteAction}
            disabled={isProcessing || !validateAction(selectedAction).valid}
            className={`px-4 py-2 rounded-md font-medium ${
              selectedAction === 'terminate'
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
            } disabled:cursor-not-allowed`}
          >
            {isProcessing ? 'Processing...' : `Execute ${selectedAction === 'terminate' ? 'Termination' : 'Action'}`}
          </button>
        </div>
      </div>
    </div>
  );
}; 