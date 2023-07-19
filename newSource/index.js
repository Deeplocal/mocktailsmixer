//webhook fulfillment setup 
const bodyParser = require("body-parser")
const express = require("express")
const {WebhookClient}  = require('dialogflow-fulfillment');
const app = express().use(bodyParser.json())
const port =  3030
const { v4: uuidv4 } = require('uuid');
const https = require("https");

const readline = require('readline');
readline.emitKeypressEvents(process.stdin);

// const path = require('path');
// process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(
//   process.cwd(),
//   'localsdk3-b447e60b51d1.json'
// )

//↓↓↓↓↓↓↓↓↓↓↓ dialogflow query
const fs = require('fs');
const util = require('util');
const dialogflow = require('@google-cloud/dialogflow');

// projectId: ID of the GCP project where Dialogflow agent is deployed
const projectId = 'localsdk3';

// sessionId: String representing a random number or hashed user identifier
const sessionId = uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

//incoming transcript from 
//var {transcript,transcriptCalculated} = require('./speech1');
const {SpeechResult} = require('./speech1');
const speech = new SpeechResult();
var transcript = speech.getResult();


// console.log("line35");

console.log('before export',speech.getResult());
speech.listen();
console.log('after export',speech.getResult());
speech.result ="test"
console.log('after set',speech.getResult());

// queries: A set of sequential queries to be send to Dialogflow agent for Intent Detection

const queries = [
  speech.getResult()
]


// languageCode: Indicates the language Dialogflow agent should use to detect intents
const languageCode = 'en';

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();

async function detectIntent(
  projectId,
  sessionId,
  query,
  contexts,
  languageCode
) {
  console.log(speech.getResult());

  if (!speech.getTranscriptCalculated()) {
    console.log('Transcript not yet calculated. Waiting for transcript calculation...');
    return; // Exit the function if transcript is not yet calculated
  }
  else{
  // The path to identify the agent that owns the created intent.
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: queries,
        languageCode: languageCode,
      },
    },
  };
  console.log(queries);
  if (contexts && contexts.length > 0) {
    request.queryParams = {
      contexts: contexts,
    };
  }

  const responses = await sessionClient.detectIntent(request);
  //if transcript calculated
  //start dialogflow and send transcript to it
  //set transcript calculated to false
  return responses[0];
}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//webhook fulfullment text
async function executeQueries(projectId, sessionId, queries, languageCode) {
  // Keeping the context across queries let's us simulate an ongoing conversation with the bot
  if (!speech.getTranscriptCalculated()) {
    console.log('Transcript not yet calculated. Waiting for transcript calculation...');
    return; // Exit the function if transcript is not yet calculated
  }
  else{
  var context;
  var intentResponse;
  for (const query of queries) {
    try {
      console.log(`Sending Query: ${query}`);
      intentResponse = await detectIntent(
        projectId,
        sessionId,
        query,
        context,
        languageCode
      );
      console.log('Detected intent');
      console.log(
        `Fulfillment Text: ${intentResponse.queryResult.fulfillmentText}`
      );
      // Use the context from this response for next queries
      context = intentResponse.queryResult.outputContexts;
    } catch (error) {
      console.log(error);
    }
  }
}
}

async function intentMap(){
app.post("/webhook",(request,response) =>{
  const _agent = new WebhookClient({request:request,response:response});

  //Welcome portion of the conversation
  function mocktailwelcome(agent){
      //Dialogflow responses
      agent.add("Hi! I am the Google Mocktails Mixer, how can I help you?");
  }

  function whatDrinks(agent){
      
      agent.add("I have cherry bomb, sunset cooler and orange blast");
  }

  function drinkChoice(agent){

      agent.add('alright, one ${drink}');
  }
  function isThisCorrect(agent){
      agent.add("you said one &drink, is this correct?")
  }

  var intents = new Map();
  //
  intents.set("mocktailwelcome",mocktailwelcome)
  intents.set("whatDrinks",whatDrinks)
  intents.set("drinkChoice",drinkChoice)
  intents.set("isThisCorrect",isThisCorrect)
  _agent.handleRequest(intents)


})

app.get("/",(req,res)=> {
  res.send("hello world")
})

app.listen(port, async () => {
  console.log("server is listening on port: ", port);

  if (speech.getTranscriptCalculated()) {
    console.log('app.listen')
    console.log(speech.result)
    try {
      await executeQueries(projectId, sessionId, [speech.getResult()], languageCode);
      // Reset transcriptCalculated to false after executing queries
      speech.setTranscriptCalculated(false);

    } catch (error) {
      console.log(error);
    }
  } else {
    console.log('Transcript not yet calculated. Waiting for transcript calculation...');
  }
});
}




function clickTracker(){
  var click = 0;
  process.stdin.on('keypress', (ch, key) => {
    if (key.name == 'p') {
      // click = click + 1;
      console.log({click});
      // executeQueries(projectId, sessionId, queries, languageCode);
      intentMap();
    }
  });
}
clickTracker();