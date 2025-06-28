import { Employee, Site, Role } from "../types";
import { calculateAgentCommission } from "../utils/commissionCalculator";

export interface TeamPerformance {
  managerId: string;
  managerName: string;
  teamSize: number;
  avgTenure: number;
  retentionRate: number;
  veteranRatio: number;
  recentTerminations: number;
}

export interface SiteComparison {
  site: Site;
  totalEmployees: number;
  agentCount: number;
  managerCount: number;
  avgTenure: number;
  veteranRatio: number;
  terminationRate: number;
  projectedCosts: number;
}

export interface TurnoverInsight {
  totalTerminations: number;
  terminationRate: number;
  avgTenureAtTermination: number;
  costOfTurnover: number;
  topTerminationReasons: { reason: string; count: number }[];
  riskEmployees: Employee[];
}

export interface CompensationInsight {
  totalAnnualSalary: number;
  totalProjectedCommission: number;
  avgSalaryByRole: Record<Role, number>;
  costPerAgent: number;
  veteranPremium: number;
  projectedNextQuarter: number;
}

export interface GrowthInsight {
  monthlyGrowthRate: number;
  projectedHeadcount: number;
  optimalTeamSize: number;
  managerToAgentRatio: number;
  expansionReadiness: boolean;
  bottlenecks: string[];
}

export class InsightsService {
  private readonly MONTHS_IN_YEAR = 12;
  private readonly AVG_MONTHLY_SALES_PER_AGENT = 5000;
  private readonly COST_PER_HIRE = 3000;
  private readonly OPTIMAL_MANAGER_RATIO = 8; // 1 manager per 8 agents

  /**
   * Get team performance metrics by manager
   */
  getTeamPerformanceInsights(employees: Employee[]): TeamPerformance[] {
    const managers = employees.filter(
      (emp) => emp.role === "Sales Manager" && emp.status === "active"
    );

    return managers
      .map((manager) => {
        const teamMembers = employees.filter(
          (emp) => emp.managerId === manager.id
        );

        const activeMembers = teamMembers.filter(
          (emp) => emp.status === "active"
        );
        const terminatedMembers = teamMembers.filter(
          (emp) => emp.status === "terminated"
        );

        // Calculate average tenure
        const totalTenure = activeMembers.reduce((sum, emp) => {
          const monthsEmployed =
            (Date.now() - emp.startDate) / (30 * 24 * 60 * 60 * 1000);
          return sum + monthsEmployed;
        }, 0);

        // Calculate veteran ratio for agents
        const agents = activeMembers.filter((emp) => emp.role === "Agent");
        const veteranAgents = agents.filter((agent) => {
          const calc = calculateAgentCommission(agent);
          return calc?.tier === "veteran";
        });

        // Count recent terminations (last 90 days)
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const recentTerminations = terminatedMembers.filter(
          (emp) =>
            emp.termination && emp.termination.terminationDate > ninetyDaysAgo
        ).length;

        return {
          managerId: manager.id,
          managerName: manager.name,
          teamSize: activeMembers.length,
          avgTenure:
            activeMembers.length > 0 ? totalTenure / activeMembers.length : 0,
          retentionRate:
            teamMembers.length > 0
              ? (activeMembers.length / teamMembers.length) * 100
              : 100,
          veteranRatio:
            agents.length > 0
              ? (veteranAgents.length / agents.length) * 100
              : 0,
          recentTerminations,
        };
      })
      .sort((a, b) => b.retentionRate - a.retentionRate);
  }

  /**
   * Compare performance between sites
   */
  getSiteComparisonInsights(employees: Employee[]): SiteComparison[] {
    const sites: Site[] = ["Austin", "Charlotte"];

    return sites.map((site) => {
      const siteEmployees = employees.filter((emp) => emp.site === site);
      const activeEmployees = siteEmployees.filter(
        (emp) => emp.status === "active"
      );
      const terminatedEmployees = siteEmployees.filter(
        (emp) => emp.status === "terminated"
      );

      const agents = activeEmployees.filter((emp) => emp.role === "Agent");
      const managers = activeEmployees.filter(
        (emp) => emp.role === "Sales Manager"
      );

      // Calculate average tenure
      const totalTenure = activeEmployees.reduce((sum, emp) => {
        const monthsEmployed =
          (Date.now() - emp.startDate) / (30 * 24 * 60 * 60 * 1000);
        return sum + monthsEmployed;
      }, 0);

      // Calculate veteran ratio
      const veteranAgents = agents.filter((agent) => {
        const calc = calculateAgentCommission(agent);
        return calc?.tier === "veteran";
      });

      // Calculate projected costs
      const projectedCosts = this.calculateSiteCosts(activeEmployees);

      return {
        site,
        totalEmployees: activeEmployees.length,
        agentCount: agents.length,
        managerCount: managers.length,
        avgTenure:
          activeEmployees.length > 0 ? totalTenure / activeEmployees.length : 0,
        veteranRatio:
          agents.length > 0 ? (veteranAgents.length / agents.length) * 100 : 0,
        terminationRate:
          siteEmployees.length > 0
            ? (terminatedEmployees.length / siteEmployees.length) * 100
            : 0,
        projectedCosts,
      };
    });
  }

