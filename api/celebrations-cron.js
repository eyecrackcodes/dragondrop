const fetch = require("node-fetch");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Check authorization
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET || "your-secret-token";

  if (authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get celebrations channel from environment or request
  const celebrationsChannelId =
    process.env.CELEBRATIONS_CHANNEL_ID || req.query.channelId;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!celebrationsChannelId) {
    return res.status(400).json({
      error: "No celebrations channel configured",
      message:
        "Set CELEBRATIONS_CHANNEL_ID environment variable or pass channelId query parameter",
    });
  }

  if (!slackWebhookUrl) {
    return res.status(400).json({
      error: "No Slack webhook URL configured",
      message: "Set SLACK_WEBHOOK_URL environment variable",
    });
  }

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    // Get all employees from Firebase
    const employeesRef = ref(database, "employees");
    const snapshot = await get(employeesRef);

    const employees = [];
    if (snapshot.exists()) {
      Object.entries(snapshot.val()).forEach(([id, employee]) => {
        if (employee.status === "active") {
          employees.push({ id, ...employee });
        }
      });
    }

    // Get today's date
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Find birthdays and anniversaries
    const birthdays = [];
    const anniversaries = [];

    employees.forEach((employee) => {
      // Check birthdays
      if (employee.birthDate) {
        const birthDate = new Date(employee.birthDate);
        if (
          birthDate.getMonth() + 1 === todayMonth &&
          birthDate.getDate() === todayDay
        ) {
          birthdays.push({
            name: employee.name,
            site: employee.site,
          });
        }
      }

      // Check work anniversaries
      if (employee.startDate) {
        const startDate = new Date(employee.startDate);
        if (
          startDate.getMonth() + 1 === todayMonth &&
          startDate.getDate() === todayDay &&
          startDate.getFullYear() !== today.getFullYear()
        ) {
          const years = today.getFullYear() - startDate.getFullYear();
          anniversaries.push({
            name: employee.name,
            site: employee.site,
            years: years,
          });
        }
      }
    });

    // Build Slack message
    let message = "";

    if (birthdays.length > 0) {
      message += "🎂 *Birthdays Today*\n";
      birthdays.forEach((person) => {
        message += `• Happy Birthday to *${person.name}* (${person.site})! 🎉\n`;
      });
      message += "\n";
    }

    if (anniversaries.length > 0) {
      message += "🎊 *Work Anniversaries Today*\n";
      anniversaries.forEach((person) => {
        const yearText = person.years === 1 ? "year" : "years";
        message += `• Congratulations to *${person.name}* on ${person.years} ${yearText} with the company! 🥳\n`;
      });
    }

    if (message) {
      // Send to Slack directly
      const slackPayload = {
        text: message.trim(),
        channel: celebrationsChannelId,
        username: "Celebrations Bot",
        icon_emoji: ":birthday:",
      };

      const slackResponse = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackPayload),
      });

      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        throw new Error(
          `Slack webhook failed: ${slackResponse.status} - ${errorText}`
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: message
        ? "Celebrations sent successfully"
        : "No celebrations today",
      celebrations: {
        birthdays: birthdays.length,
        anniversaries: anniversaries.length,
        totalEmployees: employees.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Celebrations cron error:", error);
    return res.status(500).json({
      error: "Failed to process celebrations",
      message: error.message,
    });
  }
};
