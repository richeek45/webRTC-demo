const connection = new WebSocket("ws://localhost:3000");
let connectedUser = null;
// let username = null;

// console.log(username, "outside");


connection.onopen = () => {
  console.log(`Connected`);
}

connection.onmessage = (message) => {
  const data = JSON.parse(message?.data);
  console.log(data?.type);

  switch(data?.type) {
    case "login": {
      onLogin(data.success);
      break;
    }
    case "offer": {
      onOffer(data.offer, data.name);
      break;
    }
    case "answer": {
      onAnswer(data.answer);
      break;
    }
    case "candidate": {
      onCandidate(data.candidate);
      break;
    }
    case "leave": {
      onLeave();
      break;
    }
    default:
      break;
  }
}

connection.onerror = (error) => {
  console.log(`Got error: ${error}`);
}

const send = (message) => {
  if (connectedUser) {
    message.name = connectedUser;
  }

  connection.send(JSON.stringify(message));
}

const loginPage = document.querySelector('#login-page');
const usernameInput = document.querySelector('#username');
const loginButton = document.querySelector('#login');
const callPage = document.querySelector('#call-page');
const theirUsernameInput = document.querySelector('#theirusername');
const callButton = document.querySelector('#call');
const hangUpButton = document.querySelector('#hang-up');
const localConnection = new RTCPeerConnection();
const remoteVideo = document.querySelector('#theirs');
const messageInput = document.querySelector("#message");
const received = document.querySelector("#received");
const connectButton = document.querySelector('#connect');
const sharePage = document.querySelector('#share-page');
const sendMessageButton = document.querySelector('#send-message');
const sendFileButton= document.querySelector('#send-file');
const readyText = document.querySelector('#ready');
const statusText = document.querySelector('#status');

sharePage.style.display = "none";
readyText.style.display = "none";

callPage.style.display = "none";
const dataChannelOptions = {
  // reliable: true,
  ordered: true,
  // negotiated: true,
  // id: 1223
}

const dataChannel = localConnection.createDataChannel("chat", dataChannelOptions);

let count = 0;

localConnection.ondatachannel = (event) => {
  const channel = event.channel;


  channel.onopen = () => {
    readyText.style.display = "inline-block";
    dataChannel.send(`${connectedUser} has connected!`)
  }
  
  let currentFile = [];
  let currentFileMeta = null;
  let currentFileSize = 0;
  channel.onmessage = (event) => {
  
    // console.log(`Got data channel message ${event.data}`);
  
    // received.textContent += event.data + '<br/>';
    // received.scrollTop = received.scrollHeight;
  
    // File receive code will go here
    let message = event.data; 

    try {
      message = JSON.parse(event.data);
      console.log(message)
      switch(message.type) {
        case "start": {
          currentFile = [];
          currentFileMeta = message.data;
          console.log("Receiving file", currentFile);
          break;
        } 
        case "end": {
          saveFile(currentFileMeta, currentFile);
          break;
        }
      }
    } catch(error) {
      if (typeof event.data === "string") {
        try {
          count += 1;
          console.log(count);
          currentFile.push(atob(event.data));
          currentFileSize += currentFile[currentFile.length - 1].length;
          const percentage = Math.floor((currentFileSize / currentFileMeta.size) * 100);
          statusText.innerHTML = `Receiving ${percentage} %`;
        } catch (error) {
          console.log(event.data)
        }
      
      }
    }
  
  
  }
  
  channel.onclose = () => {
    readyText.style.display = "none";
    console.log("The Data Channel is Closed");
  };
  
  channel.onerror = (error) => {
    console.log("Data Channel Error:", error);
  };

};

const hasFileApi = () => {
  return window.File && window.FileReader && window.FileList && window.Blob;
}

connectButton.addEventListener("click", (event) => {
  const remoteUsername = theirUsernameInput.value;

  if (remoteUsername.length > 0) {
    startPeerConnection(remoteUsername);
  }
})

sendMessageButton.addEventListener("click", (event) => {
  const message = messageInput.value;

  received.innerHTML += "send: " + message + "\n";
  received.scrollTop = received.scrollHeight;
  dataChannel.send(message);

})

