# 🔗 Dragon Drop External Integrations Setup Guide

This guide will help you set up n8n workflows and Slack notifications for your Dragon Drop application.

## 🚀 Quick Setup

### Option 1: Using Environment Variables (Recommended)
Create a `.env` file in your project root:

```bash
# n8n Integration
REACT_APP_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id

# Slack Integration  
REACT_APP_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Optional: API Server URL
REACT_APP_API_BASE_URL=http://localhost:3001/api
```

### Option 2: Using the UI (Easy)
1. Click the **🔗 Integrations** button in the app
2. Enter your webhook URLs directly
3. Test the connections
4. Save your configuration

## 📡 n8n Workflow Setup

### Step 1: Create n8n Workflow
1. Open your n8n instance
2. Create a new workflow
3. Add a **Webhook** trigger node

### Step 2: Configure Webhook Trigger
```json
{
  "httpMethod": "POST",
  "path": "dragon-drop-changes",
  "responseMode": "responseNode"
}
```

### Step 3: Add Processing Nodes
The webhook will receive this data structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "site": "Austin",
  "changeType": "employee_move",
  "employee": {
    "id": "emp-001",
    "name": "John Doe",
    "role": "Agent",
    "site": "Austin",
    "managerId": "mgr-001",
    "managerName": "Jane Smith"
  },
  "change": {
    "description": "John Doe moved to report to Jane Smith",
    "from": "Previous Manager",
    "to": "Jane Smith"
  },
  "metadata": {
    "source": "dragon_drop_app",
    "version": "1.0.0"
  }
}
```

### Step 4: Example n8n Workflow Nodes
- **Webhook Trigger** → **Set Node** (format data) → **HTTP Request** (notify other systems)
- **Webhook Trigger** → **Google Sheets** (log changes)
- **Webhook Trigger** → **Email** (notify HR department)

## 💬 Slack Integration Setup

### Step 1: Create Slack Incoming Webhook
1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Manage** → **Custom Integrations**
3. Click **Incoming Webhooks** → **Add Configuration**
4. Choose your channel (e.g., `#hr-notifications`)
5. Copy the webhook URL

### Step 2: Webhook URL Format
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 3: Test Your Integration
The app will send formatted messages like:
```
🔄 Dragon Drop - Organizational Update

Employee: John Doe
Role: Agent
Site: Austin
Change Type: Employee Move

Description: John Doe moved to report to Jane Smith

📅 Jan 15, 2024 10:30 AM | 🏢 Austin Site | 🤖 Dragon Drop App
```

## 🧪 Testing Your Setup

### Using the Built-in Test Feature
1. Open **🔗 Integrations** in the app
2. Enter your webhook URLs
3. Click **🧪 Test Connection** for each service
4. Verify you receive test messages

### Manual Testing with cURL

**Test n8n:**
```bash
curl -X POST https://jkdbga.app.n8n.cloud/webhook-test/0a20b2a4-df98-4040-9b86-8dd392f6bca6 \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "site": "Test",
    "changeType": "employee_create",
    "employee": {
      "id": "test-001",
      "name": "Test Employee",
      "role": "Agent",
      "site": "Test"
    },
    "change": {
      "description": "Connection test from Dragon Drop"
    },
    "metadata": {
      "source": "dragon_drop_app",
      "version": "1.0.0"
    }
  }'
```

**Test Slack:**
```bash
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🧪 Dragon Drop Connection Test",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "🧪 *Dragon Drop Connection Test*\n\nThis is a test message to verify the Slack integration is working correctly."
        }
      }
    ]
  }'
```

## 🔧 Advanced Configuration

### Custom n8n Workflows

**Example 1: Multi-System Notification**
```
Webhook → Switch (by changeType) → [HR System, Payroll, CRM] → Merge → Response
```

**Example 2: Approval Workflow**
```
Webhook → If (role=Manager) → Slack (approval request) → Wait → Update Database
```

### Custom Slack Channels
Set different channels for different types of changes:
- `#hr-general` - All changes
- `#management-alerts` - Promotions and terminations
- `#payroll-updates` - Commission tier changes

### Error Handling
Both integrations include automatic error handling:
- Connection failures are logged to console
- Non-blocking (app continues to work if webhooks fail)
- Retry logic can be added to n8n workflows

## 🔍 Troubleshooting

### Common Issues

**❌ "n8n webhook URL not configured"**
- Solution: Set `REACT_APP_N8N_WEBHOOK_URL` or use the UI to configure

**❌ "Slack webhook failed with status: 404"**
- Solution: Check your webhook URL is correct and active

**❌ "Connection test failed"**
- Solution: Verify your n8n/Slack instances are accessible from your network

### Debug Mode
Open browser developer tools to see detailed webhook logs:
```javascript
// Enable debug logging
localStorage.setItem('dragon_drop_debug', 'true');
```

## 🎯 Change Types Reference

The system sends different `changeType` values:
- `employee_move` - Employee reassigned to new manager
- `employee_promote` - Employee promoted to new role
- `employee_transfer` - Employee moved between sites
- `employee_terminate` - Employee terminated
- `employee_create` - New employee added
- `bulk_action` - Multiple employees changed at once

## 📈 Analytics & Reporting

### n8n Analytics Ideas
- Track promotion rates by site
- Monitor transfer patterns
- Generate monthly org change reports
- Alert on high turnover

### Slack Bot Integration
Create a Slack bot to:
- Query current org structure
- Request specific employee information
- Approve/reject pending changes
- Generate org charts in Slack

---

## 🆘 Need Help?

1. Check the browser console for detailed error messages
2. Test your webhooks manually with cURL
3. Verify your n8n/Slack configurations
4. Use the built-in test features in the app

Happy integrating! 🚀 