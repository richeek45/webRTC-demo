function hasRTCPeerConnection() {
  window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  return !!window.RTCPeerConnection;
}
console.log("this should not run")
async function startPeerConnection(stream) {

  const localVideo = document.querySelector('#yours');
  const remoteVideo = document.querySelector('#theirs');

  const configuration = {
    // Uncomment this code to add custom iceServers
    //"iceServers": [{ "url": "stun:stun.1.google.com:19302" }]"
  };

  const localConnection = new RTCPeerConnection();
  const remoteConnection = new RTCPeerConnection();

  stream.getTracks().forEach(track => {
    localConnection.addTrack(track, stream);
  })

  remoteConnection.addEventListener('track', async (event) => {
    console.log(event);
    const [remoteStream] = event.streams;
    remoteVideo.srcObject = remoteStream;
});

  // theirConnection.ontrack = (event) => {
  //   console.log(event);
  //   theirVideo.srcObject = event.stream;

  //   theirVideo.onloadedmetadata = () => {
  //     theirVideo.play();
  //   }
  // }

  localConnection.onicecandidate =  (event) => {
    if (event.candidate) {
      remoteConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  }

  remoteConnection.onicecandidate = (event) => {
    if (event.candidate) {
      localConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  }

  // begin the offer
  const offer = await localConnection.createOffer();
  await localConnection.setLocalDescription(offer);
  await remoteConnection.setRemoteDescription(offer);

  const answer = await remoteConnection.createAnswer();
  await remoteConnection.setLocalDescription(answer);
  await localConnection.setRemoteDescription(answer);

  // console.log(theirConnection);

  localVideo.srcObject = stream;

  localVideo.onloadedmetadata = () => {
    localVideo.play();
  }

}

const getMedia = async () => {
  // MediaStreamTrack.getSources

  const stream = await navigator.mediaDevices.getUserMedia({ video: {
    mandatory: {
      minAspectRatio: 1.777,
      maxAspectRtio: 1.778
    }
  }, audio: true });

  try {
    
    await startPeerConnection(stream);

    // const canvas = document.querySelector('canvas');
    // document.querySelector("#capture").addEventListener('click', (event) => {
    //   canvas.width = myVideo.clientWidth;
    //   canvas.height = myVideo.clientHeight;

    //   const context = canvas.getContext('2d');
    //   context.drawImage(myVideo, 0, 0);
    //   context.fillStyle = "white";
    //   context.font = '45px Arial';
    //   context.fillText("Hello World!", 20, 50);
    // })

  } catch (error) {
    console.error(error);
  }
}

getMedia();
