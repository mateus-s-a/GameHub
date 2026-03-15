import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HubMenu() {
  const games = [
    {
      id: "tic-tac-toe",
      title: "Tic-Tac-Toe",
      description: "The classic 3x3 grid game. Simple, elegant, and ruthless.",
      status: "active",
      href: "/games/tic-tac-toe",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "rock-paper-scissors",
      title: "Rock-Paper-Scissors",
      description: "A mental battle of hidden choices and commitments.",
      status: "active",
      href: "/games/rock-paper-scissors",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "guess-the-flag",
      title: "Guess the Flag PvP",
      description: "High-speed geographical trivia against live opponents.",
      status: "active",
      href: "/games/guess-the-flag",
      color: "from-orange-500 to-red-600",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background ambient light */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -z-10 animate-pulse mix-blend-screen"
        style={{ animationDuration: "4s" }}
      />

      <header className="mb-16 text-center space-y-4">
        <h1 className="text-7xl font-iosevka-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-400 drop-shadow-sm">
          GamesHub
        </h1>
        <p className="text-blue-200/60 font-iosevka-regular text-lg tracking-widest uppercase">
          Select Your Arena
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {games.map((game) => {
          const isActive = game.status === "active";

          const CardContent = (
            <div
              className={`glass-card rounded-3xl p-8 h-full flex flex-col relative overflow-hidden group ${!isActive ? "opacity-60 cursor-not-allowed hover:transform-none" : ""}`}
            >
              {/* Card gradient effect */}
              {isActive && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}
                />
              )}

              <div className="flex justify-between items-start mb-6">
                <h2
                  className={`text-2xl font-iosevka-bold ${isActive ? "text-white" : "text-gray-400"}`}
                >
                  {game.title}
                </h2>
                <span
                  className={`px-3 py-1 text-xs font-iosevka-medium rounded-full ${isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700/50 text-gray-400"}`}
                >
                  {isActive ? "PLAY LIVE" : "SOON"}
                </span>
              </div>

              <p className="text-gray-400 font-iosevka-light flex-grow leading-relaxed">
                {game.description}
              </p>

              {isActive && (
                <div className="mt-8 flex items-center text-sm font-iosevka-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  ENTER MATCHMAKING{" "}
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              )}
            </div>
          );

          return isActive ? (
            <Link key={game.id} href={game.href} className="block outline-none">
              {CardContent}
            </Link>
          ) : (
            <div key={game.id}>{CardContent}</div>
          );
        })}
      </div>
    </main>
  );
}
