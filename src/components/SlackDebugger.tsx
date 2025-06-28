import React, { useState } from "react";

export const SlackDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApiEndpoint = async () => {
    setLoading(true);
    try {
      // First test if the API endpoint is reachable
      const testResponse = await fetch("/api/test-slack", {
        method: "GET",
      });

      if (!testResponse.ok) {
        throw new Error(`Test endpoint returned ${testResponse.status}`);
      }

      const testData = await testResponse.json();
      console.log("Test endpoint response:", testData);

      // Now test POST
      const postResponse = await fetch("/api/test-slack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: "data",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!postResponse.ok) {
        throw new Error(`POST test returned ${postResponse.status}`);
      }

      const postData = await postResponse.json();

      setTestResults({
        get: testData,
        post: postData,
        success: true,
      });
    } catch (error) {
      console.error("API test error:", error);
      setTestResults({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const testSlackProxy = async () => {
    setLoading(true);
    try {
      const webhookUrl = localStorage.getItem("dragon_drop_slack_webhook");
      if (!webhookUrl) {
        throw new Error("No Slack webhook URL configured");
      }

      const response = await fetch("/api/slack-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          message: {
            text: "🧪 Debug test from Dragon Drop",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `🧪 *Debug Test*\n\nTimestamp: ${new Date().toISOString()}`,
                },
              },
            ],
          },
        }),
      });

      const responseText = await response.text();
      console.log("Slack proxy raw response:", responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawText: responseText };
      }

      setTestResults({
        status: response.status,
        ok: response.ok,
        data: responseData,
        success: response.ok,
      });
    } catch (error) {
      console.error("Slack proxy test error:", error);
      setTestResults({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        margin: "20px",
      }}
    >
      <h3>Slack API Debugger</h3>

      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={testApiEndpoint}
          disabled={loading}
          style={{ marginRight: "10px", padding: "10px 20px" }}
        >
          Test API Endpoint
        </button>

        <button
          onClick={testSlackProxy}
          disabled={loading}
          style={{ padding: "10px 20px" }}
        >
          Test Slack Proxy
        </button>
      </div>

      {loading && <p>Testing...</p>}

      {testResults && (
        <pre
          style={{
            backgroundColor: testResults.success ? "#e8f5e9" : "#ffebee",
            padding: "10px",
            borderRadius: "4px",
            overflow: "auto",
            maxHeight: "400px",
          }}
        >
          {JSON.stringify(testResults, null, 2)}
        </pre>
      )}
    </div>
  );
};
