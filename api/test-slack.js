// Simple test endpoint
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "Slack webhook proxy is running",
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "POST") {
    try {
      const fetch = require("node-fetch");

      // Test fetch
      const testResponse = await fetch("https://httpbin.org/status/200");

      return res.status(200).json({
        success: true,
        message: "Test endpoint working",
        requestBody: req.body,
        fetchTest: {
          status: testResponse.status,
          ok: testResponse.ok,
        },
        nodeVersion: process.version,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
