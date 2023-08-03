const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const sampleRateHertz = 16000;



class SpeechComponent {
  constructor() {
    this.client = new speech.SpeechClient();
    this.transcript = '';
    this.recognizeStream = null;
    this.result = '';
    this.recording = null;
  }
  startRecording() {
    if (!this.recording) {
      console.log('Listening...');
      this.recording = recorder.record({
        sampleRate: sampleRateHertz,
        threshold: 1,
        verbose: false,
        recorder: process.platform === 'darwin' ? 'rec' : 'sox',

        endOnSilence: false,
        silence: '10.0'
      });
      this.recognizeStream = this.client
        .streamingRecognize({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: sampleRateHertz,
            languageCode: 'en-US'
          },
          interimResults: false // If you want interim results, set this to true
        })
        .on('error', console.error)
        .on('data', (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            this.transcript = this.transcript.concat(data.results[0].alternatives[0].transcript);
          } else {
            console.log('No transcript available.');
          }
        })
        .on('end', (data) => {

        });
      this.recording
        .stream()
        .on('error', console.error)
        .pipe(this.recognizeStream);
    }
  }
  stopRecording() {
    console.log('Stop Recording');
    this.recording.stop();
    this.recording = null;
    this.recognizeStream.end();
    this.recognizeStream.destroy();
    this.result = this.transcript;
    this.transcript = '';
  }
  setResult(str) {
    this.result = str;
  }
  getResult() {
    return this.result;
  }
}

module.exports = { SpeechComponent };
