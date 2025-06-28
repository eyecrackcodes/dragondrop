// Cron job endpoint for automated tenure alerts
// This can be triggered by Vercel Cron or external services

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");

  // Verify authorization (add your own secret)
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET || "your-secret-token";

  if (authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Import the tenure alert service
    const { tenureAlertService } = require("../src/services/tenureAlerts");

    // Check if it's the right time to send alerts
    if (!tenureAlertService.shouldSendAlerts()) {
      return res.status(200).json({
        success: true,
        message: "Not scheduled time for alerts",
        nextRun: "Weekdays at 9:00 AM",
      });
    }

    // Get all alerts
    const alerts = await tenureAlertService.getUpcomingTenureAlerts();

    if (alerts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tenure alerts to send",
        checked: new Date().toISOString(),
      });
    }

    // Send alerts to Slack
    await tenureAlertService.sendTenureAlerts(alerts);

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Sent ${alerts.length} tenure alerts`,
      alerts: alerts.map((a) => ({
        employee: a.employee.name,
        type: a.alertType,
        daysUntilEligible: a.daysUntilEligible,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Tenure alerts cron error:", error);
    return res.status(500).json({
      error: "Failed to process tenure alerts",
      details: error.message,
    });
  }
};
