/**
 * Code that's on the Espresso Microcontroller as of 7/20/21.
 * 
**/

#include <PID_v1.h>
#include <max6675.h>

//Thermocouple Pins
int MAX6675_SO   = 19;
int MAX6675_CS_2 = 16; //boiler thermocouple
int MAX6675_CS_1 = 17; //grouphead thermocouple
int MAX6675_SCK  = 5;

MAX6675 thermocouple1(MAX6675_SCK, MAX6675_CS_1, MAX6675_SO);
MAX6675 thermocouple2(MAX6675_SCK, MAX6675_CS_2, MAX6675_SO);

//PID Values for Tuning
float Kp = 2.5;
float Ki = 37;
float Kd = 9.6;

//Pins
const uint8_t HEATER_pin = 15;        
const uint8_t POT_pin = A4;          
const uint8_t STEAM_switch_pin = 22; 
const uint8_t WATER_level_indicator = 2;
const uint8_t WATER_level_light = 21;
const uint8_t SOL_valve_pin = 12;
const uint8_t TEMP_led_pin = 23;
double setTemp = 0.0;

// Set Temp Thresholds
double temp_thresh_high = 100.000; // 200F
double temp_thresh_low = 60.000;   // 185F
double steam_temp = 120.000;       // 257F

//Define PID Variables we'll be connecting to
double Setpoint = 93.3;
double Input = 25.0;
double Output = 0.0;

//Specify the links and initial tuning parameters
PID myPID(&Input, &Output, &Setpoint, Kp, Ki, Kd, DIRECT);

//PID PWM window in milliseconds
int WindowSize = 2500;
unsigned long windowStartTime = 0;
double PWMOutput;

// Miscellaneous functional variables
bool heaterOn = false;
int counter = 0;
uint8_t secondsSinceShotPull = 0;

// Added by Nick 5/2/21
bool lowWaterLevel()
{
    return digitalRead(WATER_level_indicator) == LOW;
}

// Added by Nick 5/2/21
// If the Input temp is within 2 degrees Celsius of the Setpoint temp,
// then light up the Temp LED pin. Otherwise, turn it off.
void checkShotPull()
{
    if (Input - 2 <= Setpoint && Input + 2 >= Setpoint)
    {
        digitalWrite(TEMP_led_pin, HIGH);
    }
    else
    {
        digitalWrite(TEMP_led_pin, LOW);
    }
}

void setup()
{
    Serial.begin(115200);

    pinMode(17, OUTPUT);
    digitalWrite(17, HIGH);
    Serial.println("Espresso Code");

    //Heater set-up
    pinMode(HEATER_pin, OUTPUT);
    pinMode(STEAM_switch_pin, INPUT_PULLUP);

    //tell the PID to range between 0 and the full window size
    myPID.SetOutputLimits(0, WindowSize);

    //turn the PID on
    myPID.SetMode(AUTOMATIC);

    delay(500);
}

void loop()
{

    // DEFINE SETPOINT
    if (digitalRead(STEAM_switch_pin) == LOW)
    {
        Setpoint = steam_temp;
    }
    else
    {
        // Read Potentiometer Value
        double potValue = analogRead(POT_pin);
        double setTemp = map(potValue, 0, 930, temp_thresh_low, temp_thresh_high);

        int x = ((thermocouple1.readCelsius() + 4) / 5) * 5;

        Setpoint = (setTemp) + (((setTemp) - (x)) / 3);
    }

    myPID.Compute();

    /************************************************
     turn the output pin on/off based on pid output
    ************************************************/

    unsigned long now = millis(); //Keep track of time

    // Starts a new PWM cycle every WindowSize milliseconds
    if (now - windowStartTime > WindowSize) //time to shift the Relay Window
    {
        windowStartTime += WindowSize;
    }

    checkShotPull();

    // Calculate the number of milliseconds that have passed in the current PWM cycle.
    // If the water level is too low, the heater should be off and the low water level light should be turned on.
    // If that is less than the Output value, the relay is turned ON
    // If that is greater than (or equal to) the Output value, the relay is turned OFF.
    PWMOutput = Output * (WindowSize / 100.00);
    if (lowWaterLevel())
    {
        digitalWrite(HEATER_pin, LOW);
        digitalWrite(17, LOW);
        heaterOn = false;
        digitalWrite(WATER_level_light, HIGH); // turn on low water level light
    }
    else if ((PWMOutput > 100) && (Output > (now - windowStartTime)))
    {
        digitalWrite(WATER_level_light, LOW);
        digitalWrite(HEATER_pin, HIGH);
        digitalWrite(17, HIGH);
        heaterOn = true;
    }
    else
    {
        digitalWrite(WATER_level_light, LOW);
        digitalWrite(HEATER_pin, LOW);
        digitalWrite(17, LOW);
        heaterOn = false;
    }

    if (counter > 7000)
    {
        counter = 0;
        Input = thermocouple2.readCelsius();

        Serial.print("Compensated Brew (C): ");
        Serial.println(Setpoint);
        Serial.print("Set: ");
        Serial.println(setTemp);
        Serial.print("Boiler Temp (C): ");
        Serial.println(Input);
        Serial.print("Heater State: ");
        if (heaterOn)
            Serial.println("ON");
        else
            Serial.println("OFF");

        delay(1000);
    }
    else
        counter++;
}
