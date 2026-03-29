# GameHub

GameHub is a scalable multi-game real-time platform built with a modular monolith monorepo architecture.

## Technology Stack

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL with Prisma ORM
- **Monorepo**: Turborepo with npm workspaces
- **Language**: TypeScript

## Getting Started

Follow these instructions to run the project locally.

### 1. Install Dependencies

Run the following command from the root directory to install all dependencies across the workspaces:

```bash
npm install
```

### 2. Run the Development Servers

To start both the frontend Next.js app and the backend API server simultaneously with hot-reloading, run:

```bash
npm run dev
```

- The **Frontend App** will be available at: `http://localhost:3000`
- The **Backend API/Socket Hub** will be running on: `http://localhost:3001`

### 3. Build for Production

To compile the TypeScript files and build the Next.js optimized production bundle, run:

```bash
npm run build
```

### 4. Code Quality & Formatting

We use Turborepo to orchestrate linting and formatting across all packages:

- **Lint the codebase**: `npm run lint`
- **Format code with Prettier**: `npm run format`
- **Check TypeScript types**: `npm run check-types`

## Monorepo Structure

- `apps/web`: Next.js frontend application.
- `apps/api`: Express & Socket.io backend server.
- `packages/core`: Shared game constants and business logic.
- `packages/types`: Shared TypeScript interfaces.
- `packages/game-logic`: Isolated, server-authoritative rule engines for each game (e.g., `tic-tac-toe`).