  /**
   * Analyze turnover patterns and costs
   */
  getTurnoverInsights(employees: Employee[]): TurnoverInsight {
    const terminatedEmployees = employees.filter(
      (emp) => emp.status === "terminated"
    );
    const activeEmployees = employees.filter((emp) => emp.status === "active");

    // Calculate average tenure at termination
    const tenureAtTermination = terminatedEmployees
      .filter((emp) => emp.termination)
      .map((emp) => {
        const tenure =
          (emp.termination!.terminationDate - emp.startDate) /
          (30 * 24 * 60 * 60 * 1000);
        return tenure;
      });

    const avgTenureAtTermination =
      tenureAtTermination.length > 0
        ? tenureAtTermination.reduce((a, b) => a + b, 0) /
          tenureAtTermination.length
        : 0;

    // Count termination reasons
    const reasonCounts: Record<string, number> = {};
    terminatedEmployees.forEach((emp) => {
      if (emp.termination) {
        const reason = emp.termination.reason;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    });

    const topTerminationReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Identify at-risk employees (new agents with < 3 months tenure)
    const riskEmployees = activeEmployees.filter((emp) => {
      if (emp.role !== "Agent") return false;
      const monthsEmployed =
        (Date.now() - emp.startDate) / (30 * 24 * 60 * 60 * 1000);
      return monthsEmployed < 3;
    });

    // Calculate cost of turnover
    const costOfTurnover = terminatedEmployees.length * this.COST_PER_HIRE;

    return {
      totalTerminations: terminatedEmployees.length,
      terminationRate:
        employees.length > 0
          ? (terminatedEmployees.length / employees.length) * 100
          : 0,
      avgTenureAtTermination,
      costOfTurnover,
      topTerminationReasons,
      riskEmployees,
    };
  }

  /**
   * Analyze compensation and project costs
   */
  getCompensationInsights(employees: Employee[]): CompensationInsight {
    const activeEmployees = employees.filter((emp) => emp.status === "active");

    // Calculate total annual salary
    let totalAnnualSalary = 0;
    const salaryByRole: Record<Role, { total: number; count: number }> = {
      "Sales Director": { total: 0, count: 0 },
      "Sales Manager": { total: 0, count: 0 },
      "Team Lead": { total: 0, count: 0 },
      Agent: { total: 0, count: 0 },
    };

    activeEmployees.forEach((emp) => {
      let annualSalary = 0;

      if (emp.role === "Sales Manager") {
        annualSalary = 90000;
      } else if (emp.role === "Team Lead") {
        annualSalary = 40000;
      } else if (emp.role === "Agent") {
        const calc = calculateAgentCommission(emp);
        annualSalary = calc?.currentSalary || 60000;
      }

      totalAnnualSalary += annualSalary;
      salaryByRole[emp.role].total += annualSalary;
      salaryByRole[emp.role].count += 1;
    });

    // Calculate average salary by role
    const avgSalaryByRole: Record<Role, number> = {} as Record<Role, number>;
    Object.entries(salaryByRole).forEach(([role, data]) => {
      avgSalaryByRole[role as Role] =
        data.count > 0 ? data.total / data.count : 0;
    });

    // Calculate projected commission
    const agents = activeEmployees.filter((emp) => emp.role === "Agent");
    const totalProjectedCommission = agents.reduce((sum, agent) => {
      const calc = calculateAgentCommission(agent);
      const commissionRate = calc?.currentCommissionRate || 0.05;
      return (
        sum +
        this.AVG_MONTHLY_SALES_PER_AGENT * this.MONTHS_IN_YEAR * commissionRate
      );
    }, 0);

    // Calculate cost per agent
    const totalAgentCost =
      salaryByRole["Agent"].total + totalProjectedCommission;
    const costPerAgent = agents.length > 0 ? totalAgentCost / agents.length : 0;

    // Calculate veteran premium (difference in cost between new and veteran agents)
    const newAgentCost =
      60000 + this.AVG_MONTHLY_SALES_PER_AGENT * this.MONTHS_IN_YEAR * 0.05;
    const veteranAgentCost =
      30000 + this.AVG_MONTHLY_SALES_PER_AGENT * this.MONTHS_IN_YEAR * 0.2;
    const veteranPremium = veteranAgentCost - newAgentCost;

    // Project next quarter costs (account for upcoming tier changes)
    const upcomingVeterans = agents.filter((agent) => {
      const calc = calculateAgentCommission(agent);
      return (
        calc?.willChangeToVeteran &&
        calc.daysUntilChange &&
        calc.daysUntilChange <= 90
      );
    }).length;

    const projectedNextQuarter =
      totalAnnualSalary / 4 +
      totalProjectedCommission / 4 +
      (upcomingVeterans * veteranPremium) / 4;

    return {
      totalAnnualSalary,
      totalProjectedCommission,
      avgSalaryByRole,
      costPerAgent,
      veteranPremium,
      projectedNextQuarter,
    };
  }

  /**
   * Analyze growth patterns and scalability
   */
  getGrowthInsights(employees: Employee[]): GrowthInsight {
    const activeEmployees = employees.filter((emp) => emp.status === "active");
    const agents = activeEmployees.filter((emp) => emp.role === "Agent");
    const managers = activeEmployees.filter(
      (emp) => emp.role === "Sales Manager"
    );

    // Calculate monthly growth rate (based on hire dates)
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const recentHires = activeEmployees.filter(
      (emp) => emp.startDate > sixMonthsAgo
    );
    const monthlyGrowthRate = recentHires.length / 6;

    // Project headcount for next quarter
    const projectedHeadcount = activeEmployees.length + monthlyGrowthRate * 3;

    // Calculate optimal team size based on manager capacity
    const optimalTeamSize = managers.length * this.OPTIMAL_MANAGER_RATIO;

    // Current manager to agent ratio
    const managerToAgentRatio =
      managers.length > 0 ? agents.length / managers.length : 0;

    // Identify bottlenecks
    const bottlenecks: string[] = [];

    if (managerToAgentRatio > this.OPTIMAL_MANAGER_RATIO) {
      bottlenecks.push(
        `Manager capacity exceeded (${managerToAgentRatio.toFixed(
          1
        )} agents per manager)`
      );
    }

    const veteranAgents = agents.filter((agent) => {
      const calc = calculateAgentCommission(agent);
      return calc?.tier === "veteran";
    });

    if (veteranAgents.length / agents.length < 0.3) {
      bottlenecks.push("Low veteran agent ratio may impact training capacity");
    }

    const austinEmployees = activeEmployees.filter(
      (emp) => emp.site === "Austin"
    );
    const charlotteEmployees = activeEmployees.filter(
      (emp) => emp.site === "Charlotte"
    );

    if (Math.abs(austinEmployees.length - charlotteEmployees.length) > 10) {
      bottlenecks.push("Significant site imbalance may affect operations");
    }

    return {
      monthlyGrowthRate,
      projectedHeadcount,
      optimalTeamSize,
      managerToAgentRatio,
      expansionReadiness: bottlenecks.length === 0,
      bottlenecks,
    };
  }

  /**
   * Generate actionable recommendations
   */
  getRecommendations(employees: Employee[]): string[] {
    const recommendations: string[] = [];

    const turnover = this.getTurnoverInsights(employees);
    const growth = this.getGrowthInsights(employees);
    const compensation = this.getCompensationInsights(employees);

    // Turnover recommendations
    if (turnover.terminationRate > 20) {
      recommendations.push(
        "High turnover rate detected. Consider exit interview analysis and retention programs."
      );
    }

    if (turnover.riskEmployees.length > 5) {
      recommendations.push(
        `${turnover.riskEmployees.length} new agents at risk. Implement enhanced onboarding support.`
      );
    }

    // Growth recommendations
    if (growth.managerToAgentRatio > this.OPTIMAL_MANAGER_RATIO) {
      recommendations.push(
        "Consider hiring additional managers to maintain optimal team ratios."
      );
    }

    if (!growth.expansionReadiness) {
      recommendations.push(
        "Address operational bottlenecks before expanding headcount."
      );
    }

    // Compensation recommendations
    if (compensation.veteranPremium < 0) {
      recommendations.push(
        "Review compensation structure - veteran agents may be underpaid relative to value."
      );
    }

    // Site-specific recommendations
    const siteComparison = this.getSiteComparisonInsights(employees);
    const performanceGap = Math.abs(
      siteComparison[0].veteranRatio - siteComparison[1].veteranRatio
    );

    if (performanceGap > 20) {
      recommendations.push(
        "Significant performance gap between sites. Consider best practice sharing."
      );
    }

    return recommendations;
  }

  /**
   * Helper method to calculate site costs
   */
  private calculateSiteCosts(employees: Employee[]): number {
    return employees.reduce((total, emp) => {
      let annualCost = 0;

      if (emp.role === "Sales Manager") {
        annualCost = 90000;
      } else if (emp.role === "Team Lead") {
        annualCost = 40000;
      } else if (emp.role === "Agent") {
        const calc = calculateAgentCommission(emp);
        const salary = calc?.currentSalary || 60000;
        const commission =
          this.AVG_MONTHLY_SALES_PER_AGENT *
          this.MONTHS_IN_YEAR *
          (calc?.currentCommissionRate || 0.05);
        annualCost = salary + commission;
      }

      return total + annualCost;
    }, 0);
  }
}

// Export singleton instance
export const insightsService = new InsightsService();
