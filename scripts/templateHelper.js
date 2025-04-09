// // scripts/templateHelper.js
// import pkg from "pg";
// import dotenv from "dotenv";

// dotenv.config();
// const { Pool } = pkg;

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// export const resolveTemplate = async (notificationId, template, recipient) => {
//   try {
//     // Fetch variables for the notification
//     const { rows: variables } = await pool.query(
//       "SELECT variable_name, table_name, column_name, master_id FROM notification_template_variable WHERE notification_id = $1",
//       [notificationId]
//     );

//     let resolvedMessage = template;

//     // Replace each variable in the template
//     for (const variable of variables) {
//       const { variable_name, table_name, column_name, master_id } = variable;
//       let value;

//       if (table_name === "students") {
//         // Fetch student-specific data (e.g., name)
//         const { rows } = await pool.query(
//           `SELECT ${column_name} FROM ${table_name} WHERE email = $1 OR phone = $2`,
//           [recipient, recipient]
//         );
//         value = rows[0]?.[column_name] || "Unknown";
//         console.log(`Fetched ${variable_name} for ${recipient} from ${table_name}.${column_name}: ${value}`); // Debug log
//       } else if (table_name === "webinar") {
//         // Fetch webinar-specific data (e.g., title, date, time)
//         const { rows } = await pool.query(
//           `SELECT ${column_name} FROM ${table_name} WHERE id = $1`,
//           [master_id]
//         );
//         value = rows[0]?.[column_name] || "Unknown";
//         console.log(`Fetched ${variable_name} for webinar ID ${master_id} from ${table_name}.${column_name}: ${value}`); // Debug log
//       }

//       // Replace the variable in the template (e.g., <#name> -> Student Name)
//       const placeholder = `<#${variable_name}>`;
//       resolvedMessage = resolvedMessage.replace(new RegExp(placeholder, 'g'), value);
//     }

//     return resolvedMessage;
//   } catch (error) {
//     console.error("❌ Error resolving template:", error);
//     return template; // Fallback to original template if resolution fails
//   }
// };

// scripts/templateHelper.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export const resolveTemplate = async (notificationId, template, recipient, webinarId) => {
  try {
    // Fetch variables for the notification
    const { rows: variables } = await pool.query(
      "SELECT variable_name, table_name, column_name, master_id FROM notification_template_variable WHERE notification_id = $1",
      [notificationId]
    );

    let resolvedMessage = template;

    // Replace each variable in the template
    for (const variable of variables) {
      const { variable_name, table_name, column_name, master_id } = variable;
      let value;

      if (table_name === "students") {
        // Fetch student-specific data (e.g., name)
        const { rows } = await pool.query(
          `SELECT ${column_name} FROM ${table_name} WHERE email = $1 OR phone = $2`,
          [recipient, recipient]
        );
        value = rows[0]?.[column_name] || "Unknown";
        console.log(`Fetched ${variable_name} for ${recipient} from ${table_name}.${column_name}: ${value}`); // Debug log
      } else if (table_name === "webinar") {
        // Use webinarId if provided, fallback to master_id if webinarId is null or undefined
        const webinarIdToUse = webinarId || master_id;
        if (webinarIdToUse) {
          const { rows } = await pool.query(
            `SELECT ${column_name} FROM ${table_name} WHERE id = $1`,
            [webinarIdToUse]
          );
          value = rows[0]?.[column_name] || "Unknown";
          // Format date if the column is 'date'
          if (column_name === "date") {
            value = new Date(value).toLocaleDateString();
          }
          // Ensure time is a string if the column is 'time'
          else if (column_name === "time") {
            value = value.toString();
          }
          console.log(`Fetched ${variable_name} for webinar ID ${webinarIdToUse} from ${table_name}.${column_name}: ${value}`); // Debug log
        } else {
          value = "Unknown";
          console.log(`No webinar ID available for ${variable_name}`);
        }
      }

      // Replace the variable in the template (e.g., <#name> -> Student Name)
      const placeholder = `<#${variable_name}>`;
      resolvedMessage = resolvedMessage.replace(new RegExp(placeholder, 'g'), value);
    }

    return resolvedMessage;
  } catch (error) {
    console.error("❌ Error resolving template:", error);
    return template; // Fallback to original template if resolution fails
  }
};
