import { io } from 'socket.io-client';

const roomId = '1';
const sockets = [];
const seenGameStates = [];

const roomReady = new Promise((resolve, reject) => {
  const startedAt = Date.now();

  const timer = setTimeout(() => {
    reject(new Error('Timeout waiting for room/game_state proof'));
  }, 5000);

  function markState(socket, state) {
    seenGameStates.push({
      socketId: socket.id,
      players: state?.players?.length ?? 0,
      table: state?.table?.length ?? 0,
      deckCount: state?.deckCount ?? 0,
      ownHand: state?.hands?.[socket.id]?.length ?? 0,
    });

    if (seenGameStates.length === 4) {
      clearTimeout(timer);
      resolve(seenGameStates);
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.emit('roomid', roomId);
    });

    socket.on('game_start', (payload) => {
      console.log('game_start', payload);
    });

    socket.on('game_state', (state) => {
      console.log('visible-state', socket.id, JSON.stringify({
        players: state?.players?.length ?? 0,
        table: state?.table?.length ?? 0,
        deckCount: state?.deckCount ?? 0,
        ownHand: state?.hands?.[socket.id]?.length ?? 0,
      }));
      markState(socket, state);
    });

    socket.on('join-success', (payload) => {
      console.log('join-success', payload);
    });

    socket.on('roomdata', (players) => {
      console.log('roomdata', players);
    });

    socket.on('connect_error', (err) => {
      console.error('connect_error', err);
      reject(err);
    });

    sockets.push(socket);
  }
});

try {
  const result = await roomReady;
  console.log('READY_PROOF', JSON.stringify(result));
} finally {
  for (const socket of sockets) {
    socket.disconnect();
  }
}
