

// Define your variables properly so the code can use them
let motorState = "CLOSED"; 
const TEMP_THRESHOLD = 30.0;

// You can delete the "existingSetting" block or turn it into a variable if needed:
const existingSetting = true; 

app.post('/api/data', (req, res) => {
    const { temperature, humidity } = req.body;
    const timestamp = new Date().toLocaleTimeString();

    // --- AUTOMATIC LOGIC ---
    // If temp is too high, set motor to OPEN automatically
    if (temperature > TEMP_THRESHOLD) {
        if (motorState !== "OPEN") {
            motorState = "OPEN";
            console.log(`⚠️ ALERT: Temp is ${temperature}°C. Automatically opening vent!`);
            // Tell the website to update the button color/text
            io.emit('autoMotorUpdate', motorState);
        }
    } 
    else {
        // Optional: Auto-close if it cools down
        if (motorState !== "CLOSED") {
            motorState = "CLOSED";
            console.log(`✅ System cooled to ${temperature}°C. Closing vent.`);
            io.emit('autoMotorUpdate', motorState);
        }
    }

    // Broadcast data to dashboard as usual
    io.emit('sensorUpdate', { temperature, humidity, timestamp, motorState });
    res.status(200).send("Data Processed");
});

// The ESP32 still polls this to know what to do
app.get('/api/motor-status', (req, res) => {
    res.send(motorState);
});