"use client";

import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomid, setroomid] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      console.log("connected");
    }

    function onDisconnect() {
      console.log("disconnected");
    }
    function onjoin(data) {
      console.log(data);
    }

    const gameStart = (data) => {
      console.log("game_start event received:", data);

      if (data.players === 4) {
        router.push("/GameArea/StartGame");
      }
    }
      const onwait = (data) => {
        console.log(data);
        router.push("/GameArea/Waiting");
      };
    
    socket.on("game_start", gameStart);
    socket.on("join-success", onjoin);
    socket.on("waiting", onwait);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("join-success", onjoin);
      socket.off("game_start", gameStart);
      socket.off("waiting", onwait);
    };
  }, [router]);

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl border border-cyan-500/30 bg-zinc-900/60 shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]">
        <h2 className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase">
          Enter Room Code
        </h2>

        <input
          type="number"
          value={roomid}
          onChange={(e) => setroomid(e.target.value)}
          placeholder="0000"
          className="w-48 text-center text-3xl font-mono tracking-widest
                   bg-black text-cyan-300 placeholder-zinc-700
                   border-2 border-cyan-500/40 rounded-lg py-3
                   focus:outline-none focus:border-cyan-400
                   focus:shadow-[0_0_20px_rgba(34,211,238,0.6)]
                   transition-all duration-200
                   [appearance:textfield]
                   [&::-webkit-outer-spin-button]:appearance-none
                   [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          onClick={joinRoom}
          className="w-48 py-3 font-mono font-bold tracking-widest uppercase
                   text-black bg-cyan-400 rounded-lg
                   hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]
                   active:scale-95
                   transition-all duration-150"
        >
          Join
        </button>
      </div>
    </div>
  );
}
