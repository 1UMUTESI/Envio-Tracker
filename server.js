const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true // THIS IS THE FIX
});

let motorState = "CLOSED";
const TEMP_THRESHOLD = 30.0;
const USERS_FILE = './data/users.json';

/* ===============================
   EMAIL SETUP (GMAIL)
================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // ← set in Railway
    pass: process.env.EMAIL_PASS    // ← set in Railway
  }
});

function sendLoginEmail(userEmail) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Envio-Track Login Alert",
    text: "You have successfully logged into Envio-Track dashboard."
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log("Email error:", error);
    else console.log("✅ Email sent:", info.response);
  });
}

/* ===============================
   FILE INITIALIZATION
================================ */
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.json());
app.use(express.static('public'));

/* ===============================
   SIGNUP ROUTE
================================ */
app.post('/api/signup', (req, res) => {
  const { username, password, email } = req.body;
  let users = [];
  try { users = JSON.parse(fs.readFileSync(USERS_FILE)); } catch { users = []; }
  if (users.find(u => u.username === username)) return res.status(400).send("User exists");
  users.push({ username, password, email });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.send("Success");
});

/* ===============================
   LOGIN ROUTE
================================ */
app.post('/api/login', (req, res) => {
  const { username, password, email } = req.body;
  let users = [];
  try { users = JSON.parse(fs.readFileSync(USERS_FILE)); } catch { users = []; }

  const user = users.find(
    u => u.username === username &&
         u.password === password &&
         u.email === email
  );

  if (user) {
    sendLoginEmail(email);
    res.send("OK");
  } else {
    res.status(401).send("Invalid credentials");
  }
});

/* ===============================
   IOT DATA ROUTE
================================ */
app.post('/api/data', (req, res) => {
  const { temperature, humidity } = req.body;
  const timestamp = new Date().toLocaleTimeString();

  if (temperature > TEMP_THRESHOLD && motorState !== "OPEN") {
    motorState = "OPEN";
    console.log(`⚠️ Temp ${temperature}°C → Opening vent`);
    io.emit('autoMotorUpdate', motorState);
  } else if (temperature <= TEMP_THRESHOLD && motorState !== "CLOSED") {
    motorState = "CLOSED";
    console.log(`✅ Temp normal → Closing vent`);
    io.emit('autoMotorUpdate', motorState);
  }

  io.emit('sensorUpdate', { temperature, humidity, timestamp, motorState });
  res.send("Data Processed");
});

/* ===============================
   MOTOR STATUS
================================ */
app.get('/api/motor-status', (req, res) => {
  res.send(motorState);
});

/* ===============================
   SOCKET.IO
================================ */
io.on('connection', (socket) => {
  console.log("Client connected");
  socket.on('toggleMotor', (state) => {
    motorState = state;
    io.emit('autoMotorUpdate', state);
    console.log(`Manual Override → ${state}`);
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));