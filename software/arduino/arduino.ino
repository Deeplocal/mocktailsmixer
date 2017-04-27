/*
 * First LED ring is UI indicator then bottles.
 * Bottle numbers are 0-indexed.
 */

#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
  #include <avr/power.h>
#endif

#define NUM_BOTTLES 8
#define NEO_PIN 6
#define BASE_BRIGHTNESS 50
#define RAISED_BRIGHTNESS 200
#define MAX_CMD_SIZE 8

// Parameter 1 = number of pixels in strip
// Parameter 2 = Arduino pin number (most are valid)
// Parameter 3 = pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
//   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
//   NEO_RGBW    Pixels are wired for RGBW bitstream (NeoPixel RGBW products)
Adafruit_NeoPixel strip = Adafruit_NeoPixel(24, NEO_PIN, NEO_GRB + NEO_KHZ800);

// IMPORTANT: To reduce NeoPixel burnout risk, add 1000 uF capacitor across
// pixel power leads, add 300 - 500 Ohm resistor on first pixel's data input
// and minimize distance between Arduino and first pixel.  Avoid connecting
// on a live circuit...if you must, connect GND first.

/*
 * Array to hold incoming serial commands
 */
char cmd[MAX_CMD_SIZE];
uint16_t index = 0;

/*
 * o = off
 * h = hotword
 * l = listening
 * t = thinking
 * r = responding
 */
char _cuxState = 'o';
int16_t _iterNum = 0;
uint8_t _cuxUp = 1;

// in order of bottles
uint8_t _relayPins[] = { 2, 3, 4, 5, 7, 8, 9, 10 };

void setup() {

  // start serial
  Serial.begin(9600);

  // set pin modes for relays
  for (uint8_t i = 0; i < NUM_BOTTLES; i++) {
    pinMode(_relayPins[i], OUTPUT);
  }

  // start neopixel strip and turn pixels off
  strip.begin();
  allOff();
}

void loop() {

  // check for available serial data
  if (Serial.available() > 0) {

    // append char to command
    cmd[index] = Serial.read();

    // if character is NOT command terminator
    if (cmd[index] != '!') {

      // increment command index
      index++;
    }

    // else process entire command
    else {

      // was command valid? default to yes
      uint8_t cmdValid = 1;

      // bottle commands
      if (cmd[0] == 'b') {

        // parse command
        char temp[2] = { cmd[1], '\0' };
        uint8_t bottleNum = atoi(temp);

        // change state based on action
        switch (cmd[2]) {
          case 'r':
            // turn on relay
            digitalWrite(_relayPins[bottleNum], HIGH);
            break;
          case 'l':
            // turn off relay
            digitalWrite(_relayPins[bottleNum], LOW);
            break;
          default:
            cmdValid = 0;
            break;
        }
      }

      // ui commands
      else if  (cmd[0] == 'x') {
        // todo: check for valid cmd[1]
        _cuxState = cmd[1];
        _iterNum = 0;
      }

      // bad command
      else {
        cmdValid = 0;
      }

      // send response
      if (cmdValid == 1) {
        Serial.println("OK");
      } else if (cmdValid == 0) {
        Serial.println("ERR");
      } else {
        Serial.println("?");
      }

      // reset the command buffer and index
      resetCmd();
    }
  }

  // do conversational ux state
  switch (_cuxState) {
    case 'o':
      _iterNum += cuxOff(_iterNum);
      break;
    case 'h':
      _iterNum += cuxHotword(_iterNum);
      break;
    case 'l':
      _iterNum += cuxListening(_iterNum);
      break;
    case 't':
      _iterNum += cuxThinking(_iterNum);
      break;
    case 'r':
      _iterNum += cuxResponding(_iterNum);
      break;
  }

  delay(10);
}

/*
 * Conversational UX off
 */
int16_t cuxOff(int16_t iterNum) {

  // done
  if (iterNum > 0) {
    return 0;
  }

  // turn all pixels off
  for (uint8_t px = 0; px < 24; px++) {
    strip.setPixelColor(px, 0, 0, 0);
  }
  strip.show();

  return 1;
}

/*
 * Conversational UX hotword
 */
int16_t cuxHotword(int16_t iterNum) {

  // animation is finished
  if (iterNum > 23) {

    // todo: is this hacky?
    _cuxState = 'l';
    _iterNum = 0;

    return 0;
  }

  // clear pixels on first iteration
  if (iterNum == 0) {
    for (uint8_t px = 0; px < 24; px++) {
      strip.setPixelColor(px, 0, 0, 0);
    }
  }

  // set proper pixel color
  strip.setPixelColor(iterNum, BASE_BRIGHTNESS, BASE_BRIGHTNESS, BASE_BRIGHTNESS);
  strip.show();

  // additional delay for timing
  delay(25);

  return 1;
}

/*
 * Conversational UX listening
 */
int16_t cuxListening(int16_t iterNum) {

  // set proper pixel color
  for (uint8_t px = 0; px < 24; px++) {
    strip.setPixelColor(px, BASE_BRIGHTNESS + iterNum, BASE_BRIGHTNESS + iterNum, BASE_BRIGHTNESS + iterNum);
  }
  strip.show();

  // determine if a direction change is necessary
  if (iterNum >= (RAISED_BRIGHTNESS - BASE_BRIGHTNESS)) {
    _cuxUp = 0;
  } else if (iterNum <= 0) {
    _cuxUp = 1;
  }

  // return value based on direction
  if (_cuxUp == 1) {
    return 1;
  } else if (_cuxUp == 0) {
    return -1;
  }
  return 0;
}

/*
 * Conversational UX thinking
 */
int16_t cuxThinking(int16_t iterNum) {

  // turn all pixels off on first iteration
  if (iterNum == 0) {
    for (uint8_t px = 0; px < 24; px++) {
      strip.setPixelColor(px, 0, 0, 0);
    }
  }

  // calculate current and last pixels
  int8_t currentPixel = iterNum % 24;
  int8_t lastPixel = currentPixel - 1;
  if (lastPixel == -1) {
    lastPixel = 23;
  }

  // turn last pixel off and current pixel on
  strip.setPixelColor(lastPixel, 0, 0, 0);
  strip.setPixelColor(currentPixel, BASE_BRIGHTNESS, BASE_BRIGHTNESS, BASE_BRIGHTNESS);
  strip.show();

  // additional delay for timing
  delay(100);

  // return value
  if (iterNum == 23) {
    return -23;
  }
  return 1;
}

/*
 * Conversational UX responding
 */
int16_t cuxResponding(int16_t iterNum) {

  // set proper pixel color
  for (uint8_t px = 0; px < 24; px++) {
    strip.setPixelColor(px, BASE_BRIGHTNESS + iterNum, BASE_BRIGHTNESS + iterNum, BASE_BRIGHTNESS + iterNum);
  }
  strip.show();

  // determine if a direction change is necessary
  if (iterNum >= (RAISED_BRIGHTNESS - BASE_BRIGHTNESS)) {
    _cuxUp = 0;
  } else if (iterNum <= 0) {
    _cuxUp = 1;
  }

  // return value based on direction
  if (_cuxUp == 1) {
    return 2;
  } else if (_cuxUp == 0) {
    return -2;
  }
  return 0;
}

void resetCmd() {
  for (uint16_t i = 0; i < MAX_CMD_SIZE; i++) {
    cmd[i] = '\0';
  }
  index = 0;
}

void allOff() {
  for (uint16_t px = 0; px < strip.numPixels(); px++) {
    strip.setPixelColor(px, 0, 0, 0);
  }
  strip.show();
}

