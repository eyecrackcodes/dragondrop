import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { Site, Employee, Role, CommissionTier } from '../types';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeModal } from './EmployeeModal';
import { BulkActionsModal } from './BulkActionsModal';
import { ChangeConfirmationModal } from './ChangeConfirmationModal';
import { IntegrationsModal } from './IntegrationsModal';
import { useFirebaseOrgStructure, useFirebaseDragAndDrop, useFirebaseConnection, useFirebaseEmployees } from '../hooks/useFirebaseData';
import { useMockOrgStructure, useMockDragAndDrop } from '../hooks/useMockData';
import { importRealDataToFirebase, validateFirebaseConnection, getEmployeeCount } from '../services/firebaseImporter';
import { externalIntegrationsService } from '../services/externalIntegrations';
import { PlusIcon, MagnifyingGlassIcon, Squares2X2Icon, ExclamationTriangleIcon, CloudArrowUpIcon, CogIcon } from '@heroicons/react/24/outline';

interface OrgChartProps {
  site: Site;
  showBulkActions?: boolean;
}

interface DropZoneProps {
  onDrop: (employeeId: string) => void;
  accept?: string;
  children: React.ReactNode;
  className?: string;
  canDrop?: boolean;
}

interface ChangeRecord {
  id: string;
  type: 'move' | 'promote' | 'transfer' | 'terminate' | 'create' | 'edit';
  employeeName: string;
  description: string;
  timestamp: number;
}

interface NotificationSettings {
  sendSlack: boolean;
  sendEmail: boolean;
  recipients: string[];
  includeDetails: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onDrop, accept = 'employee', children, className = '', canDrop = true }) => {
  const [{ isOver, canDropState }, drop] = useDrop(() => ({
    accept,
    drop: (item: any) => {
      if (canDrop) {
        onDrop(item.employee.id);
      }
    },
    canDrop: () => canDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDropState: monitor.canDrop(),
    }),
  }));

  const dropZoneClass = useMemo(() => {
    if (!canDrop) return className;
    if (isOver && canDropState) return `${className} bg-green-50 border border-dashed border-green-400 rounded-lg transition-all duration-200`;
    if (isOver) return `${className} bg-red-50 border border-dashed border-red-400 rounded-lg transition-all duration-200`;
    if (canDropState) return `${className} border border-dashed border-gray-300 rounded-lg opacity-75 hover:border-blue-400 transition-all duration-200`;
    return className;
  }, [isOver, canDropState, canDrop, className]);

  return (
    <div ref={drop as any} className={dropZoneClass}>
      {children}
      {isOver && canDropState && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-10 rounded-lg flex items-center justify-center z-10">
          <span className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm">
            ✅ Drop here
          </span>
        </div>
      )}
      {isOver && !canDropState && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-10 rounded-lg flex items-center justify-center z-10">
          <span className="bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm">
            ❌ Invalid
          </span>
        </div>
      )}
    </div>
  );
};

