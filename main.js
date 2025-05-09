


// // // main.js
// // import { checkAndSendNotifications } from "./scripts/sendSMS.js";
// // import { sendScheduledWhatsApp } from "./scripts/sendWhatsapp.js";
// // import { checkAndSendEmails } from "./scripts/sendEmail.js";
// // import pkg from "pg";
// // import dotenv from "dotenv";

// // dotenv.config();
// // const { Pool } = pkg;

// // console.log("🔧 Initializing database pool...");
// // const pool = new Pool({
// //   user: process.env.DB_USER,
// //   host: process.env.DB_HOST,
// //   database: process.env.DB_NAME,
// //   password: process.env.DB_PASSWORD,
// //   port: process.env.DB_PORT,
// // });

// // pool.on('connect', () => console.log("✅ Database connected successfully"));
// // pool.on('error', (err) => console.error("❌ Database connection error:", err));

// // console.log("🚀 Notification system started...");

// // // Function to fetch notifications and schedule them precisely
// // const scheduleNotifications = async () => {
// //   try {
// //     console.log("📡 Attempting to fetch notifications...");
// //     const now = new Date();
// //     console.log(`Current time: ${now.toISOString()}`);
// //     const { rows: notifications } = await pool.query(
// //       "SELECT id, type, sending_time, template, groups FROM notification WHERE sent = FALSE",
// //       []
// //     );

// //     console.log(`📊 Found ${notifications.length} unsent notifications`);
// //     if (notifications.length === 0) {
// //       console.log("ℹ️ No unsent notifications found in the database");
// //       return;
// //     }

// //     for (const notification of notifications) {
// //       const { id, type, sending_time } = notification;
// //       const scheduledTime = new Date(sending_time);
// //       const timeDiff = scheduledTime - now;

// //       console.log(`Notification ${id} (${type}) scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

// //       // Only schedule notifications that are in the future
// //       if (timeDiff > 0) {
// //         setTimeout(() => {
// //           if (type === "sms") {
// //             checkAndSendNotifications();
// //           } else if (type === "whatsapp") {
// //             sendScheduledWhatsApp();
// //           } else if (type === "email") {
// //             checkAndSendEmails();
// //           }
// //           console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
// //         }, timeDiff);
// //         console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
// //       } else {
// //         console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), skipping...`);
// //       }
// //     }
// //   } catch (error) {
// //     console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
// //   }
// // };



// // const runSchedulers = () => {
// //   console.log("🔄 Checking database for scheduled notifications...");
// //   scheduleNotifications();
// // };
// // setInterval(runSchedulers, 15 * 60 * 1000);
// // runSchedulers();



// ///////////////////////////////////////////////////////////////////


// ///////////////////////////////////////////////////////////////////



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

// const scheduleNotifications = async () => {
//   try {
//     console.log("📡 Attempting to fetch notifications...");
//     const now = new Date();
//     console.log(`Current time: ${now.toISOString()}`);
//     const { rows: notifications } = await pool.query(
//       `SELECT n.id, nt.type_name AS type, n.sending_time, n.template, n.groups 
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE n.sent = FALSE`,
//       []
//     );

//     console.log(`📊 Found ${notifications.length} unsent notifications`);
//     if (notifications.length === 0) {
//       console.log("ℹ️ No unsent notifications found in the database");
//       return;
//     }

//     for (const notification of notifications) {
//       const { id, type, sending_time, template } = notification;
//       const scheduledTime = new Date(sending_time);
//       const timeDiff = scheduledTime - now;

//       console.log(`Notification ${id} (${type}) with template "${template}" scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

//       if (timeDiff <= 0) {
//         console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), sending immediately...`);
//         if (type === "sms") {
//           await checkAndSendNotifications();
//         } else if (type === "whatsapp") {
//           await sendScheduledWhatsApp();
//         } else if (type === "email") {
//           await checkAndSendEmails();
//         }
//         console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
//       } else {
//         setTimeout(async () => {
//           console.log(`⏰ Sending notification ${id} (${type}) at ${new Date().toISOString()}`);
//           if (type === "sms") {
//             await checkAndSendNotifications();
//           } else if (type === "whatsapp") {
//             await sendScheduledWhatsApp();
//           } else if (type === "email") {
//             await checkAndSendEmails();
//           }
//           console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
//         }, timeDiff);
//         console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
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

