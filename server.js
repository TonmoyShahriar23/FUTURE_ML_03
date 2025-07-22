const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require('express');
const twilio = require('twilio');
const axios = require('axios');
var sessionClient = new dialogflow.SessionsClient();
const { OpenAI } = require('openai'); // Correct import for OpenAI

// Initialize OpenAI client with the hardcoded API key
const openai = new OpenAI({
  apiKey: "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", // Directly using your API key
});

// Text generation function using OpenAI
const textGeneration = async (prompt) => {
  try {
    const response = await openai.completions.create({
      model: 'text-davinci-003',  // You may need to update this if the API has changed
      prompt: `Human: ${prompt}\nAI: `,
      temperature: 0.9,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stop: ['Human:', 'AI:'],
    });

    return {
      status: 1,
      response: `${response.choices[0].text}`,
    };
  } catch (error) {
    console.error(error);  // Log error for debugging
    return {
      status: 0,
      response: '',
    };
  }
};

// Initialize Express server
const webApp = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse URL-encoded data and JSON
webApp.use(express.urlencoded({ extended: true }));
webApp.use(express.json());

// Middleware for logging requests
webApp.use((req, res, next) => {
  console.log(`Path ${req.path} with Method ${req.method}`);
  next();
});

// Basic status endpoint
webApp.get('/', (req, res) => {
  res.sendStatus(200);
  res.send('Status Okay');
});

// Webhook endpoint for Dialogflow
webApp.post('/dialogflow', async (req, res) => {
  const agent = new WebhookClient({
    request: req,
    response: res,
  });

  // Fallback intent handler
  async function fallback() {
    let action = req.body.queryResult.action;
    let queryText = req.body.queryResult.queryText;

    if (action === 'input.unknown') {
      let result = await textGeneration(queryText);
      if (result.status === 1) {
        agent.add(result.response);
      } else {
        agent.add("Sorry, I'm not able to help with that.");
      }
    }
  }

  // Intent handler for "hi"
  function hi(agent) {
    console.log('intent => hi');
    agent.add('Hi, I am your Travel Assistant. Tell me which type of vacations you are looking for?');
  }

  // Mapping intents to their respective handlers
  let intentMap = new Map();
  intentMap.set('hi', hi);
  intentMap.set('Default Fallback Intent', fallback);
  agent.handleRequest(intentMap);
});

// Start the server
webApp.listen(PORT, () => {
  console.log(`Server is up and running at http://localhost:${PORT}/`);
});
