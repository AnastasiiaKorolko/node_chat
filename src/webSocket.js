import WebSocket from 'ws';

const server = new WebSocket.Server({ port: 3005 });

let clients = [];
const rooms = {};

server.on('connection', (ws) => {
  let currentRoom = null;

  clients.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'join') {
        const roomName = data.room;

        currentRoom = roomName;

        if (!rooms[roomName]) {
          rooms[roomName] = [];
        }

        ws.send(JSON.stringify({ type: 'history', messages: rooms[roomName] }));
      } else if (data.type === 'create') {
        const roomName = data.room;

        if (!rooms[roomName]) {
          rooms[roomName] = [];
          ws.send(JSON.stringify({ type: 'roomCreated', room: roomName }));
        } else {
          ws.send(
            JSON.stringify({ type: 'error', message: 'Room already exists' }),
          );
        }
      } else if (data.type === 'message' && currentRoom) {
        const newMessage = {
          author: data.author,
          text: data.text,
          time: new Date().toLocaleTimeString(),
        };

        rooms[currentRoom].push(newMessage);

        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: 'message', message: newMessage }),
            );
          }
        });
      } else if (data.type === 'rename' && rooms[data.oldName]) {
        const newRoomName = data.newName;

        if (!rooms[newRoomName]) {
          rooms[newRoomName] = rooms[data.oldName];
          delete rooms[data.oldName];

          ws.send(
            JSON.stringify({
              type: 'roomRenamed',
              oldName: data.oldName,
              newName: newRoomName,
            }),
          );
        } else {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Room with new name already exists',
            }),
          );
        }
      } else if (data.type === 'delete' && rooms[data.room]) {
        delete rooms[data.room];
        ws.send(JSON.stringify({ type: 'roomDeleted', room: data.room }));
      }
    } catch (error) {
      console.error('Invalid message:', message);

      ws.send(
        JSON.stringify({ type: 'error', message: 'Invalid message format' }),
      );
    }
  });

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
  });

  ws.send(JSON.stringify({ author: 'Server', text: 'Welcome to the chat!' }));
});
