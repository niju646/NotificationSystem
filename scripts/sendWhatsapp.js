



///////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////

// // scripts/sendWhatsapp.js ------- orginal 
// import dotenv from "dotenv";
// import twilio from "twilio";
// import pkg from "pg";
// import { resolveTemplate } from "./templateHelper.js";

// dotenv.config();
// const { Client } = pkg;

// const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// const db = new Client({ connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` });
// await db.connect();

// const statusDb = new Client({ connectionString: `postgres://${process.env.STATUS_DB_USER}:${process.env.STATUS_DB_PASSWORD}@${process.env.STATUS_DB_HOST}:${process.env.STATUS_DB_PORT}/${process.env.STATUS_DB_NAME}` });
// await statusDb.connect();

// export const sendScheduledWhatsApp = async () => {
//   try {
//     const now = new Date();
//     console.log(`Checking for WhatsApp notifications at ${now.toISOString()}...`);
//     const notifications = await db.query(
//       `SELECT n.id, n.template, n.groups 
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE nt.type_name = 'whatsapp' AND n.sending_time <= $1 AND n.sent = FALSE`,
//       [now]
//     );

//     console.log(`Found ${notifications.rows.length} WhatsApp notifications to send...`);
//     for (const notification of notifications.rows) {
//       const { id, template, groups } = notification;
//       const students = await db.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       if (students.rows.length > 0) {
//         console.log(`Sending WhatsApp notification (ID: ${id}) to ${students.rows.length} recipients...`);
//         for (const student of students.rows) {
//           try {
//             const resolvedMessage = await resolveTemplate(id, template, student.phone);
//             console.log(`Resolved message for WhatsApp to ${student.phone}: ${resolvedMessage}`);

//             // For real sending, use the Twilio client
//             const initialResponse = await twilioClient.messages.create({
//               from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
//               to: `whatsapp:${student.phone}`,
//               body: resolvedMessage,
//             });
//             console.log(`Initial Response for WhatsApp to ${student.phone}:`, initialResponse);
//             console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

//             // For mocking (uncomment to mock sending):
//             /*
//             const initialResponse = {
//               sid: `SM${Math.random().toString(36).substring(2, 15)}`,
//               status: "sent",
//               dateCreated: new Date().toISOString(),
//             };
//             console.log(`Mocked WhatsApp sending to ${student.phone}:`, initialResponse);
//             */

//             await statusDb.query(
//               "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
//               [id, "whatsapp", student.phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
//             );

//             setTimeout(async () => {
//               try {
//                 // For real status update, fetch from Twilio
//                 const updatedResponse = await twilioClient.messages(initialResponse.sid).fetch();
//                 console.log(`Updated Response for WhatsApp to ${student.phone}:`, {
//                   body: updatedResponse.body,
//                   numSegments: updatedResponse.numSegments,
//                   direction: updatedResponse.direction,
//                   from: updatedResponse.from,
//                   to: updatedResponse.to,
//                   dateUpdated: updatedResponse.dateUpdated,
//                   price: updatedResponse.price,
//                   errorMessage: updatedResponse.errorMessage,
//                   uri: updatedResponse.uri,
//                   accountSid: updatedResponse.accountSid,
//                   numMedia: updatedResponse.numMedia,
//                   status: updatedResponse.status,
//                   messagingServiceSid: updatedResponse.messagingServiceSid,
//                   sid: updatedResponse.sid,
//                   dateSent: updatedResponse.dateSent,
//                   dateCreated: updatedResponse.dateCreated,
//                   errorCode: updatedResponse.errorCode,
//                   priceUnit: updatedResponse.priceUnit,
//                   apiVersion: updatedResponse.apiVersion,
//                   subresourceUris: updatedResponse.subresourceUris,
//                 });
//                 console.log(`📋 Updated status for WhatsApp to ${student.phone}: ${updatedResponse.status}`);

//                 // For mocking (uncomment to mock status update):
//                 /*
//                 const updatedResponse = {
//                   ...initialResponse,
//                   status: "delivered",
//                   dateUpdated: new Date().toISOString(),
//                 };
//                 console.log(`Mocked updated status for WhatsApp to ${student.phone}:`, updatedResponse);
//                 */

//                 await statusDb.query(
//                   "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
//                   [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
//                 );
//               } catch (error) {
//                 console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
//                 await statusDb.query(
//                   "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
//                   [error.message, initialResponse.sid]
//                 );
//               }
//             }, 5000);
//           } catch (err) {
//             console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, err);
//             await statusDb.query(
//               "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//               [id, "whatsapp", student.phone, "failed", new Date(), err.message]
//             );
//           }
//         }
//       } else {
//         console.log(`No eligible recipients found for WhatsApp notification (ID: ${id}). Marking as sent.`);
//       }
//       await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//       console.log(`Marked WhatsApp notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
//     }
//   } catch (err) {
//     console.error("❌ Database error in sendScheduledWhatsApp:", err);
//     const now = new Date();
//     const notifications = await db.query(
//       `SELECT n.id, n.groups 
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        WHERE nt.type_name = 'whatsapp' AND n.sending_time <= $1 AND n.sent = FALSE`,
//       [now]
//     );
//     for (const notification of notifications.rows) {
//       const { id, groups } = notification;
//       const students = await db.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );
//       for (const student of students.rows) {
//         await statusDb.query(
//           "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//           [id, "whatsapp", student.phone, "failed", new Date(), err.message]
//         );
//       }
//       await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//     }
//   }
// };


// scripts/sendWhatsapp.js
import dotenv from "dotenv";
import twilio from "twilio";
import pkg from "pg";
import { resolveTemplate } from "./templateHelper.js";

dotenv.config();
const { Client } = pkg;

const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const db = new Client({ connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` });
await db.connect();

