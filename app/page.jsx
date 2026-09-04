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
        return;
      }
      localStorage.setItem("cassino-room-code", String(res.roomcode));
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
    let reconnectToken = localStorage.getItem("cassino-reconnect-token");
    if (!reconnectToken) {
      reconnectToken = crypto.randomUUID();
      localStorage.setItem("cassino-reconnect-token", reconnectToken);
    }
    socket.emit("roomid", { roomcode: trimmed, reconnectToken });
  }, [roomId, socket, isJoining]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") joinRoom();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d3b2a] via-[#072419] to-[#03110b]">
      <div
        className={`flex flex-col items-center gap-7 px-10 py-9 rounded-2xl
                   border border-[#d4af37]/30 bg-[#072419]/80 backdrop-blur-sm
                   shadow-[0_0_50px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.15)]
                   ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[#d4af37]/60 text-xs tracking-[0.4em]">
            ♠ ♥ ♦ ♣
          </span>
          <h2 className="text-[#f5e6c8] font-serif text-2xl font-bold tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
          className="w-52 h-14 text-center text-2xl font-mono
                   bg-[#03110b]/90 text-[#f5e6c8] placeholder-[#d4af37]/30 rounded-lg
                   border border-[#d4af37]/40 transition-all duration-200
                   focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_15px_rgba(212,175,55,0.3)]
                   disabled:opacity-40"
        />

        <p
          className={`font-mono text-xs tracking-wide h-4 transition-opacity duration-200 ${
            error ? "text-rose-400 opacity-100" : "opacity-0"
          }`}
        >
          {error || "placeholder"}
        </p>

        <button
          onClick={joinRoom}
          disabled={!roomId.trim() || isJoining}
          className="w-52 py-3 font-mono font-bold tracking-widest uppercase
                   text-[#072419] bg-[#d4af37] rounded-lg
                   hover:bg-[#e6c250] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]
                   active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                   disabled:hover:shadow-none disabled:hover:bg-[#d4af37]
                   transition-all duration-150"
        >
          {isJoining ? "Joining..." : "Join Table"}
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