import React from "react";
import { Loader2, X } from "lucide-react";
import BackButton from "@/\(shared\)/components/ui/BackButton";

export interface WaitingScreenProps {
  isHost: boolean;
  onCancel: () => void;
  onLeaveRoom: () => void;
  themeColor?: string;
}

export default function WaitingScreen({
  isHost,
  onCancel,
  onLeaveRoom,
  themeColor = "emerald",
}: WaitingScreenProps) {
  // Config cores padrão de animação do tema
  const themeStyles: Record<string, { textGradient: string; spinner: string }> =
    {
      emerald: {
        textGradient: "from-emerald-400 to-cyan-400",
        spinner: "text-emerald-500",
      },
      purple: {
        textGradient: "from-purple-400 to-pink-500",
        spinner: "text-purple-500",
      },
      orange: {
        textGradient: "from-orange-400 to-red-500",
        spinner: "text-orange-500",
      },
      cyan: {
        textGradient: "from-cyan-400 to-blue-500",
        spinner: "text-cyan-500",
      },
    };

  const style = themeStyles[themeColor] || themeStyles["emerald"];

  if (!style) return null;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gray-900 text-white font-iosevka-regular p-4">
      {/* Back Button superior esquerdo para Non-Hosts que derem lag, ou mesmo Hosts se quiserem dar hard-quit pro menu */}
      <BackButton
        isHost={isHost}
        isInSetup={false}
        isGameOver={false}
        onLeaveRoom={onLeaveRoom}
      />

      <div className="flex flex-col items-center justify-center p-12 bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full text-center relative overflow-hidden">
        {/* Gradients de Fundo Decorativo no Elemento */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gray-700/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-700/20 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <h2
          className={`text-2xl md:text-3xl font-iosevka-bold mb-10 tracking-wide text-transparent bg-clip-text bg-gradient-to-r ${style.textGradient}`}
        >
          Waiting for another opponent to join the game...
        </h2>

        <Loader2 className={`w-16 h-16 animate-spin mb-10 ${style.spinner}`} />

        {/* Botão de Cancelar Sala Apenas Para o Anfitrião */}
        {isHost && (
          <button
            onClick={onCancel}
            className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 outline-none text-red-500 font-iosevka-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/5"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Cancelar Sala
          </button>
        )}
      </div>
    </div>
  );
}
