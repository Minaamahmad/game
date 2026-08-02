"use client";

import React, { useState } from 'react'

 import { useSocket } from "@/Context/contextapi.js";

const Startgame = () => {
  const socket=useSocket()
  const [turn,setTurn]=useState("")

const playerTurn=()=>{
  if(!socket || !turn.trim()) return;

  socket.emit("turn",turn,(res)=>{
if (res.success) {
        setTurn("")
      } else return
  })
}
  return (
    <div>
    <h1> Players have joined the room starting game</h1>

    <input className='bg-white ' type="text"  value={turn}  onChange={(e)=>setTurn(e.target.value)}/>
<button onClick={playerTurn}>Submit</button>
    <p></p>
    </div>
  )
}

export default Startgame
