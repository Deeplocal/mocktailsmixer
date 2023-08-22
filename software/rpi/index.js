const { SpeechComponent } = require('./speech');
const { DialogComponent } = require('./dialog');
const path = require('path');
const { SerialPort } = require('serialport')


const port = new SerialPort(
  { path: '/dev/ttyACM0', baudRate: 9600 },
  function (err) {
    if (err) {
      console.error(err);
      return ('Error: ', err.message);
    }
  }
);

port.on("open", () => {
  port.write("\0");
});


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
  let keyWords = ['mechanical', 'lavender', 'mud', 'mango', 'strawberry'];
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
      port.write("o!"); console.log("sending:", "o!");
      transcript = Speech.getResult();
      console.log(transcript);
      word = transcript.includes("mango");
      // console.log(`FIRST RECORDING: ${transcript}`);
      // console.log(`${word}`);
      keyword = processTranscript(transcript);
      //console.log(keyword);
      keyWordToArduino(keyword);
    }, 10000);
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
      port.write("a!"); console.log("sending:", "a!");
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

  //console.log('text to speech working');
  await writeFile("strawberry.mp3", response.audioContent, 'binary')

  // console.log('text to speech working');
}

convertTextToMp3()

function keyWordToArduino(keyword) {

  if (keyword.includes('mango')) {

    //open b0 lemonade after 1 second of button press
    setTimeout(() => {
      port.write("b0r!"); console.log("sending:", "b0r!");
      // open b7 mango concentrate after 2 seconds
      setTimeout(() => {
        port.write("b7r!"); console.log("sending:", "b7r!");
      }, 2000)
      // close b7 mango concentrate after 44 seconds
      setTimeout(() => {
        port.write("b7l!"); console.log("sending:", "b7l!")
      }, 44000);
      // turn off b0 lemonade after 132 seconds
      setTimeout(() => {
        port.write("b0l!"); console.log("sending:", "b0l!")
      }, 132000);

      //-----

      setTimeout(() => {
        port.write("b7l!"); console.log("sending:", "b7l!")
      }, 45000);

      setTimeout(() => {
        port.write("b0l!"); console.log("sending:", "b0l!")
      }, 133000);

    }, 1000)
  }


  else if (keyword.includes('mechanical')) {
    //open b1 lemonade after 1 second
    setTimeout(() => {
      port.write("b1r!"); console.log("sending:", "b1r!");
      //open b5 watermelon after 2 seconds
      setTimeout(() => {
        port.write("b5r!"); console.log("sending:", "b5r!");
      }, 2000)
      // after 44 seconds close b1 lemonade
      setTimeout(() => {
        port.write("b1l!"); console.log("sending:", "b1l!")
        //after one second of b1 close, close b5 watermelon
        setTimeout(() => {
          port.write("b5l!"); console.log("sending:", "b5l!")
        }, 1000);
      }, 44000);
      //------
      setTimeout(() => {
        port.write("b1l!"); console.log("sending:", "b1l!")
      }, 46000);

      setTimeout(() => {
        port.write("b5l!"); console.log("sending:", "b5l!")
      }, 47000);


    }, 1000)
  }

  else if (keyword.includes('mud')) {

    //open b2 lemonade after 1 second
    setTimeout(() => {
      port.write("b2r!"); console.log("sending:", "b2r!");
      //open b3 iced tea after 2 seconds
      setTimeout(() => {
        port.write("b3r!"); console.log("sending:", "b3r!");
      }, 2000)
      // after 44 seconds close b2 lemonade
      setTimeout(() => {
        port.write("b2l!"); console.log("sending:", "b2l!")
        //after one second of b2 close, close b3 iced tea
        setTimeout(() => {
          port.write("b3l!"); console.log("sending:", "b3l!")
        }, 1000);
      }, 44000);

    }, 1000)
  }

  else if (keyword.includes('lavender')) {

    //open b1 lemonade after 1 second
    setTimeout(() => {
      port.write("b1r!"); console.log("sending:", "b1r!");
      //after two seconds open b6 lavender syrup
      setTimeout(() => {
        port.write("b6r!"); console.log("sending:", "b6r!");
        //after 12 seconds close b6 lavender
        setTimeout(() => {
          port.write("b6l!"); console.log("sending:", "b6l!")
        }, 12000);
      }, 2000)
      // after 165 seconds of b1 being open, close b1
      setTimeout(() => {
        port.write("b1l!"); console.log("sending:", "b1l!")
      }, 132000);

      setTimeout(() => {
        port.write("b6l!"); console.log("sending:", "b6l!")
      }, 16000);

      setTimeout(() => {
        port.write("b1l!"); console.log("sending:", "b1l!")
      }, 135000);

    }, 1000)
  }

  else if (keyword.includes('strawberry')) {

    //open b4 strawberry lemonade
    setTimeout(() => {
      port.write("b4r!"); console.log("sending:", "b4r!");

      //after 176 seconds close b4
      setTimeout(() => {
        port.write("b4l!"); console.log("sending:", "b4l!")

      }, 176000)

      setTimeout(() => {
        port.write("b4l!"); console.log("sending:", "b4l!")
      }, 178000);
    }, 1000)
  }

  else {

    ("Error, try again.")
  };

}



