



import { apiInstance } from '../config/index.js';

export const sendEmail = async (recipients, template, htmlContent) => {
  try {
    const sendSmtpEmail = {
      sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
      to: recipients.map(email => ({ email, name: email })),
      subject: "📢 LMS Notification",
      htmlContent: htmlContent, // Use the formatted HTML
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent successfully:", response);
  } catch (error) {
    console.error("❌ Error sending email:", error.response ? error.response.data : error);
  }
};
