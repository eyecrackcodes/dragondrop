import { Employee, CommissionTier, ROLE_COMPENSATION, AGENT_VETERAN_COMPENSATION } from '../types';
import { differenceInMonths } from 'date-fns';

export interface CommissionCalculation {
  currentSalary: number;
  currentCommissionRate: number;
  tier: CommissionTier;
  monthsEmployed: number;
  daysUntilChange?: number;
  willChangeToVeteran: boolean;
  description: string;
}

/**
 * Calculate commission information for an agent
 */
export const calculateAgentCommission = (employee: Employee): CommissionCalculation | null => {
  if (employee.role !== 'Agent') {
    return null;
  }

  const startDate = new Date(employee.startDate);
  const now = new Date();
  const monthsEmployed = differenceInMonths(now, startDate);
  const sixMonthsFromStart = new Date(startDate);
  sixMonthsFromStart.setMonth(sixMonthsFromStart.getMonth() + 6);

  const isVeteran = monthsEmployed >= 6;
  const currentTier: CommissionTier = employee.commissionTier || (isVeteran ? 'veteran' : 'new');

  let currentSalary: number;
  let currentCommissionRate: number;
  let description: string;
  let daysUntilChange: number | undefined;
  let willChangeToVeteran = false;

  if (currentTier === 'new' && monthsEmployed < 6) {
    // New agent (less than 6 months)
    currentSalary = ROLE_COMPENSATION.Agent.baseSalary;
    currentCommissionRate = ROLE_COMPENSATION.Agent.commissionRate;
    description = ROLE_COMPENSATION.Agent.description;
    
    // Calculate days until veteran status
    const daysLeft = Math.ceil((sixMonthsFromStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      daysUntilChange = daysLeft;
      willChangeToVeteran = true;
    }
  } else {
    // Veteran agent (6+ months)
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
    description
  };
};

/**
 * Check if an agent needs commission tier update
 */
export const checkCommissionEligibility = (employee: Employee): boolean => {
  if (employee.role !== 'Agent') return false;
  
  const monthsEmployed = differenceInMonths(new Date(), new Date(employee.startDate));
  return monthsEmployed >= 6 && employee.commissionTier !== 'veteran';
};

/**
 * Get agents approaching 6-month milestone (within 7 days)
 */
export const getAgentsApproachingMilestone = (employees: Employee[]): Employee[] => {
  return employees.filter(employee => {
    if (employee.role !== 'Agent' || employee.commissionTier === 'veteran') {
      return false;
    }

    const startDate = new Date(employee.startDate);
    const sixMonthsFromStart = new Date(startDate);
    sixMonthsFromStart.setMonth(sixMonthsFromStart.getMonth() + 6);
    
    const now = new Date();
    const daysUntilMilestone = Math.ceil((sixMonthsFromStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilMilestone <= 7 && daysUntilMilestone > 0;
  });
};

/**
 * Get agents who have passed 6-month milestone but haven't been updated
 */
export const getAgentsNeedingUpdate = (employees: Employee[]): Employee[] => {
  return employees.filter(employee => checkCommissionEligibility(employee));
};

/**
 * Format commission information for display
 */
export const formatCommissionInfo = (calculation: CommissionCalculation): string => {
  const { currentSalary, currentCommissionRate, daysUntilChange, willChangeToVeteran } = calculation;
  
  let info = `$${currentSalary.toLocaleString()} annual + ${(currentCommissionRate * 100)}% commission`;
  
  if (willChangeToVeteran && daysUntilChange) {
    info += ` (${daysUntilChange} days until veteran status)`;
  }
  
  return info;
};

/**
 * Get compensation info for any role
 */
export const getCompensationInfo = (employee: Employee): string => {
  if (employee.role === 'Agent') {
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
export const calculateTotalCompensation = (employee: Employee, annualCommission: number = 0): number => {
  if (employee.role === 'Agent') {
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
export const getBatchCommissionUpdates = (employees: Employee[]): Employee[] => {
  return employees
    .filter(checkCommissionEligibility)
    .map(employee => ({
      ...employee,
      commissionTier: 'veteran' as CommissionTier
    }));
}; 