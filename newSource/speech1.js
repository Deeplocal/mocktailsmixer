const recorder = require('node-record-lpcm16');
const keypress = require('keypress');
const fs = require('fs');
const io = require('socket.io');
const http = require('http')
const pm2 = require('pm2');

//key listener import and init
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
const path = require('path');

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(
  process.cwd(),
  'giz-mocktail.json'
)
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

class SpeechResult{
  constructor(){
    this.transcript = '';
    this.result = "default";
    this.keyToggle = false;
    this.transcriptCalculated;
    this.recognizeStream;
    this.client = new speech.SpeechClient();
    this.recording = recorder.record({
      sampleRate: sampleRateHertz,
      threshold: 1,
      // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
      verbose: false,
      recorder: 'rec', // Try also "arecord" or "sox"
      endOnSilence: true,
      silence: '10.0',
    });
    this.setResult;
    this.setTranscriptCalculated;
    this.request = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
      },
      interimResults: false, // If you want interim results, set this to true
    };
  }
  getResult(){
    return this.result
  }
  getTranscriptCalculated(){
    return this.transcriptCalculated;
  }
  setTranscriptCalculated(bool){
    this.transcriptCalculated = bool;
  }
  listen(){
    process.stdin.on('keypress', (ch, key) => {
      if (key.name == 'i') {
        if (this.keyToggle){ //done recording
          console.log('stopped recording');
          this.recognizeStream.destroy();
          recording.stop();
          this.result = this.transcript;
          console.log("the text:", this.result, "//has been exported");
          this.transcript = '';
          this.keyToggle = false;
          this.transcriptCalculated = true;
        }
        else {
          console.log('start recording');
          this.recognizeStream = this.client
            .streamingRecognize(this.request)
            .on('error', console.error)
            .on('data', data => {
              if (data.results[0] && data.results[0].alternatives[0]) {
                this.transcript = this.transcript.concat(data.results[0].alternatives[0].transcript);
                console.log(this.transcript); // Log the transcript in the module
              } else {
                console.log('No transcript available.');
              }
            });
          recording.stream().on('error', console.error).pipe(this.recognizeStream);
          console.log('Listening, press Ctrl+C to stop.');
  
          this.keyToggle = true;
          this.transcriptCalculated = false;
  
        }
      }
      
      else if (key && key.ctrl && key.name == 'c') {
        console.log('exit recording');
        process.exit();
      }
    });
    process.stdin.setRawMode(true);
  }
}
//const speechR = new SpeechResult();



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
    recorder: 'rec', // Try also "arecord" or "sox"
    endOnSilence: true,
    silence: '10.0',
  })



module.exports = {SpeechResult}


