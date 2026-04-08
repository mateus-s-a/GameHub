<div align="center">
  <img src="apps/web/app/favicon.ico" width="80" height="80" alt="GameHub Logo" />
  <h1>GameHub</h1>
  <p><strong>A Scalable Multi-Game Real-Time Platform</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Turborepo-2.8-EF4444?style=for-the-badge&logo=turborepo" alt="Turborepo" />
  </p>
</div>

---

## Overview

GameHub is a high-performance, real-time gaming platform designed with a **Modular Monolith Monorepo** architecture. It provides a seamless multiplayer experience with server-authoritative logic, premium UI interactions, and a scalable foundation for adding new games.

### Key Features

- **Real-Time Multiplayer**: Powered by Socket.io for low-latency gameplay and instant state synchronization.
- **Premium Aesthetics**: Dynamic game-aware themes, glassmorphism UI, and animated shimmer buttons using **Framer Motion**.
- **Modular Architecture**: Isolated game logic packages ensuring server-authoritative rules and easy extensibility.
- **Lobby System**: Robust match-making with room codes, host controls, and player readiness states.
- **Unified Tech Stack**: Full-stack TypeScript for end-to-end type safety across the monorepo.

---

## Games Library

| Game | Number of Players |
| :--- | :--- |
| **Tic Tac Toe** | 2 Players |
| **Rock Paper Scissors** | 2 Players |
| **Guess the Flag** | 2-4 Players |

---

## Technology Stack

### Core Frameworks
- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Backend**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)

### Infrastructure & Tooling
- **Database**: [PostgreSQL](https://www.postgresql.org/) managed via [Prisma ORM](https://www.prisma.io/)
- **Monorepo Manager**: [Turborepo](https://turbo.build/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Project Structure

```text
GameHub/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express & Socket.io backend server
├── packages/
│   ├── core/         # Shared constants & business logic
│   ├── game-logic/   # Isolated game engines (ttt, rps, gtf)
│   ├── types/        # Unified TypeScript interfaces
│   ├── ui/           # Shared high-end UI component library
│   └── config/       # Shared ESLint, Tailwind, and TS configs
└── setup.sh          # Automated installation and setup script
```

---

## Getting Started

### Prerequisites
- **Node.js**: `>= 20.19`
- **npm**: `>= 11.10`
- **PostgreSQL**: Running instance with `DATABASE_URL` configured

### Manual Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Configuration**:
   Create a `.env` file in `apps/api/` and add your database URL:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/gamehub"
   ```

3. **Prisma Setup**:
   Generate the client and push the schema to your database:
   ```bash
   npx turbo run generate --filter=api
   cd apps/api && npx prisma db push && cd ../..
   ```

4. **Run Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend**: `http://localhost:3000`
   - **Backend/Sockets**: `http://localhost:3001`

---

## Building for Production

To create optimized production builds for all applications:
```bash
npm run build
```
To start the production servers:
```bash
npx turbo run start
```

---

## Code Quality

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Type Checking**: `npm run check-types`
