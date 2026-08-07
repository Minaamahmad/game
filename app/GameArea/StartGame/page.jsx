"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/Context/contextapi.js";

const cardRankLabel = (rank) => rank === "10" ? "10" : rank;

function Card({ card, faceDown = false, className = "" }) {
  return (
    <motion.div
      layout
      key={card?.id ?? "card"}
      initial={{ opacity: 0, y: -8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.78 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={[
        "relative w-14 h-20 rounded-xl border border-zinc-500/70 shadow-xl bg-zinc-900 text-zinc-100",
        "flex items-center justify-center font-mono overflow-hidden",
        className,
      ].join(" ")}
      style={{ transformStyle: "preserve-3d" }}
    >
      {faceDown ? (
        <div className="absolute inset-0 rounded-xl border border-cyan-300/60 bg-gradient-to-br from-cyan-900 to-slate-950 flex items-center justify-center">
          <motion.div
            className="absolute inset-1 rounded-lg border border-cyan-300/50"
            animate={{ rotateY: 180 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
          />
          <span className="text-[10px] font-bold tracking-widest text-cyan-300">C</span>
        </div>
      ) : (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-zinc-950">
          <div className="flex flex-col h-full items-center justify-center">
            <span className="text-xs font-black leading-none">{cardRankLabel(card?.rank)}</span>
            <span className="text-[10px] font-bold mt-1">{card?.suit}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const Startgame = () => {
  const socket = useSocket();
  const router = useRouter();
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    socket.emit("room:sync", (payload) => {
      if (!payload?.success || !payload.started) {
        router.replace("/GameArea/Waiting");
        return;
      }

      if (payload.gameState) {
        setGameState(payload.gameState);
      } else {
        router.replace("/GameArea/Waiting");
      }
    });

    const handleGameState = (state) => {
      setGameState(state);
    };

    socket.on("game_state", handleGameState);

    return () => {
      socket.off("game_state", handleGameState);
    };
  }, [router, socket]);

  const currentPlayerId = gameState?.players?.[gameState?.turnIndex] ?? null;
  const myId = socket?.id ?? null;
  const myHand = gameState?.hands?.[myId] ?? [];

  const roomScore = useMemo(() => {
    if (!gameState?.captureStacks) return {};
    return Object.entries(gameState.captureStacks).reduce((acc, [playerId, stack]) => {
      acc[playerId] = (stack || []).reduce((total, card) => total + (card.points ?? 0), 0);
      return acc;
    }, {});
  }, [gameState]);

  const drawFromDeck = () => {
    if (!socket || !gameState) return;

    socket.emit("game:draw", (response) => {
      if (response?.success && response.gameState) {
        setGameState(response.gameState);
      } else {
        console.warn(response?.error || "Draw failed");
      }
    });
  };

  const throwCard = (cardId) => {
    if (!socket || !gameState) return;

    socket.emit("game:throw", cardId, (response) => {
      if (response?.success && response.gameState) {
        setGameState(response.gameState);
      } else {
        console.warn(response?.error || "Throw failed");
      }
    });
  };

  const captureCard = (cardId) => {
    if (!socket || !gameState) return;

    socket.emit("game:capture", cardId, (response) => {
      if (response?.success && response.gameState) {
        setGameState(response.gameState);
      } else {
        console.warn(response?.error || "Capture failed");
      }
    });
  };

  const stealCard = (cardId, targetPlayerId) => {
    if (!socket || !gameState) return;

    socket.emit("game:steal", cardId, targetPlayerId, (response) => {
      if (response?.success && response.gameState) {
        setGameState(response.gameState);
      } else {
        console.warn(response?.error || "Steal failed");
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-cyan-300">Cassino Table</h1>
            <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              {gameState ? `Room: ${gameState.players?.join(" / ")}` : "Waiting for room"}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-xl border border-cyan-400/60 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/10"
              onClick={drawFromDeck}
              disabled={!gameState || currentPlayerId !== myId}
            >
              Draw Deck
            </button>
          </div>
        </div>

        {!gameState ? (
          <div className="rounded-2xl border border-zinc-800 p-10 text-zinc-500">Waiting for game_state...</div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {gameState.players?.map((playerId) => (
                <div key={playerId} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{playerId}</span>
                    {currentPlayerId === playerId && <span className="text-[10px] uppercase text-emerald-300">Turn</span>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="text-xl font-black text-cyan-300">{roomScore[playerId] ?? 0}</span>
                    <span className="text-xs text-zinc-500 self-end">pts</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(gameState.captureStacks?.[playerId] ?? []).slice(-3).map((stackCard) => (
                      <span key={stackCard.id} className="px-2 py-1 rounded-full text-[9px] bg-zinc-800 text-zinc-300">
                        {stackCard.rank}{stackCard.suit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-cyan-400/30 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Table</div>
                  <div className="text-sm text-zinc-300">{gameState.table?.length ?? 0} face-up cards</div>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Deck {gameState.deckCount ?? 0}
                </div>
              </div>

              <div className="min-h-34 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-4">
                <div className="flex flex-wrap gap-3">
                  <AnimatePresence>
                    {(gameState.table ?? []).map((card) => (
                      <motion.div layout key={card.id} initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, scale: 0.65 }} transition={{ duration: 0.25 }}>
                        <Card card={card} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-amber-300/30 bg-zinc-900/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Your Hand</div>
                    <div className="text-sm text-zinc-300">{myHand.length} cards</div>
                  </div>
                  <div className="text-xs text-zinc-500">Playable Only</div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <AnimatePresence mode="popLayout">
                    {(myHand || []).map((card) => (
                      <motion.div
                        layout
                        key={card.id}
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="flex flex-col items-center gap-2"
                      >
                        <Card card={card} />
                        <div className="flex gap-1">
                          <button className="rounded px-2 py-1 border border-zinc-600 text-[10px] hover:border-cyan-300" onClick={() => throwCard(card.id)}>Throw</button>
                          <button className="rounded px-2 py-1 border border-zinc-600 text-[10px] hover:border-emerald-300" onClick={() => captureCard(card.id)}>Capture</button>
                          <button className="rounded px-2 py-1 border border-rose-600 text-[10px] hover:border-rose-300" onClick={() => {
                            const targets = Object.keys(gameState.captureStacks ?? {}).filter((id) => id !== myId);
                            if (targets.length > 0) {
                              stealCard(card.id, targets[0]);
                            }
                          }}>Steal</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
                <div className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-4">Capture Stacks</div>
                <div className="space-y-4">
                  {(gameState.players ?? []).map((playerId) => (
                    <div key={playerId} className="rounded-2xl border border-zinc-800 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{playerId}</span>
                        <span className="text-[10px] text-zinc-500">{(gameState.captureStacks?.[playerId] ?? []).length} cards</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <AnimatePresence>
                          {(gameState.captureStacks?.[playerId] ?? []).slice(-4).map((stackCard, idx) => (
                            <motion.div layout key={`${playerId}-${stackCard.id}-${idx}`} className="relative">
                              <Card card={stackCard} className="w-11 h-16" />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Startgame
