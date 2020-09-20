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
let readyButton = document.getElementById('ready-button');
let tempText = document.getElementById('temp');
let newText = document.getElementById('new');
let tempHTML = document.getElementById('temp-val')

let arduinoFrequency = 1; // Frequency that the Arduino is sending values

try {
    navigator.bluetooth.getAvailability()
    .then(available => {
        if (available) {
            console.log("This browser supports Bluetooth!");
        }
        else {
            console.log("Doh! Bluetooth is not supported");
        }
    });
} catch (error) {
    console.log(error, "Error! Bluetooth is not supported");
    let div_alert = document.createElement("div");
    div_alert.setAttribute("class", "alert alert-danger");
    div_alert.style.textAlign = "center";
    div_alert.innerHTML = 'We couldn&rsquo;t detect support for the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API">Web Bluetooth API</a> in your web browser. ' +
    'Please try <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#Browser_compatibility"> any of the supported browsers.</a>.';
    let main_section = document.getElementById("main-section")
    main_section.insertBefore(div_alert, document.getElementById("first-row"));
}



function displayTime(displayFrequency) {
    this.start = function() {
        this.interval = setInterval(step, displayFrequency, Date.now());
    }
    this.stop = function() {
        clearInterval(this.interval);
    }

    function step(startTime) {
        var delta  = Date.now() - startTime;
        if (delta <= 1) {
            var seconds = 0;
        }
        else {
            var seconds = Math.floor(delta / displayFrequency);
        }
        document.getElementById('timer').textContent = seconds;
    }
}

// Creating a timer that logs the time every second
var timer = new displayTime(1000);




connectButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    connect();

});

disconnectButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    disconnect();
});

stopButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    stopNotificationsClick();
    // timer.stop();
});

startButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    startNotificationsClick();
    // timer.start();
});

// This creates a connection between the BLE microcontroller and the
// webpage
function connect() {
    return (deviceCache ? Promise.resolve(deviceCache) : requestBluetoothDevice())
    .then(device => connectDeviceAndCacheCharacteristics(device))
    .catch(error => {
        console.log('Argh! ' + error);
        // If the action is cancelled, the button goes back to normal
        connectButton.textContent = "Connect BLE device";
    });
}

