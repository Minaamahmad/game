const SUITS = ["♥", "♦", "♣", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RANK_POINTS = {
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

export function shuffleDeck(deck) {
  const copy = deck.map((card) => ({ ...card }));
  const shuffled = [...copy];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function cloneState(gameState) {
  return structuredClone(gameState);
}

export function dealInitialState(players) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error("dealInitialState requires at least one player ID");
  }

  const baseDeck = shuffleDeck(createDeck());

  const hands = {};
  const captureStacks = {};

  for (const playerId of players) {
    hands[playerId] = [];
    captureStacks[playerId] = [];
  }

  const dealCount = 4;
  const tableCount = 4;

  for (let i = 0; i < players.length; i += 1) {
    const playerId = players[i];
    for (let j = 0; j < dealCount; j += 1) {
      hands[playerId].push(baseDeck.shift());
    }
  }

  const table = baseDeck.splice(0, tableCount);
  const deck = [...baseDeck];

  return {
    players,
    turnIndex: 0,
    deck,
    hands,
    table,
    captureStacks,
    lastCapturerId: null,
  };
}

export function findMatchingTableCards(rank, tableCards) {
  return (tableCards || []).filter((card) => card.rank === rank);
}

export function drawCard(gameState) {
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

  const drawnCard = nextState.deck.pop();
  if (!nextState.hands[currentPlayerId]) {
    nextState.hands[currentPlayerId] = [];
  }

  nextState.hands[currentPlayerId].push(drawnCard);

  return nextState;
}

export function throwCard(gameState, playerId, cardId) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  const hand = gameState.hands[playerId] || [];
  const playedCardIndex = hand.findIndex((card) => card.id === cardId);

  if (playedCardIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const nextState = cloneState(gameState);
  const currentHand = nextState.hands[playerId] || [];
  const playedCardIndexNext = currentHand.findIndex((card) => card.id === cardId);

  if (playedCardIndexNext === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [playedCard] = currentHand.splice(playedCardIndexNext, 1);
  nextState.table.push(playedCard);

  return nextState;
}

export function captureCards(gameState, playerId, cardId) {
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
  const playerHand = nextState.hands[playerId] || [];
  const playerHandIndex = playerHand.findIndex((card) => card.id === cardId);

  if (playerHandIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);
  const captured = [
    ...matchingTableCards.map((tableCard) => ({ ...tableCard })),
    { ...removedPlayedCard },
  ];

  const tableMatchIds = new Set(matchingTableCards.map((card) => card.id));
  nextState.table = (nextState.table || []).filter((card) => !tableMatchIds.has(card.id));

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }

  nextState.captureStacks[playerId] = nextState.captureStacks[playerId].concat(captured);
  nextState.lastCapturerId = playerId;

  return nextState;
}

export function stealCard(gameState, playerId, cardId, targetPlayerId) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { success: false, error: "Invalid game state" };
  }

  const activePlayerId = gameState.players[gameState.turnIndex];
  if (activePlayerId !== playerId) {
    return { success: false, error: "Not this player's turn" };
  }

  if (!gameState.players.includes(targetPlayerId)) {
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
  const playerHand = nextState.hands[playerId] || [];
  const playerHandIndex = playerHand.findIndex((card) => card.id === cardId);

  if (playerHandIndex === -1) {
    return { success: false, error: "Card is not in player's hand" };
  }

  const [removedPlayedCard] = playerHand.splice(playerHandIndex, 1);
  const targetTopCard = nextState.captureStacks[targetPlayerId].pop();

  if (!nextState.captureStacks[playerId]) {
    nextState.captureStacks[playerId] = [];
  }

  nextState.captureStacks[playerId].push(targetTopCard, removedPlayedCard);
  nextState.lastCapturerId = playerId;

  return nextState;
}

export function advanceTurn(gameState) {
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return { success: false, error: "Invalid game state" };
  }

  const nextState = cloneState(gameState);
  nextState.turnIndex = (nextState.turnIndex + 1) % nextState.players.length;
  return nextState;
}

export function isGameOver(gameState) {
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

export function sweepRemainingTableCards(gameState) {
  const nextState = cloneState(gameState);

  if (!nextState.table || nextState.table.length === 0) {
    return nextState;
  }

  if (!nextState.lastCapturerId || !nextState.captureStacks[nextState.lastCapturerId]) {
    return nextState;
  }

  nextState.captureStacks[nextState.lastCapturerId] = nextState.captureStacks[nextState.lastCapturerId].concat(nextState.table);
  nextState.table = [];

  return nextState;
}

export function calculateScore(playerCaptureStack) {
  return (playerCaptureStack || []).reduce((total, card) => total + (card.points || 0), 0);
}

export function getResults(gameState) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return { scores: {}, winnerId: [] };
  }

  const scores = {};

  for (const playerId of gameState.players) {
    const stack = gameState.captureStacks[playerId] || [];
    scores[playerId] = calculateScore(stack);
  }

  const maxScore = Math.max(...Object.values(scores));
  const tiedWinners = gameState.players.filter((playerId) => scores[playerId] === maxScore);

  return {
    scores,
    winnerId: tiedWinners.length === 1 ? tiedWinners[0] : tiedWinners,
  };
}

export function getLegalActions(gameState, playerId) {
  const actions = {
    throw: [],
    capture: [],
    steal: [],
  };

  if (!gameState || !Array.isArray(gameState.players) || !gameState.players.includes(playerId)) {
    return actions;
  }

  if (gameState.players[gameState.turnIndex] !== playerId) {
    return actions;
  }

  const hand = gameState.hands[playerId] || [];
  const table = gameState.table || [];

  for (const card of hand) {
    actions.throw.push({
      cardId: card.id,
      card,
    });

    const captures = findMatchingTableCards(card.rank, table);
    if (captures.length > 0) {
      actions.capture.push({
        cardId: card.id,
        card,
        rank: card.rank,
        matches: captures,
      });
    }

    const stealTargets = (gameState.players || [])
      .filter((targetId) => targetId !== playerId)
      .filter((targetId) => {
        const stack = gameState.captureStacks[targetId] || [];
        return stack.length > 0 && stack[stack.length - 1].rank === card.rank;
      })
      .map((targetId) => ({
        targetPlayerId: targetId,
        topCard: gameState.captureStacks[targetId][gameState.captureStacks[targetId].length - 1],
      }));

    if (stealTargets.length > 0) {
      actions.steal.push({
        cardId: card.id,
        card,
        targets: stealTargets,
      });
    }
  }

  return actions;
}