// // Run immediately and then every 15 minutes
// runSchedulers();
// setInterval(runSchedulers, 15 * 60 * 1000);








// //yesterday
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
//   let client; // ADDED: Client for connection management
//   try {
//     client = await pool.connect(); // ADDED: Acquire client
//     console.log("📡 Attempting to fetch notifications...");
//     const now = new Date();
//     console.log(`Current time: ${now.toISOString()}`);
//     const { rows: notifications } = await client.query( // MODIFIED: Updated query, used client
//       `SELECT n.id, nt.type_name AS type, n.sending_time, n.groups, n.webinar_id, n.template_id, n.custom_template_id
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE n.sent = FALSE AND n.sending_time <= $1`, // MODIFIED: Removed n.template, added time buffer
//       [new Date(now.getTime() + 15 * 60 * 1000)] // ADDED: 15-minute buffer
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

//       console.log(`Notification ${id} (${type}) with template_id=${template_id}, custom_template_id=${custom_template_id} scheduled for ${scheduledTime.toISOString()}, time difference: ${timeDiff}ms`);

//       if (timeDiff <= 0) {
//         console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), sending immediately...`);
//         try { // ADDED: Error handling per notification
//           if (type === "sms") {
//             await checkAndSendNotifications(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//           } else if (type === "whatsapp") {
//             await sendScheduledWhatsApp(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//           } else if (type === "email") {
//             await checkAndSendEmails(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//           }
//           console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
//           await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
//         } catch (err) { // ADDED: Handle per-notification errors
//           console.error(`❌ Error sending notification ${id} (${type}):`, err);
//           await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent on error
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
//           try { // ADDED: Error handling for scheduled sends
//             let timeoutClient; // ADDED: Client for timeout
//             try {
//               timeoutClient = await pool.connect(); // ADDED: Acquire client for timeout
//               if (type === "sms") {
//                 await checkAndSendNotifications(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//               } else if (type === "whatsapp") {
//                 await sendScheduledWhatsApp(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//               } else if (type === "email") {
//                 await checkAndSendEmails(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
//               }
//               console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
//               await timeoutClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
//             } finally {
//               if (timeoutClient) timeoutClient.release(); // ADDED: Release client
//             }
//           } catch (err) { // ADDED: Handle errors in timeout
//             console.error(`❌ Error sending scheduled notification ${id} (${type}):`, err);
//             const errorClient = await pool.connect(); // ADDED: Client for error handling
//             try {
//               await errorClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
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
//               errorClient.release(); // ADDED: Release client
//             }
//           }
//         }, timeDiff);
//         console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
//     // ADDED: Log errors to status_logs for failed notifications
//     try {
//       const now = new Date();
//       const { rows: notifications } = await client.query(
//         `SELECT n.id, nt.type_name AS type, n.groups
//          FROM notification n
//          JOIN notification_types nt ON n.type_id = nt.id
//          WHERE n.sent = FALSE AND n.sending_time <= $1`,
//         [new Date(now.getTime() + 15 * 60 * 1000)]
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
//     if (client) client.release(); // ADDED: Release client
//   }
// };

// const runSchedulers = () => {
//   console.log("🔄 Checking database for scheduled notifications...");
//   scheduleNotifications();
// };

// // Run immediately and then every 15 minutes
// runSchedulers();
// setInterval(runSchedulers, 15 * 60 * 1000);






