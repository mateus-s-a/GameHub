import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { RoomInfo } from "@gamehub/types";

export default function useRoomLobby(
  socket: Socket | null,
  roomId: string | null,
) {
  const [roomLobby, setRoomLobby] = useState<RoomInfo | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on("roomLobbyUpdate", (room: RoomInfo) => {
      setRoomLobby(room);
    });

    socket.emit("syncLobby", roomId); // Initial fetch from Server

    return () => {
      socket.off("roomLobbyUpdate");
    };
  }, [socket, roomId]);

  return roomLobby;
}
