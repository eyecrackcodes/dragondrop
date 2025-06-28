import React, { useState, useEffect } from "react";
import {
  externalIntegrationsService,
  WebhookPayload,
} from "../services/externalIntegrations";
import {
  ChatBubbleOvalLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  PlayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface SlackTestingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  changeType: WebhookPayload["changeType"];
  employee: WebhookPayload["employee"];
  change: WebhookPayload["change"];
}

const testScenarios: TestScenario[] = [
  {
    id: "employee_move",
    name: "Employee Move",
    description: "Test notification when an employee is moved to a new manager",
    changeType: "employee_move",
    employee: {
      id: "test-001",
      name: "John Smith",
      role: "Agent",
      site: "Austin",
      managerId: "mgr-002",
      managerName: "Sarah Johnson",
    },
    change: {
      description:
        "John Smith (Agent) moved to report to Sarah Johnson (Sales Manager)",
      from: "Mike Wilson",
      to: "Sarah Johnson",
    },
  },
  {
    id: "employee_promote",
    name: "Employee Promotion",
    description: "Test notification when an employee gets promoted",
    changeType: "employee_promote",
    employee: {
      id: "test-002",
      name: "Emily Davis",
      role: "Team Lead",
      site: "Charlotte",
    },
    change: {
      description: "Emily Davis promoted from Agent to Team Lead",
      from: "Agent",
      to: "Team Lead",
    },
  },
  {
    id: "employee_transfer",
    name: "Site Transfer",
    description: "Test notification when an employee transfers between sites",
    changeType: "employee_transfer",
    employee: {
      id: "test-003",
      name: "Michael Chen",
      role: "Agent",
      site: "Charlotte",
    },
    change: {
      description: "Michael Chen transferred from Austin to Charlotte site",
      from: "Austin",
      to: "Charlotte",
    },
  },
  {
    id: "employee_terminate",
    name: "Employee Termination",
    description: "Test notification when an employee is terminated",
    changeType: "employee_terminate",
    employee: {
      id: "test-004",
      name: "Robert Brown",
      role: "Agent",
      site: "Austin",
    },
    change: {
      description:
        "Robert Brown (Agent) has been terminated - Voluntary Resignation",
    },
  },
  {
    id: "employee_create",
    name: "New Hire",
    description: "Test notification when a new employee is added",
    changeType: "employee_create",
    employee: {
      id: "test-005",
      name: "Jessica White",
      role: "Agent",
      site: "Austin",
      managerId: "mgr-001",
      managerName: "David Wilson",
    },
    change: {
      description: "New employee Jessica White (Agent) hired at Austin site",
    },
  },
  {
    id: "bulk_action",
    name: "Bulk Action",
    description: "Test notification for bulk operations",
    changeType: "bulk_action",
    employee: {
      id: "bulk-001",
      name: "Multiple Employees",
      role: "Various",
      site: "Austin",
    },
    change: {
      description: "Bulk operation: Updated commission tiers for 5 employees",
    },
  },
];

