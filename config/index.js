



import dotenv from "dotenv";
import SibApiV3Sdk from "sib-api-v3-sdk"; 

dotenv.config(); 


const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;


export const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
