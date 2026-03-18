#include <WebSocketsClient.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <DHT.h>

/* ------------ WIFI ------------ */
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

/* ------------ SERVER ------------ */
const char* host = "192.168.1.100";   // Node.js server IP
const uint16_t port = 3000;

/* ------------ DHT ------------ */
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

/* ------------ ULTRASONIC ------------ */
#define TRIG_PIN 12
#define ECHO_PIN 14

/* ------------ MOTOR ------------ */
#define MOTOR_PIN 5

String motorState = "CLOSED";
bool autoMode = true;

/* ------------ SOCKET ------------ */
WebSocketsClient socketIo;
unsigned long lastSensorSend = 0;

/* ---------- SEND MOTOR UPDATE ---------- */
void sendMotorUpdate() {
  JsonDocument doc; // Updated for ArduinoJson v7
  JsonArray arr = doc.to<JsonArray>();

  arr.add("autoMotorUpdate");
  arr.add(motorState);

  String output;
  serializeJson(doc, output);
  // Socket.io formatted message for text: 42["event", "data"]
  socketIo.sendTXT("42" + output);
}

/* ---------- SEND SENSOR DATA ---------- */
void sendSensor(float temp, float hum, float distance) {
  JsonDocument doc; 
  JsonArray arr = doc.to<JsonArray>();

  arr.add("sensorUpdate");

  JsonObject data = arr.add<JsonObject>(); // Updated for ArduinoJson v7
  data["temperature"] = temp;
  data["humidity"] = hum;
  data["distance"] = distance;
  data["motorState"] = motorState;

  String output;
  serializeJson(doc, output);
  socketIo.sendTXT("42" + output);
}

/* ---------- MOTOR CONTROL ---------- */
void setMotor(String state) {
  if(state == "OPEN") {
    digitalWrite(MOTOR_PIN, HIGH);
    motorState = "OPEN";
  } else {
    digitalWrite(MOTOR_PIN, LOW);
    motorState = "CLOSED";
  }
  sendMotorUpdate();
}

/* ---------- DISTANCE FUNCTION ---------- */
float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 400; // Return max distance if no pulse

  float distance = duration * 0.034 / 2;
  return distance;
}

/* ---------- SOCKET EVENTS ---------- */
void socketIoEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[IO] Disconnected!");
      break;

    case WStype_CONNECTED:
      Serial.println("[IO] Connected to Server");
      // Required for Socket.io handshake
      socketIo.sendTXT("40"); 
      break;

    case WStype_TEXT: {
      String text = (char*)payload;
      
      // Check if it's a Socket.io event (starts with 42)
      if(text.startsWith("42")) {
        JsonDocument doc;
        deserializeJson(doc, text.substring(2));

        String eventName = doc[0];
        if(eventName == "toggleMotor") {
          autoMode = false; // manual override
          String state = doc[1];
          setMotor(state);
        }
      }
      break;
    }
    default:
      break;
  }
}

/* ---------- SETUP ---------- */
void setup() {
  Serial.begin(115200);

  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(MOTOR_PIN, LOW);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  
  // Socket.io v4 connection string
  socketIo.begin(host, port, "/socket.io/?EIO=4&transport=websocket");
  socketIo.onEvent(socketIoEvent);
  socketIo.setReconnectInterval(5000);
}

/* ---------- LOOP ---------- */
void loop() {
  socketIo.loop();

  float distance = getDistance();
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  /* AUTO DOOR LOGIC */
  if(autoMode) {
    if(distance > 0 && distance < 30) {
      if(motorState != "OPEN") setMotor("OPEN");
    }
    else if(distance >= 30) {
      if(motorState != "CLOSED") setMotor("CLOSED");
    }
  }

  /* SEND DATA EVERY 3s */
  if(millis() - lastSensorSend > 3000) {
    lastSensorSend = millis();
    sendSensor(temp, hum, distance);
  }
}
