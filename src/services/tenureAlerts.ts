import { Employee, Site } from "../types";
import { externalIntegrationsService } from "./externalIntegrations";
import { EmployeeService } from "./firebase";

export interface TenureAlert {
  employee: Employee;
  daysUntilEligible: number;
  eligibilityDate: Date;
  currentTier: "new" | "veteran";
  alertType: "upcoming" | "imminent" | "overdue";
  message: string;
}

export class TenureAlertService {
  private readonly SIX_MONTHS_IN_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
  private readonly SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
  private readonly ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

  /**
   * Calculate days until an employee reaches 6-month tenure
   */
  private calculateDaysUntilSixMonths(startDate: number): number {
    const now = Date.now();
    const sixMonthDate = startDate + this.SIX_MONTHS_IN_MS;
    const msUntilSixMonths = sixMonthDate - now;
    return Math.ceil(msUntilSixMonths / this.ONE_DAY_IN_MS);
  }

  /**
   * Get all employees approaching their 6-month tenure milestone
   */
  async getUpcomingTenureAlerts(site?: Site): Promise<TenureAlert[]> {
    try {
      // Get all employees
      const employees = site
        ? await EmployeeService.getBySite(site)
        : await EmployeeService.getAll();

      const alerts: TenureAlert[] = [];

      for (const employee of employees) {
        // Only check active agents with 'new' commission tier
        if (
          employee.status === "active" &&
          employee.role === "Agent" &&
          employee.commissionTier === "new"
        ) {
          const daysUntilEligible = this.calculateDaysUntilSixMonths(
            employee.startDate
          );
          const eligibilityDate = new Date(
            employee.startDate + this.SIX_MONTHS_IN_MS
          );

          // Create alerts for different timeframes
          if (daysUntilEligible <= 7 && daysUntilEligible > 1) {
            alerts.push({
              employee,
              daysUntilEligible,
              eligibilityDate,
              currentTier: "new",
              alertType: "upcoming",
              message: `${employee.name} will be eligible for veteran tier in ${daysUntilEligible} days`,
            });
          } else if (daysUntilEligible === 1) {
            alerts.push({
              employee,
              daysUntilEligible,
              eligibilityDate,
              currentTier: "new",
              alertType: "imminent",
              message: `🚨 ${employee.name} will be eligible for veteran tier TOMORROW!`,
            });
          } else if (daysUntilEligible <= 0) {
            alerts.push({
              employee,
              daysUntilEligible: Math.abs(daysUntilEligible),
              eligibilityDate,
              currentTier: "new",
              alertType: "overdue",
              message: `⚠️ ${employee.name} is ${Math.abs(
                daysUntilEligible
              )} days OVERDUE for veteran tier promotion!`,
            });
          }
        }
      }

      return alerts.sort((a, b) => a.daysUntilEligible - b.daysUntilEligible);
    } catch (error) {
      console.error("Error getting tenure alerts:", error);
      return [];
    }
  }

