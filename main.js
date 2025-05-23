


// //main.js
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

// const scheduleNotifications = async () => {
//   let client;
//   try {
//     client = await pool.connect();
//     console.log("📡 Attempting to fetch notifications...");
//     const now = new Date();
//     console.log(`Current time: ${now.toISOString()}`);
//     // Fetch notifications with sending_time >= NOW() - 1 minute
//     const { rows: notifications } = await client.query(
//       `SELECT n.id, nt.type_name AS type, n.sending_time, n.groups, n.webinar_id, n.template_id, n.custom_template_id
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE n.sent = FALSE AND n.sending_time >= $1 AND n.sending_time <= $2`,
//       [new Date(now.getTime() - 60 * 1000), new Date(now.getTime() + 15 * 60 * 1000)]
//     );

//     console.log(`📊 Found ${notifications.length} unsent notifications`);
//     if (notifications.length === 0) {
//       console.log("ℹ️ No unsent notifications found in the database");
//       return;
//     }

//     for (const notification of notifications) {
//       const { id, type, sending_time, groups, webinar_id, template_id, custom_template_id } = notification;
//       const scheduledTime = new Date(sending_time);
//       const timeDiff = scheduledTime - now;

//       // Prioritize custom_template_id, fall back to template_id
//       const selectedTemplateId = custom_template_id || template_id;

//       // MODIFIED: Enhanced logging to clarify template selection and fallback
//       console.log(
//         `Notification ${id} (${type}) scheduled for ${scheduledTime.toISOString()}, ` +
//         `time difference: ${timeDiff}ms, ` +
//         `custom_template_id: ${custom_template_id || 'none'}, ` +
//         `template_id: ${template_id || 'none'}, ` +
//         `selected: ${selectedTemplateId ? (selectedTemplateId === custom_template_id ? `custom (ID: ${custom_template_id})` : `standard (ID: ${template_id})`) : 'none'}`
//       );

//       // Check if a template is selected
//       if (!selectedTemplateId) {
//         console.error(`❌ Notification ${id} has no custom or standard template`);
//         await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//         const { rows: students } = await client.query(
//           "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//           [groups]
//         );
//         for (const student of students) {
//           const recipient = type === "email" ? student.email : student.phone;
//           await client.query(
//             "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//             [id, type, recipient, "failed", new Date(), "No template specified"]
//           );
//         }
//         continue;
//       }

//       // Skip notifications with past sending_time
//       if (timeDiff < 0) {
//         console.log(`⏮️ Notification ${id} (${type}) is in the past (scheduled for ${scheduledTime.toISOString()}), skipping...`);
//         await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//         const { rows: students } = await client.query(
//           "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//           [groups]
//         );
//         for (const student of students) {
//           const recipient = type === "email" ? student.email : student.phone;
//           await client.query(
//             "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//             [id, type, recipient, "failed", new Date(), "Notification is in the past"]
//           );
//         }
//         continue;
//       }

//       if (timeDiff <= 0) {
//         console.log(`⏳ Notification ${id} (${type}) is due now (scheduled for ${scheduledTime.toISOString()}), sending immediately...`);
//         try {
//           if (type === "sms") {
//             await checkAndSendNotifications(id, groups, webinar_id, selectedTemplateId);
//           } else if (type === "whatsapp") {
//             await sendScheduledWhatsApp(id, groups, webinar_id, selectedTemplateId);
//           } else if (type === "email") {
//             await checkAndSendEmails(id, groups, webinar_id, selectedTemplateId);
//           }
//           console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()} with template ID: ${selectedTemplateId}`);
//           await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//         } catch (err) {
//           console.error(`❌ Error sending notification ${id} (${type}):`, err);
//           await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//           const { rows: students } = await client.query(
//             "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//             [groups]
//           );
//           for (const student of students) {
//             const recipient = type === "email" ? student.email : student.phone;
//             await client.query(
//               "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//               [id, type, recipient, "failed", new Date(), err.message]
//             );
//           }
//         }
//       } else {
//         setTimeout(async () => {
//           console.log(`⏰ Sending notification ${id} (${type}) at ${new Date().toISOString()}`);
//           try {
//             let timeoutClient;
//             try {
//               timeoutClient = await pool.connect();
//               if (type === "sms") {
//                 await checkAndSendNotifications(id, groups, webinar_id, selectedTemplateId);
//               } else if (type === "whatsapp") {
//                 await sendScheduledWhatsApp(id, groups, webinar_id, selectedTemplateId);
//               } else if (type === "email") {
//                 await checkAndSendEmails(id, groups, webinar_id, selectedTemplateId);
//               }
//               console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()} with template ID: ${selectedTemplateId}`);
//               await timeoutClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//             } finally {
//               if (timeoutClient) timeoutClient.release();
//             }
//           } catch (err) {
//             console.error(`❌ Error sending scheduled notification ${id} (${type}):`, err);
//             const errorClient = await pool.connect();
//             try {
//               await errorClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//               const { rows: students } = await errorClient.query(
//                 "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//                 [groups]
//               );
//               for (const student of students) {
//                 const recipient = type === "email" ? student.email : student.phone;
//                 await errorClient.query(
//                   "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//                   [id, type, recipient, "failed", new Date(), err.message]
//                 );
//               }
//             } finally {
//               errorClient.release();
//             }
//           }
//         }, timeDiff);
//         console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()} with template ID: ${selectedTemplateId}`);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
//     try {
//       const now = new Date();
//       const { rows: notifications } = await client.query(
//         `SELECT n.id, nt.type_name AS type, n.groups
//          FROM notification n
//          JOIN notification_types nt ON n.type_id = nt.id
//          WHERE n.sent = FALSE AND n.sending_time >= $1 AND n.sending_time <= $2`,
//         [new Date(now.getTime() - 60 * 1000), new Date(now.getTime() + 15 * 60 * 1000)]
//       );
//       for (const notification of notifications) {
//         const { id, type, groups } = notification;
//         await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//         const { rows: students } = await client.query(
//           "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//           [groups]
//         );
//         for (const student of students) {
//           const recipient = type === "email" ? student.email : student.phone;
//           await client.query(
//             "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//             [id, type, recipient, "failed", new Date(), error.message]
//           );
//         }
//       }
//     } catch (err) {
//       console.error("❌ Error logging failed notifications:", err);
//     }
//   } finally {
//     if (client) client.release();
//   }
// };

