"use client";

import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useRouter } from "next/navigation"; 

export default function Home() {
   
      const [roomid,setroomid]=useState("")
      const router = useRouter();

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      console.log("connected")
    }
   

    function onDisconnect() {
            console.log("disconnected")

    }
function onjoin(data){
console.log(data.message);
router.push(`/GameArea`)
}
   
    socket.on("join-success",onjoin)

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
            socket.off("join-success", onjoin);

    };

    
  }, [ router]);

  const joinRoom = () => {
  if (!roomid.trim()) return;

  socket.emit("roomid", roomid, (res) => {
    if (res.success) {
    } else {
      alert(res.message); 
    }
  });
};

 
   

  return (
    <div>
<input type="number" value={roomid}  onChange={(e)=>setroomid(e.target.value)}/>
<button onClick={joinRoom}>Join</button>
   

    </div>
  );
}