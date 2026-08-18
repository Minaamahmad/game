import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck,
  shuffleDeck,
  dealInitialState,
  findMatchingTableCards,
  drawCard,
  throwCard,
  captureCards,
  stealCard,
  advanceTurn,
  isGameOver,
  sweepRemainingTableCards,
  calculateScore,
  getResults,
} from '../lib/gameEngine.ts';

function makeRankCard(rank) {
  return { id: `${rank}-1`, rank, suit: 'H', points: 10 };
}

test('Deck creation has exactly 52 unique cards with correct point values', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const ids = deck.map((c) => c.id);
  assert.equal(new Set(ids).size, 52);

  const expectedPoints = {
    A: 20,
    '2': 5,
    '3': 5,
    '4': 5,
    '5': 5,
    '6': 5,
    '7': 5,
    '8': 5,
    '9': 5,
    '10': 10,
    J: 10,
    Q: 10,
    K: 10,
  };

  for (const card of deck) {
    assert.equal(card.points, expectedPoints[card.rank]);
  }
});

test('Dealing produces correct hand/table sizes and deck size', () => {
  const state = dealInitialState(['p1', 'p2', 'p3', 'p4']);
  assert.equal(state.players.length, 4);
  assert.equal(state.turnIndex, 0);
  assert.equal(state.lastCapturerId, null);

  for (const id of state.players) {
    assert.equal(state.hands[id].length, 4);
    assert.equal(state.captureStacks[id].length, 0);
  }

  assert.equal(state.table.length, 4);
  assert.equal(state.deck.length, 32);
});

test('Draw gives only one card to the active player', () => {
  const state = {
    players: ['p1', 'p2'],
    turnIndex: 0,
    deck: [
      { id: 'd1', rank: 'A', suit: 'H', points: 20 },
      { id: 'd2', rank: 'K', suit: 'S', points: 10 },
      { id: 'd3', rank: 'Q', suit: 'D', points: 10 },
    ],
    hands: {
      p1: [],
      p2: [],
    },
    table: [],
    captureStacks: {
      p1: [],
      p2: [],
    },
    lastCapturerId: null,
    turnDrawCount: 0,
  };

  const result = drawCard(state, 'p1');
  assert.equal(result.success, true);
  assert.equal(result.state.hands.p1.length, 1);
  assert.equal(result.state.hands.p1[0].id, 'd1');
  assert.equal(result.state.hands.p2.length, 0);
  assert.equal(result.state.deck.length, 2);
  assert.equal(result.state.turnDrawCount, 1);
});

test('A turn can include two draws and ends only once the player throws', () => {
  const state = {
    players: ['p1', 'p2'],
    turnIndex: 0,
    deck: [
      { id: 'd1', rank: 'A', suit: 'H', points: 20 },
      { id: 'd2', rank: 'K', suit: 'S', points: 10 },
      { id: 'd3', rank: 'Q', suit: 'D', points: 10 },
    ],
    hands: {
      p1: [{ id: 'start1', rank: '2', suit: 'C', points: 5 }, { id: 'start2', rank: '3', suit: 'D', points: 5 }, { id: 'start3', rank: '4', suit: 'H', points: 5 }, { id: 'start4', rank: '5', suit: 'S', points: 5 }],
      p2: [],
    },
    table: [],
    captureStacks: {
      p1: [],
      p2: [],
    },
    lastCapturerId: null,
    turnDrawCount: 0,
  };

  const firstDraw = drawCard(state, 'p1');
  assert.equal(firstDraw.success, true);
  assert.equal(firstDraw.state.turnDrawCount, 1);
  assert.equal(firstDraw.state.hands.p1.length, 5);

  const secondDraw = drawCard(firstDraw.state, 'p1');
  assert.equal(secondDraw.success, true);
  assert.equal(secondDraw.state.turnDrawCount, 2);
  assert.equal(secondDraw.state.hands.p1.length, 6);

  const thrown = throwCard(secondDraw.state, 'p1', 'start1');
  assert.equal(thrown.success, true);
  assert.equal(thrown.state.hands.p1.length, 5);

  const advanced = advanceTurn(thrown.state);
  assert.equal(advanced.success, true);
  assert.equal(advanced.state.turnIndex, 1);
  assert.equal(advanced.state.turnDrawCount, 0);
});

