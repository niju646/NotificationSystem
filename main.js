


// // main.js
// import { checkAndSendNotifications } from "./scripts/sendSMS.js";
// import { sendScheduledWhatsApp } from "./scripts/sendWhatsapp.js";
// import { checkAndSendEmails } from "./scripts/sendEmail.js";
// import pkg from "pg";
// import dotenv from "dotenv";

// dotenv.config();
// const { Pool } = pkg;

// console.log("🔧 Initializing database pool...");
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// pool.on('connect', () => console.log("✅ Database connected successfully"));
// pool.on('error', (err) => console.error("❌ Database connection error:", err));

// console.log("🚀 Notification system started...");

// // Function to fetch notifications and schedule them precisely
// const scheduleNotifications = async () => {
//   try {
//     console.log("📡 Attempting to fetch notifications...");
//     const now = new Date();
//     console.log(`Current time: ${now.toISOString()}`);
//     const { rows: notifications } = await pool.query(
//       "SELECT id, type, sending_time, template, groups FROM notification WHERE sent = FALSE",
//       []
//     );

//     console.log(`📊 Found ${notifications.length} unsent notifications`);
//     if (notifications.length === 0) {
//       console.log("ℹ️ No unsent notifications found in the database");
//       return;
//     }

//     for (const notification of notifications) {
//       const { id, type, sending_time } = notification;
//       const scheduledTime = new Date(sending_time);
//       const timeDiff = scheduledTime - now;

//       console.log(`Notification ${id} (${type}) scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

//       // Only schedule notifications that are in the future
//       if (timeDiff > 0) {
//         setTimeout(() => {
//           if (type === "sms") {
//             checkAndSendNotifications();
//           } else if (type === "whatsapp") {
//             sendScheduledWhatsApp();
//           } else if (type === "email") {
//             checkAndSendEmails();
//           }
//           console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
//         }, timeDiff);
//         console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
//       } else {
//         console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), skipping...`);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
//   }
// };



// const runSchedulers = () => {
//   console.log("🔄 Checking database for scheduled notifications...");
//   scheduleNotifications();
// };
// setInterval(runSchedulers, 15 * 60 * 1000);
// runSchedulers();



///////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////



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

const scheduleNotifications = async () => {
  try {
    console.log("📡 Attempting to fetch notifications...");
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    const { rows: notifications } = await pool.query(
      `SELECT n.id, nt.type_name AS type, n.sending_time, n.template, n.groups 
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE n.sent = FALSE`,
      []
    );

    console.log(`📊 Found ${notifications.length} unsent notifications`);
    if (notifications.length === 0) {
      console.log("ℹ️ No unsent notifications found in the database");
      return;
    }

    for (const notification of notifications) {
      const { id, type, sending_time, template } = notification;
      const scheduledTime = new Date(sending_time);
      const timeDiff = scheduledTime - now;

      console.log(`Notification ${id} (${type}) with template "${template}" scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

      if (timeDiff <= 0) {
        console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), sending immediately...`);
        if (type === "sms") {
          await checkAndSendNotifications();
        } else if (type === "whatsapp") {
          await sendScheduledWhatsApp();
        } else if (type === "email") {
          await checkAndSendEmails();
        }
        console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
      } else {
        setTimeout(async () => {
          console.log(`⏰ Sending notification ${id} (${type}) at ${new Date().toISOString()}`);
          if (type === "sms") {
            await checkAndSendNotifications();
          } else if (type === "whatsapp") {
            await sendScheduledWhatsApp();
          } else if (type === "email") {
            await checkAndSendEmails();
          }
          console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
        }, timeDiff);
        console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
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

// Run immediately and then every 15 minutes
runSchedulers();
setInterval(runSchedulers, 15 * 60 * 1000);