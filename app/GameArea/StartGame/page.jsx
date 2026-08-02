import React, { useState } from 'react'
 import { useSocket } from "@/Context/contextapi.js";

const Startgame = () => {
  const socket=useSocket()
  const [turn,setTurn]=useState("")

const playerTurn=()=>{
  if(!socket || !turn.trim()) return;

  socket.emit("turn",turn,(res)=>{
if (res.success) {
        setError("")
        setTurn("")
      } else {
        setError(res.message || "Invalid move")
      }
  })
}
  return (
    <div>
    <h1> Players have joined the room starting gamem</h1>

    <input type="text" value={turn}  onChange={(e)=>setTurn(e.target.value)}/>
<button onClick={playerTurn}></button>
    <p></p>
    </div>
  )
}

export default Startgame
