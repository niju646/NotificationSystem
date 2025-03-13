
import { checkAndSendNotifications } from "./scripts/sendSMS.js";
import { sendScheduledWhatsApp } from "./scripts/sendWhatsapp.js";

console.log("🚀 Notification system started...");

const runSchedulers = () => {
  console.log("🔄 Running scheduled notifications...");
  checkAndSendNotifications();
  sendScheduledWhatsApp();
};

// Run every 15 minutes
setInterval(runSchedulers, 2 * 60 * 1000);

// Run immediately on startup
runSchedulers();
