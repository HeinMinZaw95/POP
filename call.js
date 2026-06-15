const CLIENT_ID = 'FiXhzGIVynEugBIj'; 

const ROOM_NAME = 'observable-our-private-room';
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let room;
let pc;
let localStream;
const drone = new Scaledrone(CLIENT_ID);

const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');

drone.on('open', error => {
  if (error) return console.error(error);
  room = drone.subscribe(ROOM_NAME);
  room.on('open', error => {
    if (error) console.error(error);
  });
  room.on('members', members => {
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

function startWebRTC(isOfferer) {
  pc = new RTCPeerConnection(configuration);

  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({ 'candidate': event.candidate });
    }
  };

  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(err => console.error(err));
    }
  }

  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, err => console.error(err));

  room.on('data', (message, client) => {
    if (client.id === drone.clientId) return;

    if (message.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(err => console.error(err));
        }
      }, err => console.error(err));
    } else if (message.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(message.candidate), () => {}, err => console.error(err));
    }
  });
}

function localDescCreated(desc) {
  pc.setLocalDescription(desc, () => sendMessage({ 'sdp': pc.localDescription }), err => console.error(err));
}

function sendMessage(message) {
  drone.publish({ room: ROOM_NAME, message });
}

// စနစ်တကျ ဖုန်းချပြီး လိုင်းပိတ်မည့် Logic
document.getElementById('hangupBtn').onclick = function() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (pc) {
        pc.close();
    }
    drone.close();

    // သင့် Website Theme နဲ့ ကိုက်ညီမယ့် End Screen စာတန်းကို ပြောင်းလဲပြသခြင်း
    document.getElementById('videoApp').innerHTML = `
        <div class="end-screen">
            <h2>ဗီဒီယိုကော ပြောတာ ပြီးဆုံးသွားပါပြီ <span>💖</span></h2>
            <p>HeinPop Private Space မှ လုံခြုံစွာ ထွက်ခွာခဲ့ပြီးပါပြီ။</p>
        </div>
    `;
};