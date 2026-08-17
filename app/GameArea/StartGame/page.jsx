"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/Context/contextapi.js";

const cardRankLabel = (rank) => (rank === "10" ? "10" : rank);

function Card({
  card,
  faceDown = false,
  className = "",
  onClick,
  isSelected = false,
  isInteractive = false,
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "relative w-14 h-20 rounded-xl border shadow-xl bg-zinc-900 text-zinc-100 transition-all select-none",
        isInteractive ? "cursor-pointer hover:-translate-y-1 hover:border-cyan-400" : "",
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400/50 -translate-y-2 shadow-amber-500/20"
          : "border-zinc-500/70",
        "flex items-center justify-center font-mono overflow-hidden",
        className,
      ].join(" ")}
      style={{ transformStyle: "preserve-3d" }}
    >
      {faceDown ? (
        <div className="absolute inset-0 rounded-xl border border-cyan-300/60 bg-gradient-to-br from-cyan-900 to-slate-950 flex items-center justify-center">
          <div className="absolute inset-1 rounded-lg border border-cyan-300/50" />
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
    </div>
  );
}

const Startgame = () => {
  const socket = useSocket();
  const router = useRouter();
  const [gameState, setGameState] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);

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
  const isMyTurn = currentPlayerId === myId;
  const myHand = useMemo(
    () => gameState?.hands?.[myId] ?? [],
    [gameState, myId]
  );
  const selectedCard = useMemo(
    () => myHand.find((c) => c.id === selectedCardId) ?? null,
    [myHand, selectedCardId]
  );

  // Reset selection whenever active turn changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedCardId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [gameState?.turnIndex, currentPlayerId]);

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
      if (!response?.success) {
        console.warn(response?.error || "Draw failed");
      }
    });
  };

  const throwCard = (cardId) => {
    if (!socket || !gameState || !cardId) return;

    socket.emit("game:throw", cardId, (response) => {
      if (response?.success) {
        setSelectedCardId(null);
      } else {
        console.warn(response?.error || "Throw failed");
      }
    });
  };

  const captureCard = (cardId) => {
    if (!socket || !gameState || !cardId) return;

    socket.emit("game:capture", cardId, (response) => {
      if (response?.success) {
        setSelectedCardId(null);
      } else {
        console.warn(response?.error || "Capture failed");
      }
    });
  };

  const stealCard = (cardId, targetPlayerId) => {
    if (!socket || !gameState || !cardId) return;

    socket.emit("game:steal", cardId, targetPlayerId, (response) => {
      if (response?.success) {
        setSelectedCardId(null);
      } else {
        console.warn(response?.error || "Steal failed");
      }
    });
  };

  const handleHandCardClick = (cardId) => {
    if (!isMyTurn) return;
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  };

  const handleTableAreaClick = () => {
    if (selectedCardId && isMyTurn) {
      throwCard(selectedCardId);
    }
  };

  const handleTableCardClick = (e) => {
    e.stopPropagation();
    if (!selectedCardId || !isMyTurn) return;
    captureCard(selectedCardId);
  };

  const handleStackClick = (e, targetPlayerId) => {
    e.stopPropagation();
    if (!selectedCardId || !isMyTurn || targetPlayerId === myId) return;
    stealCard(selectedCardId, targetPlayerId);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-cyan-300">Cassino Table</h1>
            <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              {gameState ? `Room Code: ${gameState.roomId || "In Game"}` : "Waiting for room"}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-xl border border-cyan-400/60 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/10 disabled:opacity-50 transition-colors"
              onClick={drawFromDeck}
              disabled={!gameState || !isMyTurn}
            >
              Draw Deck
            </button>
          </div>
        </div>

        {!gameState ? (
          <div className="rounded-2xl border border-zinc-800 p-10 text-zinc-500 text-center">
            Waiting for game_state...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Players Status Header */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {gameState.players?.map((playerId) => (
                <div
                  key={playerId}
                  className={`rounded-2xl border p-4 transition-all ${
                    currentPlayerId === playerId
                      ? "border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/5"
                      : "border-zinc-800 bg-zinc-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 truncate max-w-[130px]">
                      {playerId === myId ? `${playerId} (You)` : playerId}
                    </span>
                    {currentPlayerId === playerId && (
                      <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        Turn
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 items-baseline">
                    <span className="text-xl font-black text-cyan-300">{roomScore[playerId] ?? 0}</span>
                    <span className="text-xs text-zinc-500">pts</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(gameState.captureStacks?.[playerId] ?? []).slice(-3).map((stackCard) => (
                      <span
                        key={stackCard.id}
                        className="px-2 py-1 rounded-full text-[9px] bg-zinc-800 text-zinc-300 font-mono"
                      >
                        {stackCard.rank}{stackCard.suit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Table Drop Zone Area */}
            <section className="rounded-3xl border border-cyan-400/30 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Table</div>
                  <div className="text-sm text-zinc-300">
                    {selectedCardId && isMyTurn
                      ? "Click matching table card to capture, or empty table space to throw."
                      : `${gameState.table?.length ?? 0} face-up cards`}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Deck: {gameState.deck?.length ?? gameState.deckCount ?? 0}
                </div>
              </div>

              <div
                onClick={handleTableAreaClick}
                className={`min-h-44 rounded-2xl border transition-all p-6 ${
                  selectedCardId && isMyTurn
                    ? "border-amber-400/80 bg-amber-500/10 cursor-pointer shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/30"
                    : "border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900"
                }`}
              >
                <div className="flex flex-wrap gap-4 min-h-28 items-center">
                  <AnimatePresence>
                    {(gameState.table ?? []).map((card) => {
                      const isMatchingRank = selectedCard && selectedCard.rank === card.rank;
                      return (
                        <motion.div
                          layout
                          key={card.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.2 }}
                          onClick={handleTableCardClick}
                        >
                          <Card
                            card={card}
                            isInteractive={Boolean(selectedCardId && isMyTurn)}
                            isSelected={Boolean(isMatchingRank && isMyTurn)}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {selectedCardId && isMyTurn && (
                    <div className="flex items-center justify-center border-2 border-dashed border-amber-400/40 rounded-xl w-14 h-20 text-amber-300/60 text-[10px] font-bold uppercase tracking-wider text-center p-1 pointer-events-none">
                      Throw Here
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Hand */}
              <section className="rounded-3xl border border-amber-300/30 bg-zinc-900/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Your Hand</div>
                    <div className="text-sm text-zinc-300">
                      {isMyTurn
                        ? selectedCardId
                          ? "Card selected. Click table to throw or capture."
                          : "Click a card to select it"
                        : "Waiting for your turn..."}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2 min-h-24">
                  <AnimatePresence mode="popLayout">
                    {(myHand || []).map((card) => (
                      <motion.div
                        layout
                        key={card.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          card={card}
                          isInteractive={isMyTurn}
                          isSelected={selectedCardId === card.id}
                          onClick={() => handleHandCardClick(card.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              {/* Capture Stacks */}
              <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
                <div className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-4">Capture Stacks</div>
                <div className="space-y-4">
                  {(gameState.players ?? []).map((playerId) => {
                    const stack = gameState.captureStacks?.[playerId] ?? [];
                    const topCard = stack[stack.length - 1];
                    const canSteal =
                      selectedCard &&
                      topCard &&
                      selectedCard.rank === topCard.rank &&
                      playerId !== myId;

                    return (
                      <div
                        key={playerId}
                        onClick={(e) => handleStackClick(e, playerId)}
                        className={`rounded-2xl border p-3 transition-colors ${
                          canSteal && isMyTurn
                            ? "border-rose-500/80 bg-rose-500/10 cursor-pointer hover:border-rose-400"
                            : "border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 truncate max-w-[180px]">
                            {playerId === myId ? `${playerId} (You)` : playerId}{" "}
                            {canSteal && isMyTurn ? "(Click to Steal!)" : ""}
                          </span>
                          <span className="text-[10px] text-zinc-500">{stack.length} cards</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <AnimatePresence>
                            {stack.slice(-4).map((stackCard, idx) => (
                              <motion.div
                                layout
                                key={`${playerId}-${stackCard.id}-${idx}`}
                                className="relative"
                              >
                                <Card card={stackCard} className="w-11 h-16 text-[10px]" />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Startgame;