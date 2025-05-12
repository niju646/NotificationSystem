

//sendEmail.js
import dotenv from "dotenv";
import pkg from "pg";
import { sendEmail } from "../utils/emailSender.js";
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

export const checkAndSendEmails = async (notificationId, groups, webinarId, selectedTemplateId) => {
  let client, statusClient;
  try {
    client = await pool.connect();
    statusClient = await statusPool.connect();
    console.log(`Processing email notification ID ${notificationId} with selected_template_id=${selectedTemplateId}`);

    // MODIFIED: Use COALESCE to prioritize custom_template_id content, fall back to template_id content
    const { rows } = await client.query(
      `SELECT n.id, 
              COALESCE(ct.content, t.content) AS content, 
              n.groups, 
              n.webinar_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       LEFT JOIN custom_templates ct ON n.custom_template_id = ct.id
       LEFT JOIN templates t ON n.template_id = t.id
       WHERE nt.type_name = 'email' AND n.id = $1 AND n.sent = FALSE`,
      [notificationId]
    );
    const notifications = rows;

    console.log(`Found ${notifications.length} email notifications to send...`);
    for (const notification of notifications) {
      const { id, content, groups: notificationGroups, webinar_id } = notification;

      if (!content) {
        console.error(`❌ Notification ${id} has no valid template content`);
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        const { rows: students } = await client.query(
          "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
          [notificationGroups]
        );
        for (const student of students) {
          await statusClient.query(
            "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, "email", student.email, "failed", new Date(), "No valid template content"]
          );
        }
        continue;
      }

      console.log(`Processing email notification ID ${id} with content: ${content.substring(0, 100)}...`);
      const { rows: students } = await client.query(
        "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [notificationGroups]
      );

      const emails = students.map(student => student.email);
      if (emails.length > 0) {
        console.log(`Sending email notification (ID: ${id}) to ${emails.length} recipients...`);
        const recipientData = emails.map(email => ({
          email,
          unsubscribe_link: `${process.env.BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
        }));

        const resolvedMessages = await Promise.all(
          emails.map(async email => {
            const resolvedMessage = await resolveTemplate(id, content, email, webinar_id);
            console.log(`Resolved message for ${email}: ${resolvedMessage.substring(0, 100)}...`);
            return { email, resolvedMessage };
          })
        );

        const htmlContents = resolvedMessages.map(({ email, resolvedMessage }) => ({
          email,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
              <h2 style="color: #007bff;">📚 <b>LMS Notification</b></h2>
              <img src="https://yourwebsite.com/path-to-thumbnail.jpg" alt="LMS Notification" style="width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0;">
              <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                <p style="font-size: 16px; color: #333;">${resolvedMessage}</p>
              </div>
              <p style="margin-top: 20px; font-size: 14px; color: #555;">
                If you no longer wish to receive these emails,  
                <a href="${recipientData.find(r => r.email === email).unsubscribe_link}" style="color: red; text-decoration: none; font-weight: bold;">unsubscribe</a> 
               
              </p>
            </div>
          `,
        }));

        for (const { email, htmlContent } of htmlContents) {
          try {
            const initialResponse = await sendEmail([email], "LMS Notification", htmlContent);
            console.log(`Initial Response for email to ${email}:`, initialResponse);
            console.log(`✅ Email sent to ${email} with Message ID: ${initialResponse.messageId}`);

            await statusClient.query(
              "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "email", email, initialResponse.messageId, "sent", new Date()]
            );

            setTimeout(async () => {
              try {
                const updatedStatus = "sent";
                console.log(`Updated Response for email to ${email}:`, {
                  body: content,
                  numSegments: "N/A",
                  direction: "outbound",
                  from: "noreply@yourdomain.com",
                  to: email,
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
                console.log(`📋 Updated status for email to ${email}: ${updatedStatus}`);

                await statusClient.query(
                  "UPDATE status_logs SET status = $1, date_updated = $2 WHERE notification_id = $3 AND recipient = $4",
                  [updatedStatus, new Date(), id, email]
                );
              } catch (error) {
                console.error(`❌ Error simulating updated email status for ${email}:`, error);
                await statusClient.query(
                  "UPDATE status_logs SET status = 'failed', date_updated = $1, error_message = $2 WHERE notification_id = $3 AND recipient = $4",
                  [new Date(), error.message, id, email]
                );
              }
            }, 5000);
          } catch (error) {
            console.error(`❌ Error sending email to ${email}:`, error);
            await statusClient.query(
              "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
              [id, "email", email, "failed", new Date(), error.message]
            );
          }
        }

        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
        console.log(`Marked email notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
      } else {
        console.log(`No eligible recipients found for email notification (ID: ${id}). Marking as sent.`);
        await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [id]);
      }
    }
  } catch (error) {
    console.error("❌ Error processing email notifications:", error);
    try {
      const { rows: students } = await client.query(
        "SELECT email FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const email of students.map(s => s.email)) {
        await statusClient.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [notificationId, "email", email, "failed", new Date(), error.message]
        );
      }
      await client.query("UPDATE notification SET sent = TRUE WHERE id = $1", [notificationId]);
    } catch (err) {
      console.error("❌ Error logging failed email notification:", err);
    }
  } finally {
    if (client) client.release();
    if (statusClient) statusClient.release();
  }
};