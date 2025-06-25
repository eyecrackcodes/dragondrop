import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  PencilIcon, 
  XMarkIcon,
  BellIcon,
  ChatBubbleBottomCenterIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface ChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ChangeRecord[];
  onAccept: (notificationSettings: NotificationSettings) => void;
  onContinue: () => void;
  onDiscard: () => void;
}

interface ChangeRecord {
  id: string;
  type: 'move' | 'promote' | 'transfer' | 'terminate' | 'create' | 'edit';
  employeeName: string;
  description: string;
  timestamp: number;
}

interface NotificationSettings {
  sendSlack: boolean;
  sendEmail: boolean;
  recipients: string[];
  includeDetails: boolean;
}

export const ChangeConfirmationModal: React.FC<ChangeConfirmationModalProps> = ({
  isOpen,
  onClose,
  changes,
  onAccept,
  onContinue,
  onDiscard
}) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    sendSlack: true,
    sendEmail: false,
    recipients: [],
    includeDetails: true
  });

  const [recipients, setRecipients] = useState('');

  if (!isOpen) return null;

  const handleAccept = () => {
    const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
    onAccept({
      ...notificationSettings,
      recipients: recipientList
    });
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'move': return '🔄';
      case 'promote': return '⬆️';
      case 'transfer': return '🏢';
      case 'terminate': return '❌';
      case 'create': return '➕';
      case 'edit': return '✏️';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <BellIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Confirm Changes ({changes.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Changes List */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Pending Changes</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {changes.map((change, index) => (
                <div key={change.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl mr-3 mt-0.5">{getChangeIcon(change.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{change.employeeName}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(change.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{change.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <BellIcon className="w-5 h-5 mr-2" />
              Notification Settings
            </h3>
            
            <div className="space-y-3">
              {/* Slack notification */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.sendSlack}
                  onChange={(e) => setNotificationSettings(prev => ({ 
                    ...prev, 
                    sendSlack: e.target.checked 
                  }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <ChatBubbleBottomCenterIcon className="w-5 h-5 ml-3 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Send Slack notification</span>
              </label>

              {/* Email notification */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.sendEmail}
                  onChange={(e) => setNotificationSettings(prev => ({ 
                    ...prev, 
                    sendEmail: e.target.checked 
                  }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <EnvelopeIcon className="w-5 h-5 ml-3 mr-2 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Send email notification</span>
              </label>

              {/* Include details */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.includeDetails}
                  onChange={(e) => setNotificationSettings(prev => ({ 
                    ...prev, 
                    includeDetails: e.target.checked 
                  }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 ml-7">Include detailed change information</span>
              </label>

              {/* Recipients */}
              {(notificationSettings.sendSlack || notificationSettings.sendEmail) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Recipients (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="@john.doe, jane@company.com, #team-channel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For Slack: use @username or #channel. For Email: use email addresses.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Accept & Apply Changes
            </button>
            
            <button
              onClick={onContinue}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <PencilIcon className="w-5 h-5 mr-2" />
              Continue Editing
            </button>
            
            <button
              onClick={onDiscard}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              <XMarkIcon className="w-5 h-5 mr-2" />
              Discard Changes
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Accept & Apply:</strong> Permanently save all changes and send notifications.<br/>
              <strong>Continue Editing:</strong> Keep working on changes without saving.<br/>
              <strong>Discard Changes:</strong> Cancel all pending changes and revert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 