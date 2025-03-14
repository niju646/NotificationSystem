// main.js
import { checkAndSendNotifications } from "./scripts/sendSMS.js";
import { sendScheduledWhatsApp } from "./scripts/sendWhatsapp.js";
import { checkAndSendEmails } from "./scripts/sendEmail.js";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

console.log("🔧 Initializing database pool...");
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => console.log("✅ Database connected successfully"));
pool.on('error', (err) => console.error("❌ Database connection error:", err));

console.log("🚀 Notification system started...");

// Function to fetch notifications and schedule them precisely
const scheduleNotifications = async () => {
  try {
    console.log("📡 Attempting to fetch notifications...");
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    const { rows: notifications } = await pool.query(
      "SELECT id, type, sending_time, template, groups FROM notification WHERE sent = FALSE",
      []
    );

    console.log(`📊 Found ${notifications.length} unsent notifications`);
    if (notifications.length === 0) {
      console.log("ℹ️ No unsent notifications found in the database");
      return;
    }

    for (const notification of notifications) {
      const { id, type, sending_time } = notification;
      const scheduledTime = new Date(sending_time);
      const timeDiff = scheduledTime - now;

      console.log(`Notification ${id} (${type}) scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

      // Only schedule notifications that are in the future
      if (timeDiff > 0) {
        setTimeout(() => {
          if (type === "sms") {
            checkAndSendNotifications();
          } else if (type === "whatsapp") {
            sendScheduledWhatsApp();
          } else if (type === "email") {
            checkAndSendEmails();
          }
          console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
        }, timeDiff);
        console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
      } else {
        console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), skipping...`);
      }
    }
  } catch (error) {
    console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
  }
};

const runSchedulers = () => {
  console.log("🔄 Checking database for scheduled notifications...");
  scheduleNotifications();
};

// Run every 15 minutes
setInterval(runSchedulers, 15 * 60 * 1000);

// Run immediately on startup
runSchedulers();

// import { checkAndSendNotifications } from "./scripts/sendSMS.js";
// import { sendScheduledWhatsApp } from "./scripts/sendWhatsapp.js";
// import {checkAndSendEmails} from "./scripts/sendEmail.js";

// console.log("🚀 Notification system started...");

// const runSchedulers = () => {
//   console.log("🔄 Running scheduled notifications...");
//   checkAndSendNotifications();
//   sendScheduledWhatsApp();
//   checkAndSendEmails();
// };

// // Run every 15 minutes
// setInterval(runSchedulers, 2 * 60 * 1000);

// // Run immediately on startup
// runSchedulers();
