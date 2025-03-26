

import twilio from "twilio";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

// Main notification DB
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Status DB
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
    const { rows: notifications } = await pool.query(
      "SELECT id, type, sending_time, template, groups FROM notification WHERE sending_time <= $1 AND sent = FALSE",
      [now]
    );

    for (const notification of notifications) {
      const { id, type, template, groups } = notification;
      const { rows: students } = await pool.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );

      const phoneNumbers = students.map(student => student.phone);
      if (phoneNumbers.length > 0 && type === "sms") {
        await sendSMS(phoneNumbers, template, id);
        await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing notifications:`, error);
  }
};

const sendSMS = async (phoneNumbers, message, notificationId) => {
  try {
    for (const phone of phoneNumbers) {
      const initialResponse = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log("Initial Response:", initialResponse);
      console.log(`✅ SMS sent to ${phone} with SID: ${initialResponse.sid}`);

      // Log initial status to status DB
      await statusPool.query(
        "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
        [notificationId, "sms", phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
      );

      // Fetch updated status after a delay
      setTimeout(async () => {
        try {
          const updatedResponse = await client.messages(initialResponse.sid).fetch();
          console.log("Updated Response:", {
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

          // Update status in status DB
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
      }, 5000); // Adjust delay as needed
    }
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
  }
};








// import twilio from "twilio";
// import dotenv from "dotenv";
// import pkg from "pg";

// dotenv.config();
// const { Pool } = pkg;

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// const client = twilio(accountSid, authToken);

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// export const checkAndSendNotifications = async () => {
//   try {
//     const now = new Date();
//     const { rows: notifications } = await pool.query(
//       "SELECT id, type, sending_time, template, groups FROM notification WHERE sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications) {
//       const { id, type, template, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       const phoneNumbers = students.map(student => student.phone);
//       if (phoneNumbers.length > 0 && type === "sms") {
//         await sendSMS(phoneNumbers, template);
//         await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
//       }
//     }
//   } catch (error) {
//     console.error(`[${new Date().toISOString()}] Error processing notifications:`, error);
//   }
// };

// const sendSMS = async (phoneNumbers, message) => {
//   try {
//     for (const phone of phoneNumbers) {
//       // Send the SMS and get initial response
//       const initialResponse = await client.messages.create({
//         body: message,
//         from: twilioPhoneNumber,
//         to: phone,
//       });
//       console.log("Initial Response:", initialResponse);
//       console.log(`✅ SMS sent to ${phone} with SID: ${initialResponse.sid}`);

//       // Fetch updated response after a delay to get more fields
//       setTimeout(async () => {
//         try {
//           const updatedResponse = await client.messages(initialResponse.sid).fetch();
//           console.log("Updated Response:", {
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
//         } catch (error) {
//           console.error(`❌ Error fetching updated SMS status for ${phone}:`, error);
//         }
//       }, 5000); // Wait 5 seconds for Twilio to update perspective to update (adjust delay as needed)
//     }
//   } catch (error) {
//     console.error("❌ Error sending SMS:", error);
//   }
// };


// import twilio from "twilio";
// import dotenv from "dotenv";
// import pkg from "pg";

// dotenv.config();
// const { Pool } = pkg;

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// const client = twilio(accountSid, authToken);

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// export const checkAndSendNotifications = async () => {
//   try {
//     const now = new Date();
//     const { rows: notifications } = await pool.query(
//       "SELECT id, type, sending_time, template, groups FROM notification WHERE sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications) {
//       const { id, type, template, groups } = notification;
//       const { rows: students } = await pool.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       const phoneNumbers = students.map(student => student.phone);
//       if (phoneNumbers.length > 0 && type === "sms") {
//         await sendSMS(phoneNumbers, template);
//         await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
//       }
//     }
//   } catch (error) {
//     console.error(`[${new Date().toISOString()}] Error processing notifications:`, error);
//   }
// };

// const sendSMS = async (phoneNumbers, message) => {
//   try {
//     for (const phone of phoneNumbers) {
//       let res = await client.messages.create({
//         body: message,
//         from: twilioPhoneNumber,
//         to: phone,
//       });
//       console.log(res,"=================")
//       console.log(`✅ SMS sent to ${phone}`);
//     }
//   } catch (error) {
//     console.error("❌ Error sending SMS:", error);
//   }
// };
