const recorder = require('node-record-lpcm16');
const keypress = require('keypress');
const fs = require('fs');
const io = require('socket.io');
const http = require('http')
const pm2 = require('pm2');

//key listener import and init
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);



// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: false, // If you want interim results, set this to true
};

var transcript = 'should not be seen';
var keyToggle = false;
var transcriptCalculated = false;
var recognizeStream;
var result = 'result';

// const stopRecordingExport = () => {
//   exports.transcript = transcript;
//   recording.stop();
// }

// // Create a recognize stream



// Start recording and send the microphone input to the Speech API.
// // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
const recording = recorder
  .record({
    sampleRate: sampleRateHertz,
    threshold: 1,
    // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
    verbose: false,
    recorder: 'sox', // Try also "arecord" or "sox"
    endOnSilence: true,
    silence: '10.0',
  })


// Event handler for keypress events
function setResult(str) {
  result = str;
  console.log("i changed str",str)
}
function exportAud() {
  process.stdin.on('keypress', (ch, key) => {
    if (key.name == 'i') {
      if (keyToggle){ //done recording
        console.log('stopped recording');
        recognizeStream.destroy();
        recording.stop();
        result = transcript;
        console.log("the text:", result, "//has been exported");
        transcript = '';
        keyToggle = false;
        transcriptCalculated = true;
      }
      else {
        console.log('start recording');
        recognizeStream = client
          .streamingRecognize(request)
          .on('error', console.error)
          .on('data', data => {
            if (data.results[0] && data.results[0].alternatives[0]) {
              transcript = transcript.concat(data.results[0].alternatives[0].transcript);
              console.log(transcript); // Log the transcript in the module
            } else {
              console.log('No transcript available.');
            }
          });
        recording.stream()
          .on('error', console.error)
          .pipe(recognizeStream);
        console.log('Listening, press Ctrl+C to stop.');

        keyToggle = true;
        transcriptCalculated = false;

      }
    }
    
    else if (key && key.ctrl && key.name == 'c') {
      console.log('exit recording');
      process.exit();
    }
  });
  process.stdin.setRawMode(true);
}
//exportAud();
module.exports = {exportAud, setResult, result,transcriptCalculated};