sendFileButton.addEventListener("click", (event) => {
  const files = document.querySelector("#files").files;
  console.log(files[0])

  const fileMetadata = { name: files[0].name, size: files[0].size, type: files[0].type };

  if (files.length > 0) {
    dataChannel.send(JSON.stringify({
      type: "start",
      data: fileMetadata
    }))

    sendFile(files[0]);
  }

})

const arrayBuffertoBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const length = bytes.length;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const base64ToBlob = (base64ArrayData = [], contentType = "") => {

  let byteArrays = [];
  let bytes = [];
  let slice = null;
  for (let i = 0; i < base64ArrayData.length; i++) {
    slice = base64ArrayData[i];
    bytes = new Array(slice.length);
    for (let j = 0; j < slice.length; j++) {
      bytes[j] = slice.charCodeAt(j);
    }
    console.log(bytes);
    const byteArray = new Uint8Array(bytes);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

const CHUNK_MAX = 16000;
const sendFile = (file) => {
  const reader = new FileReader();

  reader.onloadend = (event) => {
    if (event.target.readyState === FileReader.DONE) {
      let buffer = reader.result, start = 0, end = 0, last = false;

      const sendChunk = () => {
        end = start + CHUNK_MAX;
        
        if (end > file.size) {
          end = file.size;
          last = true;
        }

        console.log(buffer.slice(start, end), start, end, file.size);

        // progress
        const progress = Math.floor((end / file.size) * 100);
        statusText.innerHTML = `Sending  ${progress} %`;

        dataChannel.send(arrayBuffertoBase64(buffer.slice(start, end)));

        if (last === true) {
          dataChannel.send(JSON.stringify({
            type: "end"
          }))
        } else {
          start = end;
          setTimeout(() => sendChunk(), 100);
        }
      }

      sendChunk();

    }


  }

  reader.readAsArrayBuffer(file);
}

const saveFile = (meta, data) => {
  const blob = base64ToBlob(data, meta.type);
  console.log(blob);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = meta.name;
  link.click();
} 

const setUpPeerConnection = (stream) => {

  const configuration = {
    "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
  };

  stream.getTracks().forEach(track => {
    localConnection.addTrack(track, stream);
  })

  localConnection.addEventListener('track', (event) => {
    const [remoteStream] = event.streams;
    remoteVideo.srcObject = remoteStream;
  })

  localConnection.onicecandidate = (event) => {
    if (event.candidate) {
      send({
        type: "candidate",
        candidate: event.candidate
      })
    }
  }

}

const startConnection = async () => {
  const localVideo = document.querySelector('#yours');
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;

  localVideo.onloadedmetadata = () => {
    localVideo.play();
  }

  setUpPeerConnection(stream);

}

const onLogin = (success) => {

  if (success === false) {
    alert("Login unsuccessful, please try a different name!");
  } else {
    console.log("here")
    loginPage.style.display = "none";
    callPage.style.display = "block";
    sharePage.style.display = "block";

    startConnection();
  }
}

const onOffer = async (offer, name) => {
  console.log("receiving offer", name)
  connectedUser = name;
  localConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // send the answer
  const answer = await localConnection.createAnswer();
  localConnection.setLocalDescription(answer);
  console.log('sending answer to ' + connectedUser)
  send({
    type: "answer",
    answer,
  })
}

const onAnswer = (answer) => {
  console.log("receiving answer")
  localConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

const onCandidate = (candidate) => {
  localConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

const onLeave = () => {
  connectedUser = null;
  remoteVideo.src = null;
  localConnection.close();
  localConnection.onicecandidate = null;
  localConnection.addTrack = null;
  // setUpPeerConnection(stream);
}


loginButton.addEventListener("click", (event) => {
  const name = usernameInput.value;
  console.log(name)

  if (name.length > 0) {
    send({
      type: "login",
      name,
    })
  }

})

// Initiating the call
const startPeerConnection = async (user) => {
  connectedUser = user;

  const offer = await localConnection.createOffer();
  send({
    type: "offer",
    offer,
  })
  localConnection.setLocalDescription(offer);


}

callButton.addEventListener("click", () => {
  const remoteUsername = theirUsernameInput.value;
  if (remoteUsername.length > 0) {
    startPeerConnection(remoteUsername);
  }
})

hangUpButton.addEventListener('click', (event) => {
  send({
    type: "leave"
  });

  onLeave();
})


// while send the file send the Rick roll video