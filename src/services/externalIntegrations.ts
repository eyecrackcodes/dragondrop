interface WebhookPayload {
  timestamp: string;
  site: string;
  changeType:
    | "employee_move"
    | "employee_promote"
    | "employee_transfer"
    | "employee_terminate"
    | "employee_create"
    | "bulk_action";
  employee: {
    id: string;
    name: string;
    role: string;
    site: string;
    managerId?: string;
    managerName?: string;
  };
  change: {
    description: string;
    from?: string;
    to?: string;
  };
  metadata: {
    userId?: string;
    source: "dragon_drop_app";
    version: "1.0.0";
  };
}

interface SlackMessage {
  text: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
    elements?: Array<{
      type: string;
      text: string;
    }>;
  }>;
  channel?: string;
}

class ExternalIntegrationsService {
  private n8nWebhookUrl: string | null;
  private slackWebhookUrl: string | null;
  private apiBaseUrl: string | null;

  constructor() {
    // These can be set via environment variables or config
    this.n8nWebhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || null;
    this.slackWebhookUrl = process.env.REACT_APP_SLACK_WEBHOOK_URL || null;
    this.apiBaseUrl =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api";
  }

  // Configure webhook URLs at runtime
  setN8nWebhook(url: string): void {
    this.n8nWebhookUrl = url;
    localStorage.setItem("dragon_drop_n8n_webhook", url);
  }

  setSlackWebhook(url: string): void {
    this.slackWebhookUrl = url;
    localStorage.setItem("dragon_drop_slack_webhook", url);
  }

  // Load URLs from localStorage if not in env
  private loadStoredUrls(): void {
    if (!this.n8nWebhookUrl) {
      this.n8nWebhookUrl = localStorage.getItem("dragon_drop_n8n_webhook");
    }
    if (!this.slackWebhookUrl) {
      this.slackWebhookUrl = localStorage.getItem("dragon_drop_slack_webhook");
    }
  }

