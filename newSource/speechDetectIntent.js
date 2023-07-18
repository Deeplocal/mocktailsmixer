const fs = require('fs');
const util = require('util');
const {Transform, pipeline} = require('stream');
const {struct} = require('pb-util');

const file = fs.createWriteStream('./test.wav', { encoding: 'binary' })

file; 

const pump = util.promisify(pipeline);
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();

// The path to the local file on which to perform speech recognition, e.g.
const filename = './test.wav';

// The encoding of the audio file, e.g. 'AUDIO_ENCODING_LINEAR_16'
const encoding = 'AUDIO_ENCODING_LINEAR_16';

// The sample rate of the audio file in hertz, e.g. 16000
const sampleRateHertz = 16000;

const projectId = 'localsdk3';

const { v4: uuidv4 } = require('uuid');

const sessionId = uuidv4();

// The BCP-47 language code to use, e.g. 'en-US'
const languageCode = 'en-US';
const sessionPath = sessionClient.projectAgentSessionPath(
  projectId,
  sessionId
);

const initialStreamRequest = {
  session: sessionPath,
  queryInput: {
    audioConfig: {
      audioEncoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
  },
};

async function run(){

// Create a stream for the streaming request.
const detectStream = sessionClient
  .streamingDetectIntent()
  .on('error', console.error)
  .on('data', data => {
    if (data.recognitionResult) {
      console.log(
        `Intermediate transcript: ${data.recognitionResult.transcript}`
      );
    } else {
      console.log('Detected intent:');

      const result = data.queryResult;
      // Instantiates a context client
      const contextClient = new dialogflow.ContextsClient();

      console.log(`  Query: ${result.queryText}`);
      console.log(`  Response: ${result.fulfillmentText}`);
      if (result.intent) {
        console.log(`  Intent: ${result.intent.displayName}`);
      } else {
        console.log('  No intent matched.');
      }
      const parameters = JSON.stringify(struct.decode(result.parameters));
      console.log(`  Parameters: ${parameters}`);
      if (result.outputContexts && result.outputContexts.length) {
        console.log('  Output contexts:');
        result.outputContexts.forEach(context => {
          const contextId =
            contextClient.matchContextFromProjectAgentSessionContextName(
              context.name
            );
          const contextParameters = JSON.stringify(
            struct.decode(context.parameters)
          );
          console.log(`    ${contextId}`);
          console.log(`      lifespan: ${context.lifespanCount}`);
          console.log(`      parameters: ${contextParameters}`);
        });
      }
    }
  });

// Write the initial stream request to config for audio input.
detectStream.write(initialStreamRequest);

// Stream an audio file from disk to the Conversation API, e.g.
// "./resources/audio.raw"
await pump(
  fs.createReadStream(filename),
  // Format the audio stream into the request format.
  new Transform({
    objectMode: true,
    transform: (obj, _, next) => {
      next(null, {inputAudio: obj});
    },
  }),
  detectStream
);
}
run().catch(console.error);