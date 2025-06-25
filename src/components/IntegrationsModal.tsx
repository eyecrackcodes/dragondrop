import React, { useState, useEffect } from 'react';
import { externalIntegrationsService } from '../services/externalIntegrations';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const [n8nUrl, setN8nUrl] = useState('');
  const [slackUrl, setSlackUrl] = useState('');
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [testResults, setTestResults] = useState<{ n8n?: boolean; slack?: boolean; errors?: string[] }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing URLs
      const n8nStored = localStorage.getItem('dragon_drop_n8n_webhook');
      const slackStored = localStorage.getItem('dragon_drop_slack_webhook');
      setN8nUrl(n8nStored || '');
      setSlackUrl(slackStored || '');
      setTestResults({});
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    
    if (n8nUrl.trim()) {
      externalIntegrationsService.setN8nWebhook(n8nUrl.trim());
    }
    
    if (slackUrl.trim()) {
      externalIntegrationsService.setSlackWebhook(slackUrl.trim());
    }
    
    // Test connections after saving
    const results = await externalIntegrationsService.testConnections();
    setTestResults(results);
    
    setIsSaving(false);
    
    // Show success message
    const configuredCount = (n8nUrl.trim() ? 1 : 0) + (slackUrl.trim() ? 1 : 0);
    if (configuredCount > 0) {
      alert(`✅ Saved ${configuredCount} integration${configuredCount > 1 ? 's' : ''}! Check test results below.`);
    }
  };

  const testN8nConnection = async () => {
    if (!n8nUrl.trim()) {
      alert('⚠️ Please enter an n8n webhook URL first');
      return;
    }
    
    setIsTestingN8n(true);
    
    // Temporarily set URL for testing
    externalIntegrationsService.setN8nWebhook(n8nUrl.trim());
    
    const results = await externalIntegrationsService.testConnections();
    setTestResults(prev => ({ ...prev, n8n: results.n8n, errors: results.errors }));
    
    setIsTestingN8n(false);
    
    if (results.n8n) {
      alert('✅ n8n connection successful!');
    } else {
      alert(`❌ n8n connection failed: ${results.errors.filter(e => e.includes('n8n')).join(', ')}`);
    }
  };

  const testSlackConnection = async () => {
    if (!slackUrl.trim()) {
      alert('⚠️ Please enter a Slack webhook URL first');
      return;
    }
    
    setIsTestingSlack(true);
    
    // Temporarily set URL for testing
    externalIntegrationsService.setSlackWebhook(slackUrl.trim());
    
    const results = await externalIntegrationsService.testConnections();
    setTestResults(prev => ({ ...prev, slack: results.slack, errors: results.errors }));
    
    setIsTestingSlack(false);
    
    if (results.slack) {
      alert('✅ Slack connection successful!');
    } else {
      alert(`❌ Slack connection failed: ${results.errors.filter(e => e.includes('Slack')).join(', ')}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <span className="text-3xl mr-3">🔗</span>
                External Integrations
              </h2>
              <p className="text-indigo-100 mt-1">Configure n8n workflows and Slack notifications</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* n8n Configuration */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">N8</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">n8n Workflow Integration</h3>
                <p className="text-gray-600 text-sm">Send organizational changes to n8n workflows</p>
              </div>
              {testResults.n8n !== undefined && (
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    testResults.n8n ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.n8n ? '✅ Connected' : '❌ Failed'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                n8n Webhook URL
              </label>
              <input
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={testN8nConnection}
                  disabled={isTestingN8n || !n8nUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm flex items-center"
                >
                  {isTestingN8n ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    '🧪 Test Connection'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Slack Configuration */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">#</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Slack Notifications</h3>
                <p className="text-gray-600 text-sm">Send change notifications to Slack channels</p>
              </div>
              {testResults.slack !== undefined && (
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    testResults.slack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.slack ? '✅ Connected' : '❌ Failed'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={testSlackConnection}
                  disabled={isTestingSlack || !slackUrl.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm flex items-center"
                >
                  {isTestingSlack ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    '🧪 Test Connection'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Setup Instructions</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">n8n Webhook Setup:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Create a new workflow in your n8n instance</li>
                  <li>Add a "Webhook" trigger node</li>
                  <li>Configure the webhook to accept POST requests</li>
                  <li>Copy the webhook URL and paste it above</li>
                  <li>Add processing nodes to handle the organizational data</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Slack Webhook Setup:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Go to your Slack workspace settings</li>
                  <li>Create a new Incoming Webhook integration</li>
                  <li>Choose the channel for notifications</li>
                  <li>Copy the webhook URL and paste it above</li>
                  <li>Test the connection to verify it works</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {testResults.errors && testResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">⚠️ Connection Issues:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {testResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-gray-600">
            💡 Webhooks will be triggered on organizational changes
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                '💾 Save Configuration'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 