  /**
   * Send tenure alerts via Slack
   */
  async sendTenureAlerts(alerts: TenureAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    // Group alerts by type
    const imminentAlerts = alerts.filter((a) => a.alertType === "imminent");
    const upcomingAlerts = alerts.filter((a) => a.alertType === "upcoming");
    const overdueAlerts = alerts.filter((a) => a.alertType === "overdue");

    // Create Slack message blocks
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📊 Commission Tier Eligibility Alerts",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${alerts.length} employees* approaching or past their 6-month tenure milestone for veteran tier eligibility.`,
        },
      },
    ];

    // Add overdue alerts first (highest priority)
    if (overdueAlerts.length > 0) {
      blocks.push({
        type: "divider",
      });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🔴 *OVERDUE FOR PROMOTION*",
        },
      });

      overdueAlerts.forEach((alert) => {
        blocks.push({
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Employee:* ${alert.employee.name}`,
            },
            {
              type: "mrkdwn",
              text: `*Days Overdue:* ${alert.daysUntilEligible}`,
            },
            {
              type: "mrkdwn",
              text: `*Site:* ${alert.employee.site}`,
            },
            {
              type: "mrkdwn",
              text: `*Start Date:* ${new Date(
                alert.employee.startDate
              ).toLocaleDateString()}`,
            },
          ],
        });
      });
    }

    // Add imminent alerts (tomorrow)
    if (imminentAlerts.length > 0) {
      blocks.push({
        type: "divider",
      });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🟡 *ELIGIBLE TOMORROW*",
        },
      });

      imminentAlerts.forEach((alert) => {
        blocks.push({
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Employee:* ${alert.employee.name}`,
            },
            {
              type: "mrkdwn",
              text: `*Eligibility Date:* ${alert.eligibilityDate.toLocaleDateString()}`,
            },
            {
              type: "mrkdwn",
              text: `*Site:* ${alert.employee.site}`,
            },
            {
              type: "mrkdwn",
              text: `*Current Comp:* $60k + 5%`,
            },
          ],
        });
      });
    }

    // Add upcoming alerts (within 7 days)
    if (upcomingAlerts.length > 0) {
      blocks.push({
        type: "divider",
      });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🟢 *UPCOMING THIS WEEK*",
        },
      });

      upcomingAlerts.forEach((alert) => {
        blocks.push({
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Employee:* ${alert.employee.name}`,
            },
            {
              type: "mrkdwn",
              text: `*Days Until Eligible:* ${alert.daysUntilEligible}`,
            },
            {
              type: "mrkdwn",
              text: `*Site:* ${alert.employee.site}`,
            },
            {
              type: "mrkdwn",
              text: `*Eligibility Date:* ${alert.eligibilityDate.toLocaleDateString()}`,
            },
          ],
        });
      });
    }

    // Add action reminder
    blocks.push({
      type: "divider",
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "💡 *Action Required:* Review these employees and update their commission tier from *$60k + 5%* to *$30k + 20%* when eligible.",
      },
    });

    // Add context
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated on ${new Date().toLocaleString()} | Dragon Drop Tenure Alert System`,
        },
      ],
    });

    // Send to Slack
    try {
      await externalIntegrationsService.sendToSlack({
        text: `Commission Tier Alert: ${alerts.length} employees need attention`,
        blocks,
      });
    } catch (error) {
      console.error("Failed to send Slack alert:", error);
      throw error;
    }
  }

  /**
   * Check if alerts should be sent (e.g., only on weekdays at specific times)
   */
  shouldSendAlerts(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Only send on weekdays (Mon-Fri) at 9 AM
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour === 9;
  }

  /**
   * Get a summary of all tenure statuses
   */
  async getTenureSummary(site?: Site): Promise<{
    totalNewAgents: number;
    totalVeteranAgents: number;
    upcomingTransitions: number;
    overdueTransitions: number;
  }> {
    try {
      const employees = site
        ? await EmployeeService.getBySite(site)
        : await EmployeeService.getAll();

      let totalNewAgents = 0;
      let totalVeteranAgents = 0;
      let upcomingTransitions = 0;
      let overdueTransitions = 0;

      for (const employee of employees) {
        if (employee.status === "active" && employee.role === "Agent") {
          if (employee.commissionTier === "new") {
            totalNewAgents++;

            const daysUntilEligible = this.calculateDaysUntilSixMonths(
              employee.startDate
            );
            if (daysUntilEligible <= 7 && daysUntilEligible > 0) {
              upcomingTransitions++;
            } else if (daysUntilEligible <= 0) {
              overdueTransitions++;
            }
          } else if (employee.commissionTier === "veteran") {
            totalVeteranAgents++;
          }
        }
      }

      return {
        totalNewAgents,
        totalVeteranAgents,
        upcomingTransitions,
        overdueTransitions,
      };
    } catch (error) {
      console.error("Error getting tenure summary:", error);
      return {
        totalNewAgents: 0,
        totalVeteranAgents: 0,
        upcomingTransitions: 0,
        overdueTransitions: 0,
      };
    }
  }
}

// Export singleton instance
export const tenureAlertService = new TenureAlertService();
