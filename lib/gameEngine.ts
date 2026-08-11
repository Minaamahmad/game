interface Card {
  id:string,
  rank: Rank,
  suit:string,
  points:number
}
interface Player {
  id: string;
  name: string;
  hand: Card[];
  // ...
}

interface GameState {
  players: string[];
  turnIndex: number;
  deck: Card[];
  hands: Record<string, Card[]>;
  table: Card[];
  captureStacks: Record<string, Card[]>;
  lastCapturerId: string | null;
}
const SUITS = ["♥", "♦", "♣", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const 

type Rank= typeof RANKS[number]

const RANK_POINTS:Record<Rank,number> = {
  A: 20,
  "2": 5,
  "3": 5,
  "4": 5,
  "5": 5,
  "6": 5,
  "7": 5,
  "8": 5,
  "9": 5,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

export function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`,
        rank,
        suit,
        points: RANK_POINTS[rank],
      });
    }
  }

  return deck;
}


export function shuffleDeck(deck:Card[]):Card[] {
  const shuffled = deck.map((card) => ({ ...card }));

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function cloneState(gameState:GameState) {
  return structuredClone(gameState);
}

export function dealInitialState(players:string[]) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error("dealInitialState requires at least one player ID");
  }

  const baseDeck = shuffleDeck(createDeck());

  const hands:Record<string,Card[]> = {};
  const captureStacks:Record<string,Card[]> = {};

  for (const playerId of players) {
    hands[playerId] = [];
    captureStacks[playerId] = [];
  }

  const dealCount = 4;
  const tableCount = 4;

  for (const playerId of players) {
    for (let j = 0; j < dealCount; j += 1) {
      const card=baseDeck.shift()
      if(card){
        hands[playerId].push(card)
      }
    }
  }

  const table = baseDeck.splice(0, tableCount);

  return {
    players,
    turnIndex: 0,
    deck: baseDeck,
    hands,
    table,
    captureStacks,
    lastCapturerId: null,
  };
}

export function findMatchingTableCards(rank:Rank, tableCards:Card[]):Card[] {
  return (tableCards || []).filter((card) => card.rank === rank);
}

export function drawCard(gameState:GameState) {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { success: false, error: "Invalid game state" };
  }

  if (!gameState.deck || gameState.deck.length === 0) {
    return { success: false, error: "Deck is empty" };
  }

  const nextState = cloneState(gameState);
  const currentPlayerId = nextState.players[nextState.turnIndex];

  if (!currentPlayerId) {
    return { success: false, error: "No current player" };
  }

  if (!nextState.hands[currentPlayerId]) {
    nextState.hands[currentPlayerId] = [];
  }

  const state = nextState.deck.pop();
  if (state) {
    nextState.hands[currentPlayerId].push(state);
  }

  return nextState;
}

export function throwCard(gameState:GameState, playerId:string, cardId:string) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  const nextState = cloneState(gameState as GameState);
  const hand = nextState.hands[playerId] || [];
  const cardIndex = hand.findIndex((card) => card.id === cardId);

  if (cardIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [playedCard] = hand.splice(cardIndex, 1);
  nextState.table.push(playedCard);

  return nextState;
}

export function captureCards(gameState:GameState, playerId:string, cardId:string) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  const hand = gameState.hands[playerId] || [];
  const playedCard = hand.find((card) => card.id === cardId);

  if (!playedCard) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const matchingTableCards = findMatchingTableCards(playedCard.rank, gameState.table || []);
  if (matchingTableCards.length === 0) {
    return { success: false, error: "No matching table cards for this rank" };
  }

  const nextState = cloneState(gameState);
  const playerHand = nextState.hands[playerId];
  const playerHandIndex = playerHand.findIndex((card) => card.id === cardId);
  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);

  const tableMatchIds = new Set(matchingTableCards.map((card) => card.id));
  const captured = nextState.table.filter((card) => tableMatchIds.has(card.id));
  captured.push(removedPlayedCard);

  nextState.table = nextState.table.filter((card) => !tableMatchIds.has(card.id));

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }

  nextState.captureStacks[playerId].push(...captured);
  nextState.lastCapturerId = playerId;

  return nextState;
}

export function stealCard(gameState:GameState, playerId:string, cardId:string, targetPlayerId:string) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  const targetPlayer = gameState.players.find((player) => player === targetPlayerId);
  if (!targetPlayer) {
    return { success: false, error: "Invalid steal target" };
  }

  if (targetPlayerId === playerId) {
    return { success: false, error: "Cannot steal from self" };
  }

  const hand = gameState.hands[playerId] || [];
  const playedCard = hand.find((card) => card.id === cardId);

  if (!playedCard) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const targetStack = gameState.captureStacks[targetPlayerId] || [];
  if (targetStack.length === 0) {
    return { success: false, error: "Steal target has no capture stack" };
  }

  const targetTop = targetStack[targetStack.length - 1];
  if (targetTop.rank !== playedCard.rank) {
    return { success: false, error: "Steal target top rank does not match played card rank" };
  }

  const nextState = cloneState(gameState);
  const playerHand = nextState.hands[playerId];
  const playerHandIndex = playerHand.findIndex((card) => card.id === cardId);
  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);
  const targetTopCard = nextState.captureStacks[targetPlayerId].pop();

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }
  if(targetTopCard){

    nextState.captureStacks[playerId].push(targetTopCard, removedPlayedCard);
    nextState.lastCapturerId = playerId;
  }else{
    nextState.captureStacks[playerId].push( removedPlayedCard);
  }

  return nextState;
}

export function advanceTurn(gameState:GameState) {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { success: false, error: "Invalid game state" };
  }

  const nextState = cloneState(gameState);
  nextState.turnIndex = (nextState.turnIndex + 1) % nextState.players.length;
  return nextState;
}

export function isGameOver(gameState:GameState) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return false;
  }

  const deckEmpty = !gameState.deck || gameState.deck.length === 0;
  const allHandsEmpty = gameState.players.every((playerId) => {
    const hand = gameState.hands[playerId] || [];
    return hand.length === 0;
  });

  return deckEmpty && allHandsEmpty;
}

export function sweepRemainingTableCards(gameState:GameState) {
  const nextState = cloneState(gameState);

  if (!nextState.table || nextState.table.length === 0) {
    return nextState;
  }

  if (!nextState.lastCapturerId || !nextState.captureStacks[nextState.lastCapturerId]) {
    return nextState;
  }

  nextState.captureStacks[nextState.lastCapturerId].push(...nextState.table);
  nextState.table = [];

  return nextState;
}

export function calculateScore(playerCaptureStack:Card[]) {
  return (playerCaptureStack || []).reduce((total, card) => total + (card.points || 0), 0);
}

export function getResults(gameState:GameState) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { scores: {}, winnerId: [] };
  }

  const scores = {};

  for (const playerId of gameState.players) {
    scores[playerId] = calculateScore(gameState.captureStacks[playerId]);
  }

  const maxScore = Math.max(...Object.values(scores));
  const tiedWinners = gameState.players.filter((playerId) => scores[playerId] === maxScore);

  return {
    scores,
    winnerId: tiedWinners.length === 1 ? tiedWinners[0] : tiedWinners,
  };
}

export function getLegalActions(gameState, playerId) {
  const actions = { throw: [], capture: [], steal: [] };

  if (!gameState || !Array.isArray(gameState.players) || !gameState.players.includes(playerId)) {
    return actions;
  }

  if (gameState.players[gameState.turnIndex] !== playerId) {
    return actions;
  }

  const hand = gameState.hands[playerId] || [];
  const table = gameState.table || [];

  for (const card of hand) {
    actions.throw.push({ cardId: card.id, card });

    const captures = findMatchingTableCards(card.rank, table);
    if (captures.length > 0) {
      actions.capture.push({ cardId: card.id, card, rank: card.rank, matches: captures });
    }

    const stealTargets = gameState.players
      .filter((targetId) => targetId !== playerId)
      .map((targetId) => {
        const stack = gameState.captureStacks[targetId] || [];
        const topCard = stack[stack.length - 1];
        return topCard && topCard.rank === card.rank ? { targetPlayerId: targetId, topCard } : null;
      })
      .filter(Boolean);

    if (stealTargets.length > 0) {
      actions.steal.push({ cardId: card.id, card, targets: stealTargets });
    }
  }

  return actions;
}