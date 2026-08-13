import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import {
  dealInitialState,
  drawCard,
  throwCard,
  captureCards,
  stealCard,
  advanceTurn,
  getResults,
  isGameOver,
  sweepRemainingTableCards,
  getLegalActions,
} from "./lib/gameEngine.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
const MAX_PLAYERS = 4;

const rooms = new Map();
let io;

function sanitizeGameStateForPlayer(gameState, viewerId) {
  if (!gameState) return null;

  const view = {
    players: gameState.players,
    turnIndex: gameState.turnIndex,
    table: gameState.table,
    captureStacks: gameState.captureStacks,
    lastCapturerId: gameState.lastCapturerId,
    deckCount: Array.isArray(gameState.deck) ? gameState.deck.length : 0,
    hands: {},
  };

  if (viewerId && gameState.hands && gameState.hands[viewerId]) {
    view.hands = {
      [viewerId]: gameState.hands[viewerId],
    };
  }

  return view;
}

function broadcastRoomGameState(roomId, room) {
  if (!room || !room.gameState) return;

  for (const socketId of room.players) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      const visibleState = sanitizeGameStateForPlayer(room.gameState, socketId);
      socket.emit("game_state", visibleState);
    }
  }
}

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // --- broadcast
    socket.on("client", (message) => {
      io.emit("receive-message", { senderId: socket.id, message });
    });

    // --- join / create room ---
    socket.on("roomid", (roomcode) => {
      const num = Number(roomcode);
      if (!Number.isInteger(num) || num <= 0) {
        return socket.emit("join-success", { success: false, message: "Invalid room code" });
      }

      const roomId = String(num);
      let room = rooms.get(roomId);

      if (!room) {
        room = { players: [], turnIndex: 0, started: false };
        rooms.set(roomId, room);
      }

      if (room.started) {
        return socket.emit("join-success", { success: false, message: "Game already in progress" });
      }

      if (room.players.length >= MAX_PLAYERS) {
        return socket.emit("join-success", { success: false, message: "Room is full" });
      }

      // Prevent the same socket joining a room twice (e.g. reconnect/dupe emit)
      if (room.players.includes(socket.id)) {
        return socket.emit("join-success", { success: true, message: "Already in room", roomcode: roomId });
      }

      socket.join(roomId);
      room.players.push(socket.id);
      socket.data.roomId = roomId; // remember which room this socket belongs

      const isNewRoom = room.players.length === 1;
      socket.emit("join-success", {
        success: true,
        message: isNewRoom ? `Created and joined room: ${roomId}` : `Joined room: ${roomId}`,
        roomcode: roomId,
      });

      const playerCount = room.players.length;
      const isFull = playerCount === MAX_PLAYERS;

      if (isFull) {
        room.started = true;
        room.gameState = dealInitialState(room.players);
        room.turnIndex = room.gameState.turnIndex;

        io.to(roomId).emit("game_start", {
          players: playerCount,
          message: `Room full! Starting game with ${playerCount} players.`,
        });

        broadcastRoomGameState(roomId, room);
      } else {
        io.to(roomId).emit("waiting", {
          players: playerCount,
          message: `${playerCount}/${MAX_PLAYERS} players in room`,
        });
      }

      io.to(roomId).emit("roomdata", room.players);
    });

    socket.on("room:sync", (callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room) {
        return callback?.({ success: false, error: "Not in a room" });
      }

      callback?.({
        success: true,
        roomId,
        players: room.players,
        started: Boolean(room.started),
        gameState: room.gameState ? sanitizeGameStateForPlayer(room.gameState, socket.id) : null,
      });
    });

    socket.on("game:draw", (callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room || !room.gameState) {
        return callback?.({ success: false, error: "Game has not started" });
      }

      const nextState = drawCard(room.gameState);
      if (nextState.success === false) {
        return callback?.(nextState);
      }

      room.gameState = nextState;
      room.gameState = advanceTurn(room.gameState);

      if (isGameOver(room.gameState)) {
        const lastTableSweep = sweepRemainingTableCards(room.gameState);
        room.gameState = lastTableSweep;
      }

      broadcastRoomGameState(roomId, room);
      callback?.({ success: true, gameState: sanitizeGameStateForPlayer(room.gameState, socket.id) });
    });

    socket.on("game:throw", (cardId, callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room || !room.gameState) {
        return callback?.({ success: false, error: "Game has not started" });
      }

      const result = throwCard(room.gameState, socket.id, cardId);
      if (result.success === false) {
        return callback?.(result);
      }

      room.gameState = result;
      room.gameState = advanceTurn(room.gameState);

      if (isGameOver(room.gameState)) {
        const lastTableSweep = sweepRemainingTableCards(room.gameState);
        room.gameState = lastTableSweep;
      }

      broadcastRoomGameState(roomId, room);
      callback?.({ success: true, gameState: sanitizeGameStateForPlayer(room.gameState, socket.id) });
    });

    socket.on("game:capture", (cardId, callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room || !room.gameState) {
        return callback?.({ success: false, error: "Game has not started" });
      }
      
      const result = captureCards(room.gameState, socket.id, cardId);
room.gameState=result
const actions =getLegalActions(rooms.gameState)
if(actions.capture.length===0&&actions.steal.length===0){
  room.gameState=advanceTurn(room.gameState)
            broadcastRoomGameState(roomId, room);

}
      if (result.success === false) {
        if (result.error === "No matching table cards for this rank") {
          room.gameState = advanceTurn(room.gameState);
          broadcastRoomGameState(roomId, room);
        }
        return callback?.(result);
      }

      room.gameState = result;

      if (isGameOver(room.gameState)) {
        const lastTableSweep = sweepRemainingTableCards(room.gameState);
        room.gameState = lastTableSweep;
      }

      broadcastRoomGameState(roomId, room);
      callback?.({ success: true, gameState: sanitizeGameStateForPlayer(room.gameState, socket.id) });
    });

    socket.on("game:steal", (cardId, targetPlayerId, callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room || !room.gameState) {
        return callback?.({ success: false, error: "Game has not started" });
      }

      const result = stealCard(room.gameState, socket.id, cardId, targetPlayerId);
      if (result.success === false) {
        if (
          result.error === "Steal target top rank does not match played card rank" ||
          result.error === "Steal target has no capture stack"
        ) {
          room.gameState = advanceTurn(room.gameState);
          broadcastRoomGameState(roomId, room);
        }
        return callback?.(result);
      }

      room.gameState = result;

      if (isGameOver(room.gameState)) {
        const lastTableSweep = sweepRemainingTableCards(room.gameState);
        room.gameState = lastTableSweep;
      }

      broadcastRoomGameState(roomId, room);
      callback?.({ success: true, gameState: sanitizeGameStateForPlayer(room.gameState, socket.id) });
    });

    socket.on("game:get_results", (callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room || !room.gameState) {
        return callback?.({ success: false, error: "Game has not started" });
      }

      const result = getResults(room.gameState);
      callback?.({ success: true, results: result });
    });

    // --- turn handling ---
    socket.on("turn", (turn, callback) => {
      const roomId = socket.data.roomId;
      const room = roomId ? rooms.get(roomId) : null;

      if (!room) {
        return callback?.({ success: false, error: "Not in a room" });
      }

      const currentPlayerId = room.players[room.turnIndex];
      if (socket.id !== currentPlayerId) {
        return callback?.({ success: false, error: "Not your turn" });
      }

      callback?.({ success: true });

      room.turnIndex = (room.turnIndex + 1) % room.players.length;

      io.to(roomId).emit("turn-played", {
        playerId: socket.id,
        turn,
        nextPlayerId: room.players[room.turnIndex],
      });

      console.log(`Player ${socket.id} played turn in room ${roomId}:`, turn);
    });

    // --- disconnect cleanup ---
    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);

      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const leavingIndex = room.players.indexOf(socket.id);
      if (leavingIndex === -1) return;

      room.players.splice(leavingIndex, 1);

      if (room.players.length === 0) {
        rooms.delete(roomId);
        return;
      }

      if (leavingIndex <= room.turnIndex) {
        room.turnIndex = room.turnIndex % room.players.length;
      }

      io.to(roomId).emit("player-left", {
        playerId: socket.id,
        players: room.players.length,
        nextPlayerId: room.players[room.turnIndex],
      });
      io.to(roomId).emit("roomdata", room.players);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});