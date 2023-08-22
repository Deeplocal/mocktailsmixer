/*
 * Basic Description of firmware functionality:
 * Mixology Pushbutton state is constantly monitored. When pressed, we start "conversational user experience"
 * animation and send a "button" message to the PI. We remain in this state until either:
 *   - we receive a bottle command to turn on a relay from PI -OR-
 *   - we receive an "inactive state" message (o!) from PI
 * If we send a button pressed message to PI, but don't receive an 'a!" confirmation and also don't receive a relay on message
 * within 30 seconds, we can assume a fault and will being reading the button pin again.
 * All commands from PI are terminated with an '!'
 * Bottle commands include:
 *    - 'b' (bottle command), 0-7 (bottle index number), 'r' (relay on) or 'l' (relay off), '!' (termination statement)
 * Conversational User State messages either
 *    - 'a!' => ACTIVE
 *    - 'o!'  => INACTIVE
 * LED animation rate controlled by _LEDrate variable -> default value is 10 (milliseconds between updates)
 * LED animation brightness MIN and MAX controlled by BASE_BRIGHTNESS and RAISED_BRIGHTNESS constants
 *    
 * Bottle numbers are 0-7 _indexed.
 * PIN 3 =  relay/bottle 0
 * PIN 4 =  relay/bottle 1
 * PIN 5 =  relay/bottle 2
 * PIN 7 =  relay/bottle 3
 * PIN 8 =  relay/bottle 4
 * PIN 9 =  relay/bottle 5
 * PIN 10 = relay/bottle 6
 * PIN 11 = relay/bottle 7
 * 
 * PIN 2 = pushbutton switch
 * PIN 6 = NeoPixel LED rings (with 330 Ohm series resistor)
 **********************************************************************
 *OTHER NOTES:
 *relay unit in this version is active LOW, so operation is logically reversed (LOW write to a digital pin turns
 *relays ON). 
 */

#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
  #include <avr/power.h>
#endif

#define BUTTON_PIN 2 // pin connected to the arcade style pushbutton

#define NUM_BOTTLES 8
#define NUM_RINGS 9
#define NEO_PIN 6
#define BASE_BRIGHTNESS 50
#define RAISED_BRIGHTNESS 200
#define MAX_CMD_SIZE 8
#define PIX_RING_SIZE 24
#define NUM_PIX (PIX_RING_SIZE*NUM_RINGS)
#define CUX_LED_INDEX (PIX_RING_SIZE*NUM_BOTTLES) //location of conversational user experience LED ring in series

// Parameter 1 = number of pixels in strip
// Parameter 2 = Arduino pin number (most are valid)
// Parameter 3 = pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
//   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
//   NEO_RGBW    Pixels are wired for RGBW bitstream (NeoPixel RGBW products)
Adafruit_NeoPixel strip = Adafruit_NeoPixel(NUM_PIX, NEO_PIN, NEO_GRB + NEO_KHZ800);

// IMPORTANT: To reduce NeoPixel burnout risk, add 1000 uF capacitor across
// pixel power leads, add 300 - 500 Ohm resistor on first pixel's data input
// and minimize distance between Arduino and first pixel.  Avoid connecting
// on a live circuit...if you must, connect GND first.

/*
 * Array to hold incoming serial commands
 */
char cmd[MAX_CMD_SIZE];
uint16_t _index = 0;

char _cuxState = 'o'; // cux = conversational user experience state options:
                      // 'o' == OFF 
                      // 'a' == ACTIVE 
                      // 'd' == DRINK BEING MADE
                     

// in order of bottles (controlled by relays) 
//NOTE: NOT SEQUENTIAL!! be careful of pin 2 and 6!
uint8_t _relayPins[] = { 3, 4, 5, 7, 8, 9, 10, 11 }; //note: pin 6 used for the neoPixel LEDs
                                                     //note: pin 2 used for pushbutton!!!
