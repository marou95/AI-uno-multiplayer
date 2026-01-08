# 🃏 UNO Multiplayer

A real-time, fully responsive multiplayer UNO card game built for the web. Play with friends in private rooms with smooth animations and authentic game rules.

## ✨ Features

*   **Real-time Multiplayer:** Powered by Colyseus WebSockets for seamless synchronization.
*   **Custom Game Rooms:** Create a room, get a 5-letter code, and invite up to 6 players.
*   **Authentic Rules:**
    *   Standard action cards: Skip, Reverse, Draw 2, Wild, and Wild 4.
    *   **+2 Stacking:** Stack Draw 2 cards to pass the penalty to the next player.
    *   **Catch UNO:** If a player has one card and hasn't shouted "UNO!", opponents have 3 seconds to "Catch" them and force a 2-card penalty.
*   **Responsive Design:** Optimized for both Desktop and Mobile (touch-friendly).
*   **Immersive UX:** Vibrant animations with Framer Motion, SFX, and win celebrations with confetti.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm
*   Backend server : https://github.com/marou95/uno-server.git

### Installation
1. Clone the repositories.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the frontend environment:
```bash
npm run dev
```

To start the backend environment:
```bash
npm run start:server
```
*   **Frontend:** `http://localhost:5173`
*   **Backend:** `http://localhost:2567`

## 🛠 Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons.
*   **State Management:** Zustand (Client) & Colyseus Schema (Server).
*   **Animations:** Framer Motion & Canvas-Confetti.
*   **Backend:** Colyseus Game Engine, Express, Node.js.
*   **Deployment:** Railway/render.com (Server) and Vercel (Client).

## 🎮 How to Play
1. Enter your nickname.
2. **Create a Room** or enter a **Room Code** from a friend.
3. Mark yourself as **Ready** in the lobby.
4. Once everyone is ready, the host starts the game.
5. Match cards by color or symbol. Don't forget to shout **UNO** when you have one card left!
