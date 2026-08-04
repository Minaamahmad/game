import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const max_players = 4;
const rooms = {};

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Connected ", socket.id);

    socket.on("client", (message) => {
      console.log(socket.id, message);

      io.emit("receive-message", {
        senderId: socket.id,
        message,
      });
    });

    socket.on("roomid", (roomcode) => {
  const num = Number(roomcode);

  if (!Number.isInteger(num) || num <= 0) {
    return socket.emit("join-success", { message: "Invalid room code" });
  }

  const roomId = String(num);
  const room = io.sockets.adapter.rooms.get(roomId);
  const currentPlayers = room ? room.size : 0;

  if (currentPlayers >= max_players) {
    return socket.emit("join-success", { message: "Room is full" });
  }

  socket.join(roomId);

  if (!rooms[roomId]) rooms[roomId] = [];
  rooms[roomId].push(socket.id);

  console.log(rooms);
  socket.emit("join-success", {
    message: `Created and joined new room: ${roomId}`,
    roomcode: roomId,
  });

  const updatedCount = currentPlayers + 1;

  console.log(`✅ ${socket.id} joined room ${roomId} — now ${updatedCount}/${max_players}`);

  const eventName = updatedCount === max_players ? "game_start" : "waiting";
  io.to(roomId).emit(eventName, {
    players: updatedCount,
    message:
      eventName === "game_start"
        ? `Room full! Starting game with ${updatedCount} players.`
        : `${updatedCount}/${max_players} players in room`,
  });

});

// critical code 

socket.on("turn",(turn,callback)=>{
  
  const verifyTurn=()=>{
    const id=socket.id
    if(id!==rooms[roomId]) return
    
  }
  callback({success:true})
  verifyTurn(turn)
  console.log(`player used ${turn}`)
  
})
// rewrite
    socket.on("disconnect", () => {
      console.log(" disconnected:", socket.id);
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
