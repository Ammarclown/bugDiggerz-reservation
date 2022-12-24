// const Joi = require('@hapi/joi');
// const messages = require('../constants/messages');
// const { tickets } = require('./shared-schema');

// // pending/reserved message body
// const messageBody = Joi.object().keys({
//   matchNumber: Joi.number().required(),
//   tickets,
// }).unknown(false);

// const reservationValidation = {
//   /**
//   * Validate schema for pending ticket
//   * @return null if validation passes otherwise a validation error
//   */
//   pendingTicketMessage(reservation) {
//     var schema = Joi.object().keys({
//       meta: Joi.object().keys({
//         action: Joi.string().valid(messages.TICKET_PENDING).required(),
//       }).unknown(false),
//       body: messageBody,
//     }).required();
//     return schema.validate(reservation).error;
//   },

//   /**
//   * Validate schema for reserved ticket
//   * @return null if validation passes otherwise a validation error
//   */
//   reservedTicketMessage(reservation) {
//     var schema = Joi.object().keys({
//       meta: Joi.object().keys({
//         action: Joi.string().valid(messages.TICKET_RESERVED).required(),
//       }).unknown(false),
//       body: messageBody,
//     }).required();
//     return schema.validate(reservation).error;
//   },

//   cancelledTicketMessage(reservation) {
//     var schema = Joi.object().keys({
//       meta: Joi.object().keys({
//         action: Joi.string().valid(messages.TICKET_CANCELLED).required(),
//       }).unknown(false),
//       body: messageBody,
//     }).required();
//     return schema.validate(reservation).error;
//   },
// };

// module.exports = reservationValidation;
const Joi = require('@hapi/joi');
const messages = require('../constants/messages');
const { tickets } = require('./shared-schema');

const reservationValidation = {
  /**
  * Validate schema for pending/reserved/cancelled ticket
  * @return null if validation passes otherwise a validation error
  */
  kafkaMessage(reservation) {
    var schema = Joi.object().keys({
      meta: Joi.object().keys({
        action: Joi.string().valid(messages.TICKET_RESERVED, messages.TICKET_PENDING, messages.TICKET_CANCELLED).required(),
      }).unknown(false),
      body: Joi.object().keys({
        matchNumber: Joi.number().required(),
        tickets,
      }).unknown(false),
    }).required();
    return schema.validate(reservation).error;
  },
};

module.exports = reservationValidation;