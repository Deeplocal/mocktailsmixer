//webhook.js is the part of my code that creates fulfillment requests and is the place where you set up responses for Dialogflow to give based upon certain 


const bodyParser = require("body-parser")
const express = require("express")
const dialogflow = require("dialogflow")
const {WebhookClient}  = require('dialogflow-fulfillment');
const app = express().use(bodyParser.json())
const port =  3030


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

    let intents = new Map();
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

app.listen(port,() => {
    console.log("server is listening on port: ",port)
})