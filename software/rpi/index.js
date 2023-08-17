const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
const { SerialPort } = require('serialport')

//fgggrg

const port = new SerialPort(
  { path: '/dev/ttyACM0', baudRate: 9600 },
  function (err) {
    if (err) {
      return console.log('Error: ', err.message);
    }
  }
);



// remove text to speech because we didn't use it
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const client = new textToSpeech.TextToSpeechClient();

let keyword = '';

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(
  process.cwd(),
  'secretkey.json'
)
function processTranscript(transcript) {
  let keyWords = ['mechanical', 'lavender', 'mud', 'mango', 'strawberry', 'zero', 'one', 'two', 'three', 'four', 'five,', 'six', 'seven'];
  for (let i = 0; i < keyWords.length; i++) {
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
    convertTextToMp3();
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
      console.log(keyword);
      keyWordToArduino(keyword);
    }, 10000);
  } else {
    console.log("don't know that one");
  }
}

let serialBuffer = "";

function handleSerial(data) {
  serialBuffer += data.toString();
  if (serialBuffer.indexOf("\n") != -1) {
    let sb = serialBuffer.slice(0, serialBuffer.indexOf("\n"));
    console.log("Serial recieved: ", sb.toString());

    // if statement redundant
    if (sb.startsWith("button")) {
      buttonCallback(sb);
      port.write("a!\n");
    }
    serialBuffer = serialBuffer.slice(serialBuffer.indexOf("\n") + 1);
  }
}

port.on('data', handleSerial)

// Example of dialog
Dialog.checkForDrink('Example text we would want to check...');

async function convertTextToMp3() {
  const text = "Welcome to the Gizmos Mocktail Mixer."

  const request = {
    input: { text: text },
    voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  const [response] = await client.synthesizeSpeech(request)

  const writeFile = util.promisify(fs.writeFile)

  await writeFile("output.mp3", response.audioContent, 'binary')

  console.log('text to speech working');
  await writeFile("strawberry.mp3", response.audioContent, 'binary')

  console.log('text to speech working');
}

convertTextToMp3()

function keyWordToArduino(keyword) {

  if (keyword.includes('mango')) {

    //open b0
    setTimeout(() => {
      console.log("b0 on")
      port.write("b0r!\n");

    }, 3000)

    //hack to open b0 twice
    setTimeout(() => {
      port.write("b0r!\n");
    }, 8000)

    // open b7
    setTimeout(() => {
      console.log("b7 on")
      port.write("b7r!\n");
    }, 4000)

    // close b7
    setTimeout(() => {
      console.log("b7 off")
      port.write("b7l!\n")
    }, 12000);

    // close b7 twice
    setTimeout(() => {
      port.write("b7l!\n");
    }, 8000)


    //close b0

    setTimeout(() => {
      console.log("b0 off")
      port.write("b0l!\n")
    }, 13000 + 1000 + 3000);



  }

  else if (keyword.includes('mechanical')) {
    //
    //open b1
    setTimeout(() => {
      port.write("b1r!\n");
      //after one second of b1 being open, open b5
      setTimeout(() => {
        port.write("b5r!\n");
      }, 1000)
      // after 44 seconds of b1 being open, close b1
      setTimeout(() => {
        port.write("b1l!\n")
        //after one second of b1 close, close b5
        setTimeout(() => {
          port.write("b5l!\n")
        }, 1000);
      }, 44000);
    }, 3000)
  }

  else if (keyword.includes('mud')) {

    //open b2
    setTimeout(() => {
      port.write("b2r!\n");
      //after one second of b2 being open, open b3
      setTimeout(() => {
        port.write("b3r!\n");
      }, 1000)
      // after 44 seconds of b2 being open, close b2
      setTimeout(() => {
        port.write("b2l!\n")
        //after one second of b2 close, close b3
        setTimeout(() => {
          port.write("b3l!\n")
        }, 1000);
      }, 44000);

    }, 3000)
  }

  else if (keyword.includes('lavender')) {

    //open b1
    setTimeout(() => {
      port.write("b1r!\n");
      //after one second of b1 being open, open b6
      setTimeout(() => {
        port.write("b6r!\n");
        //after 12 second of b6 being open, close b6
        setTimeout(() => {
          port.write("b6l!\n")
        }, 44000);
      }, 1000)

      // after 165 seconds of b1 being open, close b1
      setTimeout(() => {
        port.write("b1l!\n")
      }, 132000);

    }, 3000)
  }

  else if (keyword.includes('strawberry')) {

    //open b4
    setTimeout(() => {
      port.write("b4r!\n");

      //after 176 seconds close b4
      setTimeout(() => {
        port.write("b4l!\n")

      }, 176000)
    }, 3000)
  }

  else if (keyword.includes('zero')) {

    port.write("b0r!\n");

    setTimeout(() => {
      port.write("b0l!\n");

    }, 10000);
  }

  else if (keyword.includes('one')) {

    port.write("b1r!\n");

    setTimeout(() => {
      port.write("b1l!\n");

    }, 10000);
  }

  else if (keyword.includes('two')) {

    port.write("b2r!\n");

    setTimeout(() => {
      port.write("b2l!\n");

    }, 10000);
  }

  else if (keyword.includes('three')) {

    port.write("b3r!\n");

    setTimeout(() => {
      port.write("b3l!\n");

    }, 10000);
  }

  else if (keyword.includes('four')) {

    port.write("b4r!\n");

    setTimeout(() => {
      port.write("b4l!\n");

    }, 10000);
  }

  else if (keyword.includes('five')) {

    port.write("b5r!\n");

    setTimeout(() => {
      port.write("b5l!\n");

    }, 10000);
  }

  else if (keyword.includes('six')) {

    port.write("b6r!\n");

    setTimeout(() => {
      port.write("b6l!\n");

    }, 10000);
  }

  else if (keyword.includes('seven')) {

    port.write("b7r!\n");

    setTimeout(() => {
      port.write("b7l!\n");

    }, 10000);
  }

  else {

    ("Error, try again.")
  };

}



