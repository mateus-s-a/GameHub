import { useState } from 'react';

export interface GameSetupConfig {
  maxRounds: number;
  timeLimit: number;
  region?: string; // Only for GTF
}

interface GameSetupProps {
  onStart: (config: GameSetupConfig) => void;
  gameId: 'ttt' | 'rps' | 'gtf';
}

export default function GameSetup({ onStart, gameId }: GameSetupProps) {
  const [rounds, setRounds] = useState<number>(gameId === 'gtf' ? 5 : 3);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [region, setRegion] = useState<string>('All');

  const handleStart = () => {
    onStart({
      maxRounds: rounds,
      timeLimit: timeLimit,
      ...(gameId === 'gtf' ? { region } : {})
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-sm w-full bg-gray-800 p-8 rounded-2xl shadow-2xl font-iosevka-regular">
      <h2 className="text-3xl font-bold text-center text-white mb-2 font-iosevka-bold">Host Options</h2>
      
      <div className="flex flex-col gap-2">
        <label className="text-gray-300 font-semibold">Number of Rounds</label>
        <select 
          className="bg-gray-700 text-white p-3 rounded-xl border border-gray-600 focus:outline-none focus:border-blue-500"
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
        >
          <option value={1}>1 Round (Sudden Death)</option>
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
          <option value={10}>Best of 10</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-gray-300 font-semibold">Turn Time Limit</label>
        <select 
          className="bg-gray-700 text-white p-3 rounded-xl border border-gray-600 focus:outline-none focus:border-blue-500"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
        >
          <option value={5}>5 Seconds (Blitz)</option>
          <option value={15}>15 Seconds (Normal)</option>
          <option value={30}>30 Seconds</option>
          <option value={60}>60 Seconds</option>
          <option value={0}>Unlimited</option>
        </select>
      </div>

      {gameId === 'gtf' && (
        <div className="flex flex-col gap-2">
          <label className="text-gray-300 font-semibold">Continent Filter</label>
          <select 
            className="bg-gray-700 text-white p-3 rounded-xl border border-gray-600 focus:outline-none focus:border-orange-500"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="All">Global (All Regions)</option>
            <option value="Americas">Americas</option>
            <option value="Europe">Europe</option>
            <option value="Africa">Africa</option>
            <option value="Asia">Asia</option>
            <option value="Oceania">Oceania</option>
          </select>
        </div>
      )}

      <button
        onClick={handleStart}
        className="mt-4 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xl rounded-xl shadow-lg transition-transform active:scale-95 font-iosevka-bold"
      >
        Create Match
      </button>
    </div>
  );
}
