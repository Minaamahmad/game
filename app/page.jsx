"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/Context/contextapi.js";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleJoinSuccess = (res) => {
      setIsJoining(false);
      if (!res.success) {
        setError(res.message || "Failed to join room");
      }
   
    };

    const handleGameStart = (data) => {
      router.push("/GameArea/StartGame");
    };

    const handleWaiting = (data) => {
      router.push("/GameArea/Waiting");
    };

    socket.on("join-success", handleJoinSuccess);
    socket.on("game_start", handleGameStart);
    socket.on("waiting", handleWaiting);

    return () => {
      socket.off("join-success", handleJoinSuccess);
      socket.off("game_start", handleGameStart);
      socket.off("waiting", handleWaiting);
    };
  }, [router, socket]);

  const joinRoom = useCallback(() => {
    const trimmed = roomId.trim();
    const num = Number(trimmed);

    if (!trimmed || !Number.isInteger(num) || num <= 0) {
      setError("Enter a valid room code");
      return;
    }

    if (!socket || isJoining) return;

    setError("");
    setIsJoining(true);
    socket.emit("roomid", trimmed);
  }, [roomId, socket, isJoining]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") joinRoom();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl border border-cyan-500/30 bg-zinc-900/60 shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]">
        <h2 className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase">
          Enter Room Code
        </h2>
        <input
          type="number"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="0000"
          disabled={isJoining}
          className="w-48 text-center text-3xl font-mono tracking-widest
                   bg-black text-cyan-300 placeholder-zinc-700
                   border-2 border-cyan-500/40 rounded-lg py-3
                   focus:outline-none focus:border-cyan-400
                   focus:shadow-[0_0_20px_rgba(34,211,238,0.6)]
                   disabled:opacity-50
                   transition-all duration-200
                   [appearance:textfield]
                   [&::-webkit-outer-spin-button]:appearance-none
                   [&::-webkit-inner-spin-button]:appearance-none"
        />

        {error && (
          <p className="text-red-400 font-mono text-xs tracking-wide">
            {error}
          </p>
        )}
        <button
          onClick={joinRoom}
          disabled={isJoining}
          className="w-48 py-3 font-mono font-bold tracking-widest uppercase
                   text-black bg-cyan-400 rounded-lg
                   hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]
                   active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                   disabled:hover:shadow-none
                   transition-all duration-150"
        >
          {isJoining ? "Joining..." : "Join"}
        </button>
      </div>
    </div>
  );
}
