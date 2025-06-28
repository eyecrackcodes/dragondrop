import { useState, useEffect, useCallback } from "react";
import { Employee, Site, Role, CommissionTier } from "../types";
import { EmployeeService, FirebaseUtils } from "../services/firebase";
import {
  calculateAgentCommission,
  getAgentsApproachingMilestone,
  checkCommissionEligibility,
} from "../utils/commissionCalculator";

// Hook for managing employees with real-time Firebase sync
export const useFirebaseEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data and set up real-time listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeEmployees = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if Firebase is configured
        if (!FirebaseUtils.isConfigured()) {
          console.warn("Firebase not configured, using mock data");
          setIsLoading(false);
          return;
        }

        // Test connection with simple check
        try {
          await FirebaseUtils.testConnection();
        } catch (error) {
          console.warn(
            "Firebase connection test failed, but will try to continue"
          );
          // Don't throw error - let the real-time listener handle it
        }

        // Set up real-time listener
        console.log("🔗 Setting up Firebase real-time listener for employees");
        unsubscribe = EmployeeService.onEmployeesChange((employeeData) => {
          console.log(
            "📡 Firebase data update received:",
            employeeData.length,
            "employees"
          );
          setEmployees(employeeData);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error initializing employees:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    };

    initializeEmployees();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        console.log("🔌 Cleaning up Firebase listener");
        unsubscribe();
      }
    };
  }, []);

  // CRUD operations
  const createEmployee = useCallback(
    async (employeeData: Omit<Employee, "id">) => {
      try {
        setError(null);
        await EmployeeService.create(employeeData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      try {
        setError(null);
        await EmployeeService.update(id, updates);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      setError(null);
      await EmployeeService.delete(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete employee";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const moveEmployee = useCallback(
    async (employeeId: string, newManagerId: string) => {
      try {
        setError(null);
        await EmployeeService.moveToManager(employeeId, newManagerId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to move employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const transferEmployee = useCallback(
    async (employeeId: string, newSite: Site) => {
      try {
        setError(null);
        await EmployeeService.transferToSite(employeeId, newSite);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to transfer employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const promoteEmployee = useCallback(
    async (employeeId: string, newRole: Role) => {
      try {
        setError(null);
        await EmployeeService.promote(employeeId, newRole);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to promote employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const terminateEmployee = useCallback(
    async (employeeId: string, terminationDetails?: any) => {
      try {
        setError(null);
        if (terminationDetails) {
          await EmployeeService.terminate(employeeId, terminationDetails);
        } else {
          await EmployeeService.terminateBasic(employeeId);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to terminate employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const updateCommissionTier = useCallback(
    async (employeeId: string, tier: CommissionTier) => {
      try {
        setError(null);
        await EmployeeService.updateCommissionTier(employeeId, tier);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update commission tier";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const bulkUpdateEmployees = useCallback(
    async (updates: Array<{ id: string; data: Partial<Employee> }>) => {
      try {
        setError(null);
        await EmployeeService.bulkUpdate(updates);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to perform bulk update";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  return {
    employees,
    isLoading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    moveEmployee,
    transferEmployee,
    promoteEmployee,
    terminateEmployee,
    updateCommissionTier,
    bulkUpdateEmployees,
    refetch: () => {
      // Real-time data, so refetch is automatic
      console.log(
        "Data is automatically synchronized via Firebase real-time listeners"
      );
    },
  };
};

// Hook for site-specific employees
export const useFirebaseEmployeesBySite = (site: Site) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeSiteEmployees = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!FirebaseUtils.isConfigured()) {
          console.warn("Firebase not configured, using mock data");
          setIsLoading(false);
          return;
        }

        // Set up real-time listener for site-specific employees
        unsubscribe = EmployeeService.onSiteEmployeesChange(
          site,
          (employeeData) => {
            setEmployees(employeeData);
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error("Error initializing site employees:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    };

    initializeSiteEmployees();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [site]);

  return {
    employees,
    isLoading,
    error,
  };
};

// Hook for organizational structure with Firebase data
export const useFirebaseOrgStructure = (site?: Site) => {
  // Always call both hooks to avoid conditional hook calls
  const allEmployeesData = useFirebaseEmployees();
  const siteEmployeesData = useFirebaseEmployeesBySite(site || "Austin");

  // Use the appropriate data source based on whether a site is specified
  const { employees, isLoading, error } = site
    ? siteEmployeesData
    : allEmployeesData;

  const orgStructure = employees.reduce(
    (acc, employee) => {
      if (employee.status === "terminated") return acc;

      switch (employee.role) {
        case "Sales Director":
          acc.directors.push(employee);
          break;
        case "Sales Manager":
          acc.managers.push(employee);
          break;
        case "Team Lead":
          acc.teamLeads.push(employee);
          break;
        case "Agent":
          acc.agents.push(employee);
          break;
      }
      return acc;
    },
    {
      directors: [] as Employee[],
      managers: [] as Employee[],
      teamLeads: [] as Employee[],
      agents: [] as Employee[],
    }
  );

  // Build hierarchical structure
  const orgTree = orgStructure.directors.map((director) => ({
    ...director,
    reports: orgStructure.managers
      .filter((manager) => manager.managerId === director.id)
      .map((manager) => ({
        ...manager,
        reports: orgStructure.teamLeads
          .filter((lead) => lead.managerId === manager.id)
          .map((lead) => ({
            ...lead,
            reports: orgStructure.agents.filter(
              (agent) => agent.managerId === lead.id
            ),
          })),
      })),
  }));

  const stats = {
    totalEmployees: employees.filter((emp) => emp.status === "active").length,
    totalDirectors: orgStructure.directors.length,
    totalManagers: orgStructure.managers.length,
    totalTeamLeads: orgStructure.teamLeads.length,
    totalAgents: orgStructure.agents.length,
  };

  return {
    ...orgStructure,
    orgTree,
    stats,
    isLoading,
    error,
  };
};

// Hook for commission alerts with Firebase data
export const useFirebaseCommissionAlerts = () => {
  const { employees, isLoading, error } = useFirebaseEmployees();

  const agentsApproachingMilestone = getAgentsApproachingMilestone(employees);
  const agentsNeedingUpdate = employees.filter(checkCommissionEligibility);
  const hasAlerts =
    agentsApproachingMilestone.length > 0 || agentsNeedingUpdate.length > 0;

  return {
    agentsApproachingMilestone,
    agentsNeedingUpdate,
    hasAlerts,
    isLoading,
    error,
  };
};

// Hook for Firebase drag and drop operations
export const useFirebaseDragAndDrop = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveEmployee = {
    mutate: async (params: {
      employeeId: string;
      newManagerId?: string;
      newSite?: Site;
      status?: "active" | "terminated";
    }) => {
      try {
        setIsProcessing(true);
        setError(null);

        if (params.newManagerId) {
          await EmployeeService.moveToManager(
            params.employeeId,
            params.newManagerId
          );
        }

        if (params.newSite) {
          await EmployeeService.transferToSite(
            params.employeeId,
            params.newSite
          );
        }

        if (params.status) {
          if (params.status === "terminated") {
            // Use basic termination for bulk actions
            await EmployeeService.terminateBasic(params.employeeId);
          } else {
            await EmployeeService.update(params.employeeId, {
              status: params.status,
            });
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to move employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
  };

  const promoteEmployee = {
    mutate: async (params: { employeeId: string; newRole: Role }) => {
      try {
        setIsProcessing(true);
        setError(null);
        await EmployeeService.promote(params.employeeId, params.newRole);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to promote employee";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
  };

  return {
    moveEmployee,
    promoteEmployee,
    isProcessing,
    error,
  };
};

// Hook for Firebase connection status
export const useFirebaseConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);

        // First check if Firebase is configured
        const configured = FirebaseUtils.isConfigured();
        console.log("🔥 Firebase configured check:", configured);
        setIsConfigured(configured);

        if (configured) {
          // Test actual connection to Firebase
          try {
            const connectionTest = await FirebaseUtils.testConnection();
            console.log("🔥 Firebase connection test result:", connectionTest);
            setIsConnected(connectionTest);
          } catch (connectionError) {
            console.error(
              "🔥 Firebase connection test failed:",
              connectionError
            );
            setIsConnected(false);
          }
        } else {
          console.warn(
            "🔥 Firebase not configured - missing environment variables"
          );
          setIsConnected(false);
        }
      } catch (error) {
        console.error("🔥 Error checking Firebase connection:", error);
        setIsConnected(false);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();

    // Also re-check connection every 5 minutes to handle network issues (reduced frequency)
    const interval = setInterval(checkConnection, 300000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConfigured,
    isLoading,
  };
};
