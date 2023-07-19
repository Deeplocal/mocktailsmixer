const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');

const speech = new SpeechComponent();
speech.startRecording();
setTimeout(() => {
  speech.stopRecording();
  console.log(`FIRST RECORDING: ${speech.getResult()}`);
  speech.startRecording();
  setTimeout(() => {
    speech.stopRecording();
    console.log(`SECOND RECORDING: ${speech.getResult()}`);
  }, 5000);
}, 5000);
