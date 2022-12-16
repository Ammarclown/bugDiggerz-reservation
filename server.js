const path = require('path');
const express = require('express');
const app = express();
require("dotenv").config();
const apiRoutes = require('./routes/api');
const { startKafkaProducer, sendKafkaMessage } = require('./connectors/kafka');
const dbo = require("./connectors/conn");
const messagesType = require('./constants/messages');


// Config setup to parse JSON payloads from HTTP POST request body
app.use(express.json());
app.use(express.urlencoded({extended:false}));

// Register the api routes
apiRoutes(app);

// If request doesn't match any of the above routes then return 404
app.use((req, res, next) => {
  res.status(404);
});

// Create HTTP Server and Listen for Requests
app.listen(4000, async (req, res) => {
  // dbo.connectToServer(function (err) {
  //   if (err) console.error(err);
 
  // });
  // Start Kafka Producer
  await startKafkaProducer();
  console.log("CONNECTED")
  /*await sendKafkaMessage(messagesType.TICKET_RESERVED,{
    meta: {action: messagesType.TICKET_RESERVED},
    body:{
    //email: "goudah@email.com",
    matchNumber: 12,
    tickets: [{
    "category": 2,
    "quantity": 1,
    "price":125
    }],
  }
  })*/
    // console.log ("Hello"); // console.log("connected to server ")
});