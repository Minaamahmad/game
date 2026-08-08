"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/Context/contextapi.js";

const WaitingPage = () => {
  const socket = useSocket();
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [roomCode, setRoomCode] = useState(null);
  const [status, setStatus] = useState("Waiting for players");

  useEffect(() => {
    if (!socket) return undefined;

    socket.emit("room:sync", (payload) => {
      if (payload?.success) {
        setRoomCode(payload.roomId ?? null);
        setPlayers(payload.players ?? []);
        setStatus(payload.started ? "Game started" : "Waiting for players");

        if (payload.started) {
          router.replace("/GameArea/StartGame");
        }
      }
    });

    const handleRoomData = (roomPlayers) => {
      setPlayers(roomPlayers || []);
    };

    const handleJoinSuccess = (payload) => {
      if (payload?.success && payload.roomcode) {
        setRoomCode(payload.roomcode);
      }
    };

    const handleWaiting = (payload) => {
      if (payload?.message) {
        setStatus(payload.message);
      }
    };

    const handleGameStart = (payload) => {
      if (payload?.message) {
        setStatus(payload.message);
      }

      router.replace("/GameArea/StartGame");
    };

    socket.on("roomdata", handleRoomData);
    socket.on("join-success", handleJoinSuccess);
    socket.on("waiting", handleWaiting);
    socket.on("game_start", handleGameStart);

    return () => {
      socket.off("roomdata", handleRoomData);
      socket.off("join-success", handleJoinSuccess);
      socket.off("waiting", handleWaiting);
      socket.off("game_start", handleGameStart);
    };
  }, [router, socket]);

  const progress = useMemo(() => {
    return Math.max(8, Math.round((players.length / 4) * 100));
  }, [players]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-cyan-500/30 bg-zinc-900/80 p-8 shadow-[0_0_40px_rgba(34,211,238,0.14)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.34em] text-cyan-300">Room Lobby</div>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-wider text-white">Waiting Room</h1>
          </div>
          <div className="rounded-full border border-cyan-400/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-200">
            {roomCode ?? "--"}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.34em] text-zinc-500">
            <span>{status}</span>
            <span>{players.length}/4 players</span>
          </div>
          <div className="mt-3 h-3 rounded-full border border-cyan-400/30 bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </div>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {Array.from({ length: 4 }).map((_, index) => {
              const player = players[index];
              return (
                <motion.div
                  key={player ?? `empty-${index}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4 min-h-[110px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Player {index + 1}</span>
                    {player ? <span className="w-2 h-2 rounded-full bg-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-zinc-700" />}
                  </div>
                  <div className="mt-5 text-sm font-mono text-zinc-300">
                    {player ? player : "Waiting..."}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="text-sm text-zinc-400">
            A room can only begin once all four seats are occupied.
          </div>
          <button className="rounded-xl border border-cyan-300/40 px-5 py-2 text-xs font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-60">
            Ready
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingPage
