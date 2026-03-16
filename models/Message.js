const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  roomId: String,
  username: String,
  message: String,
  time: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Message", messageSchema);