import dotenv from "dotenv";
import twilio from "twilio";
import pkg from "pg";

dotenv.config();
const { Client } = pkg;

const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const db = new Client({ connectionString: process.env.DATABASE_URL });

await db.connect();

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
          // Send WhatsApp message and get initial response
          const initialResponse = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${student.phone}`,
            body: template,
          });
          console.log("Initial Response:", initialResponse);
          console.log(`✅ WhatsApp message sent to ${student.phone} with SID: ${initialResponse.sid}`);

          // Fetch updated response after a delay
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
            } catch (error) {
              console.error(`❌ Error fetching updated WhatsApp status for ${student.phone}:`, error);
            }
          }, 5000); // Wait 5 seconds for Twilio to update (adjust as needed)
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
