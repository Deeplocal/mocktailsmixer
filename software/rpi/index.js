const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
const { SerialPort } = require('serialport')


const port = new SerialPort(
  { path: '/dev/ttyAML0', baudRate: 9600 },
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
function buttonCallback(data) {

  //dont need .to string = redundant
  if (data.toString().startsWith("button")) {
    Speech.startRecording();
    setTimeout(() => {
      Speech.stopRecording();
      port.write("o!\n");
      transcript = Speech.getResult();
      console.log(transcript);
      word = transcript.includes("mango");
      console.log(`FIRST RECORDING: ${transcript}`);
      console.log(`${word}`);
      keyword = processTranscript(transcript);
      keyWordToArduino(keyword);
    }, 10000);
  } else {
    console.log("don't know that one");
  }
}

let serialBuffer = "";

function handleSerial(data){
  // console.log("data received: ", data.toString());
  serialBuffer += data.toString();
  if(serialBuffer.indexOf("\n")!=-1){
    let sb = serialBuffer.slice(0, serialBuffer.indexOf("\n"));
    console.log("Serial recieved: ", sb.toString());

    // if statement redundant
    if (sb.startsWith("button")){
      buttonCallback(sb);
      port.write("a!\n");
    }
    serialBuffer = serialBuffer.slice(serialBuffer.indexOf("\n")+1);
  }
}

port.on('data', handleSerial)
// console.log(`The word "${word}" ${sentence.includes(word) ? 'is' : 'is not'} in the sentence`)
// buttonCallback()

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


// [*] whenever you receive a button message send back a msg to arduino of "a!" to let the arduino know that it recieved button msg

// update length in time based on drink ratios

function keyWordToArduino (keyword) {

  if (keyword.includes('mango')) {

      //open b0
    port.write("b0r!\n");
    //after one second of b0 being open, open b7
    setTimeout(()=>{
      port.write("b7r!\n");
      //after 44 second of b7 being open, close b7
      setTimeout(() => {
        port.write("b7l!\n") 
      }, 44000);
    },1000)

    // after 132 seconds of b0 being open, close b0
    setTimeout(() => {
      port.write("b0l!\n")
    }, 132000);
      
  }

  else if(keyword.includes('mechanical')){

     //open b1
     port.write("b1r!");
     //after one second of b1 being open, open b5
     setTimeout(()=>{
       port.write("b5r!");
     },1000)
     // after 44 seconds of b1 being open, close b1
     setTimeout(() => {
       port.write("b1l!")
       //after one second of b1 close, close b5
       setTimeout(() => {
         port.write("b5l!") 
       }, 1000);
     }, 44000);
    
  }

  else if(keyword.includes('mud')){

    //open b2
    port.write("b2r!");
    //after one second of b2 being open, open b3
    setTimeout(()=>{
      port.write("b3r!");
    },1000)
    // after 44 seconds of b2 being open, close b2
    setTimeout(() => {
      port.write("b2l!")
      //after one second of b2 close, close b3
      setTimeout(() => {
        port.write("b3l!") 
      }, 1000);
    }, 44000);

  
  }

  else if(keyword.includes('lavender')){

    //open b1
    port.write("b1r!");
    //after one second of b1 being open, open b6
    setTimeout(()=>{
      port.write("b6r!");
    },1000)
    // after 2.3 seconds of b1 being open, close b1
    setTimeout(() => {
      port.write("b1l!")
      //after one second of b1 close, close b6
      setTimeout(() => {
        port.write("b6l!") 
      }, 1000);
    }, 23000);


  }

  else if(keyword.includes('strawberry')){

    //open b4
    port.write("b4r!");
    
    //after 176 seconds close b4
    setTimeout(()=>{
      port.write("b4l!") 
      
    },176000)
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


