import twilio from "twilio";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
        await sendSMS(phoneNumbers, template);
        await pool.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing notifications:`, error);
  }
};

const sendSMS = async (phoneNumbers, message) => {
  try {
    for (const phone of phoneNumbers) {
      await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone,
      });
      console.log(`✅ SMS sent to ${phone}`);
    }
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
  }
};
