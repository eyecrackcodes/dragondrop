import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  CogIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";
import { Employee, Site, Role, CommissionTier } from "../types";
import { EmployeeCard } from "./EmployeeCard";
import { EmployeeModal } from "./EmployeeModal";
import { BulkActionsModal } from "./BulkActionsModal";
import { ChangeConfirmationModal } from "./ChangeConfirmationModal";
import { IntegrationsModal } from "./IntegrationsModal";
import { TerminationModal } from "./TerminationModal";
import { TerminatedEmployeesView } from "./TerminatedEmployeesView";
import { SlackTestingInterface } from "./SlackTestingInterface";
import { CollapsibleHierarchy } from "./CollapsibleHierarchy";
import {
  useFirebaseOrgStructure,
  useFirebaseDragAndDrop,
  useFirebaseEmployees,
  useFirebaseConnection,
} from "../hooks/useFirebaseData";
import {
  useMockOrgStructure,
  useMockDragAndDrop,
  useMockEmployees,
} from "../hooks/useMockData";
import {
  importRealDataToFirebase,
  validateFirebaseConnection,
  getEmployeeCount,
} from "../services/firebaseImporter";
import { calculateAgentCommission } from "../utils/commissionCalculator";
import { externalIntegrationsService } from "../services/externalIntegrations";
import { format } from "date-fns";

// Types
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
  id: string;
}

interface ChangeRecord {
  id: string;
  type: "move" | "promote" | "transfer" | "terminate" | "create" | "edit";
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

const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  accept = "employee",
  children,
  className = "",
  canDrop = true,
  id,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      onDrop,
      accept,
      canDrop,
    },
  });

  const dropZoneClass = useMemo(() => {
    if (!canDrop) return className;
    if (isOver && canDrop) return `${className} drop-zone-active`;
    if (isOver) return `${className} drop-zone-invalid`;
    return `${className} border-2 border-dashed border-gray-300 rounded-xl transition-all duration-300`;
  }, [isOver, canDrop, className]);

  return (
    <div ref={setNodeRef} className={dropZoneClass}>
      {children}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl border-2 border-green-400 animate-bounce">
            <span className="mr-2">✅</span>
            Drop Here to Assign
          </div>
        </div>
      )}
      {isOver && !canDrop && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 to-pink-500/30 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl border-2 border-red-400 animate-bounce">
            <span className="mr-2">❌</span>
            Cannot Drop Here
          </div>
        </div>
      )}
    </div>
  );
};

