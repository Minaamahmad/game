"use client";

import { useEffect, useState } from "react";
import { socket } from "./socket";

export default function Home() {
    const [message, setMessage] = useState('');
      const [messages, setMessages] = useState([]);
      const [joinChat,setjoinChat]=useState(false)
      const[joined,setjoined]=useState(false)


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

    function onReceiveMessage(data) {
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on('receive-message',onReceiveMessage)

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };

    
  }, []);
  socket.emit("joinRoom",roomId) 
  const sendmessage=()=>{
    
      socket.emit('client',message)
      setMessage('')
    }

    const chat=()=>{
setjoinChat(true)
setjoined(false)
    }

  return (
    <div>
      {   !joined &&   <button type="button" value={joinChat}  onClick={chat}>join </button>
}
     {joinChat && (
  <>
    <input
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder="Type a message"
    />
    <button onClick={sendmessage}>Send</button>
  </>
)}
     <ul>
        {messages.map((m,i ) => (
          <li key={i}>
            {m.senderId === socket.id ? "You" : m.senderId.slice(0, 5)}: {m.message}
          </li>
        ))}
      </ul>

    </div>
  );
}