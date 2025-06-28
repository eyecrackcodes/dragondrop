// Simple Slack webhook proxy for Vercel
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { webhookUrl, message } = req.body;

    // Validate inputs
    if (!webhookUrl || !message) {
      return res.status(400).json({
        error: "Missing required fields: webhookUrl and message",
      });
    }

    // Validate webhook URL
    if (!webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      return res.status(400).json({
        error: "Invalid Slack webhook URL",
      });
    }

    // Use node-fetch
    const fetch = require("node-fetch");

    // Send to Slack
    const slackResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseText = await slackResponse.text();

    if (!slackResponse.ok) {
      console.error("Slack error:", slackResponse.status, responseText);

      if (slackResponse.status === 404) {
        return res.status(404).json({
          error: "Webhook not found. Please check your webhook URL.",
        });
      } else if (slackResponse.status === 400) {
        return res.status(400).json({
          error: "Invalid payload format.",
        });
      } else if (slackResponse.status === 403 || slackResponse.status === 401) {
        return res.status(403).json({
          error: "Webhook is invalid or has been disabled.",
        });
      }

      return res.status(slackResponse.status).json({
        error: `Slack error: ${responseText}`,
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error("Webhook proxy error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