//today
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
  let client; // ADDED: Client for connection management
  try {
    client = await pool.connect(); // ADDED: Acquire client
    console.log("📡 Attempting to fetch notifications...");
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    const { rows: notifications } = await client.query( // MODIFIED: Updated query, used client
      `SELECT n.id, nt.type_name AS type, n.sending_time, n.groups, n.webinar_id, n.template_id, n.custom_template_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE n.sent = FALSE AND n.sending_time <= $1`, // MODIFIED: Removed n.template, added time buffer
      [new Date(now.getTime() + 15 * 60 * 1000)] // ADDED: 15-minute buffer
    );

    console.log(`📊 Found ${notifications.length} unsent notifications`);
    if (notifications.length === 0) {
      console.log("ℹ️ No unsent notifications found in the database");
      return;
    }

    for (const notification of notifications) {
      const { id, type, sending_time, groups, webinar_id, template_id, custom_template_id } = notification;
      const scheduledTime = new Date(sending_time);
      const timeDiff = scheduledTime - now;

      // ADDED: Log template selection
      console.log(
        `Notification ${id} (${type}) scheduled for ${scheduledTime.toISOString()}, ` +
        `time difference: ${timeDiff}ms, ` +
        `using ${custom_template_id ? `custom template (ID: ${custom_template_id})` : `standard template (ID: ${template_id})`}`
      );

      // ADDED: Check if template exists
      if (!custom_template_id && !template_id) {
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
        continue; // Skip to next notification
      }

      if (timeDiff <= 0) {
        console.log(`⏳ Notification ${id} (${type}) is past due (scheduled for ${scheduledTime.toISOString()}), sending immediately...`);
        try { // ADDED: Error handling per notification
          if (type === "sms") {
            await checkAndSendNotifications(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
          } else if (type === "whatsapp") {
            await sendScheduledWhatsApp(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
          } else if (type === "email") {
            await checkAndSendEmails(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
          }
          console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
          await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
        } catch (err) { // ADDED: Handle per-notification errors
          console.error(`❌ Error sending notification ${id} (${type}):`, err);
          await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent on error
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
          console.log(`⏰ Sending notification ${id} (${type}) at ${new Date().toISOString()}`);
          try { // ADDED: Error handling for scheduled sends
            let timeoutClient; // ADDED: Client for timeout
            try {
              timeoutClient = await pool.connect(); // ADDED: Acquire client for timeout
              if (type === "sms") {
                await checkAndSendNotifications(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
              } else if (type === "whatsapp") {
                await sendScheduledWhatsApp(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
              } else if (type === "email") {
                await checkAndSendEmails(id, groups, webinar_id, template_id, custom_template_id); // MODIFIED: Pass specific params
              }
              console.log(`✅ Notification ${id} (${type}) sent at ${new Date().toISOString()}`);
              await timeoutClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
            } finally {
              if (timeoutClient) timeoutClient.release(); // ADDED: Release client
            }
          } catch (err) { // ADDED: Handle errors in timeout
            console.error(`❌ Error sending scheduled notification ${id} (${type}):`, err);
            const errorClient = await pool.connect(); // ADDED: Client for error handling
            try {
              await errorClient.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]); // ADDED: Mark as sent
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
              errorClient.release(); // ADDED: Release client
            }
          }
        }, timeDiff);
        console.log(`⏰ Scheduled ${type} notification (ID: ${id}) for ${scheduledTime.toISOString()}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in scheduleNotifications:", error.message, error.stack);
    // ADDED: Log errors to status_logs for failed notifications
    try {
      const now = new Date();
      const { rows: notifications } = await client.query(
        `SELECT n.id, nt.type_name AS type, n.groups
         FROM notification n
         JOIN notification_types nt ON n.type_id = nt.id
         WHERE n.sent = FALSE AND n.sending_time <= $1`,
        [new Date(now.getTime() + 15 * 60 * 1000)]
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
    if (client) client.release(); // ADDED: Release client
  }
};

const runSchedulers = () => {
  console.log("🔄 Checking database for scheduled notifications...");
  scheduleNotifications();
};

// Run immediately and then every 15 minutes
runSchedulers();
setInterval(runSchedulers, 15 * 60 * 1000);