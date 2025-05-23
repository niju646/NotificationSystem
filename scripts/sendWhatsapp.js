




// //sendWhatsapp.js
// import dotenv from "dotenv";
// import twilio from "twilio";
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

// const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// export const sendScheduledWhatsApp = async (notificationId, groups, webinarId, selectedTemplateId) => {
//   let client, statusClient;
//   try {
//     client = await pool.connect();
//     statusClient = await statusPool.connect();
//     console.log(`Processing WhatsApp notification ID ${notificationId} with selected_template_id=${selectedTemplateId}`);

//     // MODIFIED: Use COALESCE to prioritize custom_template_id content, fall back to template_id content
//     const { rows } = await client.query(
//       `SELECT n.id, 
//               COALESCE(ct.content, t.content) AS content, 
//               n.groups, n.webinar_id
//        FROM notification n
//        JOIN notification_types nt ON n.type_id = nt.id
//        LEFT JOIN custom_templates ct ON n.custom_template_id = ct.id
//        LEFT JOIN templates t ON n.template_id = t.id
//        WHERE nt.type_name = 'whatsapp' AND n.id = $1 AND n.sent = FALSE`,
//       [notificationId]
//     );
//     const notifications = rows;

//     console.log(`Found ${notifications.length} WhatsApp notifications to send...`);
//     for (const notification of notifications) {
//       const { id, content, groups: notificationGroups, webinar_id } = notification;

//       if (!content) {
//         console.error(`❌ Notification ${id} has no valid template content`);
//         await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//         const { rows: students } = await client.query(
//           "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//           [notificationGroups]
//         );
//         for (const student of students) {
//           await statusClient.query(
//             "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//             [id, "whatsapp", student.phone, "failed", new Date(), "No valid template content"]
//           );
//         }
//         continue;
//       }

//       console.log(`Processing WhatsApp notification ID ${id} with content: ${content.substring(0, 100)}...`);
//       const { rows: students } = await client.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [notificationGroups]
//       );

//       if (students.length > 0) {
//         console.log(`Sending WhatsApp notification (ID: ${id}) to ${students.length} recipients...`);
//         for (const student of students) {
//           try {
//             const resolvedMessage = await resolveTemplate(id, content, student.phone, webinar_id);
//             console.log(`Resolved message for WhatsApp to ${student.phone}: ${resolvedMessage.substring(0, 100)}...`);

//             const initialResponse = await twilioClient.messages.create({
//               from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
//               to: `whatsapp:${student.phone}`,
//               body: resolvedMessage,
//             });
//             console.log(`Initial Response for WhatsApp to ${student.phone}:`, initialResponse);
//             console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

//             await statusClient.query(
//               "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
//               [id, "whatsapp", student.phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
//             );

//             setTimeout(async () => {
//               try {
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

//                 await statusClient.query(
//                   "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
//                   [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
//                 );
//               } catch (error) {
//                 console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
//                 await statusClient.query(
//                   "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
//                   [error.message, initialResponse.sid]
//                 );
//               }
//             }, 5000);
//           } catch (error) {
//             console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, error);
//             await statusClient.query(
//               "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//               [id, "whatsapp", student.phone, "failed", new Date(), error.message]
//             );
//           }
//         }
//       } else {
//         console.log(`No eligible recipients found for WhatsApp notification (ID: ${id}). Marking as sent.`);
//       }
//       await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
//       console.log(`Marked WhatsApp notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
//     }
//   } catch (error) {
//     console.error("❌ Database error in sendScheduledWhatsApp:", error);
//     try {
//       const { rows: students } = await client.query(
//         "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
//         [groups]
//       );
//       for (const student of students) {
//         await statusClient.query(
//           "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
//           [notificationId, "whatsapp", student.phone, "failed", new Date(), error.message]
//         );
//       }
//       await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [notificationId]);
//     } catch (err) {
//       console.error("❌ Error logging failed WhatsApp notification:", err);
//     }
//   } finally {
//     if (client) client.release();
//     if (statusClient) statusClient.release();
//   }
// };



