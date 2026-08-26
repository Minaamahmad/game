"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/Context/contextapi.js";

const cardRankLabel = (rank) => (rank === "10" ? "10" : rank);
const isRed = (suit) => suit === "♥" || suit === "♦";

function Card({
  card,
  faceDown = false,
  className = "",
  onClick,
  isSelected = false,
  isInteractive = false,
  style,
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={[
        "relative w-14 h-20 rounded-lg border shadow-[0_6px_18px_rgba(0,0,0,0.5)] transition-all select-none",
        isInteractive ? "cursor-pointer hover:-translate-y-2 hover:border-[#e8d9a0]" : "",
        isSelected
          ? "border-[#c9a227] ring-2 ring-[#c9a227]/60 -translate-y-3 shadow-[0_0_16px_rgba(201,162,39,0.35)]"
          : "border-[#c9a227]/30",
        "flex items-center justify-center font-serif overflow-hidden",
        className,
      ].join(" ")}
    >
      {faceDown ? (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0f4a34] to-[#062318] flex items-center justify-center">
          <div className="absolute inset-1 rounded-md border border-[#c9a227]/40" />
          <span className="text-[10px] font-bold tracking-widest text-[#c9a227]/70">C</span>
        </div>
      ) : (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#fbf6e8] to-[#efe4c4]">
          <div className="flex flex-col h-full items-center justify-center">
            <span className={`text-sm font-black leading-none ${isRed(card?.suit) ? "text-[#a3312c]" : "text-[#1a1a1a]"}`}>
              {cardRankLabel(card?.rank)}
            </span>
            <span className={`text-xs mt-1 ${isRed(card?.suit) ? "text-[#a3312c]" : "text-[#1a1a1a]"}`}>
              {card?.suit}
            </span>
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

    const syncRoom = () => socket.emit("room:sync", (payload) => {
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

    const handleJoinSuccess = (payload) => {
      if (payload?.success) syncRoom();
    };

    socket.on("join-success", handleJoinSuccess);

    const roomCode = localStorage.getItem("cassino-room-code");
    let reconnectToken = localStorage.getItem("cassino-reconnect-token");
    if (!reconnectToken) {
      reconnectToken = crypto.randomUUID();
      localStorage.setItem("cassino-reconnect-token", reconnectToken);
    }
    const rejoinRoom = () => {
      if (roomCode) {
        socket.emit("roomid", { roomcode: roomCode, reconnectToken });
      } else {
        syncRoom();
      }
    };

    if (socket.connected) rejoinRoom();
    else socket.once("connect", rejoinRoom);

    const handleGameState = (state) => {
      setGameState(state);
    };

    socket.on("game_state", handleGameState);

    return () => {
      socket.off("join-success", handleJoinSuccess);
      socket.off("connect", rejoinRoom);
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

  // fan geometry for the first-person hand
  const fanTransform = (idx, total) => {
    const mid = (total - 1) / 2;
    const offset = idx - mid;
    const rot = offset * 9;
    const x = offset * 34;
    const y = Math.abs(offset) * 10;
    return { transform: `translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`, transformOrigin: "bottom center" };
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#07120d] font-serif text-[#e8d9a0]">
      {/* felt backdrop + vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(15,74,52,0.55) 0%, rgba(7,18,13,1) 72%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 180px 70px rgba(0,0,0,0.75)" }}
      />

      <div className="relative max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.3em] text-[#e8d9a0] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              Cassino
            </h1>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#c9a227]/50 font-sans mt-1">
              {gameState ? `Table · ${gameState.roomId || "In Game"}` : "Waiting for room"}
            </div>
          </div>
          <button
            className="rounded-md border border-[#c9a227]/60 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.25em] font-sans text-[#e8d9a0] hover:bg-[#c9a227]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={drawFromDeck}
            disabled={!gameState || !isMyTurn || myHand.length >= 5}
          >
            Draw
          </button>
        </div>

        {!gameState ? (
          <div className="rounded-2xl border border-[#c9a227]/20 p-10 text-[#e8d9a0]/40 text-center font-sans text-sm tracking-widest uppercase">
            Waiting for game state...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Players Status Header */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {gameState.players?.map((playerId) => (
                <div
                  key={playerId}
                  className={`rounded-xl border p-4 transition-all ${
                    currentPlayerId === playerId
                      ? "border-[#c9a227]/70 bg-[#c9a227]/[0.06] shadow-[0_0_20px_rgba(201,162,39,0.08)]"
                      : "border-[#c9a227]/15 bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8d9a0]/60 font-sans truncate max-w-[130px]">
                      {playerId === myId ? `${playerId} (You)` : playerId}
                    </span>
                    {currentPlayerId === playerId && (
                      <span className="text-[9px] uppercase font-bold text-[#c9a227] bg-[#c9a227]/15 px-2 py-0.5 rounded-full font-sans">
                        Turn
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2 items-baseline">
                    <span className="text-xl font-black text-[#e8d9a0]">{roomScore[playerId] ?? 0}</span>
                    <span className="text-[10px] text-[#e8d9a0]/40 font-sans">pts</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(gameState.captureStacks?.[playerId] ?? []).slice(-3).map((stackCard) => (
                      <span
                        key={stackCard.id}
                        className={`px-1.5 py-0.5 rounded text-[9px] bg-black/30 border border-[#c9a227]/20 font-mono ${
                          isRed(stackCard.suit) ? "text-[#c9784f]" : "text-[#e8d9a0]/70"
                        }`}
                      >
                        {stackCard.rank}{stackCard.suit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Table Drop Zone Area */}
            <section className="rounded-[2rem] border border-[#c9a227]/25 bg-black/20 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.35em] text-[#c9a227]/50 font-sans">The Table</div>
                  <div className="text-xs text-[#e8d9a0]/60 font-sans mt-1">
                    {selectedCardId && isMyTurn
                      ? "Tap a matching card to capture, or open felt to throw."
                      : `${gameState.table?.length ?? 0} cards in play`}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#e8d9a0]/40 font-sans">
                  Deck {gameState.deck?.length ?? gameState.deckCount ?? 0}
                </div>
              </div>

              <div
                onClick={handleTableAreaClick}
                className={`min-h-44 rounded-2xl border transition-all p-6 ${
                  selectedCardId && isMyTurn
                    ? "border-[#c9a227]/70 bg-[#c9a227]/[0.05] cursor-pointer ring-1 ring-[#c9a227]/20"
                    : "border-[#c9a227]/10 bg-gradient-to-br from-[#0a1f16] to-[#07120d]"
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
                    <div className="flex items-center justify-center border-2 border-dashed border-[#c9a227]/30 rounded-lg w-14 h-20 text-[#c9a227]/50 text-[9px] font-bold uppercase tracking-wider text-center p-1 pointer-events-none font-sans">
                      Throw
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Hand — first-person fan */}
              <section className="rounded-[2rem] border border-[#c9a227]/25 bg-black/20 p-6 pb-10">
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-[0.35em] text-[#c9a227]/50 font-sans">Your Hand</div>
                  <div className="text-xs text-[#e8d9a0]/60 font-sans mt-1">
                    {isMyTurn
                      ? selectedCardId
                        ? "Card raised. Tap the table to throw or capture."
                        : "Tap a card to raise it"
                      : "Waiting for your turn..."}
                  </div>
                </div>

                <div className="relative flex justify-center pt-6 min-h-[9rem]">
                  <AnimatePresence mode="popLayout">
                    {(myHand || []).map((card, idx) => {
                      const fan = fanTransform(idx, myHand.length);
                      const selected = selectedCardId === card.id;
                      return (
                        <motion.div
                          layout
                          key={card.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.25 }}
                          className="absolute bottom-0"
                          style={fan}
                        >
                          <Card
                            card={card}
                            isInteractive={isMyTurn}
                            isSelected={selected}
                            onClick={() => handleHandCardClick(card.id)}
                            style={selected ? { transform: "translateY(-14px)" } : undefined}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>

              {/* Capture Stacks */}
              <section className="rounded-[2rem] border border-[#c9a227]/15 bg-black/20 p-6">
                <div className="text-[10px] uppercase tracking-[0.35em] text-[#c9a227]/50 font-sans mb-4">Capture Stacks</div>
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
                        className={`rounded-xl border p-3 transition-colors ${
                          canSteal && isMyTurn
                            ? "border-[#a3312c]/70 bg-[#a3312c]/10 cursor-pointer hover:border-[#a3312c]"
                            : "border-[#c9a227]/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8d9a0]/60 font-sans truncate max-w-[180px]">
                            {playerId === myId ? `${playerId} (You)` : playerId}{" "}
                            {canSteal && isMyTurn ? "· Steal" : ""}
                          </span>
                          <span className="text-[9px] text-[#e8d9a0]/30 font-sans">{stack.length} cards</span>
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