// const runSchedulers = () => {
//   console.log("🔄 Checking database for scheduled notifications...");
//   scheduleNotifications();
// };

// runSchedulers();
// setInterval(runSchedulers, 15 * 60 * 1000);




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

// Add process exit handlers for graceful shutdown
const gracefulShutdown = async () => {
  console.log("🛑 Shutting down notification system...");
  try {
    await pool.end();
    console.log("✅ Database pool closed successfully");
  } catch (err) {
    console.error("❌ Error closing database pool:", err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

console.log("🚀 Notification system started...");

const scheduleNotifications = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("📡 Attempting to fetch notifications...");
    const now = new Date();
    // Ensure time is in IST (UTC+5:30)
    const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    console.log(`Current time (IST): ${nowIST.toISOString()}`);
    // Fetch notifications with sending_time >= NOW() - 1 minute
    const { rows: notifications } = await client.query(
      `SELECT n.id, nt.type_name AS type, n.sending_time, n.groups, n.webinar_id, n.template_id, n.custom_template_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE n.sent = FALSE AND n.sending_time >= $1 AND n.sending_time <= $2`,
      [new Date(nowIST.getTime() - 60 * 1000), new Date(nowIST.getTime() + 15 * 60 * 1000)]
    );

    console.log(`📊 Found ${notifications.length} unsent notifications`);
    if (notifications.length === 0) {
      console.log("ℹ️ No unsent notifications found in the database");
      return;
    }

    for (const notification of notifications) {
      const { id, type, sending_time, groups, webinar_id, template_id, custom_template_id } = notification;
      const scheduledTime = new Date(sending_time);
      const scheduledTimeIST = new Date(scheduledTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const timeDiff = scheduledTimeIST - nowIST;

      // Prioritize custom_template_id, fall back to template_id
      const selectedTemplateId = custom_template_id || template_id;

      // MODIFIED: Enhanced logging to include whether the notification may include media
      const hasMediaQuery = await client.query(
        `SELECT COALESCE(ct.image, t.image) AS image
         FROM notification n
         LEFT JOIN custom_templates ct ON n.custom_template_id = ct.id
         LEFT JOIN templates t ON n.template_id = t.id
         WHERE n.id = $1`,
        [id]
      );
      const hasMedia = hasMediaQuery.rows[0]?.image ? true : false;

      console.log(
        `Notification ${id} (${type}) scheduled for ${scheduledTimeIST.toISOString()} (IST), ` +
        `time difference: ${timeDiff}ms, ` +
        `custom_template_id: ${custom_template_id || 'none'}, ` +
        `template_id: ${template_id || 'none'}, ` +
        `selected: ${selectedTemplateId ? (selectedTemplateId === custom_template_id ? `custom (ID: ${custom_template_id})` : `standard (ID: ${template_id})`) : 'none'}, ` +
        `includes media: ${hasMedia ? 'yes' : 'no'}`
      );

      // Check if a template is selected
      if (!selectedTemplateId) {
        console.error(`❌ Notification ${id} has no custom or standard template`);
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        const { rows: students } = await client.query(
          "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
          [groups]
        );
        for (const student of students) {
          const recipient = type === "email" ? student.email : student.phone;
          await client.query(
            "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, type, recipient, "failed", new Date(), "No template specified"]
          );
        }
        continue;
      }

      // Skip notifications with past sending_time
      if (timeDiff < 0) {
        console.log(`⏮️ Notification ${id} (${type}) is in the past (scheduled for ${scheduledTimeIST.toISOString()} IST), skipping...`);
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        const { rows: students } = await client.query(
          "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
          [groups]
        );
        for (const student of students) {
          const recipient = type === "email" ? student.email : student.phone;
          await client.query(
            "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, type, recipient, "failed", new Date(), "Notification is in the past"]
          );
        }
        continue;
      }

      if (timeDiff <= 0) {
        console.log(`⏳ Notification ${id} (${type}) is due now (scheduled for ${scheduledTimeIST.toISOString()} IST), sending immediately...`);
        try {
          if (type === "sms") {
            await checkAndSendNotifications(id, groups, webinar_id, selectedTemplateId);
          } else if (type === "whatsapp") {
            await sendScheduledWhatsApp(id, groups, webinar_id, selectedTemplateId);
          } else if (type === "email") {
            await checkAndSendEmails(id, groups, webinar_id, selectedTemplateId);
          }
          console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} (IST) with template ID: ${selectedTemplateId}`);
          await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        } catch (err) {
          console.error(`❌ Error sending notification ${id} (${type}):`, err);
          await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
          const { rows: students } = await client.query(
            "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
            [groups]
          );
          for (const student of students) {
            const recipient = type === "email" ? student.email : student.phone;
            await client.query(
              "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, type, recipient, "failed", new Date(), err.message]
            );
          }
        }
      } else {
        setTimeout(async () => {
          const scheduledNowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
          console.log(`⏰ Sending notification ${id} (${type}) at ${scheduledNowIST.toISOString()} (IST)`);
          try {
            let timeoutClient;
            try {
              timeoutClient = await pool.connect();
              if (type === "sms") {
                await checkAndSendNotifications(id, groups, webinar_id, selectedTemplateId);
              } else if (type === "whatsapp") {
                await sendScheduledWhatsApp(id, groups, webinar_id, selectedTemplateId);
              } else if (type === "email") {
                await checkAndSendEmails(id, groups, webinar_id, selectedTemplateId);
              }
              console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} (IST) with template ID: ${selectedTemplateId}`);
              await timeoutClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
            } finally {
              if (timeoutClient) timeoutClient.release();
            }
          } catch (err) {
            console.error(`❌ Error sending scheduled notification ${id} (${type}):`, err);
            const errorClient = await pool.connect();
            try {
              await errorClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
              const { rows: students } = await errorClient.query(
                "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
                [groups]
              );
              for (const student of students) {
                const recipient = type === "email" ? student.email : student.phone;
                await errorClient.query(
                  "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
                  [id, type, recipient, "failed", new Date(), err.message]
                );
              }
            } finally {
              errorClient.release();
            }
          }
        }, timeDiff);
        console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTimeIST.toISOString()} (IST) with template ID: ${selectedTemplateId}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
    try {
      const now = new Date();
      const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const { rows: notifications } = await client.query(
        `SELECT n.id, nt.type_name AS type, n.groups
         FROM notification n
         JOIN notification_types nt ON n.type_id = nt.id
         WHERE n.sent = FALSE AND n.sending_time >= $1 AND n.sending_time <= $2`,
        [new Date(nowIST.getTime() - 60 * 1000), new Date(nowIST.getTime() + 15 * 60 * 1000)]
      );
      for (const notification of notifications) {
        const { id, type, groups } = notification;
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        const { rows: students } = await client.query(
          "SELECT email, phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
          [groups]
        );
        for (const student of students) {
          const recipient = type === "email" ? student.email : student.phone;
          await client.query(
            "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, type, recipient, "failed", new Date(), error.message]
          );
        }
      }
    } catch (err) {
      console.error("❌ Error logging failed notifications:", err);
    }
  } finally {
    if (client) client.release();
  }
};

const runSchedulers = () => {
  console.log("🔄 Checking database for scheduled notifications...");
  scheduleNotifications();
};

runSchedulers();
setInterval(runSchedulers, 15 * 60 * 1000);