const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("."));

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("join-room", roomId => {
    socket.join(roomId);
    socket.roomId = roomId;
    // Notify others in the room
    socket.to(roomId).emit("user-joined", socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Chat messages
  socket.on("chat-message", message => {
    io.to(socket.roomId).emit("chat-message", message);
  });

  // WebRTC signaling: offer
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // WebRTC signaling: answer
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // WebRTC signaling: ICE candidates
  socket.on("candidate", ({ candidate, to }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-left", socket.id);
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
