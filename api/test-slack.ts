import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Test endpoint to verify the API is working
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "Slack webhook proxy is running",
      nodeVersion: process.version,
      hasNativeFetch: typeof fetch !== "undefined",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "POST") {
    try {
      // Log the request body
      console.log(
        "Test endpoint - Request body:",
        JSON.stringify(req.body, null, 2)
      );

      // Test if we can make a simple fetch request
      const testUrl = "https://httpbin.org/status/200";

      let fetchFunction: typeof fetch;
      if (typeof fetch === "undefined") {
        console.log("Native fetch not available, using node-fetch");
        const nodeFetch = await import("node-fetch");
        fetchFunction = nodeFetch.default as any;
      } else {
        console.log("Using native fetch");
        fetchFunction = fetch;
      }

      const testResponse = await fetchFunction(testUrl);
      console.log("Test fetch response status:", testResponse.status);

      return res.status(200).json({
        success: true,
        message: "Test endpoint working",
        requestBody: req.body,
        fetchTest: {
          url: testUrl,
          status: testResponse.status,
          ok: testResponse.ok,
        },
        environment: {
          nodeVersion: process.version,
          hasNativeFetch: typeof fetch !== "undefined",
        },
      });
    } catch (error) {
      console.error("Test endpoint error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
