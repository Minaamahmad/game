interface Card {
  id: string;
  rank: Rank;
  suit: string;
  points: number;
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
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

type Rank = typeof RANKS[number];

const RANK_POINTS: Record<Rank, number> = {
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

type ActionResult<T> =
  | { success: true; state: T }
  | { success: false; error: string };

export function createDeck(): Card[] {
  const deck: Card[] = [];

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

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = deck.map((card) => ({ ...card }));

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function cloneState(gameState: GameState): GameState {
  if (typeof structuredClone === "function") {
    return structuredClone(gameState);
  }

  return JSON.parse(JSON.stringify(gameState));
}

export function dealInitialState(players: string[]): GameState {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error("dealInitialState requires at least one player ID");
  }

  const baseDeck = shuffleDeck(createDeck());

  const hands: Record<string, Card[]> = {};
  const captureStacks: Record<string, Card[]> = {};

  for (const playerId of players) {
    hands[playerId] = [];
    captureStacks[playerId] = [];
  }

  const dealCount = 4;
  const tableCount = 4;

  for (const playerId of players) {
    for (let j = 0; j < dealCount; j += 1) {
      const card = baseDeck.shift();
      if (card) {
        hands[playerId].push(card);
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

export function findMatchingTableCards(rank: Rank, tableCards: Card[]): Card[] {
  return (tableCards || []).filter((card) => card.rank === rank);
}

export function drawCard(gameState: GameState, playerId?: string): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  const actingPlayerId = playerId ?? activePlayerId;

  if (actingPlayerId && activePlayerId !== actingPlayerId) {
    return { success: false, error: "Not this player's turn" };
  }

  if (!gameState.deck || gameState.deck.length === 0) {
    return { success: false, error: "Deck is empty" };
  }

  const currentHand = gameState.hands[actingPlayerId] || [];
  if (currentHand.length >= 5) {
    return { success: false, error: "Player cannot hold more than 5 cards" };
  }

  const nextState = cloneState(gameState);
  if (!nextState.hands[actingPlayerId]) {
    nextState.hands[actingPlayerId] = [];
  }

  const dealtCard = nextState.deck.shift();
  if (!dealtCard) {
    return { success: false, error: "Deck is empty" };
  }

  nextState.hands[actingPlayerId].push(dealtCard);

  return { success: true, state: nextState };
}

export function throwCard(gameState: GameState, playerId: string, cardId: string): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  if ((gameState.hands[playerId] || []).length < 5 && gameState.deck.length > 0) {
    return { success: false, error: "Draw one card before playing" };
  }

  const nextState = cloneState(gameState);
  const hand = nextState.hands[playerId] || [];
  const cardIndex = hand.findIndex((card) => card.id === cardId);

  if (cardIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [playedCard] = hand.splice(cardIndex, 1);

  if (!playedCard) {
    return { success: false, error: "Failed to remove card from hand" };
  }

  nextState.table.push(playedCard);

  return { success: true, state: nextState };
}

export function captureCards(gameState: GameState, playerId: string, cardId: string): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  if ((gameState.hands[playerId] || []).length < 5 && gameState.deck.length > 0) {
    return { success: false, error: "Draw one card before capturing" };
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

  if (playerHandIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);

  if (!removedPlayedCard) {
    return { success: false, error: "Failed to remove card from hand" };
  }

  const tableMatchIds = new Set(matchingTableCards.map((card) => card.id));
  const captured = nextState.table.filter((card) => tableMatchIds.has(card.id));
  captured.push(removedPlayedCard);

  nextState.table = nextState.table.filter((card) => !tableMatchIds.has(card.id));

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }

  nextState.captureStacks[playerId].push(...captured);
  nextState.lastCapturerId = playerId;

  return { success: true, state: nextState };
}

export function stealCard(
  gameState: GameState,
  playerId: string,
  cardId: string,
  targetPlayerId: string
): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  if ((gameState.hands[playerId] || []).length < 5 && gameState.deck.length > 0) {
    return { success: false, error: "Draw one card before stealing" };
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

  if (playerHandIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);

  if (!removedPlayedCard) {
    return { success: false, error: "Failed to remove card from hand" };
  }

  const targetTopCard = nextState.captureStacks[targetPlayerId].pop();

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }

  if (targetTopCard) {
    nextState.captureStacks[playerId].push(targetTopCard, removedPlayedCard);
    nextState.lastCapturerId = playerId;
  } else {
    nextState.captureStacks[playerId].push(removedPlayedCard);
  }

  return { success: true, state: nextState };
}

export function advanceTurn(gameState: GameState): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { success: false, error: "Invalid game state" };
  }

  const nextState = cloneState(gameState);
  nextState.turnIndex = (nextState.turnIndex + 1) % nextState.players.length;
  return { success: true, state: nextState };
}

export function isGameOver(gameState: GameState): boolean {
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

export function sweepRemainingTableCards(gameState: GameState): ActionResult<GameState> {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const nextState = cloneState(gameState);

  if (!nextState.table || nextState.table.length === 0) {
    return { success: true, state: nextState };
  }

  if (!nextState.lastCapturerId || !nextState.captureStacks[nextState.lastCapturerId]) {
    return { success: true, state: nextState };
  }

  nextState.captureStacks[nextState.lastCapturerId].push(...nextState.table);
  nextState.table = [];

  return { success: true, state: nextState };
}

export function calculateScore(playerCaptureStack: Card[]): number {
  return (playerCaptureStack || []).reduce((total, card) => total + (card.points || 0), 0);
}

export function getResults(gameState: GameState) {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { scores: {}, winnerId: [] };
  }

  const scores: Record<string, number> = {};

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

type ThrowAction = {
  cardId: string;
  card: Card;
};

type CaptureAction = {
  cardId: string;
  card: Card;
  targetCards: Card[];
  rank: Rank;
};

type StealTarget = {
  targetPlayerId: string;
  topCard: Card;
};

type StealAction = {
  cardId: string;
  card: Card;
  targets: StealTarget[];
};

export type LegalActions = {
  throw: ThrowAction[];
  capture: CaptureAction[];
  steal: StealAction[];
};

export function getLegalActions(gameState: GameState, playerId: string): LegalActions {
  const actions: LegalActions = { throw: [], capture: [], steal: [] };

  if (!gameState || !Array.isArray(gameState.players) || !gameState.players.includes(playerId)) {
    return actions;
  }

  if (gameState.players[gameState.turnIndex] !== playerId) {
    return actions;
  }

  const hand: Card[] = gameState.hands[playerId] || [];
  const table: Card[] = gameState.table || [];

  for (const card of hand) {
    actions.throw.push({ cardId: card.id, card });

    const captures = findMatchingTableCards(card.rank, table);
    if (captures.length > 0) {
      actions.capture.push({ cardId: card.id, card, rank: card.rank, targetCards: captures });
    }

    const stealTargets = gameState.players
      .filter((targetId) => targetId !== playerId)
      .map((targetId) => {
        const stack = gameState.captureStacks[targetId] || [];
        const topCard = stack[stack.length - 1];
        return topCard && topCard.rank === card.rank ? { targetPlayerId: targetId, topCard } : null;
      })
      .filter((target): target is StealTarget => target !== null);

    if (stealTargets.length > 0) {
      actions.steal.push({ cardId: card.id, card, targets: stealTargets });
    }
  }

  return actions;
}