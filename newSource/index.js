const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
// Create new speech and dialog instances...
const Speech = new SpeechComponent();
const Dialog = new DialogComponent();

// Example of speech
Speech.startRecording();
setTimeout(() => {
  Speech.stopRecording();
  console.log(`FIRST RECORDING: ${Speech.getResult()}`);
  Speech.startRecording();
  setTimeout(() => {
    Speech.stopRecording();
    console.log(`SECOND RECORDING: ${Speech.getResult()}`);
  }, 5000);
}, 5000);

// Example of dialog
Dialog.checkForDrink('Example text we would want to check...');