export const SlackTestingInterface: React.FC<SlackTestingInterfaceProps> = ({
  isOpen,
  onClose,
}) => {
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = () => {
    const stored = localStorage.getItem("dragon_drop_slack_webhook");
    if (stored) {
      setSlackWebhookUrl(stored);
      setIsConfigured(true);
    }

    const status = externalIntegrationsService.getConfigStatus();
    setIsConfigured(status.slackConfigured);
  };

  const handleSaveConfiguration = () => {
    if (slackWebhookUrl.trim()) {
      externalIntegrationsService.setSlackWebhook(slackWebhookUrl.trim());
      setIsConfigured(true);
      alert("✅ Slack webhook URL saved successfully!");
    } else {
      alert("❌ Please enter a valid webhook URL");
    }
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    try {
      const result = await externalIntegrationsService.testConnections();

      if (result.slack) {
        setTestResults({
          ...testResults,
          connection: { success: true, message: "Connection successful!" },
        });
        alert("✅ Slack connection test successful!");
      } else {
        setTestResults({
          ...testResults,
          connection: {
            success: false,
            message:
              result.errors.find((e) => e.includes("Slack")) ||
              "Connection failed",
          },
        });
        alert(`❌ Slack connection test failed: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error("Connection test error:", error);
      alert("❌ Connection test failed with error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestScenario = async (scenario: TestScenario) => {
    setIsTesting({ ...isTesting, [scenario.id]: true });

    try {
      const result = await externalIntegrationsService.notifyChange(
        scenario.changeType,
        scenario.employee,
        scenario.change,
        "Test Site",
        { sendToN8n: false, sendToSlack: true }
      );

      setTestResults({
        ...testResults,
        [scenario.id]: {
          success: !result.errors.length,
          message: result.errors.length
            ? result.errors.join(", ")
            : "Message sent successfully!",
          timestamp: new Date().toLocaleTimeString(),
        },
      });

      if (result.errors.length === 0) {
        alert(`✅ ${scenario.name} test message sent successfully!`);
      } else {
        alert(`❌ ${scenario.name} test failed: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error(`Test scenario ${scenario.id} error:`, error);
      setTestResults({
        ...testResults,
        [scenario.id]: {
          success: false,
          message: "Test failed with error",
          timestamp: new Date().toLocaleTimeString(),
        },
      });
      alert(`❌ ${scenario.name} test failed with error`);
    } finally {
      setIsTesting({ ...isTesting, [scenario.id]: false });
    }
  };

  const handleSendCustomMessage = async () => {
    if (!customMessage.trim()) {
      alert("❌ Please enter a custom message");
      return;
    }

    setIsTesting({ ...isTesting, custom: true });

    try {
      const result = await externalIntegrationsService.sendToSlack({
        text: `🧪 Custom Test Message from Dragon Drop`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🧪 *Custom Test Message*\n\n${customMessage}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 ${new Date().toLocaleString()} | 🤖 Dragon Drop Testing Interface`,
              },
            ],
          },
        ],
      });

      if (result.success) {
        setTestResults({
          ...testResults,
          custom: {
            success: true,
            message: "Custom message sent successfully!",
            timestamp: new Date().toLocaleTimeString(),
          },
        });
        alert("✅ Custom message sent successfully!");
        setCustomMessage("");
      } else {
        alert(`❌ Custom message failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Custom message error:", error);
      alert("❌ Custom message failed with error");
    } finally {
      setIsTesting({ ...isTesting, custom: false });
    }
  };

  const getResultIcon = (result: any) => {
    if (!result) return null;
    return result.success ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center space-x-3">
            <ChatBubbleOvalLeftIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Slack Integration Testing
              </h2>
              <p className="text-gray-600">
                Test and configure Slack notifications for Dragon Drop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CogIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Configuration
              </h3>
              {isConfigured && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Configured
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slack Webhook URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveConfiguration}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Slack incoming webhook URL to enable notifications
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTestConnection}
                  disabled={!isConfigured || isConnecting}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {isConnecting ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                  <span>Test Connection</span>
                </button>

                {testResults.connection && (
                  <div className="flex items-center space-x-2">
                    {getResultIcon(testResults.connection)}
                    <span
                      className={`text-sm ${
                        testResults.connection.success
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {testResults.connection.message}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Scenarios */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Test Scenarios
            </h3>
            <div className="grid gap-4">
              {testScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">
                          {scenario.name}
                        </h4>
                        {testResults[scenario.id] && (
                          <div className="flex items-center space-x-2">
                            {getResultIcon(testResults[scenario.id])}
                            <span className="text-xs text-gray-500">
                              {testResults[scenario.id].timestamp}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {scenario.description}
                      </p>
                      {testResults[scenario.id] && (
                        <p
                          className={`text-xs mt-2 ${
                            testResults[scenario.id].success
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {testResults[scenario.id].message}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleTestScenario(scenario)}
                      disabled={!isConfigured || isTesting[scenario.id]}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
                    >
                      {isTesting[scenario.id] ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                      <span>Test</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Send Custom Message
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your custom test message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSendCustomMessage}
                  disabled={!isConfigured || isTesting.custom}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {isTesting.custom ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChatBubbleOvalLeftIcon className="w-4 h-4" />
                  )}
                  <span>Send Custom Message</span>
                </button>

                {testResults.custom && (
                  <div className="flex items-center space-x-2">
                    {getResultIcon(testResults.custom)}
                    <span
                      className={`text-sm ${
                        testResults.custom.success
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {testResults.custom.message}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">
              📝 Setup Instructions
            </h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Create a Slack app in your workspace</li>
              <li>Enable incoming webhooks for your app</li>
              <li>Copy the webhook URL and paste it above</li>
              <li>Test the connection to verify setup</li>
              <li>Run test scenarios to see different message formats</li>
            </ol>
            <p className="text-xs text-yellow-600 mt-2">
              💡 Need help? Check the Slack API documentation for webhook setup
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
