/* 
#####################################################

This section contains the code necessary for the connecting and reading
the values emitted from the Bluetooth Low Enerygy Device.

#####################################################
*/

// GATT searches for only this device name
var deviceName = "Nick's App";

// These are the random UUIDs that I generated
const serviceUuid = "6a521c59-55b5-4384-85c0-6534e63fb09e";
const characteristicsUUID = {
    led: "6a521c60-55b5-4384-85c0-6534e63fb09e",
    temp: "6a521c61-55b5-4384-85c0-6534e63fb09e",
    newChar: "6a521c62-55b5-4384-85c0-6534e63fb09e",
}
const uuidLookup = {
    "6a521c60-55b5-4384-85c0-6534e63fb09e": "led",
    "6a521c61-55b5-4384-85c0-6534e63fb09e": "temp",
    "6a521c62-55b5-4384-85c0-6534e63fb09e": "newChar",
}

var bluetoothDevice;
var batteryLevel;

let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let startButton = document.getElementById('start');
let stopButton = document.getElementById('stop');
let deviceCache = null;
let tempCharacteristic = null;
let newCharacteristic = null;
let terminalContainer = document.getElementById('terminal');
let readyButton = document.getElementById('ready');
let tempText = document.getElementById('temp');
let newText = document.getElementById('new');

readyButton.style.color = "gray";

connectButton.addEventListener('click', function() {
    event.stopPropagation();
    event.preventDefault();
    connect();
});

disconnectButton.addEventListener('click', function() {
    event.stopPropagation();
    event.preventDefault();
    disconnect();
});

stopButton.addEventListener('click', function() {
    event.stopPropagation();
    event.preventDefault();
    stopNotificationsClick();
});

startButton.addEventListener('click', function() {
    event.stopPropagation();
    event.preventDefault();
    startNotificationsClick();
});

// This creates a connection between the BLE microcontroller and the
// webpage
function connect() {
    return (deviceCache ? Promise.resolve(deviceCache) : requestBluetoothDevice())
    .then(device => connectDeviceAndCacheCharacteristics(device))
    .catch(error => console.log('Argh! ' + error));
}

function requestBluetoothDevice() {
    console.log('Requesting bluetooth device...');
    let options = {
        // acceptAllDevices: true // option to accept all devices
        optionalServices: [serviceUuid],
        "filters": [
            {"name": deviceName}
        ]
    }

    return navigator.bluetooth.requestDevice(options)
    .then(device => {
        console.log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        deviceCache.addEventListener('gattserverdisconnnected',
            handleDisconnection);

        return deviceCache;
    });
}

// If the device is unintentionally disconnected, it will attempt to
// reconnect
function handleDisconnection(event) {
    let device = event.target;

    console.log('"' + device.name + 
        '" bluetooth device disconnected, trying to reconnect...');
    
    connectDeviceAndCacheCharacteristics(device)
    .then(characteristic => startNotifications(characteristic))
    .catch(error => console.log('Reconnection Error: ' + error));
}

// Provide a method to start the notifications upon clicking the
// `start` button
function startNotificationsClick() {
    console.log('Starting notifications...');
    tempCharacteristic.startNotifications()
    .then(() => {
            console.log('Notifications started');
            tempCharacteristic.addEventListener('characteristicvaluechanged',
                handleCharacteristicValueChanged)
    });
    newCharacteristic.startNotifications()
    .then(() => {
            console.log('Notifications started');
            newCharacteristic.addEventListener('characteristicvaluechanged',
                handleCharacteristicValueChanged)
    });
    stopButton.disabled = false;
    startButton.disabled = true;
}

// Provide a method to stop the notifications upon clicking the
// `stop` button
function stopNotificationsClick() {
    console.log('Stopping notifications...');
    if (deviceCache) {
        deviceCache.removeEventListener('gattservicedisconnected',
            handleDisconnection);
    }

    if (tempCharacteristic) {
        tempCharacteristic.stopNotifications();
    }
    if (newCharacteristic) {
        newCharacteristic.stopNotifications();
    }
    console.log('Notifications stopped')
    stopButton.disabled = true;
    startButton.disabled = false;
    
}

// Provide a method to disconnect the device upon clicking the
// `disconnect` button
function disconnect() {
    if (deviceCache) {
        console.log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
        deviceCache.removeEventListener('gattservicedisconnected',
            handleDisconnection);
        if (deviceCache.gatt.connected) {
            deviceCache.gatt.disconnect();
            console.log('"' + deviceCache.name + '" bluetooth device disconnnected');
        }
        else {
            console.log('"' + deviceCache.name + 
                '" bluetooth device is already disconnected');
        }
    }

    if (tempCharacteristic) {
        tempCharacteristic.removeEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
            tempCharacteristic = null;
    }
    if (newCharacteristic) {
        newCharacteristic.removeEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
            newCharacteristic = null;
    }
    disconnectButton.disabled = true;
    connectButton.disabled = false;
    deviceCache = null;
}

// If the microcontroller output value is changed, it is logged to the
// web page
function handleCharacteristicValueChanged(event) {
    // Output the value for each event differently
    let tempValue = event.target.value.getFloat32(0, true);
    console.log('Aruino Output for ' + 
        uuidLookup[event.target.uuid] + ': ' + tempValue.toFixed(2));
    if (uuidLookup[event.target.uuid] == 'temp') {
        tempText.textContent = tempValue.toFixed(2);
    } else if (uuidLookup[event.target.uuid] == 'newChar') {
        newText.textContent = tempValue.toFixed(2);
    }

}

function log(data, type = '') {
    terminalContainer.insertAdjacentHTML('beforeend',
        '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

function connectDeviceAndCacheCharacteristics(device) {
    if (device.gatt.connected && tempCharacteristic) {
        return Promise.resolve(tempCharacteristic);
    }
    console.log('Connecting to GATT server...');
    return device.gatt.connect()
    .then(server => {
        console.log('GATT server connected, getting service...');
        return server.getPrimaryService(serviceUuid)
    })
    .then(service => {
        console.log('Service found, getting characteristic...');
        // Checking for all characteristics emitted
        return service.getCharacteristics();
    })
    .then(characteristics => {
        console.log('Characteristics found');
        // Assigning the relevant characteristics from the Arduino to
        // the HTML page
        for (entry of characteristics) {
            if (entry.uuid === characteristicsUUID["temp"]) {
                tempCharacteristic = entry;
                console.log('temp: ' + tempCharacteristic);
            } else if (entry.uuid === characteristicsUUID["newChar"]) {
                newCharacteristic = entry;
                console.log('new: ' + newCharacteristic);

            }
        }
        readyButton.style.color = 'green';
        startButton.disabled = false;
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        return [tempCharacteristic, newCharacteristic];
    });

}

