"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BackButtonProps {
  isHost: boolean;
  isInSetup: boolean;
  isGameOver: boolean;
  isInLobby?: boolean;
  onReturnToSetup?: () => void;
  onLeaveRoom: () => void;
}

import NavButton from "./NavButton";

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
    if (isHost && onReturnToSetup) {
      // Host returns to customization
      onReturnToSetup();
    } else {
      // Guest or Host (fallback) leaves the room/setup
      // Trigger the specialized leave logic (e.g. socket emit)
      onLeaveRoom();
      // Ensure we use soft navigation back to hub if we aren't handling it elsewhere
      router.push("/");
    }
  };

  // Only render if we are in the host setup section, the match is finished, or in the lobby
  if (!isInSetup && !isGameOver && !isInLobby) {
    return null;
  }

  return (
    <NavButton
      onClick={handleBack}
      label="BACK TO HUB"
      className="absolute top-6 left-6 shadow-xl"
    />
  );
}