import dotenv from "dotenv";
import twilio from "twilio";
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

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendScheduledWhatsApp = async (notificationId, groups, webinarId, selectedTemplateId) => {
  let client, statusClient;
  try {
    client = await pool.connect();
    statusClient = await statusPool.connect();
    console.log(`Processing WhatsApp notification ID ${notificationId} with selected_template_id=${selectedTemplateId}`);

    // MODIFIED: Include the image column in the query
    const { rows } = await client.query(
      `SELECT n.id, 
              COALESCE(ct.content, t.content) AS content, 
              COALESCE(ct.image, t.image) AS image, 
              n.groups, n.webinar_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       LEFT JOIN custom_templates ct ON n.custom_template_id = ct.id
       LEFT JOIN templates t ON n.template_id = t.id
       WHERE nt.type_name = 'whatsapp' AND n.id = $1 AND n.sent = FALSE`,
      [notificationId]
    );
    const notifications = rows;

    console.log(`Found ${notifications.length} WhatsApp notifications to send...`);
    for (const notification of notifications) {
      const { id, content, image, groups: notificationGroups, webinar_id } = notification;

      if (!content) {
        console.error(`❌ Notification ${id} has no valid template content`);
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        const { rows: students } = await client.query(
          "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
          [notificationGroups]
        );
        for (const student of students) {
          await statusClient.query(
            "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, "whatsapp", student.phone, "failed", new Date(), "No valid template content"]
          );
        }
        continue;
      }

      console.log(`Processing WhatsApp notification ID ${id} with content: ${content.substring(0, 100)}...`);
      const { rows: students } = await client.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [notificationGroups]
      );

      if (students.length > 0) {
        console.log(`Sending WhatsApp notification (ID: ${id}) to ${students.length} recipients...`);
        for (const student of students) {
          try {
            let resolvedMessage = await resolveTemplate(id, content, student.phone, webinar_id);
            console.log(`Resolved message for WhatsApp to ${student.phone}: ${resolvedMessage.substring(0, 100)}...`);

            // Remove HTML tags (including <img>) since WhatsApp text doesn't support HTML
            resolvedMessage = resolvedMessage.replace(/<[^>]+>/g, '').trim();

            // Prepare WhatsApp message options
            const messageOptions = {
              from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:${student.phone}`,
              body: resolvedMessage,
            };

            // If there's an image, add it as a media URL
            if (image) {
              const baseUrl = process.env.BASE_URL ;
              const absoluteImageUrl = `${baseUrl}${image}`;
              messageOptions.mediaUrl = [absoluteImageUrl];
              //messageOptions.mediaUrl = ["https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg"];
              console.log(`Attaching image to WhatsApp message: ${absoluteImageUrl}`);
            }

            const initialResponse = await twilioClient.messages.create(messageOptions);
            console.log(`Initial Response for WhatsApp to ${student.phone}:`, initialResponse);
            console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

            await statusClient.query(
              "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "whatsapp", student.phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
            );

            setTimeout(async () => {
              try {
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

                await statusClient.query(
                  "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
                  [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
                );
              } catch (error) {
                console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
                await statusClient.query(
                  "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
                  [error.message, initialResponse.sid]
                );
              }
            }, 5000);
          } catch (error) {
            console.error(`❌ Failed to send WhatsApp to ${student.phone}:`, error);
            await statusClient.query(
              "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "whatsapp", student.phone, "failed", new Date(), error.message]
            );
          }
        }
      } else {
        console.log(`No eligible recipients found for WhatsApp notification (ID: ${id}). Marking as sent.`);
      }
      await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
      console.log(`Marked WhatsApp notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
    }
  } catch (error) {
    console.error("❌ Database error in sendScheduledWhatsApp:", error);
    try {
      const { rows: students } = await client.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const student of students) {
        await statusClient.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [notificationId, "whatsapp", student.phone, "failed", new Date(), error.message]
        );
      }
      await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [notificationId]);
    } catch (err) {
      console.error("❌ Error logging failed WhatsApp notification:", err);
    }
  } finally {
    if (client) client.release();
    if (statusClient) statusClient.release();
  }
};