  // Send data to n8n workflow
  async sendToN8n(
    payload: WebhookPayload
  ): Promise<{ success: boolean; error?: string }> {
    this.loadStoredUrls();

    if (!this.n8nWebhookUrl) {
      console.warn("🔗 n8n webhook URL not configured");
      return { success: false, error: "n8n webhook URL not configured" };
    }

    try {
      console.log("🚀 Sending to n8n:", payload);

      const response = await fetch(this.n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed with status: ${response.status}`);
      }

      const result = await response.json().catch(() => ({ success: true }));
      console.log("✅ n8n response:", result);

      return { success: true };
    } catch (error) {
      console.error("❌ n8n webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send message to Slack
  async sendToSlack(
    message: SlackMessage
  ): Promise<{ success: boolean; error?: string }> {
    this.loadStoredUrls();

    if (!this.slackWebhookUrl) {
      console.warn("💬 Slack webhook URL not configured");
      return { success: false, error: "Slack webhook URL not configured" };
    }

    try {
      console.log("💬 Sending to Slack:", message);

      // Check if we're in production (Vercel) or development
      const isProduction = window.location.hostname !== "localhost";

      if (isProduction) {
        // Use the proxy endpoint in production to avoid CORS
        const response = await fetch("/api/slack-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhookUrl: this.slackWebhookUrl,
            message: message,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("Slack proxy error response:", errorData);
          throw new Error(
            errorData.error ||
              errorData.details ||
              `Proxy failed with status: ${response.status}`
          );
        }

        const result = await response.json();
        console.log("✅ Slack message sent successfully via proxy");
        return { success: true };
      } else {
        // In development, try direct call (may fail due to CORS)
        const response = await fetch(this.slackWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          throw new Error(
            `Slack webhook failed with status: ${response.status}`
          );
        }

        console.log("✅ Slack message sent successfully");
        return { success: true };
      }
    } catch (error) {
      console.error("❌ Slack webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Create formatted Slack message for organizational changes
  createSlackMessage(payload: WebhookPayload): SlackMessage {
    const emoji = this.getChangeEmoji(payload.changeType);
    const color = this.getChangeColor(payload.changeType);

    return {
      text: `${emoji} Organizational Change: ${payload.change.description}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} Dragon Drop - Organizational Update`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Employee:* ${payload.employee.name}`,
            },
            {
              type: "mrkdwn",
              text: `*Role:* ${payload.employee.role}`,
            },
            {
              type: "mrkdwn",
              text: `*Site:* ${payload.employee.site}`,
            },
            {
              type: "mrkdwn",
              text: `*Change Type:* ${this.formatChangeType(
                payload.changeType
              )}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:* ${payload.change.description}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date(payload.timestamp).toLocaleString()} | 🏢 ${
                payload.site
              } Site | 🤖 Dragon Drop App`,
            },
          ],
        },
      ],
    };
  }

  // Send organizational change to both n8n and Slack
  async notifyChange(
    changeType: WebhookPayload["changeType"],
    employee: WebhookPayload["employee"],
    change: WebhookPayload["change"],
    site: string,
    options: { sendToN8n?: boolean; sendToSlack?: boolean } = {
      sendToN8n: true,
      sendToSlack: true,
    }
  ): Promise<{ n8nResult?: any; slackResult?: any; errors: string[] }> {
    const payload: WebhookPayload = {
      timestamp: new Date().toISOString(),
      site,
      changeType,
      employee,
      change,
      metadata: {
        source: "dragon_drop_app",
        version: "1.0.0",
      },
    };

    const results: { n8nResult?: any; slackResult?: any; errors: string[] } = {
      errors: [],
    };

    // Send to n8n
    if (options.sendToN8n) {
      results.n8nResult = await this.sendToN8n(payload);
      if (!results.n8nResult.success) {
        results.errors.push(`n8n: ${results.n8nResult.error}`);
      }
    }

    // Send to Slack
    if (options.sendToSlack) {
      const slackMessage = this.createSlackMessage(payload);
      results.slackResult = await this.sendToSlack(slackMessage);
      if (!results.slackResult.success) {
        results.errors.push(`Slack: ${results.slackResult.error}`);
      }
    }

    return results;
  }

  // Helper methods
  private getChangeEmoji(changeType: WebhookPayload["changeType"]): string {
    switch (changeType) {
      case "employee_move":
        return "🔄";
      case "employee_promote":
        return "⬆️";
      case "employee_transfer":
        return "🏢";
      case "employee_terminate":
        return "❌";
      case "employee_create":
        return "✅";
      case "bulk_action":
        return "📦";
      default:
        return "📝";
    }
  }

  private getChangeColor(changeType: WebhookPayload["changeType"]): string {
    switch (changeType) {
      case "employee_move":
        return "#3B82F6"; // Blue
      case "employee_promote":
        return "#10B981"; // Green
      case "employee_transfer":
        return "#8B5CF6"; // Purple
      case "employee_terminate":
        return "#EF4444"; // Red
      case "employee_create":
        return "#059669"; // Emerald
      case "bulk_action":
        return "#F59E0B"; // Amber
      default:
        return "#6B7280"; // Gray
    }
  }

  private formatChangeType(changeType: WebhookPayload["changeType"]): string {
    return changeType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Test connectivity
  async testConnections(): Promise<{
    n8n: boolean;
    slack: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let n8nStatus = false;
    let slackStatus = false;

    // Test n8n
    if (this.n8nWebhookUrl) {
      const testPayload: WebhookPayload = {
        timestamp: new Date().toISOString(),
        site: "Test",
        changeType: "employee_create",
        employee: {
          id: "test-001",
          name: "Test Employee",
          role: "Agent",
          site: "Test",
        },
        change: {
          description: "Connection test from Dragon Drop",
        },
        metadata: {
          source: "dragon_drop_app",
          version: "1.0.0",
        },
      };

      const result = await this.sendToN8n(testPayload);
      n8nStatus = result.success;
      if (!result.success) {
        errors.push(`n8n test failed: ${result.error}`);
      }
    } else {
      errors.push("n8n webhook URL not configured");
    }

    // Test Slack
    if (this.slackWebhookUrl) {
      const testMessage: SlackMessage = {
        text: "🧪 Dragon Drop Connection Test",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "🧪 *Dragon Drop Connection Test*\n\nThis is a test message to verify the Slack integration is working correctly.",
            },
          },
        ],
      };

      const result = await this.sendToSlack(testMessage);
      slackStatus = result.success;
      if (!result.success) {
        errors.push(`Slack test failed: ${result.error}`);
      }
    } else {
      errors.push("Slack webhook URL not configured");
    }

    return { n8n: n8nStatus, slack: slackStatus, errors };
  }

  // Get current configuration status
  getConfigStatus(): { n8nConfigured: boolean; slackConfigured: boolean } {
    this.loadStoredUrls();
    return {
      n8nConfigured: !!this.n8nWebhookUrl,
      slackConfigured: !!this.slackWebhookUrl,
    };
  }
}

// Export singleton instance
export const externalIntegrationsService = new ExternalIntegrationsService();
export type { WebhookPayload, SlackMessage };
