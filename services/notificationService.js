import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (phoneNumbers, message) => {
  try {
    for (const phone of phoneNumbers) {
      const response = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`📩 SMS sent to ${phone}:`, response.sid);
    }
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
  }
};

export const sendWhatsApp = async (phoneNumbers, message) => {
  try {
    for (const phone of phoneNumbers) {
      const response = await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`,
      });
      console.log(`📲 WhatsApp sent to ${phone}:`, response.sid);
    }
  } catch (error) {
    console.error("❌ Error sending WhatsApp:", error);
  }
};

// -- Create the notification table with 'email' type added
// CREATE TABLE notification (
//   id SERIAL PRIMARY KEY,
//   type VARCHAR(20) CHECK (type IN ('sms', 'whatsapp', 'email')) NOT NULL,  -- 'email' added
//   sending_time TIMESTAMP NOT NULL,
//   template TEXT NOT NULL,
//   groups INTEGER[] NOT NULL,
//   sent BOOLEAN DEFAULT FALSE
// );

// -- Create the students table with 'email' column added
// CREATE TABLE students (
//   id SERIAL PRIMARY KEY,
//   name VARCHAR(100) NOT NULL,
//   phone VARCHAR(20) UNIQUE NOT NULL,
//   email VARCHAR(100),  -- Add email column to store student emails
//   group_id INTEGER NOT NULL,
//   unsubscribe BOOLEAN DEFAULT FALSE
// );

// -- Insert notifications with updated times (8:35 PM, 8:40 PM, 8:45 PM)
// INSERT INTO notification (type, sending_time, template, groups, sent)
// VALUES 
//   ('sms', TIMESTAMP '2025-03-14 20:35:00', 'Hello, this is an SMS notification.', ARRAY[1, 2], FALSE),
//   ('whatsapp', TIMESTAMP '2025-03-14 20:40:00', 'Hello, this is a WhatsApp notification.', ARRAY[2, 3], FALSE),
//   ('email', TIMESTAMP '2025-03-14 20:45:00', 'Hello, this is an email notification.', ARRAY[1, 3], FALSE);

// -- Insert students with email addresses (unchanged)
// INSERT INTO students (name, phone, email, group_id, unsubscribe)
// VALUES 
//   ('Alice', '+919446188524', 'alice@example.com', 1, FALSE),
//   ('Bob', '+919495435819', 'bob@example.com', 2, FALSE),
//   ('Charlie', '+1122334455', 'charlie@example.com', 2, TRUE), -- Unsubscribed (won't receive messages)
//   ('David', '+1222333444', 'nijusajeevnj@gmail.com', 3, FALSE);
