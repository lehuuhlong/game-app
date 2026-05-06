# 🎮 Game Portal

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

A modern, responsive web-based gaming portal featuring a rich collection of classic single-player logic games and real-time online multiplayer experiences. 

## ✨ Features

- **Massive Game Collection:** Enjoy a curated list of games including logic puzzles, word games, and arcades.
- **Online Multiplayer:** Challenge friends or strangers in real-time with custom game rooms and instant matchmaking.
- **Global Leaderboards:** Track your highest scores, fastest times, and win rates. Compete with players worldwide across all games.
- **Frictionless Authentication:** No passwords required. Pick a unique username and start playing and saving your progress immediately.
- **Premium UI/UX:** Built with a modern glassmorphism aesthetic, rich gradients, dynamic micro-animations (Framer Motion), and full responsive support for mobile and desktop.

## 🕹️ Available Games

### Single Player Classics
- **Sudoku:** The classic number puzzle with Easy, Medium, and Hard difficulties. Includes advanced features like auto-highlighting, pencil/notes mode, and an error-tracking heart system.
- **Minesweeper:** The retro bomb-avoidance game featuring Beginner, Intermediate, and Expert boards. Complete with chording (auto-clear) mechanics and time-tracking.
- **2048:** Slide and merge tiles to reach the legendary 2048 tile and beyond.
- **Wordle:** Guess the hidden 5-letter word in 6 tries with color-coded feedback.
- **T-Rex:** The famous infinite runner dinosaur game. Dodge the cacti and pterodactyls to get the highest score.

### Real-Time Multiplayer
- **Caro (Gomoku):** The classic 5-in-a-row tactical board game. Create private rooms, chat with your opponent, and battle in real-time.
- **Word Chain (Nối Chữ):** A fast-paced Vietnamese word-chain game. Players take turns linking words using the last syllable of the previous word before the 20-second timer runs out. Features real-time validation against a Vietnamese dictionary.

## 🏗 Architecture

To support both serverless rendering and real-time WebSockets, the application is split into two deployable parts:

1. **Frontend App (Next.js)**: Handles the UI, routing, single-player game logic, database connections, and REST API routes. Designed to be deployed on serverless platforms like **Vercel**.
2. **Socket Server (Node.js/Express)**: A standalone Socket.io server that manages multiplayer game rooms, real-time player states, and turn timers. Designed to be deployed on long-running container platforms like **Railway** or **Render**.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v20+)
- MongoDB Atlas cluster (or local instance)

### 1. Clone & Install
```bash
git clone https://github.com/lehuuhlong/game-app.git
cd game-app

# Install frontend dependencies
npm install

# Install socket server dependencies
cd socket-server
npm install
cd ..
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/game-portal
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 3. Run the Development Servers
You will need two terminal windows:

**Terminal 1 (Next.js Frontend):**
```bash
npm run dev
# Starts on http://localhost:3000
```

**Terminal 2 (Socket.io Server):**
```bash
cd socket-server
npm run dev
# Starts on http://localhost:4000
```

---

## 🌍 Deployment

### 1. Deploy the Socket Server (e.g., Railway)
1. Deploy the `socket-server` directory to a platform that supports WebSockets (like Railway).
2. Note the public URL provided by the platform (e.g., `https://my-socket-server.up.railway.app`).

### 2. Deploy the Frontend (e.g., Vercel)
1. Deploy the root directory to Vercel.
2. Add the following Environment Variables in Vercel:
   - `MONGODB_URI` = Your database connection string.
   - `NEXT_PUBLIC_SOCKET_URL` = The Socket server URL from Step 1.
3. Note your Vercel public URL.

### 3. Configure CORS on the Socket Server
1. Go back to your Socket Server settings (e.g., Railway).
2. Add an environment variable:
   - `CLIENT_ORIGIN` = Your Vercel public URL.
3. Redeploy the Socket Server.

---

## 🛠 Tech Stack
- **Framework:** Next.js 16.2 (App Router)
- **Styling:** Tailwind CSS 4, Framer Motion
- **Database:** MongoDB / Mongoose
- **Real-time:** Socket.io
- **State Management:** Zustand, React Context
- **Language:** TypeScript

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
