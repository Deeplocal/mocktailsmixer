const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
const { SerialPort } = require('serialport')


const port = new SerialPort(
  { path: 'COM5', baudRate: 9600 },
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

let keyword ='';

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(
  process.cwd(),
  'secretkey.json'
)
function processTranscript(transcript){
  let keyWords = ['mechanical', 'lavender', 'mud', 'mango', 'strawberry'];
  for (let i = 0; i< keyWords.length; i++){
    let kw = keyWords[i]
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
 
}, 10000);


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

// [*] port write only takes one argument

// [*] each port write need its own set timeout

//call function keyto arduino after everytime you see process transcript
//let keyword = process.transcript()

//button


function keyWordToArduino (keyword) {

  if (keyword.includes('mango')) {

      //open b0
    port.write("b0r!");
    //after one second of b0 being open, open b7
    setTimeout(()=>{
      port.write("b7r!");
    },100)
    // after 2.3 seconds of b0 being open, close b0
    setTimeout(() => {
      port.write("b0l!")
      //after one second of b0 close, close b7
      setTimeout(() => {
        port.write("b7l!") 
      }, 100);
    }, 2300);

  }

  else if(keyword.includes('mechanical')){

     //open b1
     port.write("b1r!");
     //after one second of b1 being open, open b5
     setTimeout(()=>{
       port.write("b5r!");
     },100)
     // after 2.3 seconds of b1 being open, close b1
     setTimeout(() => {
       port.write("b1l!")
       //after one second of b1 close, close b5
       setTimeout(() => {
         port.write("b5l!") 
       }, 100);
     }, 2300);
    
  }

  else if(keyword.includes('mud')){

    //open b2
    port.write("b2r!");
    //after one second of b2 being open, open b3
    setTimeout(()=>{
      port.write("b3r!");
    },100)
    // after 2.3 seconds of b2 being open, close b2
    setTimeout(() => {
      port.write("b2l!")
      //after one second of b2 close, close b3
      setTimeout(() => {
        port.write("b3l!") 
      }, 100);
    }, 2300);

  
  }

  else if(keyword.includes('lavender')){

    //open b1
    port.write("b1r!");
    //after one second of b1 being open, open b6
    setTimeout(()=>{
      port.write("b6r!");
    },100)
    // after 2.3 seconds of b1 being open, close b1
    setTimeout(() => {
      port.write("b1l!")
      //after one second of b1 close, close b6
      setTimeout(() => {
        port.write("b6l!") 
      }, 100);
    }, 2300);

  
  }

  else if(keyword.includes('strawberry')){

    //open b0
    port.write("b0r!");
    //after one second of b0 being open, open b4
    setTimeout(()=>{
      port.write("b4r!");
    },100)
    // after 2.3 seconds of b0 being open, close b0
    setTimeout(() => {
      port.write("b0l!")
      //after one second of b0 close, close b4
      setTimeout(() => {
        port.write("b4l!") 
      }, 100);
    }, 2300);

  }

  else{ 
    
       ("Error, try again.")};



}



  


//}


// check for keywords
// parameters : str (the text to search for key words
// key words (list) a list of keywords to check for )
// return: correct serial message if keyword detected 

 
// word = transcript.split()

// key_words = []


