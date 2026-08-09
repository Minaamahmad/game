# Capture Room

Capture Room is a real-time browser card game inspired by classic capture-and-steal table-card mechanics. Players join a room, begin a 4-player match, and take turns drawing, throwing, capturing matching ranks from the table, or stealing the top card from another player's capture stack when the rank matches.

The project is built with Next.js, React, and Socket.IO for multiplayer room synchronization.

## Gameplay Overview

The game uses a 52-card deck and a table-centered turn system:

- Each player starts with a 4-card hand.
- Four table cards are placed in the center at the start of the round.
- The remaining deck acts as the draw source.
- On a turn, a player may:
  - draw a card from the shared deck;
  - throw a card to the table;
  - capture matching table cards by rank using a hand card;
  - steal the top card from another player's capture stack when the played card rank matches the target stack's top rank.
- The round ends when the deck is empty and every player has no cards left in hand.
- The final table cards are swept into the last player who captured, and results are scored from capture stacks.

## Features

- Multiplayer room-based game flow with Socket.IO.
- Real-time game state syncing to each connected client.
- Responsive UI built with Next.js App Router and React.
- Card engine with legal action support, scoring, turn progression, and end-of-game settlement.
- Unit-style engine tests for dealing, capture, steal, scoring, and game-over behavior.

## Project Structure

```text
app/                 Next.js App Router pages and UI flow
components/          Reusable UI components
Context/             Socket context provider and shared client state
lib/                 Game rules, engine, and supporting logic
server.js            HTTP server, Next.js integration, and Socket.IO rooms
public/              Static assets
test/                Game engine test coverage
```

## Tech Stack

- Next.js 16
- React 19
- Socket.IO
- Tailwind CSS
- ESLint
- Node.js test runner

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the app at:

http://localhost:3000

## Production Build

```bash
npm run build
npm start
```

## Linting

```bash
npm run lint
```

## Testing

The game engine includes test coverage for core rules. You can run the tests with:

```bash
node --test
```

## How to Play

1. Start the server.
2. Open the app in a browser.
3. Enter a room code to join or create a room.
4. When the room reaches 4 players, the match starts automatically.
5. Play turns through the browser UI and watch synchronized changes from the server.

## License

This project is currently unlicensed. Add a license file if you want to publish it publicly on GitHub.

## Roadmap

Potential next improvements:

- Better visual game board and card animations
- Player name support and room lobby UX
- Match history and replay state
- Additional rules and configuration modes
- Production deployment support for cloud hosting
