import { ServerStats } from "@gamehub/types";

/**
 * Human-readable names for each game type.
 * When a new game is added to the platform, register it here.
 * Unknown keys fall back to key.toUpperCase().
 */
const GAME_NAMES: Record<string, string> = {
  ttt: "Tic-Tac-Toe",
  rps: "Rock-Paper-Scissors",
  gtf: "Guess the Flag",
};

function getGameDisplayName(key: string): string {
  return GAME_NAMES[key] || key.toUpperCase();
}

/**
 * Renders the real-time API status dashboard.
 * The page polls /api/stats every second and updates the DOM dynamically.
 */
export function renderDashboard(stats: ServerStats): string {
  // Build the game breakdown rows dynamically from all registered games
  // Merge registered games with any extra keys from live stats
  const allGameKeys = new Set([
    ...Object.keys(GAME_NAMES),
    ...Object.keys(stats.gameBreakdown),
  ]);

  const gameRows = Array.from(allGameKeys)
    .map(
      (key) => `
        <div class="game-item">
          <span class="game-name">${getGameDisplayName(key)}</span>
          <span class="game-count" data-game="${key}">${stats.gameBreakdown[key] || 0} Rooms</span>
        </div>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GameHub | API Status</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg: #0a0a0a;
          --card-bg: #151515;
          --accent: #f97316;
          --accent-glow: rgba(249, 115, 22, 0.2);
          --text: #ffffff;
          --text-dim: #888888;
          --border: rgba(255, 255, 255, 0.05);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: var(--bg);
          color: var(--text);
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .container {
          width: 100%;
          max-width: 900px;
          animation: fadeIn 0.8s ease-out;
        }

        header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .dot {
          width: 8px;
          height: 8px;
          background-color: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
          animation: pulse 2s infinite;
        }

        h1 {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff 0%, #888 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          padding: 2rem;
          border-radius: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .card-label {
          color: var(--text-dim);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .card-value {
          font-size: 2.5rem;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .games-list {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 1.5rem;
          padding: 2rem;
        }

        .games-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .games-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .game-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border);
        }

        .game-item:last-child {
          border-bottom: none;
        }

        .game-name {
          color: var(--text-dim);
          font-weight: 500;
        }

        .game-count {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255,255,255,0.05);
          padding: 0.2rem 0.6rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
        }

        footer {
          text-align: center;
          margin-top: 4rem;
          color: var(--text-dim);
          font-size: 0.85rem;
          font-family: 'JetBrains Mono', monospace;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }

        @media (max-width: 600px) {
          h1 { font-size: 2.5rem; }
          body { padding: 1rem; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div class="badge">
            <div class="dot"></div>
            System Online
          </div>
          <h1>GameHub API</h1>
        </header>

        <div class="stats-grid">
          <div class="card">
            <p class="card-label">Active Players</p>
            <p class="card-value" id="stat-players">${stats.totalPlayers}</p>
          </div>
          <div class="card">
            <p class="card-label">Live Rooms</p>
            <p class="card-value" id="stat-rooms">${stats.totalRooms}</p>
          </div>
        </div>

        <div class="games-list">
          <div class="games-title">Load Breakdown</div>
          ${gameRows}
        </div>

        <footer>
          v1.0.0 \u2014 Established ${new Date().getFullYear()} \u2014 mateus-s-a/GameHub
        </footer>
      </div>

      <script>
        async function updateStats() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();

            document.getElementById('stat-players').textContent = data.totalPlayers;
            document.getElementById('stat-rooms').textContent = data.totalRooms;

            document.querySelectorAll('[data-game]').forEach(function(el) {
              var key = el.getAttribute('data-game');
              el.textContent = (data.gameBreakdown[key] || 0) + ' Rooms';
            });
          } catch (e) {
            // Silently retry on next tick
          }
        }

        setInterval(updateStats, 1000);
      </script>
    </body>
    </html>
  `;
}