bool _bottleStatus[] = { 0, 0, 0, 0, 0, 0,  0, 0  }; //local status for bottle state LED
bool _cuxDir=1;        //sets direction of LED animation (1=increase brightness, 0=decrease brightness)
uint8_t _iterNum=0;    //variable to set LED brightness in animations
uint8_t _LEDrate = 10; //animation rate: use caution this is a program delay between LED updates, affects everything

uint32_t buttonTime = 0;  //used to store clock time for pushbutton switch timing
uint16_t debounce = 1000; //debounce+delay time used for input switch debounce and to delay frequency of valid reads
                          //**NOTE** this is not a program delay: time compared here against millis(), so a longer
                          //timeout can be used here without adversely affecting other functionality
                          
uint32_t timeOut = 30000; //if a drink is not made 30 seconds after button is pressed, start reading the button again.


void setup() {
  // start serial
  Serial.begin(9600); //open serial communication w/rasperry pi at 9600 baud rate

  // set pin modes for relays; set pins to HIGH (off) to start
  for (uint8_t i = 0; i < NUM_BOTTLES; i++) {
    pinMode(_relayPins[i], OUTPUT);
    digitalWrite (_relayPins[i], HIGH); //relay unit is active LOW, so HIGH write turns OFF relays
  }
  //declare pin arcade button is connected to to be an input
  pinMode (BUTTON_PIN, INPUT_PULLUP);
  // start neopixel strip and turn pixels off
  strip.begin();
  allOff();
}

