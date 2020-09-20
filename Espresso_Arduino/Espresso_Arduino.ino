/*
  Arduino application to control the Odyssey Espresso Machine sensor readings.

  Using an Arduino Nano 33 BLE Sense board.

*/

#include <ArduinoBLE.h>
#include <Arduino_HTS221.h> // reads temperature and humidity
#include <Arduino_LPS22HB.h> // reads the pressure

const int ledPin = LED_BUILTIN; // set ledPin to on-board LED
const int buttonPin = 4; // set buttonPin to digital pin 4

BLEService ledService("6a521c59-55b5-4384-85c0-6534e63fb09e"); // create service

// create switch characteristic and allow remote device to read and write
BLEByteCharacteristic ledCharacteristic("6a521c60-55b5-4384-85c0-6534e63fb09e", BLERead | BLEWrite);

// create button characteristic and allow remote device to get notifications
BLEFloatCharacteristic buttonCharacteristic("6a521c61-55b5-4384-85c0-6534e63fb09e", BLERead | BLENotify);

// This will be used for the temperature sensor
BLEFloatCharacteristic newCharacteristic("6a521c62-55b5-4384-85c0-6534e63fb09e", BLERead | BLENotify);

void celsius_to_fahr(float &temp) {
  temp = ((temp * 9) / 5) + 32;
}


void setup() {
  Serial.begin(9600);
  // while (!Serial);

  pinMode(ledPin, OUTPUT); // use the LED as an output
  pinMode(buttonPin, INPUT); // use button pin as an input

  // begin initialization
  if (!BLE.begin()) {
    Serial.println("starting BLE failed!");

    while (1);
  }

  if (!HTS.begin()) {
    Serial.println("Failed to initialize humidity/temperatute sensor!");
    while (1);
  }

  // set the local name peripheral advertises
  BLE.setLocalName("Nick's App");
  // set the UUID for the service this peripheral advertises:
  BLE.setAdvertisedService(ledService);

  // add the characteristics to the service
  ledService.addCharacteristic(ledCharacteristic);
  ledService.addCharacteristic(buttonCharacteristic);
  ledService.addCharacteristic(newCharacteristic);

  // add the service
  BLE.addService(ledService);

  ledCharacteristic.writeValue(0);
  buttonCharacteristic.writeValue(0);
  newCharacteristic.writeValue(0);

  // start advertising
  BLE.advertise();

  Serial.println("Bluetooth device active, waiting for connections...");
}

void loop() {
  // poll for BLE events
  BLE.poll();

  // read the current button pin state
//  char buttonValue = digitalRead(buttonPin);
  float buttonValue = (random(1, 99) / 100.0) + random(2, 12);

  // has the value changed since the last read
  boolean buttonChanged = (buttonCharacteristic.value() != buttonValue);

  // Read the temperature and humidity values
  float temperature = HTS.readTemperature();
  float humidity = HTS.readHumidity();

  celsius_to_fahr(temperature);

  if (buttonChanged) {
    // button state changed, update characteristics
    Serial.println("Button changed");
    Serial.println(buttonValue);
    Serial.println("Temp value: ");
    Serial.print(temperature);
    ledCharacteristic.writeValue(buttonValue);
    buttonCharacteristic.writeValue(buttonValue);
    newCharacteristic.writeValue(temperature);
  }
  delay(3000);

  if (ledCharacteristic.written() || buttonChanged) {
    // update LED, either central has written to characteristic or button state has changed
    if (ledCharacteristic.value()) {
      Serial.println("LED on");
      digitalWrite(ledPin, HIGH);
    } else {
      Serial.println("LED off");
      digitalWrite(ledPin, LOW);
    }
  }
}
