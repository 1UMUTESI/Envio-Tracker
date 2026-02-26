const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- State Variables ---
let motorState = "CLOSED";
const TEMP_THRESHOLD = 30.0;
const USERS_FILE = './data/users.json';


if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE, 'utf8').length < 2) {
    fs.writeFileSync(USERS_FILE, "[]"); // Forces it to be a valid JSON array
    console.log("✅ users.json initialized with []");
}

app.use(express.json());
app.use(express.static('public'));

// --- Auth Routes ---
// --- Auth Routes (SAFE VERSION) ---
app.post('/api/signup', (req, res) => {
    const { username, password, email } = req.body;
    let users = [];
    
    try {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        users = JSON.parse(data);
        if (!Array.isArray(users)) users = []; // Ensure it's a list
    } catch (e) { users = []; }

    if (users.find(u => u && u.username === username)) {
        return res.status(400).send("User exists");
    }

    users.push({ username, password, email });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.send("Success");
});

app.post('/api/login', (req, res) => {
    const { username, password, email } = req.body;
    let users = [];

    try {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        users = JSON.parse(data);
        if (!Array.isArray(users)) users = []; 
    } catch (e) { users = []; }

    const user = users.find(u => u && u.username === username && u.password === password && u.email === email);
    
    if (user) res.send("OK");
    else res.status(401).send("Invalid credentials");
});



// --- IoT Routes ---
app.post('/api/data', (req, res) => {
    const { temperature, humidity } = req.body;
    const timestamp = new Date().toLocaleTimeString();

    // Automatic logic based on temperature
    if (temperature > TEMP_THRESHOLD) {
        if (motorState !== "OPEN") {
            motorState = "OPEN";
            console.log(`⚠️ ALERT: Temp is ${temperature}°C. Automatically opening vent!`);
            io.emit('autoMotorUpdate', motorState);
        }
    } else {
        if (motorState !== "CLOSED") {
            motorState = "CLOSED";
            console.log(`✅ System cooled to ${temperature}°C. Closing vent.`);
            io.emit('autoMotorUpdate', motorState);
        }
    }

    io.emit('sensorUpdate', { temperature, humidity, timestamp, motorState });
    res.status(200).send("Data Processed");
});

app.get('/api/motor-status', (req, res) => {
    res.send(motorState);
});

// --- Socket logic ---
io.on('connection', (socket) => {
    socket.on('toggleMotor', (state) => {
        motorState = state; // Update the actual server variable
        io.emit('autoMotorUpdate', state); // Notify all clients
        console.log(`Manual Override: Motor set to ${state}`);
    });
});

server.listen(3000, () => console.log('🚀 Server running at http://localhost:3000/login.html'));
