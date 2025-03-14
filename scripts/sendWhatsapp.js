





import dotenv from "dotenv";
import twilio from "twilio";
import pkg from 'pg';


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
          const message = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${student.phone}`,
            body: template,
          });
          console.log(`✅ WhatsApp message sent to ${student.phone}: ${message.sid}`);
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
