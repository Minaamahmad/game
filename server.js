import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const max_players = 4;
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
      const roomnum = Number(roomcode);
      const room = io.sockets.adapter.rooms.get(roomnum);
      const currentPlayers = room ? room.size : 0;

      if (currentPlayers >= max_players) {
        return console.log("room is full ");
      }
      if (Number.isInteger(roomnum) && roomnum > 0) {
        socket.join(roomnum);
        socket.emit("join-success", {
          message: ` Created and joined new room: ${roomnum}`,
          roomcode: roomnum,
        });
      }
      const updatedRoom = io.sockets.adapter.rooms.get(roomnum);
      const updatedCount = updatedRoom ? updatedRoom.size : 0;

      console.log(`✅ ${socket.id} joined room ${roomnum} — now ${updatedCount}/${max_players}`);

      if (updatedCount === max_players) {
        io.to(roomnum).emit("game_start", {
          players:updatedCount,
          message: `Room full! Starting game with ${updatedCount} players.`,
        });
      } else {
        io.to(roomnum).emit("waiting", {
          message: `${updatedCount}/${max_players} players in room`,
        });
      }

      if (updatedCount === max_players) {
        io.to(roomnum).emit("game_start", {
          players: updatedCount,
          message: `Room full! Starting game with ${updatedCount} players.`,
        });
      } else {
        io.to(roomnum).emit("waiting", {
          players: updatedCount,
          message: `${updatedCount}/${max_players} players in room`,
        });
      }
    });

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