const statusDb = new Client({ connectionString: `postgres://${process.env.STATUS_DB_USER}:${process.env.STATUS_DB_PASSWORD}@${process.env.STATUS_DB_HOST}:${process.env.STATUS_DB_PORT}/${process.env.STATUS_DB_NAME}` });
await statusDb.connect();

export const sendScheduledWhatsApp = async () => {
  try {
    const now = new Date();
    console.log(`Checking for WhatsApp notifications at ${now.toISOString()}...`);
    const notifications = await db.query(
      `SELECT n.id, n.template, n.groups, n.webinar_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE nt.type_name = 'whatsapp' AND n.sending_time <= $1 AND n.sent = FALSE`,
      [now]
    );

    console.log(`Found ${notifications.rows.length} WhatsApp notifications to send...`);
    for (const notification of notifications.rows) {
      const { id, template, groups, webinar_id } = notification;
      const students = await db.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );

      if (students.rows.length > 0) {
        console.log(`Sending WhatsApp notification (ID: ${id}) to ${students.rows.length} recipients...`);
        for (const student of students.rows) {
          try {
            const resolvedMessage = await resolveTemplate(id, template, student.phone, webinar_id); // Pass webinar_id
            console.log(`Resolved message for WhatsApp to ${student.phone}: ${resolvedMessage}`);

            // For real sending, use the Twilio client
            const initialResponse = await twilioClient.messages.create({
              from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:${student.phone}`,
              body: resolvedMessage,
            });
            console.log(`Initial Response for WhatsApp to ${student.phone}:`, initialResponse);
            console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

            // For mocking (uncomment to mock sending):
            /*
            const initialResponse = {
              sid: `SM${Math.random().toString(36).substring(2, 15)}`,
              status: "sent",
              dateCreated: new Date().toISOString(),
            };
            console.log(`Mocked WhatsApp sending to ${student.phone}:`, initialResponse);
            */

            await statusDb.query(
              "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "whatsapp", student.phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
            );

            setTimeout(async () => {
              try {
                // For real status update, fetch from Twilio
                const updatedResponse = await twilioClient.messages(initialResponse.sid).fetch();
                console.log(`Updated Response for WhatsApp to ${student.phone}:`, {
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
                console.log(`📋 Updated status for WhatsApp to ${student.phone}: ${updatedResponse.status}`);

                // For mocking (uncomment to mock status update):
                /*
                const updatedResponse = {
                  ...initialResponse,
                  status: "delivered",
                  dateUpdated: new Date().toISOString(),
                };
                console.log(`Mocked updated status for WhatsApp to ${student.phone}:`, updatedResponse);
                */

                await statusDb.query(
                  "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
                  [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
                );
              } catch (error) {
                console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
                await statusDb.query(
                  "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
                  [error.message, initialResponse.sid]
                );
              }
            }, 5000);
          } catch (err) {
            console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, err);
            await statusDb.query(
              "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "whatsapp", student.phone, "failed", new Date(), err.message]
            );
          }
        }
      } else {
        console.log(`No eligible recipients found for WhatsApp notification (ID: ${id}). Marking as sent.`);
      }
      await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
      console.log(`Marked WhatsApp notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error("❌ Database error in sendScheduledWhatsApp:", err);
    const now = new Date();
    const notifications = await db.query(
      `SELECT n.id, n.groups 
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       WHERE nt.type_name = 'whatsapp' AND n.sending_time <= $1 AND n.sent = FALSE`,
      [now]
    );
    for (const notification of notifications.rows) {
      const { id, groups } = notification;
      const students = await db.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const student of students.rows) {
        await statusDb.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, "whatsapp", student.phone, "failed", new Date(), err.message]
        );
      }
      await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
    }
  }
};