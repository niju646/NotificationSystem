// utils/emailSender.js
import { apiInstance } from '../config/index.js';

export const sendEmail = async (recipients, subject, htmlContent) => {
  try {
    const sendSmtpEmail = {
      sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
      to: Array.isArray(recipients) ? recipients.map(email => ({ email, name: email })) : [{ email: recipients, name: recipients }],
      subject: subject || "📢 LMS Notification",
      htmlContent: htmlContent,
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent successfully:", response);
    return response; // Return the response so it can be used by the caller
  } catch (error) {
    console.error("❌ Error sending email:", error.response ? error.response.data : error);
    throw error; // Throw the error to be handled by the caller
  }
};

// import { apiInstance } from '../config/index.js';

// export const sendEmail = async (recipients, template, htmlContent) => {
//   try {
//     const sendSmtpEmail = {
//       sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
//       to: recipients.map(email => ({ email, name: email })),
//       subject: "📢 LMS Notification",
//       htmlContent: htmlContent, 
//     };

//     const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
//     console.log("✅ Email sent successfully:", response);
//   } catch (error) {
//     console.error("❌ Error sending email:", error.response ? error.response.data : error);
//   }
// };
