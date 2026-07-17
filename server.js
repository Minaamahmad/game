import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
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
const roomId=221
    socket.on("roomid",(roomcode)=>{
      if(roomcode==roomId){
socket.join(roomId)
        console.log("Room ids are matched")
         socket.emit("join-success", { message: `you have joined ${roomId}` });
      }
      return

     
    })

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
