const socket = io();

const videoGrid = document.getElementById("videoGrid");

let localStream;
let peers = {};

let roomId = "";
let username = "";


/* JOIN MEETING */

function joinMeeting(){

  roomId = document.getElementById("roomId").value;
  username = document.getElementById("username").value;

  if(!roomId || !username){
    alert("Enter Name and Meeting ID");
    return;
  }

  startCamera();

}


/* START CAMERA */

async function startCamera(){

  localStream = await navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  });

  const myVideo = document.createElement("video");
  myVideo.srcObject = localStream;
  myVideo.muted = true;
  myVideo.autoplay = true;
  myVideo.playsInline = true;

  videoGrid.appendChild(myVideo);

  socket.emit("join-room", roomId);

}


/* NEW USER JOINED */

socket.on("user-joined", userId => {

  createPeer(userId, true);

});


/* RECEIVE OFFER */

socket.on("offer", async ({offer, from}) => {

  const peer = createPeer(from, false);

  await peer.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await peer.createAnswer();

  await peer.setLocalDescription(answer);

  socket.emit("answer", {
    answer: answer,
    to: from
  });

});


/* RECEIVE ANSWER */

socket.on("answer", async ({answer, from}) => {

  const peer = peers[from];

  if(peer){
    await peer.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

});


/* ICE CANDIDATE */

socket.on("candidate", ({candidate, from}) => {

  const peer = peers[from];

  if(peer){
    peer.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  }

});


/* USER LEFT */

socket.on("user-left", userId => {

  if(peers[userId]){
    peers[userId].close();
    delete peers[userId];
  }

});


/* CREATE PEER CONNECTION */

function createPeer(userId, initiator){

  const peer = new RTCPeerConnection({
    iceServers:[
      {urls:"stun:stun.l.google.com:19302"}
    ]
  });

  peers[userId] = peer;

  localStream.getTracks().forEach(track=>{
    peer.addTrack(track, localStream);
  });

  peer.ontrack = event => {

    const video = document.createElement("video");

    video.srcObject = event.streams[0];
    video.autoplay = true;
    video.playsInline = true;

    videoGrid.appendChild(video);

  };


  peer.onicecandidate = event => {

    if(event.candidate){

      socket.emit("candidate", {
        candidate:event.candidate,
        to:userId
      });

    }

  };


  if(initiator){

    peer.createOffer().then(offer=>{

      peer.setLocalDescription(offer);

      socket.emit("offer", {
        offer:offer,
        to:userId
      });

    });

  }

  return peer;

}


/* CHAT MESSAGE */

function sendMessage(){

  const input = document.getElementById("chatInput");

  const message = input.value;

  if(message.trim() === "") return;

  socket.emit("chat-message", message);

  input.value = "";

}


/* RECEIVE CHAT */

socket.on("chat-message", message => {

  const chatBox = document.getElementById("chatBox");

  const msg = document.createElement("div");

  msg.innerText = message;

  chatBox.appendChild(msg);

});


/* LOAD OLD CHAT */

socket.on("old-messages", messages => {

  const chatBox = document.getElementById("chatBox");

  messages.forEach(msg => {

    const messageDiv = document.createElement("div");

    messageDiv.innerText = msg.message;

    chatBox.appendChild(messageDiv);

  });

});


/* PARTICIPANT COUNT */

socket.on("participant-count", count => {

  document.getElementById("participantCount").innerText =
    "Participants: " + count;

});


/* LEAVE MEETING */

function leaveMeeting(){

  if(localStream){

    localStream.getTracks().forEach(track=>{
      track.stop();
    });

  }

  for(let id in peers){
    peers[id].close();
  }

  peers = {};

  socket.disconnect();

  alert("You left the meeting");

  window.location.reload();

}