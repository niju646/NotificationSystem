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

