



import dotenv from "dotenv";
import SibApiV3Sdk from "sib-api-v3-sdk"; // Sendinblue SDK

dotenv.config(); // Load .env variables

// Configure Sendinblue API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

// Create API instance
export const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
