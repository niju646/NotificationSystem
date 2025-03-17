import express from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.get("/unsubscribe", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send("Email parameter is required");
  }

  try {
    const result = await pool.query(
      "UPDATE students SET unsubscribe = TRUE WHERE email = $1 RETURNING *",
      [decodeURIComponent(email)]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("No student found with this email");
    }

    res.send("You have been successfully unsubscribed from email notifications.");
  } catch (error) {
    console.error("❌ Error unsubscribing:", error);
    res.status(500).send("An error occurred while unsubscribing");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});