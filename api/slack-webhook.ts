import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { webhookUrl, message } = req.body;

    if (!webhookUrl || !message) {
      return res.status(400).json({
        error: "Missing required fields: webhookUrl and message",
      });
    }

    // Validate webhook URL is a Slack webhook
    if (!webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      return res.status(400).json({
        error: "Invalid Slack webhook URL",
      });
    }

    // Forward the request to Slack
    const slackResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    // Check if Slack accepted the webhook
    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error("Slack webhook error:", errorText);

      // Common Slack errors
      if (slackResponse.status === 404) {
        return res.status(404).json({
          error: "Webhook not found. Please check your webhook URL.",
        });
      } else if (slackResponse.status === 400) {
        return res.status(400).json({
          error: "Invalid payload. Please check your message format.",
        });
      } else if (slackResponse.status === 403) {
        return res.status(403).json({
          error: "Webhook is invalid or has been disabled.",
        });
      }

      return res.status(slackResponse.status).json({
        error: `Slack returned error: ${errorText}`,
      });
    }

    // Success! Slack webhooks typically return 'ok' as plain text
    const responseText = await slackResponse.text();
    return res.status(200).json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error("Webhook proxy error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