export const OrgChart: React.FC<OrgChartProps> = ({ site, showBulkActions = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    mode: 'view' | 'edit' | 'create';
  }>({
    isOpen: false,
    employee: null,
    mode: 'view'
  });

  // Bulk actions modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  
  // Change tracking state
  const [pendingChanges, setPendingChanges] = useState<ChangeRecord[]>([]);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  
  // Data import state
  const [isImporting, setIsImporting] = useState(false);
  
  // Integrations modal state
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const [integrationsStatus, setIntegrationsStatus] = useState({ n8nConfigured: false, slackConfigured: false });
  
  // Check Firebase connection status
  const { isConnected } = useFirebaseConnection();
  
  // Use Firebase data if available, otherwise fall back to mock data
  const firebaseOrgData = useFirebaseOrgStructure(site);
  const mockOrgData = useMockOrgStructure(site);
  const firebaseDragDrop = useFirebaseDragAndDrop();
  const mockDragDrop = useMockDragAndDrop();
  
  // Select data source based on Firebase availability
  const { directors, managers, teamLeads, agents, stats, isLoading } = isConnected ? firebaseOrgData : mockOrgData;
  const { moveEmployee, promoteEmployee } = isConnected ? firebaseDragDrop : mockDragDrop;
  
  // Get Firebase employee operations (always call hooks to avoid conditional hook rule)
  const firebaseEmployees = useFirebaseEmployees();
  
  // Create conditional refetch function (Firebase data is real-time, mock data needs manual refetch)
  const refetch = () => {
    if (!isConnected && 'refetch' in mockOrgData) {
      mockOrgData.refetch();
    }
    // Firebase data updates automatically via real-time listeners
  };

  // Get all employees for easy access
  const allEmployees = useMemo(() => [
    ...directors, ...managers, ...teamLeads, ...agents
  ], [directors, managers, teamLeads, agents]);

  // Get selected employee objects
  const selectedEmployeeObjects = useMemo(() => {
    return allEmployees.filter(emp => selectedEmployees.has(emp.id));
  }, [allEmployees, selectedEmployees]);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    const filterFn = (emp: any) => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());

    return {
      directors: allEmployees.filter((emp: any) => emp.role === 'Sales Director' && emp.site === site && filterFn(emp)),
      managers: allEmployees.filter((emp: any) => emp.role === 'Sales Manager' && emp.site === site && filterFn(emp)),
      teamLeads: allEmployees.filter((emp: any) => emp.role === 'Team Lead' && emp.site === site && emp.status !== 'terminated' && filterFn(emp)),
      agents: allEmployees.filter((emp: any) => emp.role === 'Agent' && emp.site === site && emp.status !== 'terminated' && filterFn(emp)),
    };
  }, [allEmployees, site, searchTerm]);

  // Unassigned employees (no managerId)
  const unassignedEmployees = useMemo(() => {
    return [...filteredEmployees.teamLeads, ...filteredEmployees.agents].filter(emp => !emp.managerId);
  }, [filteredEmployees]);

  const handleEmployeeSelect = (employeeId: string, selected: boolean) => {
    const newSelection = new Set(selectedEmployees);
    if (selected) {
      newSelection.add(employeeId);
    } else {
      newSelection.delete(employeeId);
    }
    setSelectedEmployees(newSelection);
  };

  const handleSelectAll = () => {
    const allEmployeeIds = allEmployees.map(emp => emp.id);
    setSelectedEmployees(new Set(allEmployeeIds));
  };

  const handleDeselectAll = () => {
    setSelectedEmployees(new Set());
  };

  const handleDrop = async (targetEmployeeId: string, droppedEmployeeId: string) => {
    if (targetEmployeeId === droppedEmployeeId) return;
    
    // Find the dropped employee and target employee
    const droppedEmployee = allEmployees.find(emp => emp.id === droppedEmployeeId);
    const targetEmployee = allEmployees.find(emp => emp.id === targetEmployeeId);
    
    if (!droppedEmployee || !targetEmployee) return;

    // Business logic for valid moves
    const canMove = validateMove(droppedEmployee, targetEmployee);
    if (!canMove.valid) {
      alert(`Cannot move employee: ${canMove.reason}`);
      return;
    }
    
    try {
      // Update the employee's manager immediately
      const updatedEmployee = {
        ...droppedEmployee,
        managerId: targetEmployeeId
      };

      if (isConnected) {
        // Update in Firebase
        await firebaseEmployees.updateEmployee(droppedEmployeeId, updatedEmployee);
        console.log('✅ Updated employee in Firebase:', droppedEmployee.name);
      } else {
        console.log('📝 Mock mode - Updated employee:', droppedEmployee.name);
      }

      // Refresh the data to show the change immediately
      refetch();
      
      // Also add to pending changes for tracking/notifications
      addPendingChange({
        type: 'move',
        employeeName: droppedEmployee.name,
        description: `Moved ${droppedEmployee.name} (${droppedEmployee.role}) to report to ${targetEmployee.name} (${targetEmployee.role})`
      });
      
      // Show success feedback
      alert(`✅ ${droppedEmployee.name} has been moved under ${targetEmployee.name}!`);
      
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      alert(`❌ Failed to move ${droppedEmployee.name}. Please try again.`);
    }
  };

  const validateMove = (droppedEmployee: any, targetEmployee: any) => {
    // Directors can't report to anyone
    if (droppedEmployee.role === 'Sales Director') {
      return { valid: false, reason: 'Directors cannot be reassigned' };
    }
    
    // Can't move to self
    if (droppedEmployee.id === targetEmployee.id) {
      return { valid: false, reason: 'Cannot assign employee to themselves' };
    }
    
    // Hierarchy levels (lower index = higher level)
    const hierarchy = ['Sales Director', 'Sales Manager', 'Team Lead', 'Agent'];
    const droppedLevel = hierarchy.indexOf(droppedEmployee.role);
    const targetLevel = hierarchy.indexOf(targetEmployee.role);
    
    // Can't move to same level 
    if (targetLevel === droppedLevel) {
      return { valid: false, reason: `Cannot assign ${droppedEmployee.role} to another ${targetEmployee.role}` };
    }
    
    // Can only move to higher-level positions (lower index numbers)
    if (targetLevel > droppedLevel) {
      return { valid: false, reason: `${droppedEmployee.role} cannot report to ${targetEmployee.role}` };
    }
    
    // Specific business rules:
    // - Agents can report to Sales Managers
    // - Team Leads can report to Sales Managers  
    // - Sales Managers can report to Sales Directors
    
    if (droppedEmployee.role === 'Agent') {
      if (targetEmployee.role !== 'Sales Manager') {
        return { valid: false, reason: 'Agents can only report to Sales Managers' };
      }
    }
    
    if (droppedEmployee.role === 'Team Lead') {
      if (targetEmployee.role !== 'Sales Manager') {
        return { valid: false, reason: 'Team Leads can only report to Sales Managers' };
      }
    }
    
    if (droppedEmployee.role === 'Sales Manager') {
      if (targetEmployee.role !== 'Sales Director') {
        return { valid: false, reason: 'Sales Managers can only report to Sales Directors' };
      }
    }
    
    return { valid: true, reason: '' };
  };

  const handlePromote = (employeeId: string, currentRole: string) => {
    const promotionMap: Record<string, string> = {
      'Agent': 'Team Lead',
      'Team Lead': 'Sales Manager',
      'Sales Manager': 'Sales Director'
    };
    
    const newRole = promotionMap[currentRole];
    const employee = allEmployees.find(emp => emp.id === employeeId);
    
    if (newRole && employee) {
      addPendingChange({
        type: 'promote',
        employeeName: employee.name,
        description: `Promote ${employee.name} from ${currentRole} to ${newRole}`
      });
      
      alert(`📝 Change queued: ${employee.name} will be promoted to ${newRole}`);
    }
  };

  // Modal handlers
  const openModal = (employee: Employee | null, mode: 'view' | 'edit' | 'create') => {
    setModalState({ isOpen: true, employee, mode });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, employee: null, mode: 'view' });
  };

  const handleEmployeeSave = async (updatedEmployee: Employee) => {
    try {
      if (modalState.mode === 'create') {
        // Handle creation immediately (new employees)
        if (isConnected) {
          const { id, ...employeeDataWithoutId } = updatedEmployee;
          await firebaseEmployees.createEmployee(employeeDataWithoutId);
          console.log('✅ Created employee:', updatedEmployee.name);
          alert(`✅ ${updatedEmployee.name} has been created successfully!`);
        } else {
          console.log('📝 Mock mode - Employee created:', updatedEmployee);
          alert(`📝 Mock mode: ${updatedEmployee.name} has been created!`);
          refetch();
        }
        closeModal();
      } else {
        // Handle edits as pending changes
        const originalEmployee = modalState.employee;
        if (!originalEmployee) return;

        // Find what changed
        const changes: string[] = [];
        if (originalEmployee.name !== updatedEmployee.name) {
          changes.push(`Name: "${originalEmployee.name}" → "${updatedEmployee.name}"`);
        }
        if (originalEmployee.role !== updatedEmployee.role) {
          changes.push(`Role: "${originalEmployee.role}" → "${updatedEmployee.role}"`);
        }
        if (originalEmployee.site !== updatedEmployee.site) {
          changes.push(`Site: "${originalEmployee.site}" → "${updatedEmployee.site}"`);
        }
        if (originalEmployee.startDate !== updatedEmployee.startDate) {
          changes.push(`Start Date: "${new Date(originalEmployee.startDate).toLocaleDateString()}" → "${new Date(updatedEmployee.startDate).toLocaleDateString()}"`);
        }
        if (originalEmployee.commissionTier !== updatedEmployee.commissionTier) {
          changes.push(`Commission Tier: "${originalEmployee.commissionTier}" → "${updatedEmployee.commissionTier}"`);
        }

        if (changes.length > 0) {
          // Add to pending changes
          addPendingChange({
            type: 'edit',
            employeeName: originalEmployee.name,
            description: `Edit ${originalEmployee.name}: ${changes.join(', ')}`
          });

          // Store the updated employee data for later application
          const existingChanges = JSON.parse(localStorage.getItem('pending_employee_edits') || '{}');
          existingChanges[originalEmployee.id] = updatedEmployee;
          localStorage.setItem('pending_employee_edits', JSON.stringify(existingChanges));

          alert(`📝 Changes queued for ${originalEmployee.name}! Review and apply changes when ready.`);
        } else {
          alert('No changes detected.');
        }
        
        closeModal();
      }
    } catch (error) {
      console.error('❌ Error saving employee:', error);
      alert(`❌ Failed to ${modalState.mode === 'create' ? 'create' : 'update'} ${updatedEmployee.name}. Please try again.`);
    }
  };

  const handleEmployeeDelete = (employeeId: string) => {
    // In a real app, this would delete from the database
    console.log('Deleting employee:', employeeId);
    setTimeout(() => {
      refetch();
      alert('Employee has been deleted.');
    }, 200);
  };

  const handleEdit = (employee: Employee) => {
    openModal(employee, 'edit');
  };

  const handleView = (employee: Employee) => {
    openModal(employee, 'view');
  };

  const handleTransfer = (employee: any) => {
    const newSite = employee.site === 'Austin' ? 'Charlotte' : 'Austin';
    
    addPendingChange({
      type: 'transfer',
      employeeName: employee.name,
      description: `Transfer ${employee.name} from ${employee.site} to ${newSite} site`
    });
    
    alert(`📝 Change queued: ${employee.name} will be transferred to ${newSite} site`);
  };

  const handleTerminate = (employee: any) => {
    if (window.confirm(`Are you sure you want to terminate ${employee.name}?`)) {
      addPendingChange({
        type: 'terminate',
        employeeName: employee.name,
        description: `Terminate ${employee.name} (${employee.role}) - ${employee.site} site`
      });
      
      alert(`📝 Change queued: ${employee.name} will be terminated`);
    }
  };

  // Bulk action handlers
  const handleBulkTransfer = async (employeeIds: string[], newSite: Site) => {
    // Simulate bulk transfer
    for (const employeeId of employeeIds) {
      moveEmployee.mutate({ employeeId, newSite });
    }
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkPromote = async (employeeIds: string[], newRole: Role) => {
    // Simulate bulk promotion
    for (const employeeId of employeeIds) {
      promoteEmployee.mutate({ employeeId, newRole });
    }
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkUpdateCommission = async (employeeIds: string[], tier: CommissionTier) => {
    // Simulate bulk commission update
    console.log('Bulk commission update:', employeeIds, tier);
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkTerminate = async (employeeIds: string[]) => {
    // Simulate bulk termination
    for (const employeeId of employeeIds) {
      moveEmployee.mutate({ employeeId, status: 'terminated' });
    }
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkReassign = async (employeeIds: string[], newManagerId: string) => {
    // Simulate bulk reassignment
    for (const employeeId of employeeIds) {
      moveEmployee.mutate({ employeeId, newManagerId });
    }
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  // Change tracking functions
  const addPendingChange = (change: Omit<ChangeRecord, 'id' | 'timestamp'>) => {
    const newChange: ChangeRecord = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    setPendingChanges(prev => [...prev, newChange]);
    // hasUnsavedChanges is now managed by useEffect
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
    // Also clear pending employee edits
    localStorage.removeItem('pending_employee_edits');
    // hasUnsavedChanges is now managed by useEffect
  };

  // Get total pending changes including edits
  const getPendingChangesCount = () => {
    const pendingEdits = JSON.parse(localStorage.getItem('pending_employee_edits') || '{}');
    return pendingChanges.length + Object.keys(pendingEdits).length;
  };

  const getTotalPendingChanges = () => {
    const pendingEdits = JSON.parse(localStorage.getItem('pending_employee_edits') || '{}');
    const editChanges = Object.entries(pendingEdits).map(([employeeId, updatedEmployee]) => ({
      id: `edit-${employeeId}`,
      type: 'edit' as const,
      employeeName: (updatedEmployee as Employee).name,
      description: `Edit ${(updatedEmployee as Employee).name}`,
      timestamp: Date.now(),
    }));
    return [...pendingChanges, ...editChanges];
  };

  const applyAllChanges = async (notificationSettings: NotificationSettings) => {
    // In a real app, this would apply all changes to the database
    console.log('Applying changes:', pendingChanges);
    console.log('Notification settings:', notificationSettings);
    
    // Apply pending employee edits first
    const pendingEdits = JSON.parse(localStorage.getItem('pending_employee_edits') || '{}');
    for (const [employeeId, updatedEmployee] of Object.entries(pendingEdits)) {
      try {
        if (isConnected) {
          await firebaseEmployees.updateEmployee(employeeId, updatedEmployee as Employee);
          console.log('✅ Applied edit for employee:', (updatedEmployee as Employee).name);
        } else {
          console.log('📝 Mock mode - Applied edit for employee:', (updatedEmployee as Employee).name);
        }
      } catch (error) {
        console.error('❌ Failed to apply edit for employee:', employeeId, error);
      }
    }
    
    // Clear pending edits
    localStorage.removeItem('pending_employee_edits');
    
    // Simulate applying other changes and send external notifications
    for (const change of pendingChanges) {
      // Apply each change based on type
      console.log(`Applying ${change.type} for ${change.employeeName}`);
      
      // Send external notifications for each change
      try {
        const employee = allEmployees.find(emp => emp.name === change.employeeName);
        if (employee) {
          await externalIntegrationsService.notifyChange(
            change.type as any,
            {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              site: employee.site,
              managerId: employee.managerId,
              managerName: allEmployees.find(emp => emp.id === employee.managerId)?.name,
            },
            {
              description: change.description,
            },
            site,
            {
              sendToN8n: true,
              sendToSlack: notificationSettings.sendSlack,
            }
          );
        }
      } catch (error) {
        console.error('Failed to send external notification:', error);
      }
    }
    
    // Send notifications
    if (notificationSettings.sendSlack) {
      console.log('Sending Slack notifications to:', notificationSettings.recipients);
      // Simulate Slack API call
      setTimeout(() => {
        alert(`📱 Slack notifications sent! ${pendingChanges.length} changes communicated to team.`);
      }, 500);
    }
    
    if (notificationSettings.sendEmail) {
      console.log('Sending email notifications to:', notificationSettings.recipients);
      // Simulate email API call
      setTimeout(() => {
        alert(`📧 Email notifications sent! ${pendingChanges.length} changes documented.`);
      }, 1000);
    }
    
    // Clear pending changes and refresh data
    clearPendingChanges();
    setConfirmationModalOpen(false);
    refetch();
    
    const totalChanges = pendingChanges.length + Object.keys(pendingEdits).length;
    alert(`✅ Successfully applied ${totalChanges} changes and sent external notifications!`);
  };

  const handleShowConfirmation = () => {
    const totalPending = getPendingChangesCount();
    if (totalPending > 0) {
      setConfirmationModalOpen(true);
    } else {
      alert('No pending changes to confirm.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (employee: Employee) => {
    console.log('🎯 Drag started:', employee.name);
    setIsDragging(true);
    setDraggedEmployee(employee);
  };

  const handleDragEnd = () => {
    console.log('🎯 Drag ended');
    setIsDragging(false);
    // Don't immediately clear draggedEmployee - let them use quick assign
    setTimeout(() => {
      if (!showQuickAssign) {
        setDraggedEmployee(null);
      } else {
        // Show quick assign modal for 3 seconds after drag ends
        setShowQuickAssign(true);
        setTimeout(() => {
          setShowQuickAssign(false);
          setDraggedEmployee(null);
        }, 3000);
      }
    }, 100);
  };

  const handleQuickAssign = (managerId: string) => {
    if (draggedEmployee) {
      const manager = allEmployees.find(emp => emp.id === managerId);
      if (manager) {
        handleDrop(managerId, draggedEmployee.id);
      }
    }
    setShowQuickAssign(false);
    setDraggedEmployee(null);
    setIsDragging(false);
  };

  const handleShowQuickAssign = () => {
    if (draggedEmployee) {
      setShowQuickAssign(true);
    }
  };

  const handleCancelQuickAssign = () => {
    setShowQuickAssign(false);
    setDraggedEmployee(null);
    setIsDragging(false);
  };

  // Data import handler
  const handleImportRealData = async () => {
    try {
      setIsImporting(true);
      
      // Get expected employee count
      const expectedCount = await getEmployeeCount();
      
      const confirmed = window.confirm(
        `🚀 Import Real Organizational Data\n\n` +
        `This will import ${expectedCount} employees from your real organizational structure:\n` +
        `• Steve Kelley (Austin Director)\n` +
        `• Trent Terrell (Charlotte Director)\n` +
        `• All managers, team leads, and agents\n\n` +
        `⚠️ WARNING: This will replace all current data!\n\n` +
        `Continue with import?`
      );
      
      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      // Validate Firebase connection
      const isConnected = await validateFirebaseConnection();
      if (!isConnected) {
        alert('❌ Firebase connection failed. Please check your configuration.');
        setIsImporting(false);
        return;
      }

      // Import the data
      await importRealDataToFirebase();
      
      // Refresh the view
      refetch();
      
      alert('✅ Successfully imported real organizational data! Refresh the page to see all employees.');
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('❌ Import failed. Please check the console for details.');
    } finally {
      setIsImporting(false);
    }
  };

  // State for view toggle
  const [viewMode, setViewMode] = useState<'detailed' | 'at-glance'>('detailed');

  // Check integration status on mount
  useEffect(() => {
    const status = externalIntegrationsService.getConfigStatus();
    setIntegrationsStatus(status);
  }, [integrationsModalOpen]); // Refresh when modal closes

  // Check for unsaved changes (including edits)
  const checkForUnsavedChanges = useCallback(() => {
    const pendingEdits = JSON.parse(localStorage.getItem('pending_employee_edits') || '{}');
    const hasPendingEdits = Object.keys(pendingEdits).length > 0;
    setHasUnsavedChanges(pendingChanges.length > 0 || hasPendingEdits);
  }, [pendingChanges]);

  // Update unsaved changes when pendingChanges changes
  useEffect(() => {
    checkForUnsavedChanges();
  }, [pendingChanges, checkForUnsavedChanges]);

  // Check for pending edits on component mount and periodically
  useEffect(() => {
    checkForUnsavedChanges();
    const interval = setInterval(checkForUnsavedChanges, 1000); // Check every second
    return () => clearInterval(interval);
  }, [checkForUnsavedChanges]);

  // Auto-scroll functionality for drag and drop
  useEffect(() => {
    if (!isDragging) return;

    let animationFrame: number;
    let isScrolling = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrolling) return; // Prevent multiple scroll animations
      
      const scrollThreshold = 80; // pixels from edge
      const scrollSpeed = 20; // pixels per scroll
      const { clientY, clientX } = e;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      let scrollX = 0;
      let scrollY = 0;
      
      // Vertical scrolling
      if (clientY < scrollThreshold) {
        // Near top - scroll up
        scrollY = -scrollSpeed;
      } else if (clientY > windowHeight - scrollThreshold) {
        // Near bottom - scroll down
        scrollY = scrollSpeed;
      }
      
      // Horizontal scrolling
      if (clientX < scrollThreshold) {
        // Near left - scroll left
        scrollX = -scrollSpeed;
      } else if (clientX > windowWidth - scrollThreshold) {
        // Near right - scroll right
        scrollX = scrollSpeed;
      }
      
      // Perform the scroll if needed
      if (scrollX !== 0 || scrollY !== 0) {
        isScrolling = true;
        
        const smoothScroll = () => {
          window.scrollBy({
            left: scrollX,
            top: scrollY,
            behavior: 'auto' // Use 'auto' for immediate response
          });
          
          // Continue scrolling if mouse is still in trigger zone
          animationFrame = requestAnimationFrame(() => {
            isScrolling = false;
          });
        };
        
        smoothScroll();
      }
    };

    // Mouse wheel scrolling during drag
    const handleWheel = (e: WheelEvent) => {
      // Don't prevent default - let normal scrolling work
      console.log('🖱️ Wheel scroll during drag:', { deltaX: e.deltaX, deltaY: e.deltaY });
      
      // Enhanced wheel scrolling - make it more responsive during drag
      const wheelMultiplier = 1.5; // Make wheel scrolling more responsive during drag
      
      // Use smooth scrolling for better UX
      window.scrollBy({
        left: e.deltaX * wheelMultiplier,
        top: e.deltaY * wheelMultiplier,
        behavior: 'smooth'
      });
    };

    // Add event listeners to document for global coverage
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('dragover', handleMouseMove, { passive: false }); // Also listen to dragover
    document.addEventListener('wheel', handleWheel, { passive: true }); // Use passive for wheel events
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragover', handleMouseMove);
      document.removeEventListener('wheel', handleWheel);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading organizational data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-8">
        {/* Search and controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle - More Subtle */}
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${
                  viewMode === 'detailed'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">📋</span>
                Detailed
              </button>
              <button
                onClick={() => setViewMode('at-glance')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${
                  viewMode === 'at-glance'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">🌳</span>
                At a Glance
              </button>
            </div>

            {/* Search - Cleaner */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm w-64 bg-white"
              />
            </div>
            
            {/* Bulk Actions - Lighter */}
            {showBulkActions && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600 font-medium">
                  {selectedEmployees.size} selected
                </span>
                {selectedEmployees.size > 0 && (
                  <>
                    <button
                      onClick={() => setBulkModalOpen(true)}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      <Squares2X2Icon className="w-4 h-4 mr-2" />
                      Bulk Actions
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                    >
                      Clear Selection
                    </button>
                  </>
                )}
                {selectedEmployees.size === 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Select All
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Action Buttons - Cleaner Row */}
          <div className="flex items-center gap-3">
            {/* Pending Changes - Subtle Indicator */}
            {hasUnsavedChanges && (
              <button
                onClick={handleShowConfirmation}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 shadow-sm transition-all font-medium"
              >
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                {getPendingChangesCount()} Pending
              </button>
            )}
            
            {/* Import Data - Cleaner */}
            <button
              onClick={handleImportRealData}
              disabled={isImporting}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Data'}
            </button>
            
            {/* Integrations - Cleaner with status */}
            <button
              onClick={() => setIntegrationsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 relative transition-colors font-medium"
            >
              <CogIcon className="w-4 h-4 mr-2" />
              Integrations
              {(integrationsStatus.n8nConfigured || integrationsStatus.slackConfigured) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              )}
            </button>
            
            {/* Add Employee - Primary Action */}
            <button
              onClick={() => openModal(null, 'create')}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Clear Hierarchy Guide */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">🏢</span>
            Organizational Hierarchy & Drag-Drop Guide
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Hierarchy */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-500 rounded-full mr-2 flex items-center justify-center">
                  <span className="text-white text-xs">1</span>
                </span>
                Reporting Structure
              </h4>
              
              <div className="space-y-3">
                {/* Level 1 */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">👑</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-purple-700">Level 1: Site Directors</div>
                    <div className="text-xs text-gray-600">Executive leadership - Cannot be moved</div>
                  </div>
                </div>
                
                {/* Connection line */}
                <div className="ml-4 w-0.5 h-4 bg-gray-300"></div>
                
                {/* Level 2 */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">👔</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-700">Level 2: Sales Managers</div>
                    <div className="text-xs text-gray-600">Report to Directors - Can accept dropped employees</div>
                  </div>
                </div>
                
                {/* Connection line */}
                <div className="ml-4 w-0.5 h-4 bg-gray-300"></div>
                
                {/* Level 3 */}
                <div className="ml-4 space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🎯</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-700">Level 3a: Team Leads</div>
                      <div className="text-xs text-gray-600">Report to Sales Managers</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">💼</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-700">Level 3b: Sales Agents</div>
                      <div className="text-xs text-gray-600">Report to Sales Managers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Drag & Drop Instructions */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                  <span className="text-white text-xs">2</span>
                </span>
                How to Use Drag & Drop
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs">🎯</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Manager Drop Zones</div>
                    <div className="text-gray-600 text-xs">Blue dashed areas under each manager accept new team members</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs">✅</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Valid Moves</div>
                    <div className="text-gray-600 text-xs">Team Leads & Agents → Sales Managers</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">❌</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Invalid Moves</div>
                    <div className="text-gray-600 text-xs">Directors cannot be moved, same-level transfers not allowed</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 text-xs">⚡</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Visual Feedback</div>
                    <div className="text-gray-600 text-xs">Green highlights = valid drop target, Red = invalid</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Hierarchy Overview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">📊 Organizational Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Austin Site Structure */}
            <div className="bg-white rounded-lg p-3 border">
              <h4 className="font-medium text-purple-600 mb-2 flex items-center">
                <div className="w-3 h-3 bg-sales-director rounded mr-2"></div>
                Austin Site Director
              </h4>
              <div className="ml-4 space-y-2">
                {filteredEmployees.managers.filter(m => m.site === 'Austin').map(manager => (
                  <div key={manager.id} className="border-l-2 border-blue-300 pl-3">
                    <div className="font-medium text-blue-600 flex items-center">
                      <div className="w-2 h-2 bg-sales-manager rounded mr-2"></div>
                      {manager.name}
                    </div>
                    <div className="ml-3 text-xs text-gray-600">
                      Reports: {[...filteredEmployees.teamLeads, ...filteredEmployees.agents]
                        .filter(emp => emp.managerId === manager.id).length} employees
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charlotte Site Structure */}
            <div className="bg-white rounded-lg p-3 border">
              <h4 className="font-medium text-purple-600 mb-2 flex items-center">
                <div className="w-3 h-3 bg-sales-director rounded mr-2"></div>
                Charlotte Site Director
              </h4>
              <div className="ml-4 space-y-2">
                {filteredEmployees.managers.filter(m => m.site === 'Charlotte').map(manager => (
                  <div key={manager.id} className="border-l-2 border-blue-300 pl-3">
                    <div className="font-medium text-blue-600 flex items-center">
                      <div className="w-2 h-2 bg-sales-manager rounded mr-2"></div>
                      {manager.name}
                    </div>
                    <div className="ml-3 text-xs text-gray-600">
                      Reports: {[...filteredEmployees.teamLeads, ...filteredEmployees.agents]
                        .filter(emp => emp.managerId === manager.id).length} employees
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.totalDirectors}</div>
            <div className="text-sm text-purple-600">Directors</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalManagers}</div>
            <div className="text-sm text-blue-600">Managers</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.totalTeamLeads}</div>
            <div className="text-sm text-green-600">Team Leads</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.totalAgents}</div>
            <div className="text-sm text-gray-600">Agents</div>
          </div>
        </div>

        {/* At-a-Glance View */}
        {viewMode === 'at-glance' && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100">
            {/* Beautiful Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {site} Site Organizational Structure
              </h3>
              <p className="text-gray-600 mt-2">Interactive organizational chart - click any employee to view details</p>
            </div>

            {/* Clean Tree Structure */}
            <div className="relative overflow-x-auto">
              <div className="min-w-fit mx-auto">
                {/* Directors Level */}
                {filteredEmployees.directors.map((director, directorIndex) => (
                  <div key={director.id} className="mb-16">
                    {/* Director Node - Elegant and Clean */}
                    <div className="flex justify-center mb-12">
                      <div 
                        onClick={() => handleView(director)}
                        className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
                      >
                        <div className="relative bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl min-w-[280px] text-center border-2 border-white/20">
                          {/* Crown Badge */}
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white text-sm">👑</span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex items-center justify-center mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-2xl">🏢</span>
                            </div>
                          </div>
                          <h4 className="font-bold text-xl mb-1">{director.name}</h4>
                          <p className="text-purple-100 font-medium">Site Director</p>
                          <div className="mt-3 bg-white/10 rounded-full px-3 py-1 text-sm">
                            📍 {director.site}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connection Line to Managers */}
                    {filteredEmployees.managers.filter(m => m.site === director.site).length > 0 && (
                      <div className="relative">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6">
                          <div className="w-0.5 h-6 bg-gradient-to-b from-purple-300 to-blue-300"></div>
                        </div>
                      </div>
                    )}

                    {/* Managers Level - Clean Cards */}
                    {filteredEmployees.managers.filter(m => m.site === director.site).length > 0 && (
                      <div className="flex justify-center mb-10">
                        <div className="flex flex-wrap justify-center gap-8">
                          {filteredEmployees.managers.filter(m => m.site === director.site).map((manager) => {
                            const teamMembers = [...filteredEmployees.teamLeads, ...filteredEmployees.agents]
                              .filter(emp => emp.managerId === manager.id);
                            
                            return (
                              <div key={manager.id} className="flex flex-col items-center">
                                {/* Vertical Line to Manager */}
                                <div className="w-0.5 h-8 bg-gradient-to-b from-blue-300 to-cyan-300 mb-4"></div>
                                
                                {/* Manager Card - Clean Design */}
                                <div 
                                  onClick={() => handleView(manager)}
                                  className="group cursor-pointer transform hover:scale-105 transition-all duration-300 mb-6"
                                >
                                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-5 shadow-md hover:shadow-lg w-[240px] text-center border border-white/20">
                                    {/* Badge */}
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">👔</span>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex items-center justify-center mb-3">
                                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-xl">👥</span>
                                      </div>
                                    </div>
                                    <h4 className="font-semibold text-lg mb-1">{manager.name}</h4>
                                    <p className="text-blue-100 text-sm">Sales Manager</p>
                                    <div className="mt-2 bg-white/10 rounded-full px-3 py-1 text-xs">
                                      👥 {teamMembers.length} Reports
                                    </div>
                                  </div>
                                </div>

                                {/* Team Members - Minimalist Cards */}
                                {teamMembers.length > 0 ? (
                                  <div className="flex flex-col items-center">
                                    {/* Connection Line */}
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-300 to-green-300"></div>
                                    
                                    {/* Team Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                      {teamMembers
                                        .sort((a, b) => {
                                          if (a.role === 'Team Lead' && b.role === 'Agent') return -1;
                                          if (a.role === 'Agent' && b.role === 'Team Lead') return 1;
                                          return a.name.localeCompare(b.name);
                                        })
                                        .map((employee) => (
                                          <div 
                                            key={employee.id}
                                            onClick={() => handleView(employee)}
                                            className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
                                          >
                                            <div className={`rounded-lg p-3 shadow-sm hover:shadow-md text-center border border-white/30 ${
                                              employee.role === 'Team Lead' 
                                                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' 
                                                : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white'
                                            } min-w-[110px]`}>
                                              {/* Role Icon */}
                                              <div className="text-lg mb-1">
                                                {employee.role === 'Team Lead' ? '🎯' : '💼'}
                                              </div>
                                              {/* Name */}
                                              <div className="font-medium text-sm truncate" title={employee.name}>
                                                {employee.name.split(' ')[0]}
                                              </div>
                                              {/* Role */}
                                              <div className="text-xs opacity-90 mt-1">
                                                {employee.role === 'Team Lead' ? 'Lead' : 'Agent'}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`transition-all ${
                                    isDragging 
                                      ? 'p-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' 
                                      : 'p-3 bg-gray-50'
                                  }`}>
                                    <div className="text-center">
                                      {isDragging ? (
                                        <div className="text-blue-600">
                                          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                                            <span className="text-2xl">🎯</span>
                                          </div>
                                          <p className="font-medium">Drop employee here</p>
                                          <p className="text-xs mt-1">Build {manager.name}'s team</p>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 text-sm">
                                          <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                                            <span className="text-lg">👥</span>
                                          </div>
                                          <p>No team members</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Unassigned Employees - Clean Warning */}
                {unassignedEmployees.length > 0 && (
                  <div className="mt-12 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="font-medium text-yellow-800">Unassigned Employees</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {unassignedEmployees.map((employee) => (
                        <div 
                          key={employee.id}
                          onClick={() => handleView(employee)}
                          className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md cursor-pointer transform hover:scale-105 transition-all duration-300 border border-yellow-200"
                        >
                          <div className="text-center">
                            <div className="text-lg mb-1">
                              {employee.role === 'Team Lead' ? '🎯' : employee.role === 'Sales Manager' ? '👔' : '💼'}
                            </div>
                            <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                            <div className="text-xs text-gray-600">{employee.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee Cards - Clear Hierarchy Structure (Detailed View) */}
        {viewMode === 'detailed' && (
          <div className="space-y-8">
            {/* Directors */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👑</span>
                  </div>
                  Site Directors
                  <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    Level 1 - Executive
                  </span>
                </h3>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredEmployees.directors.length}</span> Director{filteredEmployees.directors.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {filteredEmployees.directors.map((employee) => (
                  <div key={employee.id} className="transform hover:scale-105 transition-transform">
                    <div onClick={() => handleView(employee)} className="cursor-pointer">
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        onView={handleView}
                        onEdit={handleEdit}
                        onPromote={(emp) => handlePromote(emp.id, emp.role)}
                        onTransfer={handleTransfer}
                        onTerminate={handleTerminate}
                        onSelect={handleEmployeeSelect}
                        isSelected={selectedEmployees.has(employee.id)}
                        showBulkActions={showBulkActions}
                        isDragMode={true}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Managers and their Teams - Clear Hierarchy */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👔</span>
                  </div>
                  Sales Manager Teams
                  <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Level 2 - Management
                  </span>
                </h3>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredEmployees.managers.length}</span> Team{filteredEmployees.managers.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="space-y-6">
                {filteredEmployees.managers.map((manager) => {
                  const directReports = [...filteredEmployees.teamLeads, ...filteredEmployees.agents]
                    .filter(emp => emp.managerId === manager.id);
                  const teamLeads = directReports.filter(emp => emp.role === 'Team Lead');
                  const agents = directReports.filter(emp => emp.role === 'Agent');
                  
                  return (
                    <div key={manager.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                      {/* Manager Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-lg">👔</span>
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg">{manager.name}</h4>
                              <div className="flex items-center space-x-4 text-blue-100 text-sm">
                                <span>🏢 {manager.site} Site</span>
                                <span>👥 {directReports.length} Reports</span>
                                <span>📊 Sales Manager</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-xs">Drop Zone</div>
                            <div className="text-blue-200 text-xs">Drag employees here</div>
                          </div>
                        </div>
                      </div>

                      {/* Manager Card as Drop Zone */}
                      <div className="p-4 bg-blue-50">
                        <DropZone
                          onDrop={(droppedId) => handleDrop(manager.id, droppedId)}
                          className={`relative rounded-lg transition-all ${
                            isDragging 
                              ? 'border-2 border-dashed border-blue-400 bg-blue-100 p-2' 
                              : 'border border-transparent p-1'
                          }`}
                          canDrop={isDragging}
                        >
                          <div onClick={() => handleView(manager)} className="cursor-pointer">
                            <EmployeeCard
                              key={manager.id}
                              employee={manager}
                              onView={handleView}
                              onEdit={handleEdit}
                              onPromote={(emp) => handlePromote(emp.id, emp.role)}
                              onTransfer={handleTransfer}
                              onTerminate={handleTerminate}
                              onSelect={handleEmployeeSelect}
                              isSelected={selectedEmployees.has(manager.id)}
                              showBulkActions={showBulkActions}
                              isDragMode={true}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                            />
                          </div>
                          
                          {/* Only show drop hint when dragging */}
                          {isDragging && (
                            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full opacity-75">
                              Drop Zone
                            </div>
                          )}
                        </DropZone>
                      </div>

                      {/* Team Structure - Simplified for 1:1 Manager-Team Lead relationship */}
                      {directReports.length > 0 ? (
                        <div className="p-4 bg-gray-50">
                          {/* Single Team Lead - Clean Row */}
                          {teamLeads.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center space-x-4 bg-white rounded-lg p-3 shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-4 h-0.5 bg-green-400 mr-3"></div>
                                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-green-600 text-xs">🎯</span>
                                  </span>
                                  <div>
                                    <div className="text-sm font-bold text-green-700">Team Lead</div>
                                    <div className="text-xs text-gray-600">Level 3 Leadership</div>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div onClick={() => handleView(teamLeads[0])} className="cursor-pointer">
                                    <EmployeeCard
                                      key={teamLeads[0].id}
                                      employee={teamLeads[0]}
                                      onView={handleView}
                                      onEdit={handleEdit}
                                      onPromote={(emp) => handlePromote(emp.id, emp.role)}
                                      onTransfer={handleTransfer}
                                      onTerminate={handleTerminate}
                                      onSelect={handleEmployeeSelect}
                                      isSelected={selectedEmployees.has(teamLeads[0].id)}
                                      showBulkActions={showBulkActions}
                                      isDragMode={true}
                                      onDragStart={handleDragStart}
                                      onDragEnd={handleDragEnd}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Agents - Compact Grid */}
                          {agents.length > 0 && (
                            <div>
                              <div className="flex items-center mb-3">
                                <div className="w-4 h-0.5 bg-gray-400"></div>
                                <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mr-2 ml-2">
                                  <span className="text-gray-600 text-xs">💼</span>
                                </span>
                                <h5 className="text-sm font-bold text-gray-700">
                                  Sales Agents ({agents.length})
                                </h5>
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  Level 3
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                {agents.map((employee) => (
                                  <div key={employee.id} onClick={() => handleView(employee)} className="cursor-pointer transform hover:scale-105 transition-transform">
                                    <EmployeeCard
                                      key={employee.id}
                                      employee={employee}
                                      onView={handleView}
                                      onEdit={handleEdit}
                                      onPromote={(emp) => handlePromote(emp.id, emp.role)}
                                      onTransfer={handleTransfer}
                                      onTerminate={handleTerminate}
                                      onSelect={handleEmployeeSelect}
                                      isSelected={selectedEmployees.has(employee.id)}
                                      showBulkActions={showBulkActions}
                                      isDragMode={true}
                                      onDragStart={handleDragStart}
                                      onDragEnd={handleDragEnd}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`transition-all ${
                          isDragging 
                            ? 'p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' 
                            : 'p-3 bg-gray-50'
                        }`}>
                          <div className="text-center">
                            {isDragging ? (
                              <div className="text-blue-600">
                                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                                  <span className="text-xl">🎯</span>
                                </div>
                                <p className="font-medium text-sm">Drop employee here</p>
                                <p className="text-xs mt-1">Build {manager.name}'s team</p>
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm">
                                <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                                  <span className="text-lg">👥</span>
                                </div>
                                <p className="text-xs">No team members</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unassigned Employees - Critical Action Required */}
            {(filteredEmployees.teamLeads.filter(emp => !emp.managerId).length > 0 || 
              filteredEmployees.agents.filter(emp => !emp.managerId).length > 0) && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-red-600 to-orange-600 rounded-full mr-3 flex items-center justify-center animate-pulse">
                      <span className="text-white text-sm font-bold">⚠️</span>
                    </div>
                    Unassigned Employees
                    <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full animate-pulse">
                      Action Required
                    </span>
                  </h3>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-red-600">
                      {[...filteredEmployees.teamLeads, ...filteredEmployees.agents].filter(emp => !emp.managerId).length}
                    </span> Unassigned
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Assignment Required</h4>
                      <p className="text-sm text-yellow-700">
                        These employees need to be assigned to a Sales Manager. Use drag & drop to move them to the appropriate manager's team section above.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border-2 border-dashed border-red-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                    {[...filteredEmployees.teamLeads, ...filteredEmployees.agents]
                      .filter(emp => !emp.managerId)
                      .sort((a, b) => {
                        // Team Leads first, then Agents
                        if (a.role === 'Team Lead' && b.role === 'Agent') return -1;
                        if (a.role === 'Agent' && b.role === 'Team Lead') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((employee) => (
                        <div key={employee.id} className="relative">
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center z-10">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <div onClick={() => handleView(employee)} className="cursor-pointer transform hover:scale-105 transition-transform">
                            <EmployeeCard
                              key={employee.id}
                              employee={employee}
                              onView={handleView}
                              onEdit={handleEdit}
                              onPromote={(emp) => handlePromote(emp.id, emp.role)}
                              onTransfer={handleTransfer}
                              onTerminate={handleTerminate}
                              onSelect={handleEmployeeSelect}
                              isSelected={selectedEmployees.has(employee.id)}
                              showBulkActions={showBulkActions}
                              isDragMode={true}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                            />
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        employee={modalState.employee}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        onClose={closeModal}
        onSave={handleEmployeeSave}
        onDelete={handleEmployeeDelete}
        onReassign={(employeeId, newManagerId) => {
          addPendingChange({
            type: 'move',
            employeeName: allEmployees.find(emp => emp.id === employeeId)?.name || 'Employee',
            description: `Reassign ${allEmployees.find(emp => emp.id === employeeId)?.name} to ${allEmployees.find(emp => emp.id === newManagerId)?.name}'s team`
          });
          closeModal();
          alert('📝 Change queued: Employee will be reassigned when you apply changes');
        }}
        availableManagers={managers}
      />

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedEmployees={selectedEmployeeObjects}
        onBulkTransfer={handleBulkTransfer}
        onBulkPromote={handleBulkPromote}
        onBulkUpdateCommission={handleBulkUpdateCommission}
        onBulkTerminate={handleBulkTerminate}
        onBulkReassign={handleBulkReassign}
      />

      {/* Change Confirmation Modal */}
      <ChangeConfirmationModal
        isOpen={confirmationModalOpen}
        onClose={() => setConfirmationModalOpen(false)}
        changes={getTotalPendingChanges()}
        onAccept={applyAllChanges}
        onContinue={() => setConfirmationModalOpen(false)}
        onDiscard={() => {
          clearPendingChanges();
          setConfirmationModalOpen(false);
        }}
      />

      {/* Quick Assign Button - small and elegant, appears after drag */}
      {!isDragging && draggedEmployee && !showQuickAssign && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleShowQuickAssign}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center text-sm transition-all"
          >
            🎯 Assign {draggedEmployee?.name.split(' ')[0]}
          </button>
        </div>
      )}

      {/* Dynamic Quick Assign - appears when dragging */}
      {isDragging && draggedEmployee && (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 max-w-xs">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center">
              🎯 Quick Assign
            </h3>
            <p className="text-xs text-gray-600">
              {draggedEmployee?.name.split(' ')[0]} • {draggedEmployee?.role}
            </p>
          </div>
          
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredEmployees.managers.map((manager) => {
              const canAssign = validateMove(draggedEmployee, manager).valid;
              return (
                <button
                  key={manager.id}
                  onClick={() => handleQuickAssign(manager.id)}
                  disabled={!canAssign}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    canAssign 
                      ? 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <div className="font-medium">{manager.name}</div>
                  <div className="text-xs opacity-75">{manager.site}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Manager Selector - only for manual quick assign */}
      {!isDragging && showQuickAssign && draggedEmployee && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 max-w-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              🎯 Assign Employee
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Choose a manager for {draggedEmployee?.name}
            </p>
          </div>
          
          <div className="space-y-2">
            {filteredEmployees.managers.map((manager) => {
              const canAssign = validateMove(draggedEmployee, manager).valid;
              return (
                <button
                  key={manager.id}
                  onClick={() => handleQuickAssign(manager.id)}
                  disabled={!canAssign}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                    canAssign 
                      ? 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <div className="font-medium">{manager.name}</div>
                  <div className="text-xs opacity-75">{manager.site} - Sales Manager</div>
                  {!canAssign && (
                    <div className="text-xs text-red-500 mt-1">
                      {validateMove(draggedEmployee, manager).reason}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={handleCancelQuickAssign}
            className="w-full mt-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Integrations Modal */}
      <IntegrationsModal
        isOpen={integrationsModalOpen}
        onClose={() => setIntegrationsModalOpen(false)}
      />

      {/* Auto-scroll Visual Indicators - Show when dragging */}
      {isDragging && (
        <>
          {/* Top scroll zone */}
          <div 
            className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-200 to-transparent opacity-50 z-40 pointer-events-none"
            style={{ backdropFilter: 'blur(1px)' }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                ⬆️ Scroll Up Zone
              </div>
            </div>
          </div>
          
          {/* Bottom scroll zone */}
          <div 
            className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-blue-200 to-transparent opacity-50 z-40 pointer-events-none"
            style={{ backdropFilter: 'blur(1px)' }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                ⬇️ Scroll Down Zone
              </div>
            </div>
          </div>
          
          {/* Left scroll zone */}
          <div 
            className="fixed top-0 left-0 bottom-0 w-20 bg-gradient-to-r from-blue-200 to-transparent opacity-50 z-40 pointer-events-none"
            style={{ backdropFilter: 'blur(1px)' }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium transform -rotate-90">
                ⬅️ Scroll Left
              </div>
            </div>
          </div>
          
          {/* Right scroll zone */}
          <div 
            className="fixed top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-blue-200 to-transparent opacity-50 z-40 pointer-events-none"
            style={{ backdropFilter: 'blur(1px)' }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium transform rotate-90">
                ➡️ Scroll Right
              </div>
            </div>
          </div>

          {/* Mouse Wheel Scrolling Indicator */}
          <div className="fixed top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
            <div className="flex items-center space-x-2">
              <div className="animate-spin">🖱️</div>
              <div className="text-sm font-medium">Mouse Wheel Active</div>
            </div>
            <div className="text-xs opacity-90 mt-1">Use scroll wheel to navigate while dragging</div>
          </div>
        </>
      )}
    </>
  );
}; 