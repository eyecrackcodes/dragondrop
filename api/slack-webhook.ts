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

    // Log incoming request for debugging
    console.log("Incoming webhook request:", {
      hasWebhookUrl: !!webhookUrl,
      hasMessage: !!message,
      messageType: typeof message,
    });

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

    // Use dynamic import for node-fetch to ensure compatibility
    let fetchFunction: typeof fetch;
    if (typeof fetch === "undefined") {
      const nodeFetch = await import("node-fetch");
      fetchFunction = nodeFetch.default as any;
    } else {
      fetchFunction = fetch;
    }

    // Forward the request to Slack
    const slackResponse = await fetchFunction(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    // Check if Slack accepted the webhook
    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error("Slack webhook error:", {
        status: slackResponse.status,
        errorText,
        webhookUrl: webhookUrl.substring(0, 50) + "...", // Log partial URL for security
      });

      // Common Slack errors
      if (slackResponse.status === 404) {
        return res.status(404).json({
          error: "Webhook not found. Please check your webhook URL.",
        });
      } else if (slackResponse.status === 400) {
        return res.status(400).json({
          error: "Invalid payload. Please check your message format.",
        });
      } else if (slackResponse.status === 403 || slackResponse.status === 401) {
        return res.status(403).json({
          error:
            "Webhook is invalid, expired, or has been disabled. Please create a new webhook in Slack.",
        });
      }

      return res.status(slackResponse.status).json({
        error: `Slack returned error: ${errorText}`,
      });
    }

    // Success! Slack webhooks typically return 'ok' as plain text
    const responseText = await slackResponse.text();
    console.log("Slack webhook success:", responseText);

    return res.status(200).json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error("Webhook proxy error:", error);

    // Provide more detailed error information for debugging
    if (error instanceof Error) {
      return res.status(500).json({
        error: "Internal server error",
        details: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: "An unexpected error occurred",
    });
  }
}
