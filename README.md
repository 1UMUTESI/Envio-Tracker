#The Envio-Track project
##Objectives
Envio-Track is a real-time IoT Monitoring Dashboard designed to track environmental conditions (Temperature & Humidity) and 
provide automated/manual control over a motor (or actuator) via a web interface.

Features
Real-time Dashboard: Built with Socket.io for instant data updates without refreshing.
Automated Motor Logic: The server automatically triggers the motor based on temperature thresholds (e.g., > 30°C).
Manual Override: Control the motor status directly from the web dashboard.
REST API: Ready to receive data from ESP32, Arduino, or other IoT devices via JSON

###Tech tracks:
Backend: Node.js, Express.js
Real-Time: Socket.io
Frontend: HTML5, CSS3 (Modern UI), JavaScript
Hardware Compatible: ESP32, ESP8266, DHT11/22 Sensors
Getting Started

####Prerequisites
1. Make sure you have Node.js installed on your machine.
2.InstallationClone the repository and install the dependencies:
git clone https://github.com/YOUR_USERNAME/Envio-Track.git
cd Envio-Track
npm install

3. Run the ServerBashnode server.js
The dashboard will be live at: http://localhost:3000
License
This project is open-source and available under the MIT License.
