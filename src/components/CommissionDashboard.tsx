import React, { useState, useMemo } from "react";
import { Employee, Site } from "../types";
import {
  calculateAgentCommission,
  getAgentsApproachingMilestone,
  getAgentsNeedingUpdate,
  getEarlyPromotedAgents,
  formatCommissionInfo,
} from "../utils/commissionCalculator";
import { insightsService } from "../services/insightsService";
import { format } from "date-fns";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  LightBulbIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
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
  const [showInsights, setShowInsights] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState<
    "team" | "sites" | "turnover" | "compensation" | "growth"
  >("team");

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

  // Get insights data
  const insights = useMemo(() => {
    return {
      teamPerformance: insightsService.getTeamPerformanceInsights(employees),
      siteComparison: insightsService.getSiteComparisonInsights(employees),
      turnover: insightsService.getTurnoverInsights(employees),
      compensation: insightsService.getCompensationInsights(employees),
      growth: insightsService.getGrowthInsights(employees),
      recommendations: insightsService.getRecommendations(employees),
    };
  }, [employees]);

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

          <button
            onClick={() => setShowInsights(!showInsights)}
            className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 flex items-center"
          >
            <LightBulbIcon className="w-4 h-4 mr-1" />
            {showInsights ? "Hide Insights" : "Show Insights"}
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

      {/* Insights Section */}
      {showInsights && (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Insights Header with Tabs */}
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <LightBulbIcon className="w-5 h-5 mr-2 text-purple-600" />
              Data Insights & Analytics
            </h3>

            <div className="flex space-x-1">
              {[
                { id: "team", label: "Team Performance", icon: UserGroupIcon },
                {
                  id: "sites",
                  label: "Site Comparison",
                  icon: BuildingOfficeIcon,
                },
                { id: "turnover", label: "Turnover", icon: ArrowPathIcon },
                {
                  id: "compensation",
                  label: "Compensation",
                  icon: CurrencyDollarIcon,
                },
                { id: "growth", label: "Growth", icon: ArrowTrendingUpIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInsightTab(tab.id as any)}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${
                      activeInsightTab === tab.id
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Insights Content */}
          <div className="p-6">
            {/* Team Performance Tab */}
            {activeInsightTab === "team" && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Manager Performance Rankings
                </h4>
                <div className="space-y-3">
                  {insights.teamPerformance.map((team, index) => (
                    <div
                      key={team.managerId}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {index + 1}. {team.managerName}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Team Size: {team.teamSize} • Avg Tenure:{" "}
                            {team.avgTenure.toFixed(1)}m
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              team.retentionRate >= 90
                                ? "text-green-600"
                                : team.retentionRate >= 80
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {team.retentionRate.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">Retention</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded px-2 py-1">
                          <span className="text-gray-500">Veteran Ratio:</span>{" "}
                          <span className="font-medium">
                            {team.veteranRatio.toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white rounded px-2 py-1">
                          <span className="text-gray-500">Recent Terms:</span>{" "}
                          <span
                            className={`font-medium ${
                              team.recentTerminations > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {team.recentTerminations}
                          </span>
                        </div>
                        <div className="bg-white rounded px-2 py-1">
                          <span className="text-gray-500">Efficiency:</span>{" "}
                          <span className="font-medium">
                            {team.teamSize > 0
                              ? (team.veteranRatio / team.teamSize).toFixed(1)
                              : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Site Comparison Tab */}
            {activeInsightTab === "sites" && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Site Performance Comparison
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.siteComparison.map((site) => (
                    <div key={site.site} className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 text-lg mb-3">
                        {site.site}
                      </h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Total Employees
                          </span>
                          <span className="font-medium">
                            {site.totalEmployees}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Agent/Manager Ratio
                          </span>
                          <span className="font-medium">
                            {site.managerCount > 0
                              ? (site.agentCount / site.managerCount).toFixed(1)
                              : "N/A"}
                            :1
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Avg Tenure
                          </span>
                          <span className="font-medium">
                            {site.avgTenure.toFixed(1)} months
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Veteran Ratio
                          </span>
                          <span
                            className={`font-medium ${
                              site.veteranRatio >= 40
                                ? "text-green-600"
                                : "text-amber-600"
                            }`}
                          >
                            {site.veteranRatio.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Termination Rate
                          </span>
                          <span
                            className={`font-medium ${
                              site.terminationRate <= 10
                                ? "text-green-600"
                                : site.terminationRate <= 20
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {site.terminationRate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="pt-2 mt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Projected Annual Cost
                            </span>
                            <span className="font-medium text-purple-600">
                              ${(site.projectedCosts / 1000000).toFixed(2)}M
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turnover Tab */}
            {activeInsightTab === "turnover" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-red-900 text-sm font-medium">
                      Total Terminations
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {insights.turnover.totalTerminations}
                    </div>
                    <div className="text-xs text-red-700 mt-1">
                      {insights.turnover.terminationRate.toFixed(1)}%
                      termination rate
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="text-amber-900 text-sm font-medium">
                      Avg Tenure at Term
                    </div>
                    <div className="text-2xl font-bold text-amber-600">
                      {insights.turnover.avgTenureAtTermination.toFixed(1)}m
                    </div>
                    <div className="text-xs text-amber-700 mt-1">
                      months before leaving
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-purple-900 text-sm font-medium">
                      Cost of Turnover
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(insights.turnover.costOfTurnover / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      in hiring costs
                    </div>
                  </div>
                </div>

                {/* Top Termination Reasons */}
                {insights.turnover.topTerminationReasons.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      Top Termination Reasons
                    </h5>
                    <div className="space-y-2">
                      {insights.turnover.topTerminationReasons.map(
                        (reason, index) => (
                          <div key={index} className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-red-500 h-full rounded-full"
                                style={{
                                  width: `${
                                    (reason.count /
                                      insights.turnover.totalTerminations) *
                                    100
                                  }%`,
                                }}
                              />
                              <span className="absolute left-2 top-0 text-xs leading-6 text-gray-700">
                                {reason.reason}
                              </span>
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-600 w-12 text-right">
                              {reason.count}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* At-Risk Employees */}
                {insights.turnover.riskEmployees.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">
                      At-Risk Employees (
                      {insights.turnover.riskEmployees.length})
                    </h5>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800 mb-2">
                        New agents with less than 3 months tenure who may need
                        additional support:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {insights.turnover.riskEmployees.map((emp) => (
                          <span
                            key={emp.id}
                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs"
                          >
                            {emp.name} ({emp.site})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compensation Tab */}
            {activeInsightTab === "compensation" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-green-900 text-sm font-medium">
                      Total Annual Salary
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      $
                      {(
                        insights.compensation.totalAnnualSalary / 1000000
                      ).toFixed(2)}
                      M
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-blue-900 text-sm font-medium">
                      Projected Commission
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      $
                      {(
                        insights.compensation.totalProjectedCommission / 1000
                      ).toFixed(0)}
                      k
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-purple-900 text-sm font-medium">
                      Next Quarter Cost
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      $
                      {(
                        insights.compensation.projectedNextQuarter / 1000000
                      ).toFixed(2)}
                      M
                    </div>
                  </div>
                </div>

                {/* Average Salary by Role */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">
                    Average Salary by Role
                  </h5>
                  <div className="space-y-2">
                    {Object.entries(insights.compensation.avgSalaryByRole)
                      .filter(([_, salary]) => salary > 0)
                      .map(([role, salary]) => (
                        <div
                          key={role}
                          className="flex justify-between items-center bg-gray-50 rounded px-3 py-2"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {role}
                          </span>
                          <span className="font-mono text-sm">
                            ${salary.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Cost Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-2">
                      Cost per Agent
                    </h6>
                    <div className="text-xl font-bold text-gray-700">
                      ${insights.compensation.costPerAgent.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Including projected commission
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-2">
                      Veteran Premium
                    </h6>
                    <div
                      className={`text-xl font-bold ${
                        insights.compensation.veteranPremium > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      $
                      {Math.abs(
                        insights.compensation.veteranPremium
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {insights.compensation.veteranPremium > 0
                        ? "Additional"
                        : "Savings"}{" "}
                      per veteran agent
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Growth Tab */}
            {activeInsightTab === "growth" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-blue-900 text-sm font-medium">
                      Monthly Growth Rate
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      +{insights.growth.monthlyGrowthRate.toFixed(1)}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      employees per month
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-green-900 text-sm font-medium">
                      Projected Headcount
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(insights.growth.projectedHeadcount)}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      in 3 months
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-purple-900 text-sm font-medium">
                      Manager Ratio
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {insights.growth.managerToAgentRatio.toFixed(1)}:1
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      agents per manager
                    </div>
                  </div>
                </div>

                {/* Expansion Readiness */}
                <div
                  className={`rounded-lg p-4 ${
                    insights.growth.expansionReadiness
                      ? "bg-green-50"
                      : "bg-amber-50"
                  }`}
                >
                  <h5
                    className={`font-medium mb-2 ${
                      insights.growth.expansionReadiness
                        ? "text-green-900"
                        : "text-amber-900"
                    }`}
                  >
                    Expansion Readiness:{" "}
                    {insights.growth.expansionReadiness ? "Ready" : "Not Ready"}
                  </h5>
                  {insights.growth.bottlenecks.length > 0 ? (
                    <div className="space-y-1">
                      {insights.growth.bottlenecks.map((bottleneck, index) => (
                        <div
                          key={index}
                          className="text-sm text-amber-700 flex items-start"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                          {bottleneck}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-700">
                      All systems operating within optimal parameters. Ready for
                      expansion.
                    </p>
                  )}
                </div>

                {/* Capacity Analysis */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h6 className="font-medium text-gray-900 mb-2">
                    Capacity Analysis
                  </h6>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Capacity</span>
                      <span className="font-medium">
                        {insights.growth.optimalTeamSize} agents
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Utilization</span>
                      <span
                        className={`font-medium ${
                          filteredEmployees.filter(
                            (e) => e.role === "Agent" && e.status === "active"
                          ).length /
                            insights.growth.optimalTeamSize >
                          0.9
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {(
                          (filteredEmployees.filter(
                            (e) => e.role === "Agent" && e.status === "active"
                          ).length /
                            insights.growth.optimalTeamSize) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            {insights.recommendations.length > 0 && (
              <div className="mt-6 bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                  <LightBulbIcon className="w-5 h-5 mr-2" />
                  Actionable Recommendations
                </h4>
                <div className="space-y-2">
                  {insights.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="ml-3 text-sm text-purple-800">
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
