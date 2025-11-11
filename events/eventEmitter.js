const EventEmitter = require("events");

// Create a single, shared instance of the EventEmitter
const eventEmitter = new EventEmitter();

// Set a higher listener limit to accommodate many notification types
eventEmitter.setMaxListeners(50);

module.exports = eventEmitter;
