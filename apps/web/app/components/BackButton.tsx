import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const handleBack = () => {
    if (isGameOver && isHost && onReturnToSetup) {
      // Host at game over -> Return to host customization section
      onReturnToSetup();
    } else {
      // Setup phase, or Guest at game over -> Return to root route
      onLeaveRoom();
      router.push("/");
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