function requestBluetoothDevice() {
    // Creating a loading button animation for BLE connect
    var loadingText = '<i class="fa fa-circle-o-notch fa-spin"></i> Connecting Device...';
    connectButton.innerHTML = loadingText;
    console.log('Requesting bluetooth device...');
    let options = {
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
var time = 0;

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
    deviceCache = null;
    disconnectButton.disabled = true;
    connectButton.disabled = false;
}

// If the microcontroller output value is changed, it is logged to the
// web page
function handleCharacteristicValueChanged(event) {
    // Output the value for each event differently
    let tempValue = event.target.value.getFloat32(0, true);
    console.log('Arduino Output for ' + 
        uuidLookup[event.target.uuid] + ': ' + tempValue.toFixed(2));
    if (uuidLookup[event.target.uuid] == 'temp') {
        // Increments the values every time they come in
        // In this case, ticks is the number of seconds
        ++time;
        document.getElementById('timer').textContent = time;
        line_config.data.labels.push(time);

        // Changes the pressure value each time it comes in
        tempText.textContent = tempValue.toFixed(2);
        line_config.data.datasets[0].data.push(tempValue.toFixed(2));

        // Gauge chart updating values
        gauge_config.options.title.text = tempValue.toFixed(2);

        // Updating the label values
        document.getElementById('time-val').innerHTML = `${time} s`;
        document.getElementById('pressure-val').innerHTML = `${tempValue.toFixed(2)} bar`;

        // Updating the gauge chart values
        gauge_config.options.title.text = tempValue.toFixed(2);

        // 20 is the max bar value
        let first_val = (tempValue / 20) * 100;
        let second_val = ((20 - tempValue) / 20) * 100;

        // Emptying the dataset every time
        gauge_config.data.datasets[0].data = [];

        gauge_config.data.datasets[0].data.push(first_val);
        gauge_config.data.datasets[0].data.push(second_val);

        myChart.update();
        myChart1.update();


    } else if (uuidLookup[event.target.uuid] == 'newChar') {
        newText.textContent = tempValue.toFixed(2);
        tempHTML.textContent = tempValue.toFixed(2);
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
        // TODO: this is a lagging point - find a way to make this connection faster
        return server.getPrimaryService(serviceUuid);
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
        for (const entry of characteristics) {
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
        disconnectButton.disabled = false;
        connectButton.disabled = true;
        connectButton.textContent = "Connect BLE device";
        return [tempCharacteristic, newCharacteristic];
    });

}




/* 
#####################################################

This section contains the code necessary for the plotting.

#####################################################
*/

import "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.3/Chart.js"


// $(document).ready(function () {
//     const line_config = {
//         type: 'line',
//         data: {
//             labels: [],
//             datasets: [{
//                 label: "pressure",
//                 backgroundColor: 'red',
//                 borderColor: 'red',
//                 data: [],
//                 fill: false,
//             }],
//         },
//         options: {
//             legend: {
//                 position: 'bottom',
//                 display: false
//             },
//             responsive: true,
//             title: {
//                 display:false,
//             },
//             tooltips: {
//                 mode: 'index',
//                 intersect: false,
//             },
//             hover: {
//                 mode: 'nearest',
//                 intersect: true
//             },
//             scales: {
//                 xAxes: [{
//                     display: true,
//                     scaleLabel: {
//                         display: true,
//                         labelString: 'time (sec)',
//                         fontSize: 20,
//                     },
//                     ticks: {
//                         max: 60,
//                         min: 0
//                     }
//                 }],
//                 yAxes: [{
//                     display: true,
//                     scaleLabel: {
//                         display: true,
//                         labelString: 'pressure (bar)',
//                         fontSize: 20,
//                     },
//                     ticks: {
//                         max: 14,
//                         min: 0,
//                     }
//                 }]
//             }
//         }
//     };
//     const gauge_config = {
//         type: 'doughnut',
//         data: {
//             labels: false,
//             datasets: [{
//                 borderColor: "white",
//                 backgroundColor: ["red", "gray"],
//                 data: [],
//                 fill: false,
//             }],
//         },
//         options: {
//             title: {
//                 display:true,
//                 text: [],
//                 position: "bottom",
//                 fontSize: 20,
//             },
//             circumference: 1.5 * Math.PI,
//             rotation: 0.75 * Math.PI,
//             cutoutPercentage: 50,
//             legend: {
//                 display: false,
//             },
//             tooltips: {
//                 enabled: false
//             }
            
//         }
//     };

//     const line_ctx = document.getElementById('myChart').getContext('2d');
//     const myChart = new Chart(line_ctx, line_config);

//     const gauge_ctx = document.getElementById('myChart1').getContext('2d');
//     const myChart1 = new Chart(gauge_ctx, gauge_config);

//     const source = new EventSource("/chart-data");

//     source.onmessage = function (event) {
//         const data = JSON.parse(event.data);

//         // Increments the values every time they come in
//         // In this case, ticks is the number of seconds
//         // ticks += 1;
//         // timeText.textContent = ticks;
//         // Updating the line chart values
//         line_config.data.labels.push(data.time);
//         line_config.data.datasets[0].data.push(data.value.toFixed(2));
        
//         // Updating the label values
//         document.getElementById('time-val').innerHTML = `${data.time} s`;
//         document.getElementById('pressure-val').innerHTML = `${data.value.toFixed(2)} bar`;

//         // Updating the gauge chart values
//         gauge_config.options.title.text = data.value.toFixed(2);

//         // 20 is the max bar value
//         let first_val = (data.value / 20) * 100;
//         let second_val = ((20 - data.value) / 20) * 100;

//         // Emptying the dataset every time
//         gauge_config.data.datasets[0].data = [];

//         gauge_config.data.datasets[0].data.push(first_val);
//         gauge_config.data.datasets[0].data.push(second_val);

//         myChart1.update();

//         myChart.update();
//     }


// });


const line_config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: "pressure",
            backgroundColor: 'red',
            borderColor: 'red',
            data: [],
            fill: false,
        }],
    },
    options: {
        legend: {
            position: 'bottom',
            display: false
        },
        responsive: true,
        title: {
            display:false,
        },
        tooltips: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'time (sec)',
                    fontSize: 20,
                },
                ticks: {
                    max: 60,
                    min: 0
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'pressure (bar)',
                    fontSize: 20,
                },
                ticks: {
                    max: 14,
                    min: 0,
                }
            }]
        }
    }
};

const gauge_config = {
    type: 'doughnut',
    data: {
        labels: false,
        datasets: [{
            borderColor: "white",
            backgroundColor: ["red", "gray"],
            data: [],
            fill: false,
        }],
    },
    options: {
        title: {
            display:true,
            text: [],
            position: "bottom",
            fontSize: 20,
        },
        circumference: 1.5 * Math.PI,
        rotation: 0.75 * Math.PI,
        cutoutPercentage: 50,
        legend: {
            display: false,
        },
        tooltips: {
            enabled: false
        }
        
    }
};

const line_ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(line_ctx, line_config);

const gauge_ctx = document.getElementById('myChart1').getContext('2d');
const myChart1 = new Chart(gauge_ctx, gauge_config);