void loop() {
  //if we're in conversational user state, but a drink recipe has not started 30 seconds after button press, return to inactve state
  if (_cuxState == 'a' && ((millis()-buttonTime)>timeOut)){
    _cuxState = 'o';
    Serial.println ("TimeOut reached, returning to INACTIVE state. Reading the switch again."); Serial.println();
  }
  //if we're in inactive state, constantly read the pushbutton switch pin.
  if (_cuxState == 'o'){
    checkButton();
  }
  // check for available serial data
  if (Serial.available() > 0) {
    // append char to command
      cmd[_index] = Serial.read();
    // if character is NOT command terminator
    if (cmd[_index] != '!' || '\0' ) {
      // increment command _index
      _index++;
    }
  }
  // else process entire command
  else {
      // was command valid? default to yes
      uint8_t cmdValid = 1;
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      // bottle commands
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      if (cmd[0] == 'b') {
        // parse command
        char temp[2] = { cmd[1], '\0' };
        uint8_t bottleNum = atoi(temp); //atoi interprets string content as integer, returns integer value
        // change state based on action
        switch (cmd[2]) {
          case 'r':
            // turn on relay
            digitalWrite(_relayPins[bottleNum], LOW); //relays active LOW, this turns ON the relay
            //Serial.print ("relay index # "); Serial.print (bottleNum); Serial.println (" is ON!");
             _bottleStatus[bottleNum]=1; //set status to active for bottle animation
             _cuxState = 'd'; //stay in "Drinks being made" state until all relays are off
            break;
          case 'l':
            // turn off relay
            digitalWrite(_relayPins[bottleNum], HIGH); //relays active HIGH, this turns OFF the relay
           // Serial.print ("bottle index # "); Serial.print (bottleNum); Serial.println (" Relay is OFF!");
            _bottleStatus[bottleNum]=0; //set status to inactive to stop bottle animation
            checkMachineStatus();
            break;
          default:
            cmdValid = 0;
            break;
        }
        updateLEDs();
      }
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      // ui commands
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      else if  (cmd[0] == 'a') {
        // set conversational user state to active
        _cuxState = cmd[0];
        _iterNum = 0;
       // Serial.println ("Conversational User State is ACTIVE!");
        updateLEDs();
      }
      // set conversation user state to inactive
      else if (cmd[0] == 'o'){
        _cuxState = cmd[0];
       // Serial.println ("Conversational User State is NOT active.");
        //turn off all relays and LEDs; begin listening for button presses
        resetMachine(); //turn off any LEDs or relays that are active, clear bottle status array
      }
      else{
        cmdValid = 0;
      }
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      // send response
      //////////////////////////////////////////////////////////////////////////////////////////////////////
     // if (cmd[0] != '\0'){
       // if (cmdValid == 1) {
         // Serial.println("OK: Valid Message Received:");
        //   uint8_t _index = 0;
        //   for (uint8_t i=0; i<MAX_CMD_SIZE; i++){
        //     if (cmd[i] != '\0'){Serial.print(cmd[i]); Serial.print("   ");}
        //   }
        //   Serial.println();
        // } else if (cmdValid == 0) {
        //   Serial.println("ERR: Invalid Message Receivd:");
        //   for (uint8_t i=0; i<MAX_CMD_SIZE; i++){
        //     if (cmd[i] != '\0'){Serial.print(cmd[i]); Serial.print("   ");}
        //   }
        //   Serial.println();
        // } else {
        //   Serial.println("?");
      //   }
      // }
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      // reset the command buffer and _index
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      resetCmd();
  }
  delay(10);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//reset CMD array, get ready for new data
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void resetCmd() {
  for (uint16_t i = 0; i < MAX_CMD_SIZE; i++) {
    cmd[i] = '\0';
  }
  _index = 0;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//interrupt service routine (isr) to monitor pushbutton presses
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void checkButton() {
  if (digitalRead(BUTTON_PIN)==0 && (millis()-buttonTime)>debounce){
    buttonTime=millis();
  //  Serial.println ("Message sent:");
    Serial.println ("button"); //msg sent to PI to alert that conversational user experience has begun
    Serial.println ();
    //_cuxState = 'a'; //add this for debug purposes, during normal operation PI is responsible for sending this command
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Turn off all LEDs
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void allOff() {
  for (uint16_t px = 0; px < strip.numPixels(); px++) {
    strip.setPixelColor(px, 0, 0, 0);
  }
  strip.show();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//LED animation routine
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void updateLEDs(){
  //if we're in "Conversational User Experience == ACTIVE" adjust Speaker LED ring LED animation
  if (_cuxState == 'a'){
    for (uint8_t px = 0; px < 24; px++) {
      strip.setPixelColor((CUX_LED_INDEX+px), BASE_BRIGHTNESS, BASE_BRIGHTNESS, BASE_BRIGHTNESS);
    }
  }
  //otherwise, lets make sure the Speaker LED ring is off
  else{
    for (uint8_t px = 0; px < 24; px++) {
      strip.setPixelColor((CUX_LED_INDEX+px), 0,0,0);
    }
  } 
  //if a bottle relay is active, adjust bottle LED ring animation
  for (uint8_t i=0; i<NUM_BOTTLES; i++){
    for (uint8_t j=0; j<PIX_RING_SIZE; j++){
        strip.setPixelColor(((i*PIX_RING_SIZE)+j), (BASE_BRIGHTNESS*_bottleStatus[i]),(BASE_BRIGHTNESS*_bottleStatus[i]),(BASE_BRIGHTNESS*_bottleStatus[i]));
    }
  }
  strip.show(); //update the pixels
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Check Machine Status:
//when we turn off a relay, lets see if any other relays are active. if not, let's set the unit to
//inactive (cux == o) and begin waiting for button presses
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void checkMachineStatus(){
  uint8_t _flag = 0;
  for (uint8_t i=0; i<NUM_BOTTLES; i++){
    _flag = (_flag + _bottleStatus[i]);
  }
  if (_flag==0){
    _cuxState = 'o'; //set conversational user state to inactive
    updateLEDs();
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Reset Machine:
//if we receive a "conversational user state inactive" message from PI, turn off any active LEDs and Relays
//////////////////////////////////////////////////////////////////////////////////////////////////////////
void resetMachine(){
  allOff(); //turn off LEDs if any of them are on...
  for (uint8_t i=0; i<NUM_BOTTLES; i++){
     _bottleStatus[i] = 0; //set bottle status to OFF
     digitalWrite(_relayPins[i], HIGH); //turn off the corresponding bottle relay (if it was on)
  }
  buttonTime=millis();
}
