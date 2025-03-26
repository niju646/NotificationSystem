// scripts/sendEmail.js
import dotenv from "dotenv";
import pkg from "pg";
import { sendEmail } from "../utils/emailSender.js";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const statusPool = new Pool({
  user: process.env.STATUS_DB_USER,
  host: process.env.STATUS_DB_HOST,
  database: process.env.STATUS_DB_NAME,
  password: process.env.STATUS_DB_PASSWORD,
  port: process.env.STATUS_DB_PORT,
});

export const checkAndSendEmails = async () => {
  let notifications = []; // Define notifications outside try block
  try {
    const now = new Date();
    const { rows } = await pool.query(
      "SELECT id, template, groups FROM notification WHERE type = 'email' AND sending_time <= $1 AND sent = FALSE",
      [now]
    );
    notifications = rows; // Assign rows to outer scope

    for (const notification of notifications) {
      const { id, template, groups } = notification;
      const { rows: students } = await pool.query(
        "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );

      const emails = students.map(student => student.email);
      if (emails.length > 0) {
        const recipientData = emails.map(email => ({
          email,
          unsubscribe_link: `${process.env.BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
        }));

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
            <h2 style="color: #007bff;">📚 <b>LMS Notification</b></h2>
            <img src="https://yourwebsite.com/path-to-thumbnail.jpg" alt="LMS Notification" style="width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #333;">${template}</p>
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #555;">
              If you no longer wish to receive these emails, click 
              <a href="${recipientData[0].unsubscribe_link}" style="color: red; text-decoration: none; font-weight: bold;">here</a> 
              to unsubscribe.
            </p>
          </div>
        `;

        // Send email and get initial response
        const initialResponse = await sendEmail(emails, "LMS Notification", htmlContent);
        console.log("Initial Response:", initialResponse);
        console.log(`✅ Emails sent to ${emails.join(", ")} with Message ID: ${initialResponse.messageId}`);

        // Log initial status to status DB
        for (const email of emails) {
          await statusPool.query(
            "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, "email", email, initialResponse.messageId, "sent", new Date()]
          );
        }

        // Simulate updated status (Sendinblue doesn’t support direct polling)
        setTimeout(async () => {
          try {
            const updatedStatus = "sent"; // Placeholder; integrate Sendinblue logs/webhooks for real status
            console.log("Updated Response:", {
              body: template,
              numSegments: "N/A",
              direction: "outbound",
              from: "noreply@yourdomain.com",
              to: emails.join(", "),
              dateUpdated: new Date().toISOString(),
              price: null,
              errorMessage: null,
              uri: null,
              accountSid: null,
              numMedia: "0",
              status: updatedStatus,
              messagingServiceSid: null,
              sid: initialResponse.messageId,
              dateSent: new Date().toISOString(),
              dateCreated: new Date().toISOString(),
              errorCode: null,
              priceUnit: null,
              apiVersion: "N/A",
              subresourceUris: null,
            });
            console.log(`📋 Updated status for emails to ${emails.join(", ")}: ${updatedStatus}`);

            for (const email of emails) {
              await statusPool.query(
                "UPDATE status_logs SET status = $1, date_updated = $2 WHERE notification_id = $3 AND recipient = $4",
                [updatedStatus, new Date(), id, email]
              );
            }
          } catch (error) {
            console.error(`❌ Error simulating updated email status:`, error);
            for (const email of emails) {
              await statusPool.query(
                "UPDATE status_logs SET status = 'failed', date_updated = $1, error_message = $2 WHERE notification_id = $3 AND recipient = $4",
                [new Date(), error.message, id, email]
              );
            }
          }
        }, 5000);

        await pool.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
      }
    }
  } catch (error) {
    console.error("❌ Error processing email notifications:", error);
    for (const notification of notifications) {
      const { id, groups } = notification;
      const { rows: students } = await pool.query(
        "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const email of students.map(s => s.email)) {
        await statusPool.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, "email", email, "failed", new Date(), error.message]
        );
      }
    }
  }
};



// import dotenv from "dotenv";
// import pkg from "pg";
// import { sendEmail } from "../utils/emailSender.js";

// dotenv.config();
// const { Pool } = pkg;

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// // Status DB
// const statusPool = new Pool({
//   user: process.env.STATUS_DB_USER,
//   host: process.env.STATUS_DB_HOST,
//   database: process.env.STATUS_DB_NAME,
//   password: process.env.STATUS_DB_PASSWORD,
//   port: process.env.STATUS_DB_PORT,
// });

// export const checkAndSendEmails = async () => {
//   try {
//     const now = new Date();
//     const { rows: notifications } = await pool.query(
//       "SELECT id, template, groups FROM notification WHERE type = 'email' AND sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications) {
//       const { id, template, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       const emails = students.map(student => student.email);
//       if (emails.length > 0) {
//         const recipientData = emails.map(email => ({
//           email,
//           unsubscribe_link: `${process.env.BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
//         }));

//         const htmlContent = `
//           <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
//             <h2 style="color: #007bff;">📚 <b>LMS Notification</b></h2>
//             <img src="https://yourwebsite.com/path-to-thumbnail.jpg" alt="LMS Notification" style="width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0;">
//             <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
//               <p style="font-size: 16px; color: #333;">${template}</p>
//             </div>
//             <p style="margin-top: 20px; font-size: 14px; color: #555;">
//               If you no longer wish to receive these emails, click 
//               <a href="${recipientData[0].unsubscribe_link}" style="color: red; text-decoration: none; font-weight: bold;">here</a> 
//               to unsubscribe.
//             </p>
//           </div>
//         `;

//         await sendEmail(emails, template, htmlContent);

//         // Log email status to status DB
//         for (const email of emails) {
//           await statusPool.query(
//             "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated) VALUES ($1, $2, $3, $4, $5)",
//             [id, "email", email, "sent", new Date()] // Assuming success; no SID for email
//           );
//         }

//         await pool.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error processing email notifications:", error);
//     // Log failure status for all emails if sendEmail fails
//     for (const notification of notifications) {
//       const { id, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );
//       for (const email of students.map(s => s.email)) {
//         await statusPool.query(
//           "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//           [id, "email", email, "failed", new Date(), error.message]
//         );
//       }
//     }
//   }
// };


// import dotenv from "dotenv";
// import pkg from "pg";
// import { sendEmail } from "../utils/emailSender.js"; 

// dotenv.config();
// const { Pool } = pkg;

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// export const checkAndSendEmails = async () => {
//   try {
//     const now = new Date();
//     const { rows: notifications } = await pool.query(
//       "SELECT id, template, groups FROM notification WHERE type = 'email' AND sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications) {
//       const { id, template, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       const emails = students.map(student => student.email);
//       if (emails.length > 0) {
//         const recipientData = emails.map(email => ({
//           email,
//           unsubscribe_link: `${process.env.BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`
//         }));

//         const htmlContent = `
//           <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
//             <h2 style="color: #007bff;">📚 <b>LMS Notification</b></h2>
            
//             <!-- Thumbnail Image -->
//             <img src="https://yourwebsite.com/path-to-thumbnail.jpg" alt="LMS Notification" style="width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0;">
            
//             <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
//               <p style="font-size: 16px; color: #333;">${template}</p>
//             </div>
            
//             <p style="margin-top: 20px; font-size: 14px; color: #555;">
//               If you no longer wish to receive these emails, click 
//               <a href="${recipientData[0].unsubscribe_link}" style="color: red; text-decoration: none; font-weight: bold;">here</a> 
//               to unsubscribe.
//             </p>
//           </div>
//         `;

//         await sendEmail(emails, template, htmlContent);
//         await pool.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error processing email notifications:", error);
//   }
// };
