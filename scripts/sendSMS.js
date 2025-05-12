


//sendSms.js
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

export const checkAndSendNotifications = async (notificationId, groups, webinarId, selectedTemplateId) => {
  let client, statusClient;
  try {
    client = await pool.connect();
    statusClient = await statusPool.connect();
    console.log(`Processing SMS notification ID ${notificationId} with selected_template_id=${selectedTemplateId}`);

    // MODIFIED: Use COALESCE to prioritize custom_template_id content, fall back to template_id content
    const { rows } = await client.query(
      `SELECT n.id, nt.type_name AS type, n.sending_time, 
              COALESCE(ct.content, t.content) AS content, 
              n.groups, n.webinar_id
       FROM notification n
       JOIN notification_types nt ON n.type_id = nt.id
       LEFT JOIN custom_templates ct ON n.custom_template_id = ct.id
       LEFT JOIN templates t ON n.template_id = t.id
       WHERE nt.type_name = 'sms' AND n.id = $1 AND n.sent = FALSE`,
      [notificationId]
    );
    const notifications = rows;

    console.log(`Found ${notifications.length} SMS notifications to send...`);
    for (const notification of notifications) {
      const { id, type, content, groups: notificationGroups, webinar_id } = notification;

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
            [id, "sms", student.phone, "failed", new Date(), "No valid template content"]
          );
        }
        continue;
      }

      console.log(`Processing SMS notification ID ${id} with content: ${content.substring(0, 100)}...`);
      const { rows: students } = await client.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [notificationGroups]
      );

      const phoneNumbers = students.map(student => student.phone);
      if (phoneNumbers.length > 0 && type === "sms") {
        console.log(`Sending SMS notification (ID: ${id}) to ${phoneNumbers.length} recipients...`);
        await sendSMS(phoneNumbers, content, id, webinar_id, statusClient);
        await client.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
        console.log(`Marked SMS notification (ID: ${id}) as sent at ${new Date().toISOString()}`);
      } else {
        console.log(`No eligible recipients found for SMS notification (ID: ${id}). Marking as sent.`);
        await client.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [id]);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing SMS notifications:`, error);
    try {
      const { rows: students } = await client.query(
        "SELECT phone FROM students WHERE group_id = ANY($1) AND unsubscribe = FALSE",
        [groups]
      );
      for (const phone of students.map(s => s.phone)) {
        await statusClient.query(
          "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
          [notificationId, "sms", phone, "failed", new Date(), error.message]
        );
      }
      await client.query(`UPDATE notification SET sent = TRUE WHERE id = $1`, [notificationId]);
    } catch (err) {
      console.error("❌ Error logging failed SMS notification:", err);
    }
  } finally {
    if (client) client.release();
    if (statusClient) statusClient.release();
  }
};

const sendSMS = async (phoneNumbers, content, notificationId, webinarId, statusClient) => {
  for (const phone of phoneNumbers) {
    try {
      const resolvedMessage = await resolveTemplate(notificationId, content, phone, webinarId);
      console.log(`Resolved message for SMS to ${phone}: ${resolvedMessage.substring(0, 100)}...`);

      const initialResponse = await client.messages.create({
        body: resolvedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`Initial Response for SMS to ${phone}:`, initialResponse);
      console.log(`✅ SMS sent to ${phone} with SID: ${initialResponse.sid}`);

      await statusClient.query(
        "INSERT INTO status_logs (notification_id, type, recipient, message_sid, status, date_updated) VALUES ($1, $2, $3, $4, $5, $6)",
        [notificationId, "sms", phone, initialResponse.sid, initialResponse.status, new Date(initialResponse.dateCreated)]
      );

      setTimeout(async () => {
        try {
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

          await statusClient.query(
            "UPDATE status_logs SET status = $1, date_updated = $2, error_message = $3 WHERE message_sid = $4",
            [updatedResponse.status, new Date(updatedResponse.dateUpdated), updatedResponse.errorMessage || null, updatedResponse.sid]
          );
        } catch (error) {
          console.error(`❌ Error fetching updated SMS status for ${phone}:`, error);
          await statusClient.query(
            "UPDATE status_logs SET status = 'failed', error_message = $1 WHERE message_sid = $2",
            [error.message, initialResponse.sid]
          );
        }
      }, 5000);
    } catch (error) {
      console.error(`❌ Error sending SMS to ${phone}:`, error);
      await statusClient.query(
        "INSERT INTO status_logs (notification_id, type, recipient, status, date_updated, error_message) VALUES ($1, $2, $3, $4, $5, $6)",
        [notificationId, "sms", phone, "failed", new Date(), error.message]
      );
    }
  }
};