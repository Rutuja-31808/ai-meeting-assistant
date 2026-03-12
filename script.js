const socket = io();

let localStream;
const localVideo = document.getElementById("localVideo");
const videoGrid = document.getElementById("videoGrid");
const peers = {}; // store peer connections by userId

function joinMeeting() {
  const roomId = document.getElementById("roomId").value;
  socket.emit("join-room", roomId);
  alert("Joined meeting: " + roomId);
}

// --- Camera Controls ---
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.log("Camera error:", error);
  }
}

function stopCamera() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
}

async function shareScreen() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    localVideo.srcObject = screenStream;
    // Replace tracks in peer connections
    Object.values(peers).forEach(pc => {
      screenStream.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track);
      });
    });
  } catch (error) {
    console.log("Screen share error:", error);
  }
}

// --- Speech Recognition ---
function startSpeech() {
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.onresult = function(event) {
    const text = event.results[event.results.length - 1][0].transcript;
    document.getElementById("transcript").innerText += " " + text;
  };
  recognition.start();
}

// --- Summary Generation ---
function generateSummary() {
  const transcript = document.getElementById("transcript").innerText;
  if (transcript.length === 0) {
    alert("No transcript available");
    return;
  }
  const sentences = transcript.split(".");
  let summary = "";
  for (let i = 0; i < sentences.length && i < 3; i++) {
    summary += sentences[i] + ". ";
  }
  document.getElementById("summary").innerText = summary;
}

// --- Chat ---
function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value;
  socket.emit("chat-message", message);
  input.value = "";
}

socket.on("chat-message", message => {
  const chatBox = document.getElementById("chatBox");
  const msg = document.createElement("p");
  msg.innerText = message;
  chatBox.appendChild(msg);
});

// --- Notes Download ---
function downloadNotes() {
  const transcript = document.getElementById("transcript").innerText;
  const summary = document.getElementById("summary").innerText;
  const text = "Transcript:\n" + transcript + "\n\nSummary:\n" + summary;
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "meeting-notes.txt";
  link.click();
}

// --- WebRTC Signaling ---
socket.on("user-joined", async userId => {
  const peerConnection = new RTCPeerConnection();
  peers[userId] = peerConnection;

  // Add local tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle remote stream
  peerConnection.ontrack = event => {
    const remoteVideo = document.createElement("video");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    videoGrid.appendChild(remoteVideo);
  };

  // ICE candidates
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", { candidate: event.candidate, to: userId });
    }
  };

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, to: userId });
});

socket.on("offer", async ({ offer, from }) => {
  const peerConnection = new RTCPeerConnection();
  peers[from] = peerConnection;

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    const remoteVideo = document.createElement("video");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    videoGrid.appendChild(remoteVideo);
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", { candidate: event.candidate, to: from });
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, to: from });
});

socket.on("answer", async ({ answer, from }) => {
  await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", async ({ candidate, from }) => {
  await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
});