export const OrgChart: React.FC<OrgChartProps> = ({
  site,
  showBulkActions = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set()
  );

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    mode: "view" | "edit" | "create";
  }>({
    isOpen: false,
    employee: null,
    mode: "view",
  });

  // Team filtering state
  const [selectedManagerId, setSelectedManagerId] = useState<string | "all">(
    "all"
  );

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
  const [showHierarchyGuide, setShowHierarchyGuide] = useState(false);

  // Data import state
  const [isImporting, setIsImporting] = useState(false);

  // Integrations modal state
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const [integrationsStatus, setIntegrationsStatus] = useState({
    n8nConfigured: false,
    slackConfigured: false,
  });

  // Termination modal state
  const [terminationModalOpen, setTerminationModalOpen] = useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] =
    useState<Employee | null>(null);

  // Slack testing interface state
  const [slackTestingOpen, setSlackTestingOpen] = useState(false);

  // View mode state - add terminated employees view
  const [viewMode, setViewMode] = useState<
    | "modern-hierarchy"
    | "detailed"
    | "at-glance"
    | "bulk-manage"
    | "table"
    | "collapsible"
    | "terminated"
  >("modern-hierarchy");

  // Check Firebase connection status
  const { isConnected, isConfigured } = useFirebaseConnection();

  // Debug Firebase connection status
  useEffect(() => {
    console.log("🔥 Firebase Connection Status:", {
      isConnected,
      isConfigured,
    });
    if (!isConnected && isConfigured) {
      console.warn(
        "⚠️ Firebase is configured but not connected - using mock data"
      );
    } else if (!isConfigured) {
      console.warn("⚠️ Firebase is not configured - check .env file");
    } else {
      console.log("✅ Firebase is connected and ready");
    }
  }, [isConnected, isConfigured]);

  // Use Firebase data if available, otherwise fall back to mock data
  const firebaseOrgData = useFirebaseOrgStructure(site);
  const mockOrgData = useMockOrgStructure(site);
  const firebaseDragDrop = useFirebaseDragAndDrop();
  const mockDragDrop = useMockDragAndDrop();

  // Select data source based on Firebase availability
  const { directors, managers, teamLeads, agents, stats, isLoading } =
    isConnected ? firebaseOrgData : mockOrgData;
  const { moveEmployee, promoteEmployee } = isConnected
    ? firebaseDragDrop
    : mockDragDrop;

  // Get Firebase employee operations (always call hooks to avoid conditional hook rule)
  const firebaseEmployees = useFirebaseEmployees();

  // Get raw employee data including terminated employees for TerminatedEmployeesView
  const rawMockData = useMockEmployees();

  // Raw employees including terminated ones - use Firebase data when connected
  const allEmployeesIncludingTerminated = isConnected
    ? firebaseEmployees.employees
    : rawMockData.employees;

  // Debug: Log employee counts for terminated view
  useEffect(() => {
    const totalEmployees = allEmployeesIncludingTerminated.length;
    const terminatedEmployees = allEmployeesIncludingTerminated.filter(
      (emp) => emp.status === "terminated"
    ).length;
    console.log("👥 Employee counts for TerminatedEmployeesView:", {
      total: totalEmployees,
      terminated: terminatedEmployees,
      active: totalEmployees - terminatedEmployees,
    });
  }, [allEmployeesIncludingTerminated]);

  // Create conditional refetch function (Firebase data is real-time, mock data needs manual refetch)
  const refetch = () => {
    if (!isConnected && "refetch" in mockOrgData) {
      mockOrgData.refetch();
    }
    // Firebase data updates automatically via real-time listeners
  };

  // Get all employees for easy access
  const allEmployees = useMemo(
    () => [...directors, ...managers, ...teamLeads, ...agents],
    [directors, managers, teamLeads, agents]
  );

  // Get selected employee objects
  const selectedEmployeeObjects = useMemo(() => {
    return allEmployees.filter((emp) => selectedEmployees.has(emp.id));
  }, [allEmployees, selectedEmployees]);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    const filterFn = (emp: any) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());

    return {
      directors: allEmployees.filter(
        (emp: any) =>
          emp.role === "Sales Director" && emp.site === site && filterFn(emp)
      ),
      managers: allEmployees.filter(
        (emp: any) =>
          emp.role === "Sales Manager" && emp.site === site && filterFn(emp)
      ),
      teamLeads: allEmployees.filter(
        (emp: any) =>
          emp.role === "Team Lead" &&
          emp.site === site &&
          emp.status !== "terminated" &&
          filterFn(emp)
      ),
      agents: allEmployees.filter(
        (emp: any) =>
          emp.role === "Agent" &&
          emp.site === site &&
          emp.status !== "terminated" &&
          filterFn(emp)
      ),
    };
  }, [allEmployees, site, searchTerm]);

  // Unassigned employees (no managerId)
  const unassignedEmployees = useMemo(() => {
    return [...filteredEmployees.teamLeads, ...filteredEmployees.agents].filter(
      (emp) => !emp.managerId
    );
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
    const allEmployeeIds = allEmployees.map((emp) => emp.id);
    setSelectedEmployees(new Set(allEmployeeIds));
  };

  const handleDeselectAll = () => {
    setSelectedEmployees(new Set());
  };

  const handleDrop = async (
    targetEmployeeId: string,
    droppedEmployeeId: string
  ) => {
    console.log("🎯 ===== HANDLE DROP START =====");
    console.log("🎯 Target Employee ID:", targetEmployeeId);
    console.log("🎯 Dropped Employee ID:", droppedEmployeeId);
    console.log("🎯 Firebase Connected:", isConnected);

    if (targetEmployeeId === droppedEmployeeId) {
      console.log("❌ HANDLE DROP FAILED: Cannot drop employee on themselves");
      return;
    }

    // Find the dropped employee and target employee
    const droppedEmployee = allEmployees.find(
      (emp) => emp.id === droppedEmployeeId
    );
    const targetEmployee = allEmployees.find(
      (emp) => emp.id === targetEmployeeId
    );

    console.log("🔍 Found Employees:", {
      droppedFound: !!droppedEmployee,
      targetFound: !!targetEmployee,
      droppedName: droppedEmployee?.name,
      targetName: targetEmployee?.name,
    });

    if (!droppedEmployee || !targetEmployee) {
      console.error("❌ HANDLE DROP FAILED: Employee not found:", {
        droppedEmployee: droppedEmployee ? "FOUND" : "NOT FOUND",
        targetEmployee: targetEmployee ? "FOUND" : "NOT FOUND",
      });
      return;
    }

    // Business logic for valid moves
    console.log("🔍 Running validation...");
    const canMove = validateMove(droppedEmployee, targetEmployee);
    console.log("🔍 Validation result:", canMove);

    if (!canMove.valid) {
      console.log("❌ HANDLE DROP FAILED: Validation failed:", canMove.reason);
      alert(`❌ Cannot move employee: ${canMove.reason}`);
      return;
    }

    console.log("✅ VALIDATION PASSED - Proceeding with move...");

    try {
      // Create timestamp for the change
      const changeTimestamp = Date.now();
      const changeDate = new Date(changeTimestamp);

      // Update the employee's manager with timestamp
      const updatedEmployee = {
        ...droppedEmployee,
        managerId: targetEmployeeId,
        lastModified: changeTimestamp,
        lastModifiedBy: "admin", // You could add user authentication later
        lastAction: `Moved to report to ${targetEmployee.name}`,
        lastActionDate: changeTimestamp,
      };

      console.log("🔄 Updating employee:", updatedEmployee);

      if (isConnected) {
        // Update in Firebase with enhanced data
        await firebaseEmployees.updateEmployee(
          droppedEmployeeId,
          updatedEmployee
        );
        console.log(
          "✅ Successfully updated employee in Firebase:",
          droppedEmployee.name
        );

        // Create a change log entry in Firebase
        const changeLogEntry = {
          employeeId: droppedEmployeeId,
          employeeName: droppedEmployee.name,
          action: "move",
          details: `Moved ${droppedEmployee.name} (${droppedEmployee.role}) to report to ${targetEmployee.name} (${targetEmployee.role})`,
          previousManagerId: droppedEmployee.managerId || "unassigned",
          newManagerId: targetEmployeeId,
          timestamp: changeTimestamp,
          performedBy: "admin",
        };

        // Log the change (using Firebase's built-in push to create unique ID)
        try {
          const { database } = await import("../services/firebase");
          if (database) {
            const { ref, push, set } = await import("firebase/database");
            const changeLogRef = ref(database, "changeLog");
            const newChangeRef = push(changeLogRef);
            await set(newChangeRef, changeLogEntry);
            console.log("📝 Change logged to Firebase");
          }
        } catch (logError) {
          console.warn("⚠️ Failed to log change:", logError);
        }
      } else {
        console.log("📝 Mock mode - Updated employee:", droppedEmployee.name);
      }

      // Also add to pending changes for UI tracking/notifications
      addPendingChange({
        type: "move",
        employeeName: droppedEmployee.name,
        description: `Moved ${droppedEmployee.name} (${
          droppedEmployee.role
        }) to report to ${targetEmployee.name} (${
          targetEmployee.role
        }) at ${changeDate.toLocaleString()}`,
      });

      // Show success feedback with timestamp
      console.log(
        `✅ ${droppedEmployee.name} has been moved under ${
          targetEmployee.name
        } at ${changeDate.toLocaleString()}`
      );

      // Don't show alert immediately - let the real-time update handle the feedback
      setTimeout(() => {
        console.log("🔄 Move operation completed successfully");
      }, 500);
    } catch (error) {
      console.error("❌ Error updating employee:", error);
      alert(
        `❌ Failed to move ${droppedEmployee.name}. Please try again. Error: ${error}`
      );
    }
  };

  const validateMove = (droppedEmployee: any, targetEmployee: any) => {
    console.log("🔍 ===== VALIDATE MOVE START =====");
    console.log("🔍 Dropped Employee:", {
      id: droppedEmployee?.id,
      name: droppedEmployee?.name,
      role: droppedEmployee?.role,
      currentManagerId: droppedEmployee?.managerId,
    });
    console.log("🔍 Target Employee:", {
      id: targetEmployee?.id,
      name: targetEmployee?.name,
      role: targetEmployee?.role,
    });

    // Directors can't report to anyone
    if (droppedEmployee.role === "Sales Director") {
      console.log("❌ VALIDATION FAILED: Directors cannot be reassigned");
      return { valid: false, reason: "Directors cannot be reassigned" };
    }

    // Can't move to self
    if (droppedEmployee.id === targetEmployee.id) {
      console.log("❌ VALIDATION FAILED: Cannot assign employee to themselves");
      return { valid: false, reason: "Cannot assign employee to themselves" };
    }

    // Allow horizontal moves for agents and team leads between different managers
    console.log("🎯 Checking horizontal move rules...");

    if (
      droppedEmployee.role === "Agent" &&
      targetEmployee.role === "Sales Manager"
    ) {
      // Allow agents to move between different sales managers
      if (droppedEmployee.managerId === targetEmployee.id) {
        console.log(
          "❌ VALIDATION FAILED: Agent is already assigned to this manager"
        );
        return {
          valid: false,
          reason: "Agent is already assigned to this manager",
        };
      }
      console.log(
        "✅ VALIDATION PASSED: Agent can move to different Sales Manager"
      );
      return {
        valid: true,
        reason: "Agent horizontal move to different manager allowed",
      };
    }

    if (
      droppedEmployee.role === "Team Lead" &&
      targetEmployee.role === "Sales Manager"
    ) {
      // Allow team leads to move between different sales managers
      if (droppedEmployee.managerId === targetEmployee.id) {
        console.log(
          "❌ VALIDATION FAILED: Team Lead is already assigned to this manager"
        );
        return {
          valid: false,
          reason: "Team Lead is already assigned to this manager",
        };
      }
      console.log(
        "✅ VALIDATION PASSED: Team Lead can move to different Sales Manager"
      );
      return {
        valid: true,
        reason: "Team Lead horizontal move to different manager allowed",
      };
    }

    if (
      droppedEmployee.role === "Sales Manager" &&
      targetEmployee.role === "Sales Director"
    ) {
      // Allow sales managers to report to directors
      if (droppedEmployee.managerId === targetEmployee.id) {
        console.log(
          "❌ VALIDATION FAILED: Sales Manager is already assigned to this director"
        );
        return {
          valid: false,
          reason: "Sales Manager is already assigned to this director",
        };
      }
      console.log(
        "✅ VALIDATION PASSED: Sales Manager can report to Sales Director"
      );
      return {
        valid: true,
        reason: "Sales Manager to Director assignment allowed",
      };
    }

    // Hierarchy levels (lower index = higher level) - for reference only
    const hierarchy = ["Sales Director", "Sales Manager", "Team Lead", "Agent"];
    const droppedLevel = hierarchy.indexOf(droppedEmployee.role);
    const targetLevel = hierarchy.indexOf(targetEmployee.role);

    console.log("📊 Hierarchy reference:", {
      droppedLevel,
      targetLevel,
      droppedRole: droppedEmployee.role,
      targetRole: targetEmployee.role,
    });

    // Block invalid combinations
    if (
      droppedEmployee.role === "Agent" &&
      targetEmployee.role !== "Sales Manager"
    ) {
      console.log(
        "❌ VALIDATION FAILED: Agents can only report to Sales Managers"
      );
      return {
        valid: false,
        reason: "Agents can only report to Sales Managers",
      };
    }

    if (
      droppedEmployee.role === "Team Lead" &&
      targetEmployee.role !== "Sales Manager"
    ) {
      console.log(
        "❌ VALIDATION FAILED: Team Leads can only report to Sales Managers"
      );
      return {
        valid: false,
        reason: "Team Leads can only report to Sales Managers",
      };
    }

    if (
      droppedEmployee.role === "Sales Manager" &&
      targetEmployee.role !== "Sales Director"
    ) {
      console.log(
        "❌ VALIDATION FAILED: Sales Managers can only report to Sales Directors"
      );
      return {
        valid: false,
        reason: "Sales Managers can only report to Sales Directors",
      };
    }

    // Prevent same level moves between peers (except the specific allowed cases above)
    if (targetLevel === droppedLevel) {
      console.log(
        "❌ VALIDATION FAILED: Same level peer assignment not allowed"
      );
      return {
        valid: false,
        reason: `Cannot assign ${droppedEmployee.role} to another ${targetEmployee.role}`,
      };
    }

    console.log("❌ VALIDATION FAILED: No valid rule matched");
    return { valid: false, reason: "Move not allowed by business rules" };
  };

  const handlePromote = (employeeId: string, currentRole: string) => {
    const promotionMap: Record<string, string> = {
      Agent: "Team Lead",
      "Team Lead": "Sales Manager",
      "Sales Manager": "Sales Director",
    };

    const newRole = promotionMap[currentRole];
    const employee = allEmployees.find((emp) => emp.id === employeeId);

    if (newRole && employee) {
      addPendingChange({
        type: "promote",
        employeeName: employee.name,
        description: `Promote ${employee.name} from ${currentRole} to ${newRole}`,
      });

      alert(
        `📝 Change queued: ${employee.name} will be promoted to ${newRole}`
      );
    }
  };

  // Modal handlers
  const openModal = (
    employee: Employee | null,
    mode: "view" | "edit" | "create"
  ) => {
    setModalState({ isOpen: true, employee, mode });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, employee: null, mode: "view" });
  };

  const handleEmployeeSave = async (updatedEmployee: Employee) => {
    try {
      if (modalState.mode === "create") {
        // Handle creation immediately (new employees)
        if (isConnected) {
          const { id, ...employeeDataWithoutId } = updatedEmployee;
          await firebaseEmployees.createEmployee(employeeDataWithoutId);
          console.log("✅ Created employee:", updatedEmployee.name);
          alert(`✅ ${updatedEmployee.name} has been created successfully!`);
        } else {
          console.log("📝 Mock mode - Employee created:", updatedEmployee);
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
          changes.push(
            `Name: "${originalEmployee.name}" → "${updatedEmployee.name}"`
          );
        }
        if (originalEmployee.role !== updatedEmployee.role) {
          changes.push(
            `Role: "${originalEmployee.role}" → "${updatedEmployee.role}"`
          );
        }
        if (originalEmployee.site !== updatedEmployee.site) {
          changes.push(
            `Site: "${originalEmployee.site}" → "${updatedEmployee.site}"`
          );
        }
        if (originalEmployee.startDate !== updatedEmployee.startDate) {
          changes.push(
            `Start Date: "${new Date(
              originalEmployee.startDate
            ).toLocaleDateString()}" → "${new Date(
              updatedEmployee.startDate
            ).toLocaleDateString()}"`
          );
        }
        if (
          originalEmployee.commissionTier !== updatedEmployee.commissionTier
        ) {
          changes.push(
            `Commission Tier: "${originalEmployee.commissionTier}" → "${updatedEmployee.commissionTier}"`
          );
        }

        // Check birthDate changes (handle undefined values)
        if (originalEmployee.birthDate !== updatedEmployee.birthDate) {
          const originalBirthDate = originalEmployee.birthDate
            ? format(new Date(originalEmployee.birthDate), "MMMM d")
            : "Not set";
          const updatedBirthDate = updatedEmployee.birthDate
            ? format(new Date(updatedEmployee.birthDate), "MMMM d")
            : "Not set";
          changes.push(
            `Birth Date: "${originalBirthDate}" → "${updatedBirthDate}"`
          );
        }

        // Check notes changes (handle undefined/empty values)
        const originalNotes = originalEmployee.notes || "";
        const updatedNotes = updatedEmployee.notes || "";
        if (originalNotes !== updatedNotes) {
          changes.push(
            `Notes: "${originalNotes || "(empty)"}" → "${
              updatedNotes || "(empty)"
            }"`
          );
        }

        if (changes.length > 0) {
          // Add to pending changes
          addPendingChange({
            type: "edit",
            employeeName: originalEmployee.name,
            description: `Edit ${originalEmployee.name}: ${changes.join(", ")}`,
          });

          // Store the updated employee data for later application
          const existingChanges = JSON.parse(
            localStorage.getItem("pending_employee_edits") || "{}"
          );
          // Ensure we store all fields including birthDate and notes
          existingChanges[originalEmployee.id] = {
            ...originalEmployee,
            ...updatedEmployee,
            // Explicitly include fields that might be undefined
            birthDate: updatedEmployee.birthDate,
            notes: updatedEmployee.notes,
          };
          localStorage.setItem(
            "pending_employee_edits",
            JSON.stringify(existingChanges)
          );

          alert(
            `📝 Changes queued for ${originalEmployee.name}! Review and apply changes when ready.`
          );
        } else {
          alert("No changes detected.");
        }

        closeModal();
      }
    } catch (error) {
      console.error("❌ Error saving employee:", error);
      alert(
        `❌ Failed to ${modalState.mode === "create" ? "create" : "update"} ${
          updatedEmployee.name
        }. Please try again.`
      );
    }
  };

  const handleEmployeeDelete = (employeeId: string) => {
    // In a real app, this would delete from the database
    console.log("Deleting employee:", employeeId);
    setTimeout(() => {
      refetch();
      alert("Employee has been deleted.");
    }, 200);
  };

  const handleEdit = (employee: Employee) => {
    openModal(employee, "edit");
  };

  const handleView = (employee: Employee) => {
    openModal(employee, "view");
  };

  const handleTransfer = (employee: any) => {
    const newSite = employee.site === "Austin" ? "Charlotte" : "Austin";

    addPendingChange({
      type: "transfer",
      employeeName: employee.name,
      description: `Transfer ${employee.name} from ${employee.site} to ${newSite} site`,
    });

    alert(
      `📝 Change queued: ${employee.name} will be transferred to ${newSite} site`
    );
  };

  const handleTerminate = (employee: any) => {
    setEmployeeToTerminate(employee);
    setTerminationModalOpen(true);
  };

  const handleTerminationConfirm = async (
    employeeId: string,
    terminationDetails: any
  ) => {
    try {
      // Use the enhanced termination function
      await firebaseEmployees.terminateEmployee(employeeId, terminationDetails);

      // Add to pending changes for notification purposes
      addPendingChange({
        type: "terminate",
        employeeName: employeeToTerminate?.name || "Unknown",
        description: `Employee terminated - Reason: ${terminationDetails.reason}`,
      });

      setTerminationModalOpen(false);
      setEmployeeToTerminate(null);

      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error) {
      console.error("Error terminating employee:", error);
      alert("Failed to terminate employee. Please try again.");
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

  const handleBulkUpdateCommission = async (
    employeeIds: string[],
    tier: CommissionTier
  ) => {
    // Simulate bulk commission update
    console.log("Bulk commission update:", employeeIds, tier);
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkTerminate = async (employeeIds: string[]) => {
    // Simulate bulk termination
    for (const employeeId of employeeIds) {
      moveEmployee.mutate({ employeeId, status: "terminated" });
    }
    setTimeout(() => {
      refetch();
      setSelectedEmployees(new Set());
    }, 500);
  };

  const handleBulkReassign = async (
    employeeIds: string[],
    newManagerId: string
  ) => {
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
  const addPendingChange = (change: Omit<ChangeRecord, "id" | "timestamp">) => {
    const newChange: ChangeRecord = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setPendingChanges((prev) => [...prev, newChange]);
    // hasUnsavedChanges is now managed by useEffect
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
    // Also clear pending employee edits
    localStorage.removeItem("pending_employee_edits");
    // hasUnsavedChanges is now managed by useEffect
  };

  // Get total pending changes including edits
  const getPendingChangesCount = () => {
    const pendingEdits = JSON.parse(
      localStorage.getItem("pending_employee_edits") || "{}"
    );
    return pendingChanges.length + Object.keys(pendingEdits).length;
  };

  const getTotalPendingChanges = () => {
    const pendingEdits = JSON.parse(
      localStorage.getItem("pending_employee_edits") || "{}"
    );
    const editChanges = Object.entries(pendingEdits).map(
      ([employeeId, updatedEmployee]) => ({
        id: `edit-${employeeId}`,
        type: "edit" as const,
        employeeName: (updatedEmployee as Employee).name,
        description: `Edit ${(updatedEmployee as Employee).name}`,
        timestamp: Date.now(),
      })
    );
    return [...pendingChanges, ...editChanges];
  };

  const applyAllChanges = async (
    notificationSettings: NotificationSettings
  ) => {
    // In a real app, this would apply all changes to the database
    console.log("Applying changes:", pendingChanges);
    console.log("Notification settings:", notificationSettings);

    // Apply pending employee edits first
    const pendingEdits = JSON.parse(
      localStorage.getItem("pending_employee_edits") || "{}"
    );
    for (const [employeeId, updatedEmployee] of Object.entries(pendingEdits)) {
      try {
        if (isConnected) {
          // Extract only the changed fields to avoid overwriting unchanged data
          const employee = updatedEmployee as Employee;
          const updates: Partial<Employee> = {
            name: employee.name,
            role: employee.role,
            site: employee.site,
            startDate: employee.startDate,
            status: employee.status,
            managerId: employee.managerId,
            teamId: employee.teamId,
            commissionTier: employee.commissionTier,
            // Include optional fields that might have been added/changed
            ...(employee.birthDate !== undefined && {
              birthDate: employee.birthDate,
            }),
            ...(employee.notes !== undefined && { notes: employee.notes }),
          };

          await firebaseEmployees.updateEmployee(employeeId, updates);
          console.log("✅ Applied edit for employee:", employee.name);
        } else {
          console.log(
            "📝 Mock mode - Applied edit for employee:",
            (updatedEmployee as Employee).name
          );
        }
      } catch (error) {
        console.error(
          "❌ Failed to apply edit for employee:",
          employeeId,
          error
        );
      }
    }

    // Clear pending edits
    localStorage.removeItem("pending_employee_edits");

    // Simulate applying other changes and send external notifications
    for (const change of pendingChanges) {
      // Apply each change based on type
      console.log(`Applying ${change.type} for ${change.employeeName}`);

      // Send external notifications for each change
      try {
        const employee = allEmployees.find(
          (emp) => emp.name === change.employeeName
        );
        if (employee) {
          await externalIntegrationsService.notifyChange(
            change.type as any,
            {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              site: employee.site,
              managerId: employee.managerId,
              managerName: allEmployees.find(
                (emp) => emp.id === employee.managerId
              )?.name,
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
        console.error("Failed to send external notification:", error);
      }
    }

    // Send notifications
    if (notificationSettings.sendSlack) {
      console.log(
        "Sending Slack notifications to:",
        notificationSettings.recipients
      );
      // Simulate Slack API call
      setTimeout(() => {
        alert(
          `📱 Slack notifications sent! ${pendingChanges.length} changes communicated to team.`
        );
      }, 500);
    }

    if (notificationSettings.sendEmail) {
      console.log(
        "Sending email notifications to:",
        notificationSettings.recipients
      );
      // Simulate email API call
      setTimeout(() => {
        alert(
          `📧 Email notifications sent! ${pendingChanges.length} changes documented.`
        );
      }, 1000);
    }

    // Clear pending changes and refresh data
    clearPendingChanges();
    setConfirmationModalOpen(false);
    refetch();

    const totalChanges =
      pendingChanges.length + Object.keys(pendingEdits).length;
    alert(
      `✅ Successfully applied ${totalChanges} changes and sent external notifications!`
    );
  };

  const handleShowConfirmation = () => {
    const totalPending = getPendingChangesCount();
    if (totalPending > 0) {
      setConfirmationModalOpen(true);
    } else {
      alert("No pending changes to confirm.");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (employee: Employee) => {
    console.log("🎯 ===== DRAG START =====");
    console.log(
      "🎯 Employee being dragged:",
      employee.name,
      "(",
      employee.role,
      ")"
    );
    console.log("🎯 Setting isDragging to true");
    console.log("🎯 Setting draggedEmployee to:", employee);
    setIsDragging(true);
    setDraggedEmployee(employee);
  };

  const handleDragEnd = () => {
    console.log("🎯 ===== DRAG END =====");
    console.log("🎯 Setting isDragging to false");
    setIsDragging(false);
    // Don't immediately clear draggedEmployee - let them use quick assign
    setTimeout(() => {
      if (!showQuickAssign) {
        console.log("🎯 Clearing draggedEmployee");
        setDraggedEmployee(null);
      } else {
        console.log("🎯 Keeping draggedEmployee for quick assign");
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
      const manager = allEmployees.find((emp) => emp.id === managerId);
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
        alert(
          "❌ Firebase connection failed. Please check your configuration."
        );
        setIsImporting(false);
        return;
      }

      // Import the data
      await importRealDataToFirebase();

      // Refresh the view
      refetch();

      alert(
        "✅ Successfully imported real organizational data! Refresh the page to see all employees."
      );
    } catch (error) {
      console.error("Import failed:", error);
      alert("❌ Import failed. Please check the console for details.");
    } finally {
      setIsImporting(false);
    }
  };

  // Enhanced state for modern interface
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null);

  // Helper functions for modern interface
  const expandAllTeams = useCallback(() => {
    const allManagerIds = filteredEmployees.managers.map((m) => m.id);
    setExpandedTeams(new Set(allManagerIds));
  }, [filteredEmployees.managers]);

  const collapseAllTeams = useCallback(() => {
    setExpandedTeams(new Set());
  }, []);

  const toggleTeamExpansion = (managerId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (expandedTeams.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
    }
    setExpandedTeams(newExpanded);
  };

  // Auto-expand teams with search matches in modern view
  useEffect(() => {
    if (viewMode === "modern-hierarchy" && searchTerm.trim()) {
      const matchingManagerIds = filteredEmployees.managers
        .filter((manager) => {
          const teamMembers = [
            ...filteredEmployees.teamLeads,
            ...filteredEmployees.agents,
          ].filter((emp) => emp.managerId === manager.id);
          return (
            teamMembers.some(
              (emp) =>
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.role.toLowerCase().includes(searchTerm.toLowerCase())
            ) || manager.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
        .map((m) => m.id);

      setExpandedTeams(new Set(matchingManagerIds));
    }
  }, [searchTerm, viewMode, filteredEmployees]);

  // Helper function to highlight search matches
  const highlightSearchMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={index}
          className="bg-yellow-200 text-yellow-900 px-1 rounded font-bold"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Check integration status on mount
  useEffect(() => {
    const status = externalIntegrationsService.getConfigStatus();
    setIntegrationsStatus(status);
  }, [integrationsModalOpen]); // Refresh when modal closes

  // Check for unsaved changes (including edits)
  const checkForUnsavedChanges = useCallback(() => {
    const pendingEdits = JSON.parse(
      localStorage.getItem("pending_employee_edits") || "{}"
    );
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

  // Keyboard shortcuts for modern interface
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewMode !== "modern-hierarchy") return;

      // Ctrl/Cmd + E: Expand all teams
      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        expandAllTeams();
      }

      // Ctrl/Cmd + R: Collapse all teams
      if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        collapseAllTeams();
      }

      // Escape: Clear search
      if (event.key === "Escape") {
        setSearchTerm("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, expandAllTeams, collapseAllTeams]);

  // Enhanced scroll behavior for better navigation - FIXED
  useEffect(() => {
    // Remove custom wheel handling that interferes with normal scrolling
    // Let the browser handle natural scrolling behavior
    return () => {
      // Cleanup function - no custom wheel handlers needed
    };
  }, []);

  // Auto-scroll functionality for drag and drop only - SIMPLIFIED
  useEffect(() => {
    if (!isDragging) return;

    console.log("🖱️ Setting up auto-scroll for drag and drop");

    // Auto-scroll functionality for drag and drop
    let animationFrame: number;
    let isScrolling = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (isScrolling) return; // Prevent multiple scroll animations

      const scrollThreshold = 100; // pixels from edge
      const scrollSpeed = 15; // pixels per scroll
      const { clientX, clientY } = e;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let scrollX = 0;
      let scrollY = 0;

      // Vertical scrolling
      if (clientY < scrollThreshold) {
        scrollY = -scrollSpeed;
      } else if (clientY > windowHeight - scrollThreshold) {
        scrollY = scrollSpeed;
      }

      // Horizontal scrolling
      if (clientX < scrollThreshold) {
        scrollX = -scrollSpeed;
      } else if (clientX > windowWidth - scrollThreshold) {
        scrollX = scrollSpeed;
      }

      // Perform the scroll if needed
      if (scrollX !== 0 || scrollY !== 0) {
        isScrolling = true;

        const smoothScroll = () => {
          window.scrollBy({
            left: scrollX,
            top: scrollY,
            behavior: "auto", // Use auto for immediate response during drag
          });

          animationFrame = requestAnimationFrame(() => {
            isScrolling = false;
          });
        };

        smoothScroll();
      }
    };

    // Only add mousemove listener for drag auto-scroll
    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">
          Loading organizational data...
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6 min-h-screen">
        {/* Firebase Connection Status - Compact */}
        <div className="mb-3">
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
              isConnected
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
            {isConnected ? "🔥 Firebase Connected" : "⚠️ Using Mock Data"}
            {isConnected && (
              <span className="ml-2 text-xs opacity-75">
                Real-time sync active
              </span>
            )}
          </div>
        </div>

        {/* Modern Navigation Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          {/* Main Navigation Row */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            {/* Left Section: View Toggle & Search Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5 flex-1">
              {/* Modern Segmented Control - View Toggle */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-1.5 border border-gray-200 shadow-sm">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setViewMode("modern-hierarchy")}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${
                      viewMode === "modern-hierarchy"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2.5 text-base">🏢</span>
                    <span className="whitespace-nowrap">Modern Teams</span>
                    {viewMode === "modern-hierarchy" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl animate-pulse"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode("detailed")}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${
                      viewMode === "detailed"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2.5 text-base">📋</span>
                    <span className="whitespace-nowrap">Cards</span>
                    {viewMode === "detailed" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl animate-pulse"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode("at-glance")}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${
                      viewMode === "at-glance"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2.5 text-base">🌳</span>
                    <span className="whitespace-nowrap">Tree</span>
                    {viewMode === "at-glance" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl animate-pulse"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${
                      viewMode === "table"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2.5 text-base">📊</span>
                    <span className="whitespace-nowrap">Table</span>
                    {viewMode === "table" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl animate-pulse"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode("terminated")}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${
                      viewMode === "terminated"
                        ? "bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2.5 text-base">❌</span>
                    <span className="whitespace-nowrap">Terminated</span>
                    {viewMode === "terminated" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl animate-pulse"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Enhanced Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder-gray-400 bg-gray-50 
                              focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none 
                              transition-all duration-300 shadow-sm hover:shadow-md hover:border-gray-300"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  )}
                </div>

                {/* Modern Team Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="appearance-none bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 
                              hover:bg-white hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none 
                              transition-all duration-300 shadow-sm hover:shadow-md min-w-[200px] cursor-pointer"
                  >
                    <option value="all">🏢 All Teams</option>
                    {filteredEmployees.managers.map((manager) => {
                      const teamSize = [
                        ...filteredEmployees.teamLeads,
                        ...filteredEmployees.agents,
                      ].filter((emp) => emp.managerId === manager.id).length;
                      return (
                        <option key={manager.id} value={manager.id}>
                          👔 {manager.name} ({teamSize} members)
                        </option>
                      );
                    })}
                    <option value="unassigned">⚠️ Unassigned Only</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Bulk Actions - Modern Style */}
                {showBulkActions && (
                  <div className="flex items-center gap-3">
                    {selectedEmployees.size > 0 ? (
                      <div className="flex items-center gap-3">
                        <span className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-2 rounded-xl text-sm font-semibold border border-blue-200">
                          {selectedEmployees.size} selected
                        </span>
                        <button
                          onClick={() => setBulkModalOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold 
                                    hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg 
                                    flex items-center border border-blue-500 hover:border-blue-600"
                        >
                          <Squares2X2Icon className="w-4 h-4 mr-2" />
                          Actions
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-semibold border border-gray-200 
                                    hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 transition-all duration-300"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSelectAll}
                        className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-semibold border border-gray-200 
                                  hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 transition-all duration-300"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Action Buttons */}
            <div className="flex items-center gap-4">
              {/* Pending Changes Badge */}
              {hasUnsavedChanges && (
                <button
                  onClick={handleShowConfirmation}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-3 rounded-xl font-semibold 
                            hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl 
                            flex items-center animate-pulse border border-amber-500 hover:border-amber-600"
                >
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  <span>{getPendingChangesCount()} Pending</span>
                </button>
              )}

              {/* Import Data Button */}
              <button
                onClick={handleImportRealData}
                disabled={isImporting}
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-5 py-3 rounded-xl font-semibold 
                          hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 
                          transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed 
                          flex items-center disabled:opacity-75 border border-emerald-500 hover:border-emerald-600 
                          disabled:border-gray-400"
              >
                <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                <span>{isImporting ? "Importing..." : "Import Data"}</span>
              </button>

              {/* Integrations Button */}
              <button
                onClick={() => setIntegrationsModalOpen(true)}
                className="relative bg-gradient-to-r from-purple-600 to-violet-600 text-white px-5 py-3 rounded-xl font-semibold 
                          hover:from-purple-700 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl 
                          flex items-center border border-purple-500 hover:border-purple-600"
              >
                <CogIcon className="w-5 h-5 mr-2" />
                <span>Integrations</span>
                {(integrationsStatus.n8nConfigured ||
                  integrationsStatus.slackConfigured) && (
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 
                                rounded-full border-2 border-white shadow-lg animate-bounce"
                  ></div>
                )}
              </button>

              {/* Slack Testing Button */}
              <button
                onClick={() => setSlackTestingOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl font-semibold 
                          hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl 
                          flex items-center border border-blue-400 hover:border-blue-500"
              >
                <ChatBubbleOvalLeftIcon className="w-5 h-5 mr-2" />
                <span>Test Slack</span>
              </button>

              {/* Add Employee Button */}
              <button
                onClick={() => openModal(null, "create")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold 
                          hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl 
                          flex items-center border border-blue-500 hover:border-blue-600"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Hierarchy Guide */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-xl border border-blue-200">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-100/50 transition-colors rounded-t-xl"
            onClick={() => setShowHierarchyGuide(!showHierarchyGuide)}
          >
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">🏢</span>
              Organizational Hierarchy & Drag-Drop Guide
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">
                {showHierarchyGuide ? "Hide Guide" : "Show Guide"}
              </span>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                  showHierarchyGuide ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {showHierarchyGuide && (
            <div className="p-6 pt-0">
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
                        <div className="text-sm font-semibold text-purple-700">
                          Level 1: Site Directors
                        </div>
                        <div className="text-xs text-gray-600">
                          Executive leadership - Cannot be moved
                        </div>
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
                        <div className="text-sm font-semibold text-blue-700">
                          Level 2: Sales Managers
                        </div>
                        <div className="text-xs text-gray-600">
                          Report to Directors - Can accept dropped employees
                        </div>
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
                          <div className="text-sm font-semibold text-green-700">
                            Level 3a: Team Leads
                          </div>
                          <div className="text-xs text-gray-600">
                            Report to Sales Managers
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">💼</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-700">
                            Level 3b: Sales Agents
                          </div>
                          <div className="text-xs text-gray-600">
                            Report to Sales Managers
                          </div>
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
                        <div className="font-medium text-gray-800">
                          Manager Drop Zones
                        </div>
                        <div className="text-gray-600 text-xs">
                          Blue dashed areas under each manager accept new team
                          members
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 text-xs">✅</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          Valid Moves
                        </div>
                        <div className="text-gray-600 text-xs">
                          Team Leads & Agents → Sales Managers
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-600 text-xs">❌</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          Invalid Moves
                        </div>
                        <div className="text-gray-600 text-xs">
                          Directors cannot be moved, same-level transfers not
                          allowed
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-xs">⚡</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          Visual Feedback
                        </div>
                        <div className="text-gray-600 text-xs">
                          Green highlights = valid drop target, Red = invalid
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalDirectors}
            </div>
            <div className="text-sm text-purple-600">Directors</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalManagers}
            </div>
            <div className="text-sm text-blue-600">Managers</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.totalTeamLeads}
            </div>
            <div className="text-sm text-green-600">Team Leads</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {stats.totalAgents}
            </div>
            <div className="text-sm text-gray-600">Agents</div>
          </div>
        </div>

        {/* Material UI Table View - Spreadsheet Style */}
        {viewMode === "table" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📊</span>
                  Employee Directory - {site} Site
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    Total: {Object.values(filteredEmployees).flat().length}{" "}
                    employees
                  </span>
                  {showBulkActions && selectedEmployees.size > 0 && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {selectedEmployees.size} selected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {showBulkActions && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={
                            selectedEmployees.size ===
                            Object.values(filteredEmployees).flat().length
                          }
                          onChange={(e) =>
                            e.target.checked
                              ? handleSelectAll()
                              : handleDeselectAll()
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(filteredEmployees)
                    .flat()
                    .sort((a, b) => {
                      // Sort by role hierarchy, then by name
                      const roleOrder = {
                        "Sales Director": 1,
                        "Sales Manager": 2,
                        "Team Lead": 3,
                        Agent: 4,
                      };
                      const aOrder =
                        roleOrder[a.role as keyof typeof roleOrder] || 5;
                      const bOrder =
                        roleOrder[b.role as keyof typeof roleOrder] || 5;
                      if (aOrder !== bOrder) return aOrder - bOrder;
                      return a.name.localeCompare(b.name);
                    })
                    .map((employee, index) => {
                      const manager = Object.values(filteredEmployees)
                        .flat()
                        .find((emp) => emp.id === employee.managerId);
                      const commission = employee.commissionTier
                        ? employee.role === "Agent"
                          ? employee.commissionTier.charAt(0).toUpperCase() +
                            employee.commissionTier.slice(1)
                          : "Management"
                        : "Not Set";

                      return (
                        <tr
                          key={employee.id}
                          className={`hover:bg-gray-50 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-25"
                          }`}
                        >
                          {showBulkActions && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.has(employee.id)}
                                onChange={(e) =>
                                  handleEmployeeSelect(
                                    employee.id,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div
                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                    employee.role === "Sales Director"
                                      ? "bg-purple-500"
                                      : employee.role === "Sales Manager"
                                      ? "bg-blue-500"
                                      : employee.role === "Team Lead"
                                      ? "bg-green-500"
                                      : "bg-gray-500"
                                  }`}
                                >
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .substring(0, 2)}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {employee.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  employee.role === "Sales Director"
                                    ? "bg-purple-100 text-purple-800"
                                    : employee.role === "Sales Manager"
                                    ? "bg-blue-100 text-blue-800"
                                    : employee.role === "Team Lead"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {employee.role === "Sales Director"
                                  ? "👑"
                                  : employee.role === "Sales Manager"
                                  ? "👔"
                                  : employee.role === "Team Lead"
                                  ? "🎯"
                                  : "💼"}{" "}
                                {employee.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {manager
                              ? manager.name
                              : employee.role === "Sales Director"
                              ? "—"
                              : "Unassigned"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                commission === "Veteran"
                                  ? "bg-green-100 text-green-800"
                                  : commission === "Standard"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : commission === "New"
                                  ? "bg-blue-100 text-blue-800"
                                  : commission === "Management"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {commission}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    employee.role === "Sales Director"
                                      ? "bg-purple-500 w-full"
                                      : employee.role === "Sales Manager"
                                      ? "bg-blue-500 w-4/5"
                                      : employee.role === "Team Lead"
                                      ? "bg-green-500 w-3/5"
                                      : "bg-gray-400 w-2/5"
                                  }`}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">
                                {employee.role === "Sales Director"
                                  ? "100%"
                                  : employee.role === "Sales Manager"
                                  ? "85%"
                                  : employee.role === "Team Lead"
                                  ? "72%"
                                  : "58%"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                employee.status === "terminated"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {employee.status === "terminated"
                                ? "🔴 Terminated"
                                : "🟢 Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleView(employee)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="View Details"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => handleEdit(employee)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              {employee.role !== "Sales Director" && (
                                <button
                                  onClick={() =>
                                    handlePromote(employee.id, employee.role)
                                  }
                                  className="text-green-600 hover:text-green-900 transition-colors"
                                  title="Promote"
                                >
                                  ⬆️
                                </button>
                              )}
                              <button
                                onClick={() => handleTransfer(employee)}
                                className="text-yellow-600 hover:text-yellow-900 transition-colors"
                                title="Transfer"
                              >
                                🔄
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  Showing {Object.values(filteredEmployees).flat().length}{" "}
                  employees
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
                <div className="flex items-center space-x-4">
                  <span>
                    📊 Directors: {filteredEmployees.directors.length}
                  </span>
                  <span>👔 Managers: {filteredEmployees.managers.length}</span>
                  <span>🎯 Leads: {filteredEmployees.teamLeads.length}</span>
                  <span>💼 Agents: {filteredEmployees.agents.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Hierarchy View */}
        {viewMode === "collapsible" && (
          <CollapsibleHierarchy
            employees={Object.values(filteredEmployees).flat()}
            site={site}
            showBulkActions={showBulkActions}
            onEmployeeUpdate={handleEmployeeSave}
            onEmployeeDelete={handleEmployeeDelete}
          />
        )}

        {/* At-a-Glance View */}
        {/* Tree View - Clean & Organized Hierarchy */}
        {viewMode === "at-glance" && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            {/* Clean Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">
                  🌳 {site} Organizational Tree
                </h3>
                <p className="text-blue-100">
                  Clear hierarchy view - click any employee to interact
                </p>
              </div>
            </div>

            {/* Tree Structure */}
            <div className="p-8">
              <div className="space-y-12">
                {/* Site Director Level */}
                {filteredEmployees.directors.map((director) => (
                  <div key={director.id} className="text-center">
                    {/* Director Card */}
                    <div className="inline-block mb-8">
                      <div
                        onClick={() => handleView(director)}
                        className="cursor-pointer transform hover:scale-105 transition-all duration-200"
                      >
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg min-w-[280px]">
                          <div className="flex items-center justify-center mb-3">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-3xl">👑</span>
                            </div>
                          </div>
                          <h4 className="text-xl font-bold mb-1">
                            {director.name}
                          </h4>
                          <p className="text-purple-200 font-medium">
                            Site Director
                          </p>
                          <div className="mt-3 text-sm bg-white/10 rounded-full px-4 py-1">
                            📍 {director.site}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connection Line */}
                    {filteredEmployees.managers.filter(
                      (m) => m.site === director.site
                    ).length > 0 && (
                      <div className="w-0.5 h-12 bg-gray-300 mx-auto mb-8"></div>
                    )}

                    {/* Managers Level */}
                    <div className="flex flex-wrap justify-center gap-16">
                      {filteredEmployees.managers
                        .filter((m) => m.site === director.site)
                        .map((manager) => {
                          const teamMembers = [
                            ...filteredEmployees.teamLeads,
                            ...filteredEmployees.agents,
                          ].filter((emp) => emp.managerId === manager.id);

                          return (
                            <div
                              key={manager.id}
                              className="flex flex-col items-center"
                            >
                              {/* Manager Card */}
                              <div
                                onClick={() => handleView(manager)}
                                className="cursor-pointer transform hover:scale-105 transition-all duration-200 mb-6"
                              >
                                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg p-5 shadow-md w-[220px] text-center">
                                  <div className="flex items-center justify-center mb-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                      <span className="text-2xl">👔</span>
                                    </div>
                                  </div>
                                  <h5 className="text-lg font-semibold mb-1">
                                    {manager.name}
                                  </h5>
                                  <p className="text-blue-100 text-sm">
                                    Sales Manager
                                  </p>
                                  <div className="mt-2 text-xs bg-white/10 rounded-full px-3 py-1">
                                    👥 {teamMembers.length} Team Members
                                  </div>
                                </div>
                              </div>

                              {/* Team Members */}
                              {teamMembers.length > 0 ? (
                                <>
                                  {/* Connection Line */}
                                  <div className="w-0.5 h-8 bg-gray-300 mb-4"></div>

                                  {/* Team Grid */}
                                  <div className="grid grid-cols-3 gap-3 max-w-[300px]">
                                    {teamMembers
                                      .sort((a, b) => {
                                        // Team Leads first, then Agents
                                        if (
                                          a.role === "Team Lead" &&
                                          b.role === "Agent"
                                        )
                                          return -1;
                                        if (
                                          a.role === "Agent" &&
                                          b.role === "Team Lead"
                                        )
                                          return 1;
                                        return a.name.localeCompare(b.name);
                                      })
                                      .map((employee) => (
                                        <div
                                          key={employee.id}
                                          onClick={() => handleView(employee)}
                                          className="cursor-pointer transform hover:scale-105 transition-all duration-200"
                                        >
                                          <div
                                            className={`rounded-lg p-3 text-center shadow-sm border-2 ${
                                              employee.role === "Team Lead"
                                                ? "bg-green-500 text-white border-green-400"
                                                : "bg-gray-500 text-white border-gray-400"
                                            }`}
                                          >
                                            <div className="text-base mb-1">
                                              {employee.role === "Team Lead"
                                                ? "🎯"
                                                : "💼"}
                                            </div>
                                            <div
                                              className="text-xs font-medium truncate"
                                              title={employee.name}
                                            >
                                              {employee.name.split(" ")[0]}
                                            </div>
                                            <div className="text-xs opacity-80 mt-1">
                                              {employee.role === "Team Lead"
                                                ? "Lead"
                                                : "Agent"}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </>
                              ) : (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  <div className="text-center text-gray-500">
                                    <div className="text-2xl mb-2">👥</div>
                                    <p className="text-sm">No team assigned</p>
                                    {isDragging && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Drop here to assign
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}

                {/* Unassigned Employees Warning */}
                {unassignedEmployees.length > 0 && (
                  <div className="mt-12 p-6 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-2" />
                        <span className="text-lg font-semibold text-yellow-800">
                          Unassigned Employees
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {unassignedEmployees.map((employee) => (
                          <div
                            key={employee.id}
                            onClick={() => handleView(employee)}
                            className="bg-white rounded-lg p-3 border border-yellow-300 cursor-pointer hover:shadow-md transition-all"
                          >
                            <div className="text-center">
                              <div className="text-lg mb-1">
                                {employee.role === "Team Lead" ? "🎯" : "💼"}
                              </div>
                              <div
                                className="text-sm font-medium text-gray-800 truncate"
                                title={employee.name}
                              >
                                {employee.name}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {employee.role}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tree Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-6">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-purple-600 rounded-full mr-2"></span>
                    Directors ({filteredEmployees.directors.length})
                  </span>
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    Managers ({filteredEmployees.managers.length})
                  </span>
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Team Leads ({filteredEmployees.teamLeads.length})
                  </span>
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                    Agents ({filteredEmployees.agents.length})
                  </span>
                </div>
                <div className="font-medium">
                  Total: {Object.values(filteredEmployees).flat().length}{" "}
                  employees
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Team Management Interface - Full Width & Interactive */}
        {viewMode === "modern-hierarchy" && (
          <div className="space-y-6">
            {/* Enhanced Header with Analytics Dashboard */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black mb-2">
                    Team Management Dashboard
                  </h2>
                  <p className="text-blue-100 text-lg font-medium">
                    Interactive organizational structure with enhanced team
                    insights
                  </p>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={expandAllTeams}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/30"
                      title="Expand all teams (Ctrl+E)"
                    >
                      📖 Expand All
                    </button>
                    <button
                      onClick={collapseAllTeams}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/30"
                      title="Collapse all teams (Ctrl+R)"
                    >
                      📑 Collapse All
                    </button>
                    <div className="bg-white/20 text-white px-3 py-2 rounded-lg border border-white/30 text-sm">
                      <span className="opacity-75">
                        💡 Ctrl+E: Expand • Ctrl+R: Collapse • Esc: Clear search
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black">
                      {Object.values(filteredEmployees).flat().length}
                    </div>
                    <div className="text-blue-100 font-medium">
                      Total Team Members
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-2xl font-black">
                    {filteredEmployees.directors.length}
                  </div>
                  <div className="text-blue-100 text-sm font-medium">
                    👑 Directors
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-2xl font-black">
                    {filteredEmployees.managers.length}
                  </div>
                  <div className="text-blue-100 text-sm font-medium">
                    👔 Managers
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-2xl font-black">
                    {filteredEmployees.teamLeads.length}
                  </div>
                  <div className="text-blue-100 text-sm font-medium">
                    🎯 Team Leads
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-2xl font-black">
                    {filteredEmployees.agents.length}
                  </div>
                  <div className="text-blue-100 text-sm font-medium">
                    💼 Agents
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Team Structure - Full Width Layout */}
            {filteredEmployees.directors.map((director) => {
              const directorManagers = filteredEmployees.managers.filter(
                (m) => m.site === director.site
              );

              return (
                <div
                  key={director.id}
                  className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  {/* Director Header - Enhanced */}
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/30">
                          <span className="text-3xl">👑</span>
                        </div>
                        <div>
                          <h3
                            className="text-2xl font-black cursor-pointer hover:text-purple-100 transition-colors"
                            onClick={() => handleView(director)}
                          >
                            {highlightSearchMatch(director.name, searchTerm)}
                          </h3>
                          <div className="text-purple-100 font-medium">
                            Site Director • {director.site}
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-purple-200">
                            <span>
                              📅{" "}
                              {new Date(
                                director.startDate
                              ).toLocaleDateString()}
                            </span>
                            <span>
                              👥 {directorManagers.length} Manager Teams
                            </span>
                            <span>🏢 {director.site} Site</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black">
                          {directorManagers.reduce((total, manager) => {
                            return (
                              total +
                              [
                                ...filteredEmployees.teamLeads,
                                ...filteredEmployees.agents,
                              ].filter((emp) => emp.managerId === manager.id)
                                .length +
                              1
                            );
                          }, 1)}
                        </div>
                        <div className="text-purple-100 text-sm">
                          Total Team Size
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manager Teams Grid - Modern Layout */}
                  <div className="p-6">
                    <div className="grid gap-6">
                      {directorManagers.map((manager) => {
                        const teamMembers = [
                          ...filteredEmployees.teamLeads,
                          ...filteredEmployees.agents,
                        ].filter((emp) => emp.managerId === manager.id);
                        const teamLeads = teamMembers.filter(
                          (emp) => emp.role === "Team Lead"
                        );
                        const agents = teamMembers.filter(
                          (emp) => emp.role === "Agent"
                        );
                        const isExpanded = expandedTeams.has(manager.id);

                        return (
                          <div
                            key={manager.id}
                            className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                          >
                            {/* Manager Header - Clickable & Interactive */}
                            <div
                              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-300"
                              onClick={() => toggleTeamExpansion(manager.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                                    <span className="text-white text-xl font-bold">
                                      👔
                                    </span>
                                  </div>
                                  <div>
                                    <h4
                                      className="text-xl font-black text-gray-900 hover:text-blue-600 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(manager);
                                      }}
                                    >
                                      {highlightSearchMatch(
                                        manager.name,
                                        searchTerm
                                      )}
                                    </h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <span>📍 {manager.site}</span>
                                      <span>
                                        📅{" "}
                                        {new Date(
                                          manager.startDate
                                        ).toLocaleDateString()}
                                      </span>
                                      <span>
                                        👥 {teamMembers.length + 1} Members
                                      </span>
                                      {teamLeads.length > 0 && (
                                        <span>
                                          🎯 {teamLeads.length} Lead
                                          {teamLeads.length > 1 ? "s" : ""}
                                        </span>
                                      )}
                                      {agents.length > 0 && (
                                        <span>
                                          💼 {agents.length} Agent
                                          {agents.length > 1 ? "s" : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  {/* Quick Actions */}
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(manager);
                                      }}
                                      className="w-10 h-10 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors"
                                      title="Edit Manager"
                                    >
                                      <span className="text-blue-600">✏️</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(manager);
                                      }}
                                      className="w-10 h-10 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors"
                                      title="View Details"
                                    >
                                      <span className="text-green-600">👁️</span>
                                    </button>
                                  </div>
                                  {/* Expand/Collapse Toggle */}
                                  <div
                                    className={`transform transition-transform duration-300 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  >
                                    <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Team Members - Expandable Grid */}
                            {isExpanded && (
                              <div className="p-4 bg-gray-50">
                                <DropZone
                                  onDrop={(droppedId) =>
                                    handleDrop(manager.id, droppedId)
                                  }
                                  className={`rounded-xl transition-all duration-300 ${
                                    isDragging
                                      ? "border-2 border-dashed border-green-400 bg-green-50 p-4"
                                      : "border border-gray-300 bg-white p-4"
                                  }`}
                                  canDrop={true}
                                  id={`modern-team-${manager.id}`}
                                >
                                  {teamMembers.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                      {teamMembers
                                        .sort((a, b) => {
                                          if (
                                            a.role === "Team Lead" &&
                                            b.role === "Agent"
                                          )
                                            return -1;
                                          if (
                                            a.role === "Agent" &&
                                            b.role === "Team Lead"
                                          )
                                            return 1;
                                          return a.name.localeCompare(b.name);
                                        })
                                        .map((employee) => (
                                          <div
                                            key={employee.id}
                                            className="relative group"
                                            onMouseEnter={() =>
                                              setHoveredEmployee(employee.id)
                                            }
                                            onMouseLeave={() =>
                                              setHoveredEmployee(null)
                                            }
                                          >
                                            {/* Enhanced Employee Card with Role Badge */}
                                            <div className="relative">
                                              <div className="absolute -top-2 -right-2 z-10">
                                                <span
                                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                                    employee.role ===
                                                    "Team Lead"
                                                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                                      : "bg-gradient-to-r from-gray-500 to-slate-500 text-white"
                                                  }`}
                                                >
                                                  {employee.role === "Team Lead"
                                                    ? "🎯 LEAD"
                                                    : "💼 AGENT"}
                                                </span>
                                              </div>
                                              <div
                                                className={`transition-all duration-300 ${
                                                  hoveredEmployee ===
                                                  employee.id
                                                    ? "scale-105 shadow-xl"
                                                    : "hover:scale-102"
                                                }`}
                                                onClick={() =>
                                                  handleView(employee)
                                                }
                                              >
                                                <EmployeeCard
                                                  employee={employee}
                                                  onView={handleView}
                                                  onEdit={handleEdit}
                                                  onPromote={(emp) =>
                                                    handlePromote(
                                                      emp.id,
                                                      emp.role
                                                    )
                                                  }
                                                  onTransfer={handleTransfer}
                                                  onTerminate={handleTerminate}
                                                  onSelect={
                                                    handleEmployeeSelect
                                                  }
                                                  isSelected={selectedEmployees.has(
                                                    employee.id
                                                  )}
                                                  showBulkActions={
                                                    showBulkActions
                                                  }
                                                  isDragMode={true}
                                                  onDragStart={handleDragStart}
                                                  onDragEnd={handleDragEnd}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12">
                                      <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <span className="text-3xl">👥</span>
                                      </div>
                                      <h4 className="text-lg font-bold text-gray-600 mb-2">
                                        No Team Members Yet
                                      </h4>
                                      <p className="text-gray-500 mb-4">
                                        Drag employees here to build{" "}
                                        {manager.name}'s team
                                      </p>
                                      <button
                                        onClick={() =>
                                          openModal(null, "create")
                                        }
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                      >
                                        Add Team Member
                                      </button>
                                    </div>
                                  )}
                                </DropZone>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Unassigned Employees - Enhanced Action Center */}
            {[
              ...filteredEmployees.teamLeads,
              ...filteredEmployees.agents,
            ].filter((emp) => !emp.managerId).length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/30 animate-pulse">
                        <span className="text-3xl">⚠️</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black">
                          Unassigned Employees
                        </h3>
                        <p className="text-red-100 font-medium">
                          Requires immediate attention and team assignment
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black">
                        {
                          [
                            ...filteredEmployees.teamLeads,
                            ...filteredEmployees.agents,
                          ].filter((emp) => !emp.managerId).length
                        }
                      </div>
                      <div className="text-red-100 text-sm">
                        Need Assignment
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {[
                      ...filteredEmployees.teamLeads,
                      ...filteredEmployees.agents,
                    ]
                      .filter((emp) => !emp.managerId)
                      .map((employee) => (
                        <div key={employee.id} className="relative">
                          <div className="absolute -top-2 -right-2 z-10">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg animate-pulse">
                              ⚠️ UNASSIGNED
                            </span>
                          </div>
                          <EmployeeCard
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
              </div>
            )}
          </div>
        )}

        {/* Employee Cards - Clear Hierarchy Structure (Detailed View) */}
        {viewMode === "detailed" && (
          <div className="space-y-8">
            {/* Directors */}
            <div className="bg-white rounded-xl p-6 border-l-4 border-purple-500 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full mr-3 flex items-center justify-center border-2 border-purple-300">
                    <span className="text-purple-700 text-lg font-bold">
                      👑
                    </span>
                  </div>
                  Site Directors
                  <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full border border-purple-200">
                    Level 1 - Executive
                  </span>
                </h3>
                <div className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="font-semibold">
                    {filteredEmployees.directors.length}
                  </span>{" "}
                  Director{filteredEmployees.directors.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {filteredEmployees.directors.map((employee) => (
                  <div
                    key={employee.id}
                    className="transform hover:scale-105 transition-transform"
                  >
                    <div
                      onClick={() => handleView(employee)}
                      className="cursor-pointer"
                    >
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
            {selectedManagerId !== "unassigned" && (
              <div className="bg-white rounded-xl p-6 border-l-4 border-blue-500 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full mr-3 flex items-center justify-center border-2 border-blue-300">
                      <span className="text-blue-700 text-lg font-bold">
                        👔
                      </span>
                    </div>
                    Sales Manager Teams
                    <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full border border-blue-200">
                      Consolidated View
                    </span>
                  </h3>
                  <div className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                    <span className="font-semibold">
                      {filteredEmployees.managers.length}
                    </span>{" "}
                    Team{filteredEmployees.managers.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-6">
                  {filteredEmployees.managers
                    .filter(
                      (manager) =>
                        selectedManagerId === "all" ||
                        selectedManagerId === manager.id
                    )
                    .map((manager) => {
                      const directReports = [
                        ...filteredEmployees.teamLeads,
                        ...filteredEmployees.agents,
                      ].filter((emp) => emp.managerId === manager.id);
                      const teamLeads = directReports.filter(
                        (emp) => emp.role === "Team Lead"
                      );
                      const agents = directReports.filter(
                        (emp) => emp.role === "Agent"
                      );

                      return (
                        <div
                          key={manager.id}
                          className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                        >
                          {/* Compact Team Header */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    👔
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-gray-900 font-bold text-base">
                                    {manager.name}'s Team
                                  </h4>
                                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                                    <span>🏢 {manager.site}</span>
                                    <span>
                                      👥 {directReports.length + 1} Members
                                    </span>
                                    {teamLeads.length > 0 && (
                                      <span>🎯 {teamLeads.length} Lead</span>
                                    )}
                                    {agents.length > 0 && (
                                      <span>💼 {agents.length} Agents</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Single Row Team Layout */}
                          <div className="p-4">
                            <DropZone
                              onDrop={(droppedId) =>
                                handleDrop(manager.id, droppedId)
                              }
                              className={`relative rounded-lg transition-all ${
                                isDragging
                                  ? "border-2 border-dashed border-green-400 bg-green-50"
                                  : "border border-gray-200 bg-gray-50"
                              }`}
                              canDrop={true}
                              id={`team-${manager.id}`}
                            >
                              {/* Horizontal Team Grid - All members in one row */}
                              <div className="flex flex-wrap gap-3 p-3">
                                {/* Manager First */}
                                <div
                                  onClick={() => handleView(manager)}
                                  className="cursor-pointer relative flex-shrink-0"
                                >
                                  <div className="absolute -top-1 -right-1 z-10">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm border border-blue-200">
                                      👔
                                    </span>
                                  </div>
                                  <EmployeeCard
                                    key={manager.id}
                                    employee={manager}
                                    onView={handleView}
                                    onEdit={handleEdit}
                                    onPromote={(emp) =>
                                      handlePromote(emp.id, emp.role)
                                    }
                                    onTransfer={handleTransfer}
                                    onTerminate={handleTerminate}
                                    onSelect={handleEmployeeSelect}
                                    isSelected={selectedEmployees.has(
                                      manager.id
                                    )}
                                    showBulkActions={showBulkActions}
                                    isDragMode={true}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                </div>

                                {/* Team Members - Same Row */}
                                {directReports
                                  .sort((a, b) => {
                                    // Team Leads first, then Agents
                                    if (
                                      a.role === "Team Lead" &&
                                      b.role === "Agent"
                                    )
                                      return -1;
                                    if (
                                      a.role === "Agent" &&
                                      b.role === "Team Lead"
                                    )
                                      return 1;
                                    return a.name.localeCompare(b.name);
                                  })
                                  .map((employee) => (
                                    <div
                                      key={employee.id}
                                      onClick={() => handleView(employee)}
                                      className="cursor-pointer relative flex-shrink-0"
                                    >
                                      <div className="absolute -top-1 -right-1 z-10">
                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                            employee.role === "Team Lead"
                                              ? "bg-green-100 text-green-800 shadow-sm border border-green-200"
                                              : "bg-gray-100 text-gray-800 shadow-sm border border-gray-200"
                                          }`}
                                        >
                                          {employee.role === "Team Lead"
                                            ? "🎯"
                                            : "💼"}
                                        </span>
                                      </div>
                                      <EmployeeCard
                                        key={employee.id}
                                        employee={employee}
                                        onView={handleView}
                                        onEdit={handleEdit}
                                        onPromote={(emp) =>
                                          handlePromote(emp.id, emp.role)
                                        }
                                        onTransfer={handleTransfer}
                                        onTerminate={handleTerminate}
                                        onSelect={handleEmployeeSelect}
                                        isSelected={selectedEmployees.has(
                                          employee.id
                                        )}
                                        showBulkActions={showBulkActions}
                                        isDragMode={true}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                      />
                                    </div>
                                  ))}
                              </div>
                            </DropZone>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Unassigned Employees - Critical Action Required */}
            {(selectedManagerId === "all" ||
              selectedManagerId === "unassigned") &&
              (filteredEmployees.teamLeads.filter((emp) => !emp.managerId)
                .length > 0 ||
                filteredEmployees.agents.filter((emp) => !emp.managerId)
                  .length > 0) && (
                <div className="bg-white rounded-xl p-6 border-l-4 border-red-500 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-full mr-3 flex items-center justify-center border-2 border-red-300 animate-pulse">
                        <span className="text-red-700 text-lg font-bold">
                          ⚠️
                        </span>
                      </div>
                      Unassigned Employees
                      <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full border border-red-200 animate-pulse">
                        Action Required
                      </span>
                    </h3>
                    <div className="text-sm text-gray-700 bg-red-100 px-3 py-2 rounded-lg">
                      <span className="font-semibold text-red-800">
                        {
                          [
                            ...filteredEmployees.teamLeads,
                            ...filteredEmployees.agents,
                          ].filter((emp) => !emp.managerId).length
                        }
                      </span>{" "}
                      Unassigned
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">!</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-1">
                          Assignment Required
                        </h4>
                        <p className="text-sm text-yellow-700">
                          These employees need to be assigned to a Sales
                          Manager. Use drag & drop to move them to the
                          appropriate manager's team section above.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-red-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {[
                        ...filteredEmployees.teamLeads,
                        ...filteredEmployees.agents,
                      ]
                        .filter((emp) => !emp.managerId)
                        .sort((a, b) => {
                          // Team Leads first, then Agents
                          if (a.role === "Team Lead" && b.role === "Agent")
                            return -1;
                          if (a.role === "Agent" && b.role === "Team Lead")
                            return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((employee) => (
                          <div key={employee.id} className="relative">
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center z-10">
                              <span className="text-white text-xs font-bold">
                                !
                              </span>
                            </div>
                            <div
                              onClick={() => handleView(employee)}
                              className="cursor-pointer transform hover:scale-105 transition-transform"
                            >
                              <EmployeeCard
                                key={employee.id}
                                employee={employee}
                                onView={handleView}
                                onEdit={handleEdit}
                                onPromote={(emp) =>
                                  handlePromote(emp.id, emp.role)
                                }
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

        {/* Bulk Management View - Streamlined landscape layout */}
        {viewMode === "bulk-manage" && (
          <div className="space-y-6">
            {/* Bulk Management Header */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="text-2xl mr-3">⚡</span>
                  Bulk Management View
                </h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-indigo-600">
                      {selectedEmployees.size}
                    </span>{" "}
                    employees selected
                  </span>
                  {selectedEmployees.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value && selectedEmployees.size > 0) {
                            handleBulkReassign(
                              Array.from(selectedEmployees),
                              e.target.value
                            );
                            setSelectedEmployees(new Set());
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        defaultValue=""
                      >
                        <option value="">Reassign to...</option>
                        {filteredEmployees.managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.site})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleDeselectAll}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">💡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      How to use Bulk Management
                    </h4>
                    <p className="text-sm text-blue-800">
                      Check boxes to select multiple employees, then use the
                      "Reassign to..." dropdown to quickly move them to a new
                      manager. This view optimizes the layout for efficient bulk
                      operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Leads Table */}
            {filteredEmployees.teamLeads.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-green-800 flex items-center">
                      <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">🎯</span>
                      </span>
                      Team Leads ({filteredEmployees.teamLeads.length})
                    </h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const teamLeadIds = filteredEmployees.teamLeads.map(
                            (emp) => emp.id
                          );
                          setSelectedEmployees(
                            new Set([
                              ...Array.from(selectedEmployees),
                              ...teamLeadIds,
                            ])
                          );
                        }}
                        className="px-3 py-1 text-sm text-green-700 hover:text-green-900 border border-green-300 rounded-md hover:bg-green-100"
                      >
                        Select All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const teamLeadIds =
                                filteredEmployees.teamLeads.map(
                                  (emp) => emp.id
                                );
                              if (e.target.checked) {
                                setSelectedEmployees(
                                  new Set([
                                    ...Array.from(selectedEmployees),
                                    ...teamLeadIds,
                                  ])
                                );
                              } else {
                                const newSelected = new Set(selectedEmployees);
                                teamLeadIds.forEach((id) =>
                                  newSelected.delete(id)
                                );
                                setSelectedEmployees(newSelected);
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Site
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Manager
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quick Reassign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEmployees.teamLeads.map((employee) => {
                        const currentManager = filteredEmployees.managers.find(
                          (m) => m.id === employee.managerId
                        );
                        return (
                          <tr
                            key={employee.id}
                            className={`hover:bg-gray-50 ${
                              selectedEmployees.has(employee.id)
                                ? "bg-indigo-50"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.has(employee.id)}
                                onChange={(e) =>
                                  handleEmployeeSelect(
                                    employee.id,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-green-700 text-sm">
                                    🎯
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {employee.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Team Lead
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                📍 {employee.site}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {currentManager ? (
                                <span className="font-medium">
                                  {currentManager.name}
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  ⚠️ Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                employee.startDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleDrop(e.target.value, employee.id);
                                  }
                                }}
                                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
                                defaultValue=""
                              >
                                <option value="">Move to...</option>
                                {filteredEmployees.managers.map((manager) => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.name} ({manager.site})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleView(employee)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  👁️
                                </button>
                                <button
                                  onClick={() => handleEdit(employee)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agents Table */}
            {filteredEmployees.agents.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                      <span className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">💼</span>
                      </span>
                      Sales Agents ({filteredEmployees.agents.length})
                    </h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const agentIds = filteredEmployees.agents.map(
                            (emp) => emp.id
                          );
                          setSelectedEmployees(
                            new Set([
                              ...Array.from(selectedEmployees),
                              ...agentIds,
                            ])
                          );
                        }}
                        className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-100"
                      >
                        Select All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const agentIds = filteredEmployees.agents.map(
                                (emp) => emp.id
                              );
                              if (e.target.checked) {
                                setSelectedEmployees(
                                  new Set([
                                    ...Array.from(selectedEmployees),
                                    ...agentIds,
                                  ])
                                );
                              } else {
                                const newSelected = new Set(selectedEmployees);
                                agentIds.forEach((id) =>
                                  newSelected.delete(id)
                                );
                                setSelectedEmployees(newSelected);
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Site
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Manager
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quick Reassign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEmployees.agents.map((employee) => {
                        const currentManager = filteredEmployees.managers.find(
                          (m) => m.id === employee.managerId
                        );
                        const commissionInfo =
                          calculateAgentCommission(employee);
                        return (
                          <tr
                            key={employee.id}
                            className={`hover:bg-gray-50 ${
                              selectedEmployees.has(employee.id)
                                ? "bg-indigo-50"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.has(employee.id)}
                                onChange={(e) =>
                                  handleEmployeeSelect(
                                    employee.id,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-gray-700 text-sm">
                                    💼
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {employee.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Sales Agent
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                📍 {employee.site}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {currentManager ? (
                                <span className="font-medium">
                                  {currentManager.name}
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  ⚠️ Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    commissionInfo?.tier === "veteran"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {commissionInfo?.currentCommissionRate
                                    ? commissionInfo.currentCommissionRate * 100
                                    : 0}
                                  %
                                </span>
                                {commissionInfo?.willChangeToVeteran &&
                                  commissionInfo?.daysUntilChange &&
                                  commissionInfo?.daysUntilChange <= 7 && (
                                    <span className="text-orange-600 text-xs font-medium">
                                      🎯 {commissionInfo?.daysUntilChange}d
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                employee.startDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleDrop(e.target.value, employee.id);
                                  }
                                }}
                                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
                                defaultValue=""
                              >
                                <option value="">Move to...</option>
                                {filteredEmployees.managers.map((manager) => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.name} ({manager.site})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleView(employee)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  👁️
                                </button>
                                <button
                                  onClick={() => handleEdit(employee)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Managers for Reference */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                <h4 className="font-semibold text-blue-800 flex items-center">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">👔</span>
                  </span>
                  Sales Managers - Available Drop Targets (
                  {filteredEmployees.managers.length})
                </h4>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredEmployees.managers.map((manager) => {
                    const teamSize = [
                      ...filteredEmployees.teamLeads,
                      ...filteredEmployees.agents,
                    ].filter((emp) => emp.managerId === manager.id).length;
                    return (
                      <div
                        key={manager.id}
                        className="bg-blue-50 rounded-lg p-4 border border-blue-200"
                      >
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-sm">👔</span>
                          </div>
                          <div>
                            <div className="font-semibold text-blue-900">
                              {manager.name}
                            </div>
                            <div className="text-sm text-blue-700">
                              {manager.site} Site
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-blue-800">
                          Current team:{" "}
                          <span className="font-semibold">
                            {teamSize} members
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
            type: "move",
            employeeName:
              allEmployees.find((emp) => emp.id === employeeId)?.name ||
              "Employee",
            description: `Reassign ${
              allEmployees.find((emp) => emp.id === employeeId)?.name
            } to ${
              allEmployees.find((emp) => emp.id === newManagerId)?.name
            }'s team`,
          });
          closeModal();
          alert(
            "📝 Change queued: Employee will be reassigned when you apply changes"
          );
        }}
        availableManagers={allEmployees.filter(
          (emp) => emp.role === "Sales Manager" && emp.status !== "terminated"
        )}
        defaultSite={site}
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
            🎯 Assign {draggedEmployee?.name.split(" ")[0]}
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
              {draggedEmployee?.name.split(" ")[0]} • {draggedEmployee?.role}
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
                      ? "bg-green-50 hover:bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
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
                      ? "bg-green-50 hover:bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
                  }`}
                >
                  <div className="font-medium">{manager.name}</div>
                  <div className="text-xs opacity-75">
                    {manager.site} - Sales Manager
                  </div>
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

      {/* Terminated Employees View */}
      {viewMode === "terminated" && (
        <TerminatedEmployeesView
          employees={allEmployeesIncludingTerminated}
          site={site}
        />
      )}

      {/* Termination Modal */}
      <TerminationModal
        employee={employeeToTerminate}
        isOpen={terminationModalOpen}
        onClose={() => {
          setTerminationModalOpen(false);
          setEmployeeToTerminate(null);
        }}
        onConfirm={handleTerminationConfirm}
      />

      {/* Integrations Modal */}
      <IntegrationsModal
        isOpen={integrationsModalOpen}
        onClose={() => setIntegrationsModalOpen(false)}
      />

      {/* Slack Testing Interface */}
      <SlackTestingInterface
        isOpen={slackTestingOpen}
        onClose={() => setSlackTestingOpen(false)}
      />

      {/* Auto-scroll Visual Indicators - Show when dragging */}
      {isDragging && (
        <>
          {/* Top scroll zone */}
          <div
            className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-200 to-transparent opacity-50 z-40 pointer-events-none"
            style={{ backdropFilter: "blur(1px)" }}
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
            style={{ backdropFilter: "blur(1px)" }}
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
            style={{ backdropFilter: "blur(1px)" }}
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
            style={{ backdropFilter: "blur(1px)" }}
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
            <div className="text-xs opacity-90 mt-1">
              Use scroll wheel to navigate while dragging
            </div>
          </div>
        </>
      )}
    </>
  );
};
