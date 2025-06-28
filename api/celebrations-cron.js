const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Check authorization
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET || "your-secret-token";

  if (authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get celebrations channel from environment or request
  const celebrationsChannelId =
    process.env.CELEBRATIONS_CHANNEL_ID || req.query.channelId;

  if (!celebrationsChannelId) {
    return res.status(400).json({
      error: "No celebrations channel configured",
      message:
        "Set CELEBRATIONS_CHANNEL_ID environment variable or pass channelId query parameter",
    });
  }

  try {
    // In a real implementation, you would:
    // 1. Connect to your database
    // 2. Get all employees with birthdays
    // 3. Check for birthdays and anniversaries today
    // 4. Send notifications to Slack

    // For now, we'll return a mock response
    const mockCelebrations = {
      birthdays: [{ name: "John Doe", site: "Austin" }],
      anniversaries: [{ name: "Jane Smith", site: "Charlotte", years: 2 }],
    };

    // Build Slack message
    let message = "";

    if (mockCelebrations.birthdays.length > 0) {
      message += "🎂 *Birthdays Today*\n";
      mockCelebrations.birthdays.forEach((person) => {
        message += `• Happy Birthday to *${person.name}* (${person.site})! 🎉\n`;
      });
      message += "\n";
    }

    if (mockCelebrations.anniversaries.length > 0) {
      message += "🎊 *Work Anniversaries Today*\n";
      mockCelebrations.anniversaries.forEach((person) => {
        const yearText = person.years === 1 ? "year" : "years";
        message += `• Congratulations to *${person.name}* on ${person.years} ${yearText} with the company! 🥳\n`;
      });
    }

    if (message) {
      // Send to Slack via our webhook proxy
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const slackResponse = await fetch(`${baseUrl}/api/slack-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message.trim(),
          channel: celebrationsChannelId,
          icon_emoji: ":birthday:",
          username: "Celebrations Bot",
        }),
      });

      if (!slackResponse.ok) {
        throw new Error(`Slack webhook failed: ${slackResponse.statusText}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: message
        ? "Celebrations sent successfully"
        : "No celebrations today",
      celebrations: mockCelebrations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Celebrations cron error:", error);
    return res.status(500).json({
      error: "Failed to process celebrations",
      message: error.message,
    });
  }
};
