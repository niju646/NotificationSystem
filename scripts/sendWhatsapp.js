import dotenv from "dotenv";
import twilio from "twilio";
import pkg from "pg";

dotenv.config();
const { Client } = pkg;

const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const db = new Client({ connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` });
await db.connect();

// Status DB
const statusDb = new Client({ connectionString: `postgres://${process.env.STATUS_DB_USER}:${process.env.STATUS_DB_PASSWORD}@${process.env.STATUS_DB_HOST}:${process.env.STATUS_DB_PORT}/${process.env.STATUS_DB_NAME}` });
await statusDb.connect();

export const sendScheduledWhatsApp = async () => {
  try {
    const now = new Date();
    const notifications = await db.query(
      "SELECT id, template, groups FROM notification WHERE type = 'whatsapp' AND sending_time <= $1 AND sent = FALSE",
      [now]
    );

    for (const notification of notifications.rows) {
      const { id, template, groups } = notification;
      const students = await db.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );

      for (const student of students.rows) {
        try {
          const initialResponse = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${student.phone}`,
            body: template,
          });
          console.log("Initial Response:", initialResponse);
          console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

          // Log initial status to status DB
          await statusDb.query(
            "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, "whatsapp", student.phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
          );

          // Fetch updated status after a delay
          setTimeout(async () => {
            try {
              const updatedResponse = await twilioClient.messages(initialResponse.sid).fetch();
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
              console.log(`📋 Updated status for WhatsApp to ${student.phone}: ${updatedResponse.status}`);

              // Update status in status DB
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
          }, 5000); // Adjust delay as needed
        } catch (err) {
          console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, err);
        }
      }
      await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
    }
  } catch (err) {
    console.error("❌ Database error:", err);
  }
};



// import dotenv from "dotenv";
// import twilio from "twilio";
// import pkg from "pg";

// dotenv.config();
// const { Client } = pkg;

// const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// const db = new Client({ connectionString: process.env.DATABASE_URL });

// await db.connect();

// export const sendScheduledWhatsApp = async () => {
//   try {
//     const now = new Date();
//     const notifications = await db.query(
//       "SELECT id, template, groups FROM notification WHERE type = 'whatsapp' AND sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications.rows) {
//       const { id, template, groups } = notification;
//       const students = await db.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       for (const student of students.rows) {
//         try {
//           // Send WhatsApp message and get initial response
//           const initialResponse = await twilioClient.messages.create({
//             from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
//             to: `whatsapp:${student.phone}`,
//             body: template,
//           });
//           console.log("Initial Response:", initialResponse);
//           console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

//           // Fetch updated response after a delay
//           setTimeout(async () => {
//             try {
//               const updatedResponse = await twilioClient.messages(initialResponse.sid).fetch();
//               console.log("Updated Response:", {
//                 body: updatedResponse.body,
//                 numSegments: updatedResponse.numSegments,
//                 direction: updatedResponse.direction,
//                 from: updatedResponse.from,
//                 to: updatedResponse.to,
//                 dateUpdated: updatedResponse.dateUpdated,
//                 price: updatedResponse.price,
//                 errorMessage: updatedResponse.errorMessage,
//                 uri: updatedResponse.uri,
//                 accountSid: updatedResponse.accountSid,
//                 numMedia: updatedResponse.numMedia,
//                 status: updatedResponse.status,
//                 messagingServiceSid: updatedResponse.messagingServiceSid,
//                 sid: updatedResponse.sid,
//                 dateSent: updatedResponse.dateSent,
//                 dateCreated: updatedResponse.dateCreated,
//                 errorCode: updatedResponse.errorCode,
//                 priceUnit: updatedResponse.priceUnit,
//                 apiVersion: updatedResponse.apiVersion,
//                 subresourceUris: updatedResponse.subresourceUris,
//               });
//               console.log(`📋 Updated status for WhatsApp to ${student.phone}: ${updatedResponse.status}`);
//             } catch (error) {
//               console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
//             }
//           }, 5000); // Wait 5 seconds for Twilio to update (adjust as needed)
//         } catch (err) {
//           console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, err);
//         }
//       }

//       await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//     }
//   } catch (err) {
//     console.error("❌ Database error:", err);
//   }
// };


// import dotenv from "dotenv";
// import twilio from "twilio";
// import pkg from 'pg';


// dotenv.config();
// const { Client } = pkg;

// const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// const db = new Client({ connectionString: process.env.DATABASE_URL });

// await db.connect();

// export const sendScheduledWhatsApp = async () => {
//   try {
//     const now = new Date();
//     const notifications = await db.query(
//       "SELECT id, template, groups FROM notification WHERE type = 'whatsapp' AND sending_time <= $1 AND sent = FALSE",
//       [now]
//     );

//     for (const notification of notifications.rows) {
//       const { id, template, groups } = notification;
//       const students = await db.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );

//       for (const student of students.rows) {
//         try {
//           const message = await twilioClient.messages.create({
//             from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
//             to: `whatsapp:${student.phone}`,
//             body: template,
//           });
//           console.log(message);
//           console.log(`✅ WhatsApp message sent to ${student.phone}: ${message.sid}`);
//         } catch (err) {
//           console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, err);
//         }
//       }

//       await db.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//     }
//   } catch (err) {
//     console.error("❌ Database error:", err);
//   }
// };
