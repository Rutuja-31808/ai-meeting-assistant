const express = require("express");
const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const mongoose = require("mongoose");

const Message = require("./models/Message");

// Serve frontend
app.use(express.static("public"));

/* MongoDB Connection */

mongoose.connect("mongodb+srv://suryawanshirutuja94_db_user:Rutuja123@cluster0.bdjrrbw.mongodb.net/meetingDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));



/* Socket Connection */

io.on("connection", socket => {

  console.log("User connected:", socket.id);


  // Join Meeting Room
  socket.on("join-room", async roomId => {

    socket.join(roomId);
    socket.roomId = roomId;

    console.log(`${socket.id} joined room ${roomId}`);

    // Notify other users
    socket.to(roomId).emit("user-joined", socket.id);

    // Send previous chat messages
    const oldMessages = await Message.find({ roomId });

    socket.emit("old-messages", oldMessages);

  });


  // WebRTC Offer
  socket.on("offer", data => {

    io.to(data.to).emit("offer", {
      offer: data.offer,
      from: socket.id
    });

  });


  // WebRTC Answer
  socket.on("answer", data => {

    io.to(data.to).emit("answer", {
      answer: data.answer,
      from: socket.id
    });

  });


  // ICE Candidate
  socket.on("candidate", data => {

    io.to(data.to).emit("candidate", {
      candidate: data.candidate,
      from: socket.id
    });

  });


  // Chat Message
  socket.on("chat-message", async message => {

    // Save to database
    const newMessage = new Message({
      roomId: socket.roomId,
      message: message
    });

    await newMessage.save();

    // Send message to room
    io.to(socket.roomId).emit("chat-message", message);

  });

  socket.on("old-messages", messages => {

  const chatBox = document.getElementById("chatBox");

  messages.forEach(msg => {

    const messageDiv = document.createElement("div");

    messageDiv.innerText = msg.message;

    chatBox.appendChild(messageDiv);

  });

});


  // User Disconnect
  socket.on("disconnect", () => {

  if (socket.roomId && rooms[socket.roomId]) {

    rooms[socket.roomId]--;

    io.to(socket.roomId).emit("participant-count", rooms[socket.roomId]);

    socket.to(socket.roomId).emit("user-left", socket.id);

  }

});

});


/* Start Server */

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

const Summary = require("./models/Summary");

app.post("/save-summary", express.json(), async (req,res)=>{

  const newSummary = new Summary({

    roomId: req.body.roomId,
    summary: req.body.summary

  });

  await newSummary.save();

  res.send("Summary saved");

});