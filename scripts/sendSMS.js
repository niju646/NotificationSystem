


///////////////////////////////////////////////////////////////////



// // scripts/sendSMS.js ----- orginal
// import twilio from "twilio";
// import dotenv from "dotenv";
// import pkg from "pg";
// import { resolveTemplate } from "./templateHelper.js";

// dotenv.config();
// const { Pool } = pkg;

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// const statusPool = new Pool({
//   user: process.env.STATUS_DB_USER,
//   host: process.env.STATUS_DB_HOST,
//   database: process.env.STATUS_DB_NAME,
//   password: process.env.STATUS_DB_PASSWORD,
//   port: process.env.STATUS_DB_PORT,
// });

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// export const checkAndSendNotifications = async () => {
//   try {
//     const now = new Date();
//     console.log(`Checking for SMS notifications at ${now.toISOString()}...`);
//     const { rows: notifications } = await pool.query(
//       `SELECT n.id, nt.type_name AS type, n.sending_time, n.template, n.groups 
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE nt.type_name = 'sms' AND n.sending_time <= $1 AND n.sent = FALSE`,
//       [now]
//     );

//     console.log(`Found ${notifications.length} SMS notifications to send...`);
//     for (const notification of notifications) {
//       const { id, type, template, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       const phoneNumbers = students.map(student => student.phone);
//       if (phoneNumbers.length > 0 && type === "sms") {
//         console.log(`Sending SMS notification (ID: ${id}) to ${phoneNumbers.length} recipients...`);
//         await sendSMS(phoneNumbers, template, id);
//         await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
//         console.log(`Marked SMS notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
//       } else {
//         console.log(`No eligible recipients found for SMS notification (ID: ${id}). Marking as sent.`);
//         await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
//       }
//     }
//   } catch (error) {
//     console.error(`[${new Date().toISOString()}] Error processing SMS notifications:`, error);
//     const now = new Date();
//     const { rows: notifications } = await pool.query(
//       `SELECT n.id, n.groups 
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE nt.type_name = 'sms' AND n.sending_time <= $1 AND n.sent = FALSE`,
//       [now]
//     );
//     for (const notification of notifications) {
//       const { id, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );
//       for (const phone of students.map(s => s.phone)) {
//         await statusPool.query(
//           "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//           [id, "sms", phone, "failed", new Date(), error.message]
//         );
//       }
//       await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
//     }
//   }
// };

// const sendSMS = async (phoneNumbers, template, notificationId) => {
//   try {
//     for (const phone of phoneNumbers) {
//       const resolvedMessage = await resolveTemplate(notificationId, template, phone);
//       console.log(`Resolved message for SMS to ${phone}: ${resolvedMessage}`);

//       // For real sending, use the Twilio client
//       const initialResponse = await client.messages.create({
//         body: resolvedMessage,
//         from: process.env.TWILIO_PHONE_NUMBER,
//         to: phone,
//       });
//       console.log(`Initial Response for SMS to ${phone}:`, initialResponse);
//       console.log(`✅ SMS sent to ${phone} with SID: ${initialResponse.sid}`);

//       // For mocking (uncomment to mock sending):
//       /*
//       const initialResponse = {
//         sid: `SM${Math.random().toString(36).substring(2, 15)}`,
//         status: "sent",
//         dateCreated: new Date().toISOString(),
//       };
//       console.log(`Mocked SMS sending to ${phone}:`, initialResponse);
//       */

//       await statusPool.query(
//         "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
//         [notificationId, "sms", phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
//       );

//       setTimeout(async () => {
//         try {
//           // For real status update, fetch from Twilio
//           const updatedResponse = await client.messages(initialResponse.sid).fetch();
//           console.log(`Updated Response for SMS to ${phone}:`, {
//             body: updatedResponse.body,
//             numSegments: updatedResponse.numSegments,
//             direction: updatedResponse.direction,
//             from: updatedResponse.from,
//             to: updatedResponse.to,
//             dateUpdated: updatedResponse.dateUpdated,
//             price: updatedResponse.price,
//             errorMessage: updatedResponse.errorMessage,
//             uri: updatedResponse.uri,
//             accountSid: updatedResponse.accountSid,
//             numMedia: updatedResponse.numMedia,
//             status: updatedResponse.status,
//             messagingServiceSid: updatedResponse.messagingServiceSid,
//             sid: updatedResponse.sid,
//             dateSent: updatedResponse.dateSent,
//             dateCreated: updatedResponse.dateCreated,
//             errorCode: updatedResponse.errorCode,
//             priceUnit: updatedResponse.priceUnit,
//             apiVersion: updatedResponse.apiVersion,
//             subresourceUris: updatedResponse.subresourceUris,
//           });
//           console.log(`📋 Updated status for SMS to ${phone}: ${updatedResponse.status}`);

//           // For mocking (uncomment to mock status update):
//           /*
//           const updatedResponse = {
//             ...initialResponse,
//             status: "delivered",
//             dateUpdated: new Date().toISOString(),
//           };
//           console.log(`Mocked updated status for SMS to ${phone}:`, updatedResponse);
//           */

//           await statusPool.query(
//             "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
//             [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
//           );
//         } catch (error) {
//           console.error(`❌ Error fetching updated SMS status for ${phone}:`, error);
//           await statusPool.query(
//             "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
//             [error.message, initialResponse.sid]
//           );
//         }
//       }, 5000);
//     }
//   } catch (error) {
//     console.error("❌ Error sending SMS:", error);
//     throw error; // Re-throw to handle in the calling function
//   }
// };




// scripts/sendSMS.js
import twilio from "twilio";
import dotenv from "dotenv";
import pkg from "pg";
import { resolveTemplate } from "./templateHelper.js";

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

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const checkAndSendNotifications = async () => {
  try {
    const now = new Date();
    console.log(`Checking for SMS notifications at ${now.toISOString()}...`);
    const { rows: notifications } = await pool.query(
      `SELECT n.id, nt.type_name AS type, n.sending_time, n.template, n.groups, n.webinar_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE nt.type_name = 'sms' AND n.sending_time <= $1 AND n.sent = FALSE`,
      [now]
    );

    console.log(`Found ${notifications.length} SMS notifications to send...`);
    for (const notification of notifications) {
      const { id, type, template, groups, webinar_id } = notification;
      const { rows: students } = await pool.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );

      const phoneNumbers = students.map(student => student.phone);
      if (phoneNumbers.length > 0 && type === "sms") {
        console.log(`Sending SMS notification (ID: ${id}) to ${phoneNumbers.length} recipients...`);
        await sendSMS(phoneNumbers, template, id, webinar_id); // Pass webinar_id
        await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
        console.log(`Marked SMS notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
      } else {
        console.log(`No eligible recipients found for SMS notification (ID: ${id}). Marking as sent.`);
        await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing SMS notifications:`, error);
    const now = new Date();
    const { rows: notifications } = await pool.query(
      `SELECT n.id, n.groups 
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE nt.type_name = 'sms' AND n.sending_time <= $1 AND n.sent = FALSE`,
      [now]
    );
    for (const notification of notifications) {
      const { id, groups } = notification;
      const { rows: students } = await pool.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const phone of students.map(s => s.phone)) {
        await statusPool.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, "sms", phone, "failed", new Date(), error.message]
        );
      }
      await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
    }
  }
};

const sendSMS = async (phoneNumbers, template, notificationId, webinarId) => {
  try {
    for (const phone of phoneNumbers) {
      const resolvedMessage = await resolveTemplate(notificationId, template, phone, webinarId); // Pass webinar_id
      console.log(`Resolved message for SMS to ${phone}: ${resolvedMessage}`);

      // For real sending, use the Twilio client
      const initialResponse = await client.messages.create({
        body: resolvedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`Initial Response for SMS to ${phone}:`, initialResponse);
      console.log(`✅ SMS sent to ${phone} with SID: ${initialResponse.sid}`);

      // For mocking (uncomment to mock sending):
      /*
      const initialResponse = {
        sid: `SM${Math.random().toString(36).substring(2, 15)}`,
        status: "sent",
        dateCreated: new Date().toISOString(),
      };
      console.log(`Mocked SMS sending to ${phone}:`, initialResponse);
      */

      await statusPool.query(
        "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
        [notificationId, "sms", phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
      );

      setTimeout(async () => {
        try {
          // For real status update, fetch from Twilio
          const updatedResponse = await client.messages(initialResponse.sid).fetch();
          console.log(`Updated Response for SMS to ${phone}:`, {
            body: updatedResponse.body,
            numSegments: updatedResponse.numSegments,
            direction: updatedResponse.direction,
            from: updatedResponse.from,
            to: updatedResponse.to,
            dateUpdated: updatedResponse.dateUpdated,
            price: updatedResponse.price,
            errorMessage: updatedResponse.errorMessage,
            uri: updatedResponse.uri,
            accountSid: updatedResponse.accountSid,
            numMedia: updatedResponse.numMedia,
            status: updatedResponse.status,
            messagingServiceSid: updatedResponse.messagingServiceSid,
            sid: updatedResponse.sid,
            dateSent: updatedResponse.dateSent,
            dateCreated: updatedResponse.dateCreated,
            errorCode: updatedResponse.errorCode,
            priceUnit: updatedResponse.priceUnit,
            apiVersion: updatedResponse.apiVersion,
            subresourceUris: updatedResponse.subresourceUris,
          });
          console.log(`📋 Updated status for SMS to ${phone}: ${updatedResponse.status}`);

          // For mocking (uncomment to mock status update):
          /*
          const updatedResponse = {
            ...initialResponse,
            status: "delivered",
            dateUpdated: new Date().toISOString(),
          };
          console.log(`Mocked updated status for SMS to ${phone}:`, updatedResponse);
          */

          await statusPool.query(
            "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
            [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
          );
        } catch (error) {
          console.error(`❌ Error fetching updated SMS status for ${phone}:`, error);
          await statusPool.query(
            "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
            [error.message, initialResponse.sid]
          );
        }
      }, 5000);
    }
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    throw error; // Re-throw to handle in the calling function
  }
};