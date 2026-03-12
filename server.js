const express = require("express")
const app = express()
const server = require("http").createServer(app)
const io = require("socket.io")(server)

app.use(express.static("."))

io.on("connection", socket => {

console.log("User connected")

socket.on("join-room", roomId => {

socket.join(roomId)

socket.roomId = roomId

io.to(roomId).emit("user-joined", socket.id)

})

socket.on("chat-message", message => {

io.to(socket.roomId).emit("chat-message", message)

})

})

server.listen(3000, () => {

console.log("Server running on http://localhost:3000")

})