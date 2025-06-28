import { Employee } from "../types";
import { format, isSameDay, addYears, startOfDay, endOfDay } from "date-fns";
import { externalIntegrationsService } from "./externalIntegrations";

export interface CelebrationAlert {
  employee: Employee;
  type: "birthday" | "anniversary";
  date: Date;
  yearsCount?: number; // For anniversaries
  daysUntil: number;
}

export interface CelebrationConfig {
  channelId: string;
  enableBirthdays: boolean;
  enableAnniversaries: boolean;
  advanceNoticeDays: number; // How many days in advance to notify
}

export class CelebrationsService {
  private defaultConfig: CelebrationConfig = {
    channelId: "", // Will be set by user
    enableBirthdays: true,
    enableAnniversaries: true,
    advanceNoticeDays: 0, // Same day notification by default
  };

  /**
   * Get upcoming birthdays and anniversaries
   */
  getUpcomingCelebrations(
    employees: Employee[],
    daysAhead: number = 7
  ): CelebrationAlert[] {
    const alerts: CelebrationAlert[] = [];
    const today = new Date();
    const activeEmployees = employees.filter((emp) => emp.status === "active");

    for (let i = 0; i <= daysAhead; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      // Check birthdays
      const birthdayAlerts = this.checkBirthdays(activeEmployees, checkDate, i);
      alerts.push(...birthdayAlerts);

      // Check anniversaries
      const anniversaryAlerts = this.checkAnniversaries(
        activeEmployees,
        checkDate,
        i
      );
      alerts.push(...anniversaryAlerts);
    }

    return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * Check for birthdays on a specific date
   */
  private checkBirthdays(
    employees: Employee[],
    checkDate: Date,
    daysUntil: number
  ): CelebrationAlert[] {
    return employees
      .filter((emp) => emp.birthDate)
      .filter((emp) => {
        const birthDate = new Date(emp.birthDate!);
        // Compare month and day only (ignore year)
        return (
          birthDate.getMonth() === checkDate.getMonth() &&
          birthDate.getDate() === checkDate.getDate()
        );
      })
      .map((emp) => ({
        employee: emp,
        type: "birthday" as const,
        date: checkDate,
        daysUntil,
      }));
  }

  /**
   * Check for work anniversaries on a specific date
   */
  private checkAnniversaries(
    employees: Employee[],
    checkDate: Date,
    daysUntil: number
  ): CelebrationAlert[] {
    return employees
      .filter((emp) => {
        const startDate = new Date(emp.startDate);
        // Compare month and day only (ignore year)
        return (
          startDate.getMonth() === checkDate.getMonth() &&
          startDate.getDate() === checkDate.getDate() &&
          startDate.getFullYear() !== checkDate.getFullYear() // Not their first day
        );
      })
      .map((emp) => {
        const startDate = new Date(emp.startDate);
        const yearsCount = checkDate.getFullYear() - startDate.getFullYear();
        return {
          employee: emp,
          type: "anniversary" as const,
          date: checkDate,
          yearsCount,
          daysUntil,
        };
      });
  }

  /**
   * Send celebration notifications to Slack
   */
  async sendCelebrationNotifications(
    employees: Employee[],
    config: CelebrationConfig
  ): Promise<{
    success: boolean;
    message: string;
    alerts: CelebrationAlert[];
  }> {
    if (!config.channelId) {
      return {
        success: false,
        message: "No celebration channel configured",
        alerts: [],
      };
    }

    const todayAlerts = this.getUpcomingCelebrations(
      employees,
      config.advanceNoticeDays
    ).filter((alert) => alert.daysUntil === config.advanceNoticeDays);

    if (todayAlerts.length === 0) {
      return {
        success: true,
        message: "No celebrations today",
        alerts: [],
      };
    }

    // Filter based on config
    const filteredAlerts = todayAlerts.filter((alert) => {
      if (alert.type === "birthday" && !config.enableBirthdays) return false;
      if (alert.type === "anniversary" && !config.enableAnniversaries)
        return false;
      return true;
    });

    if (filteredAlerts.length === 0) {
      return {
        success: true,
        message: "No enabled celebrations today",
        alerts: [],
      };
    }

    // Group alerts by type
    const birthdays = filteredAlerts.filter((a) => a.type === "birthday");
    const anniversaries = filteredAlerts.filter(
      (a) => a.type === "anniversary"
    );

    let message = "";

    // Build birthday section
    if (birthdays.length > 0) {
      message += "🎂 *Birthdays Today*\n";
      birthdays.forEach((alert) => {
        message += `• Happy Birthday to *${alert.employee.name}* (${alert.employee.site})! 🎉\n`;
      });
      message += "\n";
    }

    // Build anniversary section
    if (anniversaries.length > 0) {
      message += "🎊 *Work Anniversaries Today*\n";
      anniversaries.forEach((alert) => {
        const yearText = alert.yearsCount === 1 ? "year" : "years";
        message += `• Congratulations to *${alert.employee.name}* on ${alert.yearsCount} ${yearText} with the company! 🥳\n`;
      });
    }

    // Send to Slack
    try {
      const slackMessage = {
        text: message.trim(),
        channel: config.channelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${
                config.advanceNoticeDays === 0 ? "🎉 Today's" : "📅 Upcoming"
              } Celebrations`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message.trim(),
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Sent from Dragon Drop Celebrations Bot | ${format(
                  new Date(),
                  "MMM dd, yyyy"
                )}`,
              },
            ],
          },
        ],
      };

      const result = await externalIntegrationsService.sendToSlack(
        slackMessage
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to send to Slack");
      }

      return {
        success: true,
        message: `Sent ${filteredAlerts.length} celebration notifications`,
        alerts: filteredAlerts,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send notifications: ${error}`,
        alerts: filteredAlerts,
      };
    }
  }

  /**
   * Get celebration summary for dashboard
   */
  getCelebrationSummary(employees: Employee[]): {
    todayBirthdays: CelebrationAlert[];
    todayAnniversaries: CelebrationAlert[];
    upcomingBirthdays: CelebrationAlert[];
    upcomingAnniversaries: CelebrationAlert[];
  } {
    const allCelebrations = this.getUpcomingCelebrations(employees, 30);

    return {
      todayBirthdays: allCelebrations.filter(
        (a) => a.type === "birthday" && a.daysUntil === 0
      ),
      todayAnniversaries: allCelebrations.filter(
        (a) => a.type === "anniversary" && a.daysUntil === 0
      ),
      upcomingBirthdays: allCelebrations.filter(
        (a) => a.type === "birthday" && a.daysUntil > 0 && a.daysUntil <= 7
      ),
      upcomingAnniversaries: allCelebrations.filter(
        (a) => a.type === "anniversary" && a.daysUntil > 0 && a.daysUntil <= 7
      ),
    };
  }

  /**
   * Format celebration message for display
   */
  formatCelebrationMessage(alert: CelebrationAlert): string {
    if (alert.type === "birthday") {
      if (alert.daysUntil === 0) {
        return `🎂 Today is ${alert.employee.name}'s birthday!`;
      } else {
        return `🎂 ${alert.employee.name}'s birthday in ${
          alert.daysUntil
        } days (${format(alert.date, "MMM d")})`;
      }
    } else {
      const yearText = alert.yearsCount === 1 ? "year" : "years";
      if (alert.daysUntil === 0) {
        return `🎊 Today is ${alert.employee.name}'s ${alert.yearsCount} ${yearText} anniversary!`;
      } else {
        return `🎊 ${alert.employee.name}'s ${
          alert.yearsCount
        } ${yearText} anniversary in ${alert.daysUntil} days (${format(
          alert.date,
          "MMM d"
        )})`;
      }
    }
  }
}

// Export singleton instance
export const celebrationsService = new CelebrationsService();
