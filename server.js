import { WebSocketServer } from "ws";

const  wss = new WebSocketServer({ port: 3000 });

const users = {};

const respondClient = (conn, data) => {
  conn.send(JSON.stringify(data));
}

// wscat -c ws://localhost:8080
wss.on('connection', (connection) => {

  connection.on('message', (message) => {
    const data = JSON.parse(message.toString());
    console.log(data?.type)
    // try {
    //   data = JSON.parse(data);
    //   console.log(JSON.parse(data))
    // } catch (error) {
    //   console.error('Error parsing the JSON')
    // }

    if (data?.type) {
      switch(data.type) {
        case "login": {
          // user already loggged in
          console.log(data.name)
          if (users[data.name]) {
            respondClient(connection, {
              type: "login",
              success: false
            })
          } else {
            users[data.name] = connection;
            connection.name = data.name;
            respondClient(connection, {
              type: "login",
              success: true
            })
          }

          break;
        }

        case "offer": {
          // send offer to the other user connection
          console.log(`Sending offer to ${data.name}`);
          const conn = users[data.name];

          if (conn !== null) {
            connection.otherName = data.name;
            respondClient(conn, {
              type: "offer",
              offer: data.offer,
              name: connection.name
            })
          }

          break;
        }

        case "answer": {
          // answer coming from the offered user connection
          console.log(`Sending answer to ${data.name}`);
          const conn = users[data.name];

          if (conn !== null) {
            console.log("connection exists")
            connection.otherName = data.name;
            respondClient(conn, {
              type: "answer",
              answer: data.answer,
              name: connection.name,
            })
          }

          break;
        }

        case "candidate": {
          console.log(`Sending candidate to ${data.name}`);
          const conn = users[data.name];

          if (conn !== null) {
            respondClient(conn, {
              type: "candidate",
              candidate: data.candidate
            })
          }

          break;
        }

        case "leave": {
          console.log(`Disconnecting user from ${data.name}`);
          const conn = users[data.name];

          if (conn !== null) {
            respondClient(conn, {
              type: "leave",
            })
          }

          break;
        }

        default: respondClient(connection, {
          type: "error",
          message: `Unrecognized command ${data.type}`
        })
      }
    }

  })

  connection.on('close', () => {
    if (connection?.name) {
      delete users[connection.name];

      if (connection.otherName) {
        console.log(`Disconnecting user from ${connection.otherName}`);
        const conn = users[connection.otherName];

        if (conn !== null) {
          conn.otherName = null;
          respondClient(conn, {
            type: "leave"
          })
        }
      }
    }
  })

  // {"login": "Richeek", "message": "Log me IN!"}

  connection.send('send data to the server!!!')

})