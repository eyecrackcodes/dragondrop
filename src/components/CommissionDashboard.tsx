import React, { useState, useMemo } from "react";
import { Employee, Site } from "../types";
import {
  calculateAgentCommission,
  getAgentsApproachingMilestone,
  getAgentsNeedingUpdate,
  getEarlyPromotedAgents,
  formatCommissionInfo,
} from "../utils/commissionCalculator";
import { format } from "date-fns";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

interface CommissionDashboardProps {
  employees: Employee[];
  site?: Site;
}

interface CommissionMetrics {
  totalAgents: number;
  newAgents: number;
  veteranAgents: number;
  earlyPromotedAgents: Employee[];
  agentsApproachingMilestone: Employee[];
  agentsNeedingUpdate: Employee[];
  avgMonthsEmployed: number;
  totalEstimatedAnnualCommission: number;
}

export const CommissionDashboard: React.FC<CommissionDashboardProps> = ({
  employees,
  site,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "current" | "3months" | "6months" | "1year"
  >("current");
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  // Filter employees by site if specified
  const filteredEmployees = useMemo(() => {
    return site ? employees.filter((emp) => emp.site === site) : employees;
  }, [employees, site]);

  // Calculate commission metrics
  const metrics = useMemo((): CommissionMetrics => {
    const agents = filteredEmployees.filter(
      (emp) => emp.role === "Agent" && emp.status === "active"
    );
    const newAgents = agents.filter((agent) => {
      const calc = calculateAgentCommission(agent);
      return calc?.tier === "new";
    });
    const veteranAgents = agents.filter((agent) => {
      const calc = calculateAgentCommission(agent);
      return calc?.tier === "veteran";
    });

    const earlyPromotedAgents = getEarlyPromotedAgents(agents);
    const agentsApproachingMilestone = getAgentsApproachingMilestone(agents);
    const agentsNeedingUpdate = getAgentsNeedingUpdate(agents);

    // Calculate average months employed
    const totalMonths = agents.reduce((sum, agent) => {
      const calc = calculateAgentCommission(agent);
      return sum + (calc?.monthsEmployed || 0);
    }, 0);
    const avgMonthsEmployed =
      agents.length > 0 ? totalMonths / agents.length : 0;

    // Estimate annual commission (simplified calculation)
    const totalEstimatedAnnualCommission = agents.reduce((sum, agent) => {
      const calc = calculateAgentCommission(agent);
      if (calc) {
        // Assume average $5000 monthly sales per agent
        const avgMonthlySales = 5000;
        const annualCommission =
          avgMonthlySales * 12 * calc.currentCommissionRate;
        return sum + annualCommission;
      }
      return sum;
    }, 0);

    return {
      totalAgents: agents.length,
      newAgents: newAgents.length,
      veteranAgents: veteranAgents.length,
      earlyPromotedAgents,
      agentsApproachingMilestone,
      agentsNeedingUpdate,
      avgMonthsEmployed,
      totalEstimatedAnnualCommission,
    };
  }, [filteredEmployees]);

  // Get commission details for all agents
  const agentCommissionDetails = useMemo(() => {
    return filteredEmployees
      .filter((emp) => emp.role === "Agent" && emp.status === "active")
      .map((agent) => {
        const calc = calculateAgentCommission(agent);
        return {
          employee: agent,
          commission: calc,
          formattedInfo: calc ? formatCommissionInfo(calc) : "N/A",
        };
      })
      .sort(
        (a, b) =>
          (b.commission?.monthsEmployed || 0) -
          (a.commission?.monthsEmployed || 0)
      );
  }, [filteredEmployees]);

  const getStatusColor = (agent: Employee) => {
    const calc = calculateAgentCommission(agent);
    if (!calc) return "text-gray-500";

    if (
      calc.willChangeToVeteran &&
      calc.daysUntilChange &&
      calc.daysUntilChange <= 7
    ) {
      return "text-amber-600";
    }
    if (calc.tier === "veteran") {
      return "text-green-600";
    }
    return "text-blue-600";
  };

  const getStatusIcon = (agent: Employee) => {
    const calc = calculateAgentCommission(agent);
    if (!calc) return ClockIcon;

    if (
      calc.willChangeToVeteran &&
      calc.daysUntilChange &&
      calc.daysUntilChange <= 7
    ) {
      return ExclamationTriangleIcon;
    }
    if (calc.tier === "veteran") {
      return ArrowTrendingUpIcon;
    }
    return ClockIcon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Commission Dashboard
          </h2>
          <p className="text-sm text-gray-600">
            {site ? `${site} Site` : "All Sites"} •{" "}
            {format(new Date(), "MMMM yyyy")}
          </p>
        </div>

        <div className="flex space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="current">Current Period</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>

          <button
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            {showDetailedBreakdown ? "Hide Details" : "Show Details"}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Agents */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserGroupIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalAgents}
              </p>
            </div>
          </div>
          <div className="mt-2 flex text-xs">
            <span className="text-blue-600">{metrics.newAgents} new</span>
            <span className="text-gray-400 mx-1">•</span>
            <span className="text-green-600">
              {metrics.veteranAgents} veteran
            </span>
          </div>
        </div>

        {/* Average Tenure */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CalendarIcon className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Tenure</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.avgMonthsEmployed.toFixed(1)}m
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Months employed</p>
        </div>

        {/* Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.agentsApproachingMilestone.length +
                  metrics.agentsNeedingUpdate.length}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs">
            <div className="text-amber-600">
              {metrics.agentsApproachingMilestone.length} approaching milestone
            </div>
            <div className="text-red-600">
              {metrics.agentsNeedingUpdate.length} need updates
            </div>
          </div>
        </div>

        {/* Estimated Annual Commission */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                Est. Annual Commission
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(metrics.totalEstimatedAnnualCommission / 1000)}k
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Based on avg $5k monthly sales
          </p>
        </div>
      </div>

      {/* Early Promoted Agents Section */}
      {metrics.earlyPromotedAgents.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
            Early Promoted Agents
          </h3>

          <div className="space-y-2">
            <p className="text-sm text-green-800 mb-3">
              These agents were promoted to veteran status (30k + 20%
              commission) before completing 6 months of service based on
              performance:
            </p>
            {metrics.earlyPromotedAgents.map((agent) => {
              const calc = calculateAgentCommission(agent);
              return (
                <div key={agent.id} className="text-sm text-green-700">
                  <strong>{agent.name}</strong> - {calc?.monthsEmployed} months
                  employed, veteran status
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {(metrics.agentsApproachingMilestone.length > 0 ||
        metrics.agentsNeedingUpdate.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-amber-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            Commission Alerts
          </h3>

          <div className="space-y-3">
            {metrics.agentsApproachingMilestone.length > 0 && (
              <div>
                <h4 className="font-medium text-amber-800 mb-2">
                  Approaching 6-Month Veteran Eligibility:
                </h4>
                <div className="space-y-1">
                  {metrics.agentsApproachingMilestone.map((agent) => {
                    const calc = calculateAgentCommission(agent);
                    return (
                      <div key={agent.id} className="text-sm text-amber-700">
                        <strong>{agent.name}</strong> - {calc?.daysUntilChange}{" "}
                        days until automatic veteran eligibility
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {metrics.agentsNeedingUpdate.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2">
                  Need Commission Tier Update:
                </h4>
                <div className="space-y-1">
                  {metrics.agentsNeedingUpdate.map((agent) => {
                    const calc = calculateAgentCommission(agent);
                    return (
                      <div key={agent.id} className="text-sm text-red-700">
                        <strong>{agent.name}</strong> - {calc?.monthsEmployed}{" "}
                        months employed, still marked as 'new'
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {showDetailedBreakdown && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Agent Commission Details
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {agentCommissionDetails.map(
                  ({ employee, commission }, index) => {
                    const StatusIcon = getStatusIcon(employee);
                    return (
                      <tr
                        key={employee.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {employee.name}
                          <div className="text-xs text-gray-500">
                            {employee.site}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {commission?.monthsEmployed || 0} months
                          <div className="text-xs text-gray-500">
                            Since{" "}
                            {format(new Date(employee.startDate), "MMM yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              commission?.tier === "veteran"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {commission?.tier === "veteran" ? "Veteran" : "New"}
                          </span>
                          {commission?.isEarlyPromotion && (
                            <div className="text-xs text-green-600 mt-1">
                              Early promotion
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {commission
                            ? `${(
                                commission.currentCommissionRate * 100
                              ).toFixed(0)}%`
                            : "N/A"}
                          <div className="text-xs text-gray-500">
                            $
                            {commission?.currentSalary.toLocaleString() ||
                              "N/A"}{" "}
                            base
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div
                            className={`flex items-center ${getStatusColor(
                              employee
                            )}`}
                          >
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {commission?.willChangeToVeteran &&
                            commission.daysUntilChange ? (
                              <span>
                                {commission.daysUntilChange} days to veteran
                              </span>
                            ) : commission?.tier === "veteran" ? (
                              <span>Veteran status</span>
                            ) : (
                              <span>Active</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-2">
            Commission Distribution
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>New Agents (5%)</span>
              <span className="font-medium">{metrics.newAgents}</span>
            </div>
            <div className="flex justify-between">
              <span>Veteran Agents (20%)</span>
              <span className="font-medium">{metrics.veteranAgents}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-2">
            Upcoming Milestones
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Next 7 days</span>
              <span className="font-medium text-amber-600">
                {metrics.agentsApproachingMilestone.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Need updates</span>
              <span className="font-medium text-red-600">
                {metrics.agentsNeedingUpdate.length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-2">
            Compensation Overview
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Avg Base Salary</span>
              <span className="font-medium">
                $
                {Math.round(
                  (metrics.newAgents * 60000 + metrics.veteranAgents * 30000) /
                    Math.max(metrics.totalAgents, 1) /
                    1000
                )}
                k
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Est. Commission</span>
              <span className="font-medium text-green-600">
                ${Math.round(metrics.totalEstimatedAnnualCommission / 1000)}
                k/year
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
