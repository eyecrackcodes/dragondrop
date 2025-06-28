import {
  Employee,
  CommissionTier,
  ROLE_COMPENSATION,
  AGENT_VETERAN_COMPENSATION,
} from "../types";
import { differenceInMonths } from "date-fns";

export interface CommissionCalculation {
  currentSalary: number;
  currentCommissionRate: number;
  tier: CommissionTier;
  monthsEmployed: number;
  daysUntilChange?: number;
  willChangeToVeteran: boolean;
  isEarlyPromotion: boolean;
  description: string;
}

/**
 * Calculate commission information for an agent
 */
export const calculateAgentCommission = (
  employee: Employee
): CommissionCalculation | null => {
  if (employee.role !== "Agent") {
    return null;
  }

  const startDate = new Date(employee.startDate);
  const now = new Date();
  const monthsEmployed = differenceInMonths(now, startDate);
  const sixMonthsFromStart = new Date(startDate);
  sixMonthsFromStart.setMonth(sixMonthsFromStart.getMonth() + 6);

  const hasServedSixMonths = monthsEmployed >= 6;

  // Respect explicit tier setting, but default to tenure-based for unset tiers
  let currentTier: CommissionTier;
  if (employee.commissionTier) {
    currentTier = employee.commissionTier;
  } else {
    currentTier = hasServedSixMonths ? "veteran" : "new";
  }

  let currentSalary: number;
  let currentCommissionRate: number;
  let description: string;
  let daysUntilChange: number | undefined;
  let willChangeToVeteran = false;
  const isEarlyPromotion = currentTier === "veteran" && !hasServedSixMonths;

  if (currentTier === "new") {
    // New agent compensation
    currentSalary = ROLE_COMPENSATION.Agent.baseSalary;
    currentCommissionRate = ROLE_COMPENSATION.Agent.commissionRate;
    description = ROLE_COMPENSATION.Agent.description;

    // Calculate days until automatic veteran eligibility (only if not already veteran)
    if (!hasServedSixMonths) {
      const daysLeft = Math.ceil(
        (sixMonthsFromStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft > 0) {
        daysUntilChange = daysLeft;
        willChangeToVeteran = true;
      }
    }
  } else {
    // Veteran agent compensation
    currentSalary = AGENT_VETERAN_COMPENSATION.baseSalary;
    currentCommissionRate = AGENT_VETERAN_COMPENSATION.commissionRate;
    description = AGENT_VETERAN_COMPENSATION.description;
  }

  return {
    currentSalary,
    currentCommissionRate,
    tier: currentTier,
    monthsEmployed,
    daysUntilChange,
    willChangeToVeteran,
    isEarlyPromotion,
    description,
  };
};

/**
 * Check if an agent is eligible for veteran status (either by tenure or manual promotion)
 */
export const checkCommissionEligibility = (employee: Employee): boolean => {
  if (employee.role !== "Agent") return false;

  // Already veteran - no change needed
  if (employee.commissionTier === "veteran") return false;

  // Check if they've served 6 months and aren't marked as veteran yet
  const monthsEmployed = differenceInMonths(
    new Date(),
    new Date(employee.startDate)
  );
  return (
    monthsEmployed >= 6 &&
    (employee.commissionTier === "new" || employee.commissionTier === undefined)
  );
};

/**
 * Check if an agent can be manually promoted to veteran status
 */
export const canPromoteToVeteran = (employee: Employee): boolean => {
  if (employee.role !== "Agent") return false;
  return employee.commissionTier !== "veteran"; // Can promote any non-veteran agent
};

/**
 * Validate commission tier changes (prevent veteran → new downgrades)
 */
export const validateCommissionTierChange = (
  currentTier: CommissionTier | undefined,
  newTier: CommissionTier
): { isValid: boolean; error?: string } => {
  // Allow any change to undefined or new tier
  if (!currentTier || currentTier === "new") {
    return { isValid: true };
  }

  // Prevent veteran → new downgrade
  if (currentTier === "veteran" && newTier === "new") {
    return {
      isValid: false,
      error:
        "Cannot downgrade from veteran to new agent status. This is a one-way promotion.",
    };
  }

  return { isValid: true };
};

/**
 * Get agents approaching 6-month milestone (within 7 days) who are still new
 */
export const getAgentsApproachingMilestone = (
  employees: Employee[]
): Employee[] => {
  return employees.filter((employee) => {
    if (employee.role !== "Agent" || employee.commissionTier === "veteran") {
      return false;
    }

    const startDate = new Date(employee.startDate);
    const sixMonthsFromStart = new Date(startDate);
    sixMonthsFromStart.setMonth(sixMonthsFromStart.getMonth() + 6);

    const now = new Date();
    const daysUntilMilestone = Math.ceil(
      (sixMonthsFromStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilMilestone <= 7 && daysUntilMilestone > 0;
  });
};

/**
 * Get agents who have passed 6-month milestone but haven't been updated to veteran
 */
export const getAgentsNeedingUpdate = (employees: Employee[]): Employee[] => {
  return employees.filter((employee) => checkCommissionEligibility(employee));
};

/**
 * Get agents who were promoted to veteran before 6 months
 */
export const getEarlyPromotedAgents = (employees: Employee[]): Employee[] => {
  return employees.filter((employee) => {
    if (employee.role !== "Agent") return false;
    const calc = calculateAgentCommission(employee);
    return calc?.isEarlyPromotion || false;
  });
};

/**
 * Format commission information for display
 */
export const formatCommissionInfo = (
  calculation: CommissionCalculation
): string => {
  const {
    currentSalary,
    currentCommissionRate,
    daysUntilChange,
    willChangeToVeteran,
    isEarlyPromotion,
  } = calculation;

  let info = `$${currentSalary.toLocaleString()} annual + ${
    currentCommissionRate * 100
  }% commission`;

  if (isEarlyPromotion) {
    info += ` (early promotion)`;
  } else if (willChangeToVeteran && daysUntilChange) {
    info += ` (${daysUntilChange} days until veteran eligibility)`;
  }

  return info;
};

/**
 * Get compensation info for any role
 */
export const getCompensationInfo = (employee: Employee): string => {
  if (employee.role === "Agent") {
    const calc = calculateAgentCommission(employee);
    if (calc) {
      return formatCommissionInfo(calc);
    }
  }

  return ROLE_COMPENSATION[employee.role].description;
};

/**
 * Calculate total compensation for reporting
 */
export const calculateTotalCompensation = (
  employee: Employee,
  annualCommission: number = 0
): number => {
  if (employee.role === "Agent") {
    const calc = calculateAgentCommission(employee);
    if (calc) {
      return calc.currentSalary + annualCommission;
    }
  }

  const roleComp = ROLE_COMPENSATION[employee.role];
  return roleComp.baseSalary + annualCommission;
};

/**
 * Batch update agents who have reached veteran status
 */
export const getBatchCommissionUpdates = (
  employees: Employee[]
): Employee[] => {
  return employees.filter(checkCommissionEligibility).map((employee) => ({
    ...employee,
    commissionTier: "veteran" as CommissionTier,
  }));
};
