# ☑️ Million Checkboxes

A real-time collaborative checkbox app. Every checkbox you click is instantly synced across all open browser windows — powered by Node.js, Socket.io, and Redis.

## Features

- **Real-time sync** — changes broadcast instantly to all connected clients
- **Persistent state** — checkbox state saved in Redis, survives server restarts
- **Multi-instance support** — multiple server instances stay in sync via Redis pub/sub
- **Rate limiting** — each client is limited to one checkbox change every 5.5 seconds

## Tech Stack

- **Node.js** + **Express** — HTTP server
- **Socket.io** — real-time bidirectional communication
- **Redis** — state persistence and pub/sub messaging between server instances

## How It Works

1. On page load, the client fetches the current checkbox state from the server
2. When a checkbox is clicked, the client emits `client:checkbox:change` via Socket.io
3. The server checks rate limiting, updates Redis, then publishes to the Redis channel
4. All server instances subscribed to that channel broadcast `server:checkbox:change` to their connected clients
5. All open windows update instantly

## Getting Started

### Prerequisites

- Node.js 18+
- Redis running locally or via a cloud provider

### Install

```bash
npm install
```

### Run

```bash
node index.js
```

With a custom port:

```bash
$env:PORT=8000; node --watch index.js  # Windows
PORT=8000 node --watch index.js        # Mac/Linux
```

Then open `http://localhost:8000` in multiple browser windows and start clicking.

## Project Structure

```
├── public/
│   └── index.html        # Frontend UI
├── index.js              # Express + Socket.io server
├── redis-connection.js   # Redis client setup
└── README.md
```

## API

| Endpoint | Method | Description |
|---|---|---|
| `/checkboxes` | GET | Returns current state of all checkboxes |
| `/health` | GET | Health check |

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `client:checkbox:change` | Client → Server | User clicked a checkbox |
| `server:checkbox:change` | Server → Client | Broadcast checkbox update to all clients |
| `server:error` | Server → Client | Rate limit hit, change rejected |