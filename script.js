const socket = io()

let stream
const video = document.getElementById("video")

function joinMeeting(){

const roomId = document.getElementById("roomId").value

socket.emit("join-room", roomId)

alert("Joined meeting: " + roomId)

}

socket.on("user-joined", userId => {

const list = document.getElementById("participants")

const item = document.createElement("li")

item.innerText = userId

list.appendChild(item)

})

async function startCamera(){

try{

stream = await navigator.mediaDevices.getUserMedia({
video:true,
audio:true
})

video.srcObject = stream

}catch(error){

console.log("Camera error:", error)

}

}

function stopCamera(){

if(stream){

stream.getTracks().forEach(track => track.stop())

video.srcObject = null

}

}

async function shareScreen(){

try{

const screenStream = await navigator.mediaDevices.getDisplayMedia({
video:true
})

video.srcObject = screenStream

}catch(error){

console.log("Screen share error:", error)

}

}

function startSpeech(){

const recognition = new webkitSpeechRecognition()

recognition.continuous = true

recognition.onresult = function(event){

const text = event.results[event.results.length-1][0].transcript

document.getElementById("transcript").innerText += " " + text

}

recognition.start()

}

function generateSummary(){

const transcript = document.getElementById("transcript").innerText

if(transcript.length === 0){

alert("No transcript available")

return

}

const sentences = transcript.split(".")

let summary = ""

for(let i=0;i<sentences.length && i<3;i++){

summary += sentences[i] + ". "

}

document.getElementById("summary").innerText = summary

}

function sendMessage(){

const input = document.getElementById("chatInput")

const message = input.value

socket.emit("chat-message", message)

input.value = ""

}

socket.on("chat-message", message => {

const chatBox = document.getElementById("chatBox")

const msg = document.createElement("p")

msg.innerText = message

chatBox.appendChild(msg)

})

function downloadNotes(){

const transcript = document.getElementById("transcript").innerText

const summary = document.getElementById("summary").innerText

const text = "Transcript:\n" + transcript + "\n\nSummary:\n" + summary

const blob = new Blob([text], {type:"text/plain"})

const link = document.createElement("a")

link.href = URL.createObjectURL(blob)

link.download = "meeting-notes.txt"

link.click()

}