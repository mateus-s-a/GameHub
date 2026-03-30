import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  isHost: boolean;
  isInSetup: boolean;
  isGameOver: boolean;
  isInLobby?: boolean;
  onReturnToSetup?: () => void;
  onLeaveRoom: () => void;
}

export default function BackButton({
  isHost,
  isInSetup,
  isGameOver,
  isInLobby = false,
  onReturnToSetup,
  onLeaveRoom,
}: BackButtonProps) {
  const handleBack = () => {
    if (isHost && onReturnToSetup) {
      // Host returns to customization
      onReturnToSetup();
    } else {
      // Guest or Host (fallback) leaves the room/setup
      onLeaveRoom();
    }
  };

  // Only render if we are in the host setup section, the match is finished, or in the lobby
  if (!isInSetup && !isGameOver && !isInLobby) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      className={`absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white 
        font-iosevka-bold rounded-xl shadow-lg border border-gray-600 transition-all active:scale-95`}
    >
      <ArrowLeft className="w-5 h-5" /> Back
    </button>
  );
}
