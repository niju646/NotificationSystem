


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

export const checkAndSendEmails = async () => {
  try {
    const now = new Date();
    const { rows: notifications } = await pool.query(
      "SELECT id, template, groups FROM notification WHERE type = 'email' AND sending_time <= $1 AND sent = FALSE",
      [now]
    );

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
          unsubscribe_link: `${process.env.BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`
        }));

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
            <h2 style="color: #007bff;">📚 <b>LMS Notification</b></h2>
            
            <!-- Thumbnail Image -->
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

        await sendEmail(emails, template, htmlContent);
        await pool.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
      }
    }
  } catch (error) {
    console.error("❌ Error processing email notifications:", error);
  }
};
