"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/Context/contextapi.js";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const router = useRouter();
  const socket = useSocket();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  useEffect(() => {
    if (!socket) return;

    const handleJoinSuccess = (res) => {
      setIsJoining(false);
      if (!res.success) {
        setError(res.message || "Failed to join room");
        triggerShake();
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
      triggerShake();
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
      <div
        className={`flex flex-col items-center gap-7 px-10 py-9 rounded-2xl
                   border border-cyan-500/30 bg-zinc-900/60
                   shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]
                   ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-zinc-600 text-[10px] tracking-[0.4em]">
            ♠ ♥ ♦ ♣
          </span>
          <h2 className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase">
            Enter Room Code
          </h2>
        </div>

        <input
          type="text"
          inputMode="numeric"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          disabled={isJoining}
          placeholder="Room code"
          aria-label="Room code"
          className="w-48 h-14 text-center text-2xl font-mono
                   bg-black text-cyan-300 rounded-lg
                   border-2 border-cyan-500/25 transition-all duration-200
                   focus:outline-none focus:border-cyan-400/70
                   disabled:opacity-40"
        />

        <p
          className={`font-mono text-xs tracking-wide h-4 transition-opacity duration-200 ${
            error ? "text-red-400 opacity-100" : "opacity-0"
          }`}
        >
          {error || "placeholder"}
        </p>

        <button
          onClick={joinRoom}
          disabled={!roomId.trim() || isJoining}
          className="w-48 py-3 font-mono font-bold tracking-widest uppercase
                   text-black bg-cyan-400 rounded-lg
                   hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]
                   active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                   disabled:hover:shadow-none disabled:hover:bg-cyan-400
                   transition-all duration-150"
        >
          {isJoining ? "Joining..." : "Join"}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}