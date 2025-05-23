// // // utils/emailSender.js
// // import { apiInstance } from '../config/index.js';

// // export const sendEmail = async (recipients, subject, htmlContent) => {
// //   try {
// //     const sendSmtpEmail = {
// //       sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
// //       to: Array.isArray(recipients) ? recipients.map(email => ({ email, name: email })) : [{ email: recipients, name: recipients }],
// //       subject: subject || "📢 LMS Notification",
// //       htmlContent: htmlContent,
// //     };

// //     const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
// //     console.log("✅ Email sent successfully:", response);
// //     return response; // Return the response so it can be used by the caller
// //   } catch (error) {
// //     console.error("❌ Error sending email:", error.response ? error.response.data : error);
// //     throw error; // Throw the error to be handled by the caller
// //   }
// // };


// import { apiInstance } from '../config/index.js';

// export const sendEmail = async (recipients, subject, htmlContent, attachments = []) => {
//   try {
//     // Prepare attachments for Sendinblue API
//     // const sendinblueAttachments = attachments.map(attachment => ({
//     //   name: attachment.filename,
//     //   content: attachment.content.toString('base64'), // Convert Buffer to base64
//     // }));

//     const sendSmtpEmail = {
//       sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
//       to: Array.isArray(recipients) ? recipients.map(email => ({ email, name: email })) : [{ email: recipients, name: recipients }],
//       subject: subject,
//       htmlContent: htmlContent,
//       // attachment: sendinblueAttachments.length > 0 ? sendinblueAttachments : undefined,
//     };

//     const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
//     console.log("✅ Email sent successfully:", {
//       messageId: response.messageId,
//       recipients: recipients,
//       subject: subject,
//     });
//     return response;
//   } catch (error) {
//     const errorDetails = error.response ? error.response.data : error.message;
//     console.error("❌ Error sending email:", {
//       error: errorDetails,
//       recipients: recipients,
//       subject: subject,
//     });
//     throw new Error(`Failed to send email: ${JSON.stringify(errorDetails)}`);
//   }
// };



import { apiInstance } from '../config/index.js';

export const sendEmail = async (recipients, subject, htmlContent, attachments = [], replyTo = null) => {
  try {
    // Prepare attachments for Sendinblue API
    // const sendinblueAttachments = attachments.map(attachment => ({
    //   name: attachment.filename,
    //   content: attachment.content.toString('base64'), // Convert Buffer to base64
    // }));

    const sendSmtpEmail = {
      sender: { name: "LMS", email: process.env.SENDINBLUE_EMAIL },
      to: Array.isArray(recipients) ? recipients.map(email => ({ email, name: email })) : [{ email: recipients, name: recipients }],
      subject: subject,
      htmlContent: htmlContent,
      // attachment: sendinblueAttachments.length > 0 ? sendinblueAttachments : undefined,
      replyTo: replyTo ? { email: replyTo } : undefined, // Added replyTo field for Sendinblue API
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent successfully:", {
      messageId: response.messageId,
      recipients: recipients,
      subject: subject,
      replyTo: replyTo || 'Not set',
    });
    return response;
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error("❌ Error sending email:", {
      error: errorDetails,
      recipients: recipients,
      subject: subject,
      replyTo: replyTo || 'Not set',
    });
    throw new Error(`Failed to send email: ${JSON.stringify(errorDetails)}`);
  }
};