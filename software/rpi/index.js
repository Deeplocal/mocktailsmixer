const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
const { SerialPort } = require('serialport')


const port = new SerialPort(
  { path: 'COM3', baudRate: 9600 },
  function (err) {
      if (err) {
          return console.log('Error: ', err.message);
      }
  }
);

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const client = new textToSpeech.TextToSpeechClient();

let keyword;

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(
  process.cwd(),
  'secretkey.json'
)
function processTranscript(transcript){
  let keyWords = ['mechanical', 'lavender', 'mud', 'mango', 'strawberry'];
  for (let kw in keyWords){
    if (transcript.includes(kw))
      return kw
  }
  return "nodrink"
}


let transcript = '';
let word = false;

// Create new speech and dialog instances...
const Speech = new SpeechComponent();
const Dialog = new DialogComponent();

// Example of speech
Speech.startRecording();
setTimeout(() => {
  Speech.stopRecording();
  transcript = Speech.getResult();
  word = transcript.includes("mango");
  console.log(`FIRST RECORDING: ${transcript}`);
  console.log(`${word}`);
  keyword = processTranscript(transcript);
  keyWordToArduino(keyword);
  Speech.startRecording();
  setTimeout(() => {
    Speech.stopRecording();
    console.log(`SECOND RECORDING: ${Speech.getResult()}`);
  }, 20000);
}, 20000);


// console.log(`The word "${word}" ${sentence.includes(word) ? 'is' : 'is not'} in the sentence`)


// Example of dialog
Dialog.checkForDrink('Example text we would want to check...');
 
async function convertTextToMp3(){
        const text = "Welcome to the Gizmos Mocktail Mixer."

        const request = {
          input: {text: text},
          voice: {languageCode: 'en-US', ssmlGender: 'FEMALE'},
          audioConfig: {audioEncoding: 'MP3'},
        };
        
        const [response] = await client.synthesizeSpeech(request)

        const writeFile = util.promisify(fs.writeFile)

        await writeFile("output.mp3",response.audioContent,'binary')
      
        console.log('text to speech working');
}

convertTextToMp3()


// -------------keyword to arduino command---------

// [*] put this into function

// [*] put if (keyword.includes) for each
// [*] no return needed

//port.write (b0r! = turn on, b7r!= turn on) order of operations = turn on ->wait 23 seconds -> then turn off

// [*] port write only takes one argument

// [*] each port write need its own set timeout

// can console log port.write(b0r!) to port.write(console log) to test
// bottle zero port one pump everything hooked up like it would be power, comm
//define port

//call function keyto arduino after everytime you see process transcript


//let keyword = process.transcript()

//button


function keyWordToArduino (keyword) {

  if (keyword.includes('mango')) {
    
    port.write("b0r!");
    setTimeout(() => {
     port.write("b0l!")}, 23000);

     port.write("b7r!");
     setTimeout(() => {
      port.write("b7l!")}, 23000);
  }

  else if(keyword.includes('mechanical')){
    
    port.write("b1r!");
    setTimeout(() => {
     port.write("b1l!")}, 23000);

     port.write("b5r!");
     setTimeout(() => {
      port.write("b5l!")}, 23000);
  }

  else if(keyword.includes('mud')){

    port.write("b2r!");
    setTimeout(() => {
     port.write("b2l!")}, 23000);

     port.write("b3r!");
     setTimeout(() => {
      port.write("b3l!")}, 23000);
  }

  else if(keyword.includes('lavender')){

    port.write("b1r!");
    setTimeout(() => {
     port.write("b1l!")}, 23000);

     port.write("b6r!");
     setTimeout(() => {
      port.write("b6l!")}, 23000);
  }

  else if(keyword.includes('strawberry')){

    port.write("b0r!");
    setTimeout(() => {
     port.write("b0l!")}, 23000);

     port.write("b4r!");
     setTimeout(() => {
      port.write("b4l!")}, 23000);
  }

  else{ 
    
       ("Error, try again.")};



}


// if (transcript.includes('mango')) {

  
//   "b0r!", "b0l!"

//   console.log('1+1')

  


//}


// check for keywords
// parameters : str (the text to search for key words
// key words (list) a list of keywords to check for )
// return: correct serial message if keyword detected 

 
// word = transcript.split()

// key_words = []