test('Throw when no match exists', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: '9', suit: 'H', points: 5 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [{ id: 't1', rank: 'K', suit: 'S', points: 10 }],
    captureStacks: {
      p1: [],
      p2: [],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = throwCard(state, 'p1', 'c1');
  assert.equal(result.success, true);
  assert.equal(result.state.hands.p1.length, 0);
  assert.equal(result.state.table.length, 2);
  assert.equal(result.state.table.some((c) => c.id === 'c1'), true);
});

test('Capture when exactly one match exists', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: '5', suit: 'H', points: 5 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [{ id: 't1', rank: '5', suit: 'S', points: 5 }],
    captureStacks: {
      p1: [],
      p2: [],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = captureCards(state, 'p1', 'c1');
  assert.equal(result.success, true);
  assert.equal(result.state.captureStacks.p1.length, 2);
  assert.equal(result.state.table.length, 0);
  assert.equal(result.state.lastCapturerId, 'p1');
});

test('Capture when multiple table cards share a rank (multi-capture)', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: '7', suit: 'H', points: 5 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [
      { id: 't1', rank: '7', suit: 'S', points: 5 },
      { id: 't2', rank: '7', suit: 'C', points: 5 },
      { id: 't3', rank: '9', suit: 'D', points: 5 },
    ],
    captureStacks: {
      p1: [],
      p2: [],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = captureCards(state, 'p1', 'c1');
  assert.equal(result.success, true);
  assert.equal(result.state.captureStacks.p1.length, 3);
  assert.equal(result.state.table.length, 1);
  assert.equal(result.state.table[0].rank, '9');
});

test('Steal succeeds when top of target stack matches', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: 'A', suit: 'H', points: 20 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [],
    captureStacks: {
      p1: [],
      p2: [{ id: 't2', rank: 'A', suit: 'C', points: 20 }],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = stealCard(state, 'p1', 'c1', 'p2');
  assert.equal(result.success, true);
  assert.equal(result.state.captureStacks.p1.length, 2);
  assert.equal(result.state.captureStacks.p1[0].rank, 'A');
  assert.equal(result.state.captureStacks.p1[1].rank, 'A');
  assert.equal(result.state.lastCapturerId, 'p1');
});

test('Steal fails when card does not match top of target stack even if it matches a buried stack card', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: 'A', suit: 'H', points: 20 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [],
    captureStacks: {
      p1: [],
      p2: [
        { id: 'low', rank: '7', suit: 'S', points: 5 },
        { id: 'top', rank: 'K', suit: 'D', points: 10 },
      ],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = stealCard(state, 'p1', 'c1', 'p2');
  assert.equal(result.success, false);
  assert.equal(result.error, 'Steal target top rank does not match played card rank');
});

test('Turn validation rejects a move from a player who is not current turn', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 1,
    deck: [],
    hands: {
      p1: [{ id: 'c1', rank: '9', suit: 'H', points: 5 }],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [],
    captureStacks: {
      p1: [],
      p2: [],
      p3: [],
      p4: [],
    },
    lastCapturerId: null,
  };

  const result = throwCard(state, 'p1', 'c1');
  assert.equal(result.success, false);
  assert.equal(result.error, 'Not this player\'s turn');
});

test('Game-over detection and final sweep to last capturer', () => {
  const state = {
    players: ['p1', 'p2', 'p3', 'p4'],
    turnIndex: 0,
    deck: [],
    hands: {
      p1: [],
      p2: [],
      p3: [],
      p4: [],
    },
    table: [{ id: 't1', rank: 'K', suit: 'S', points: 10 }],
    captureStacks: {
      p1: [{ id: 'old', rank: 'A', suit: 'H', points: 20 }],
      p2: [],
      p3: [],
      p4: [],
    },
    lastCapturerId: 'p1',
  };

  assert.equal(isGameOver(state), true);
  const swept = sweepRemainingTableCards(state);
  assert.equal(swept.success, true);
  assert.equal(swept.state.table.length, 0);
  assert.equal(swept.state.captureStacks.p1.length, 2);
});

test('Score calculation matches the point table exactly', () => {
  const stack = [
    { id: 'a', rank: 'A', suit: 'H', points: 20 },
    { id: 'k', rank: 'K', suit: 'S', points: 10 },
    { id: 'q', rank: 'Q', suit: 'D', points: 10 },
    { id: 'j', rank: 'J', suit: 'C', points: 10 },
    { id: 'ten', rank: '10', suit: 'H', points: 10 },
    { id: 'nine', rank: '9', suit: 'S', points: 5 },
  ];

  const total = calculateScore(stack);
  assert.equal(total, 65);
});
