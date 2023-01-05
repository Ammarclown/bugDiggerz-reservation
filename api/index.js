require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const stripe = require('stripe')('sk_test_51MHGhECgTetkFohrisVduRDay98bJTxigceKg9rDzKgSj8rkB25Q4xyKYpD5FbPjljG4iAwp1emgp73Xu3os4MhP005TJUcLkA');
const { v4 } = require('uuid');
const dbo = require('../connectors/postgres');
const { sendKafkaMessage } = require('../connectors/kafka');
const { validateTicketReservationDto } = require('../validation/reservation');
const messagesType = require('../constants/messages');
const { startKafkaProducer } = require('../connectors/kafka');
const cors = require('cors');
app.use(cors())

// Config setup to parse JSON payloads from HTTP POST request body
app.use(express.json());

app.use(express.urlencoded({ extended: false }));

// Register the api routes
// HTTP endpoint to test health performance of service
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.get('/api/health', async (req, res) => {
  return res.send('Service Health');
});

// HTTP endpoint to create new user
app.post('/api/reservation', async (req, res) => {
  // app.use(cors)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  await dbo.connectToServer(function(err){
    let db_connect = dbo.getDb("worldcup22");
    const ticketReservation = {
      id: v4(),
      email: req.body.email,
      matchNumber: req.body.matchNumber,
      category: req.body.tickets.category,
      quantity: req.body.tickets.quantity,
      price: req.body.tickets.price,
    };
    db_connect.collection("Reservations").insertOne(ticketReservation, function (err, response) {
      if (err) throw err;
      // res.json(response);
    });
  })
    try {
    // validate payload before proceeding with reservations
    const validationError = validateTicketReservationDto(req.body);
    if (validationError) {
      return res.status(403).send(validationError.message);
    }
    // Send message indicating ticket is pending checkout
    // so shop consumers can process message and call
    // sp-shop-api to decrement available ticket count
    await sendKafkaMessage(messagesType.TICKET_PENDING, {
      meta: { action: messagesType.TICKET_PENDING },
      body: {
        matchNumber: req.body.matchNumber,
        tickets: req.body.tickets,
      }
    });

    // Perform Stripe Payment Flow
    // try {
    //   const token = await stripe.tokens.create({
    //     card: {
    //       number: req.body.card.number,
    //       exp_month: req.body.card.expirationMonth,
    //       exp_year: req.body.card.expirationYear,
    //       cvc: req.body.card.cvc,
    //     },
    //   });
    //   await stripe.charges.create({
    //     amount: req.body.tickets.quantity * req.body.tickets.price,
    //     currency: 'usd',
    //     source: token.id,
    //     description: 'FIFA World Cup Ticket Reservation',
    //   });
    //   await sendKafkaMessage(messagesType.TICKET_RESERVED, {
    //     meta: { action: messagesType.TICKET_RESERVED },
    //     body: {
    //       matchNumber: req.body.matchNumber,
    //       tickets: req.body.tickets,
    //     }
    //   });
    // } catch (stripeError) {
    //   // Send cancellation message indicating ticket sale failed
    //   await sendKafkaMessage(messagesType.TICKET_CANCELLED, {
    //     meta: { action: messagesType.TICKET_CANCELLED },
    //     body: {
    //       matchNumber: req.body.matchNumber,
    //       tickets: req.body.tickets,
    //     }
    //   });
    //   return res.status(400).send(`could not process payment: ${stripeError.message}`);
    // }

    // Persist ticket sale in database with a generated reference id so user can lookup ticket
    
    // await db('Reservations').insert(ticketReservation);
    
    // Return success response to client
    // return res.json({
    //   message: 'Ticket Purchase Successful',
    //   ...ticketReservation,
    // });
    return res.json({
        message: 'Ticket PENDING Successful',
        
      });
  } catch (e) {
    return res.status(400).send(e.message);
  }
});
app.post('/api/reservation/reserve',async(req,res)=>{
  app.use(cors)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const validationError = validateTicketReservationDto(req.body);
    if (validationError) {
      return res.status(403).send(validationError.message);
    }
    const token = await stripe.tokens.create({
      card: {
        number: req.body.card.number,
        exp_month: req.body.card.expirationMonth,
        exp_year: req.body.card.expirationYear,
        cvc: req.body.card.cvc,
      },
    });
    await stripe.charges.create({
      amount: req.body.tickets.quantity * req.body.tickets.price,
      currency: 'usd',
      source: token.id,
      description: 'FIFA World Cup Ticket Reservation',
    });
    await sendKafkaMessage(messagesType.TICKET_RESERVED, {
      meta: { action: messagesType.TICKET_RESERVED },
      body: {
        matchNumber: req.body.matchNumber,
        tickets: req.body.tickets,
      }
    });
    await dbo.connectToServer(function(err){
      let db_connect = dbo.getDb("worldcup22");
      const ticketReservation = {
        id: v4(),
        email: req.body.email,
        matchNumber: req.body.matchNumber,
        category: req.body.tickets.category,
        quantity: req.body.tickets.quantity,
        price: req.body.tickets.price,
      };
      db_connect.collection("Reservations").insertOne(ticketReservation, function (err, response) {
        if (err) throw err;
        // res.json(response);
      });
    })
    return res.json({
      message: 'Ticket Reservation Successful',
    
    });
    
  }
  catch (stripeError) {
    // Send cancellation message indicating ticket sale failed
    await sendKafkaMessage(messagesType.TICKET_CANCELLED, {
      meta: { action: messagesType.TICKET_CANCELLED },
      body: {
        matchNumber: req.body.matchNumber,
        tickets: req.body.tickets,
      }
    });
    return res.status(400).send(`could not process payment: ${stripeError.message}`);
  }


})

app.post('/api/reservation/cancel',async(req,res)=>{
  app.use(cors)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  await sendKafkaMessage(messagesType.TICKET_CANCELLED, {
    meta: { action: messagesType.TICKET_CANCELLED },
    body: {
      matchNumber: req.body.matchNumber,
      tickets: req.body.tickets,
    }
  });
  return res.status(400).send(`could not process payment,process was cancelled`);
})

// If request doesn't match any of the above routes then return 404
app.use((req, res, next) => {
  return res.status(404).send();
});

// Create HTTP Server and Listen for Requests
app.listen(3000, async (req, res) => {
  // Start Kafka Producer
  await startKafkaProducer();
});
