const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
// const { SerialPort } = require('serialport')

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const client = new textToSpeech.TextToSpeechClient();

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
  console.log(processTranscript(transcript))
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


// keyword to arduino command

//put this into function

function keyWordToArduino (keywords) {

  setTimeout(() => {


  if (transcript.includes('mango')) {
    setTimeout(() => {
      setTimeout(() => {
        return port.write("b0r!", "b0l!" )
        }, 23000);
        
    return port.write("b7r!", "b7l!") 
  }, 23000);
 
  }
  


  else if(transcript.includes('mechanical')){
    setTimeout(() => {
      return port.write("b1r!", "b1l!", "b5r!", "b5l!" )
    }, 23000);
  }


  else if(transcript.includes('mud')){
    setTimeout(() => {
      return port.write("b2r!", "b2l!", "b3r!", "b3l!" )
  }, 23000);
    
  }

  else if(transcript.includes('lavender')){
    setTimeout(() => {
      return port.write("b1r!", "b1l!", "b6r!", "b6l!" )
  }, 23000);
    
  }

  else if(transcript.includes('strawberry')){
    setTimeout(() => {
      return port.write("b0r!", "b0l!", "b4r!", "b4l!" )
  }, 23000);
    
  }

  else{ 
    
      return ("Error, try again.")};


},23000) 
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


