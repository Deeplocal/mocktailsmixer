var weather = require('weather-js');
var moment = require('moment');
var request = require('request');
var pubsub = require('@google-cloud/pubsub');
var ApiAiAssistant = require('actions-on-google').ApiAiAssistant;

var pubsubClient = pubsub({ projectId: 'autonomous-rite-162316' }); // todo: remove and add placeholder
var topicName = 'MocktailsMixerMessages';

exports.webhook = function(req, res) {

  var respData = {
    'speech': 'This is default speech.',
    'displayText': 'This is default display text.',
    'data': {},
    'contextOut': [],
    'source': ''
  };

  var intent = req.body.result.metadata.intentName;
  console.log('intent = ' + intent);

  switch (intent) {

    case 'prime_pump_start':

      var whichPump = req.body.result.parameters.which_pump;
      console.log('whichPump = ' + whichPump);

      createTopic(function(topic) {

        var pubData = { 'intent': 'prime_pump_start', 'which_pump': whichPump };

        publishMessage(topic, JSON.stringify(pubData), function() {

          var s = 'Priming pump ' + whichPump + '.';
          respData.speech = s;
          respData.displayText = s;
          res.json(respData);
        });
      });

      break;

    case 'prime_pump_end':

      createTopic(function(topic) {

        var pubData = { 'intent': 'prime_pump_end' };

        publishMessage(topic, JSON.stringify(pubData), function() {

          var s = 'Stopped priming pump.';
          respData.speech = s;
          respData.displayText = s;
          res.json(respData);
        });
      });

      break;

    case 'make_drink':

      var drink = req.body.result.parameters.drink;
      console.log('drink = ' + drink);

      createTopic(function(topic) {

        var pubData = { 'intent': 'make_drink', 'drink': drink };

        publishMessage(topic, JSON.stringify(pubData), function() {

          var s = 'Coming right up. While I make your drink, would you like to hear the weather or your fortune?';
          respData.speech = s;
          respData.displayText = s;
          res.json(respData);
        });
      });

      break;

    case 'chuck_norris':

      requestChuckNorris(function(jokeText) {

        // set assistant speech and display text
        respData.speech = jokeText;
        respData.displayText = jokeText;

        // serve response
        res.json(respData);
      });
      break;

    case 'resp_weather':

      console.log('about to call getWeather()');

      var zip = req.body.result.parameters.zip_code;
      console.log('zip =' + zip);

      getWeather(zip, function(respText) {

        console.log('inside getWeather() callback');
        respData.speech = respText;
        respData.displayText = respText;
        res.json(respData);
      });

      break;

    default:

      console.log('switch-case in default');
      res.json(respData);

      break;
  }
};

function createTopic(callback) {

  if (!callback) {
    console.log('no callback');
    return;
  }

  pubsubClient.createTopic(topicName, function(error, topic) {

    // topic already exists
    if (error && error.code === 409) {

      console.log('topic created');

      // callback(topic);
      callback(pubsubClient.topic(topicName));
      return;
    }

    if (error) {
      console.log(error);
      return;
    }

    callback(pubsubClient.topic(topicName));
  });
}

function publishMessage(topic, message, callback) {

  topic.publish(message, function(error) {

    if (error) {
      console.log('Publish error:');
      console.log(error);
      return;
    }

    console.log('publish successful');

    if (callback) {
      callback();
    }
  });
}

function requestChuckNorris(callback) {

  if (!callback) {
    console.log('Chuck norris doesnt need a callback function, but you do.');
    return;
  }

  request('http://api.icndb.com/jokes/random?limitTo=[nerdy]&exclude=[explicit]', function(error, response, body) {

    var json = JSON.parse(body);

    if (json.type !== 'success') {
      callback('Error, Chuck Norris round-housed the server rack.');
    } else {
      callback(json.value.joke);
    }
  });
}

function getWeather(zip, callback) {

  if (!callback) {
    console.log('No callback.');
    return;
  }

  weather.find({search: zip, degreeType: 'F'}, function(err, result) {

    if (err) {
      console.log(err);
      callback('There has been an error with the weather service.');
      return;
    }

    callback('The temperature in ' + result[0].location.name + ' is ' + result[0].current.temperature + ' degrees.');
  });
}
