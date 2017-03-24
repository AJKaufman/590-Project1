const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the client html file into memory
// __dirname in node is the current directory
// (in this case the same folder as the server js file)
const index = fs.readFileSync(`${__dirname}/../client/index.html`);


const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

// num to hold all of our connected users
// const userList = {};
const roomList = {};
let nextRoom = 0;
let currentRoomCount = 0;

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    // add a user to the count
    currentRoomCount++;

    // send the user to their room
    socket.join(`room${nextRoom}`);


    // if the room isn't in the roomList
    if (!roomList[`room${nextRoom}`]) {
      console.log(`adding room ${nextRoom} to roomList`);
      roomList[`room${nextRoom}`] = {};
      roomList[`room${nextRoom}`].userList = {};
    }

    // add their username to the user list
    roomList[`room${nextRoom}`].userList[currentRoomCount] = data.name;
    console.log(`Name added ${data.name}`);

    // if there are 3 people in the room, start the game
    // and change the name of the room for the next party
    if (currentRoomCount > 2) {
      console.log('Picking a judge to send back to the clients');
      let randomJudge = Math.floor(Math.random() * 3) + 1;
      // if this didn't exist, there is a tiny chance for the server to break if it gets exactly 4
      if (randomJudge === 4) randomJudge = 3;

      const chosenJudge = roomList[`room${nextRoom}`].userList[randomJudge];

      console.log(`chosen Judge ${randomJudge}`);
      console.log(roomList[`room${nextRoom}`].userList[randomJudge]);

      // start the game when the room limit is reached, and send the chosen judge back to the client
      io.sockets.in(`room${nextRoom}`).emit('startRoom', { chosen: chosenJudge, room: nextRoom, player1: roomList[`room${nextRoom}`].userList[1], player2: roomList[`room${nextRoom}`].userList[2], player3: roomList[`room${nextRoom}`].userList[3] });
      
      nextRoom++;
      currentRoomCount = 0;
    }
  });

  // when the judge selects treatment, send back the treatment to the treaters
  socket.on('treatmentChosen', (data) => {
    console.log(`inside treatmentChosen, room: ${data.room}`);

    io.sockets.in(`room${data.room}`).emit('treaterStart', { treatmentSelected: data.treatmentSelected });
  });
  
  // gets appeasement on server and displays it in each room
  socket.on('appease', (data) => {
    io.sockets.in(`room${data.room}`).emit('broadcastAppeasement', { appeasement: data.appeasement, name: data.name });
  });
};


io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
});

console.log('Websocket server started');

