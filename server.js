import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
const MAX_PLAYERS = 4;

const rooms = new Map();

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

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

      if (isFull) room.started = true;

      io.to(roomId).emit(isFull ? "game_start" : "waiting", {
        players: playerCount,
        message: isFull
          ? `Room full! Starting game with ${playerCount} players.`
          : `${playerCount}/${MAX_PLAYERS} players in room`,
      });

      io.to(roomId).emit("roomdata", room.players);
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