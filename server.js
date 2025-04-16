const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const mysql = require("mysql2"); // Changed from mongoose
require("dotenv").config();
const WebSocket = require("ws"); // Import WebSocket library

const app = express();

// Enable CORS
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify MySQL connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database!");
  connection.release();
});
////////////////
// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 }); // Choose a different port

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => console.log("Client disconnected"));
});

// Function to send a message to all connected clients
function broadcastNewData() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("newData"); // Simple message indicating new data
    }
  });
}
////////////
// API endpoint to get trading data with pagination
app.get("/api/data", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const offset = page * limit;

    // Get total number of rows
    const [totalRows] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM trading_data"); // Replace with your actual table name

    const total = totalRows[0].total;

    // Fetch data with pagination
    const [rows] = await pool
      .promise()
      .query("SELECT * FROM trading_data ORDER BY timestamp DESC LIMIT ?, ?", [
        offset,
        limit,
      ]); // Corrected the query

    res.status(200).json({
      success: true,
      data: rows,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook endpoint for TradingView
app.post("/api/webhook", async (req, res) => {
  try {
    if (!req.body || !req.body.symbol || !req.body.price || !req.body.signal_) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const { symbol, price, signal_, timestamp, additional_info } = req.body;
    const timestampValue = timestamp || new Date();

    // Insert data into MySQL table
    await pool.promise().query(
      "INSERT INTO trading_data (symbol, price, signal_, timestamp, additional_info) VALUES (?, ?, ?, ?, ?)",
      [symbol, price, signal_, timestampValue, additional_info] // Make sure additional_info is here
    );

    console.log("Received webhook data:", req.body);
    broadcastNewData();
    res
      .status(200)
      .json({ success: true, message: "Data received successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
