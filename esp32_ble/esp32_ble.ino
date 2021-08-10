/**
* Creating a demo BLE server for the SparkFun ESP32 Thing Plus board.
* https://github.com/sparkfun/ESP32_Thing_Plus
*
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <string>

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
BLECharacteristic* randCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint32_t value = 0;
float randomVal = 0.0;


#define LED_SERVICE_UUID        "6a521c59-55b5-4384-85c0-6534e63fb09e"
#define LED_CHARACTERISTIC_UUID "6a521c60-55b5-4384-85c0-6534e63fb09e"
#define RAND_CHARACTERISTIC_UUID "6a521c61-55b5-4384-85c0-6534e63fb09e"


class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
    
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      Serial.println("********");
      Serial.println("New Value: ");
      for (auto letter: value) {
        Serial.print(letter);
      }
      Serial.println();
      Serial.println("********");
    }
  }
};


void setup() {
  Serial.begin(115200);

  // Create the BLE Device
  BLEDevice::init("Argos Odyssey Espresso");

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(LED_SERVICE_UUID);

  // Create a BLE Characteristic 
  // This reads data sent from a remote device and outputs it to
  // the serial monitor
  pCharacteristic = pService->createCharacteristic(
    LED_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ   |
    BLECharacteristic::PROPERTY_WRITE
  );

  randCharacteristic = pService->createCharacteristic(
    RAND_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ   |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->setCallbacks(new MyCallbacks());
  // Create a BLE Descriptor
  // pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setValue("Hello World");
  randCharacteristic->setValue(randomVal);

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(LED_SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  Serial.println("Waiting a client connection to notify...");
}


void loop() {
    // notify changed value
    randomVal = (random(1, 99) / 100.0) + random(2, 12);
    if (deviceConnected) {
      delay(1000);
      randCharacteristic->setValue((uint8_t*)&randomVal, 4);
      randCharacteristic->notify();
      Serial.println(randomVal);
      delay(3); // bluetooth stack will go into congestion otherwise
    }
    // disconnecting
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising
        Serial.println("start advertising");
        oldDeviceConnected = deviceConnected;
    }
    // connecting
    if (deviceConnected && !oldDeviceConnected) {
        // do stuff here on connecting
        oldDeviceConnected = deviceConnected;
    }
}
