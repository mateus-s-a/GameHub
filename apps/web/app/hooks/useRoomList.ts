import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { RoomInfo } from "@gamehub/types";

export function useRoomList(socket: Socket | null) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("getRooms");

    const onRoomListUpdate = (updatedRooms: RoomInfo[]) => {
      setRooms(updatedRooms);
    };

    socket.on("roomListUpdate", onRoomListUpdate);

    return () => {
      socket.off("roomListUpdate", onRoomListUpdate);
    };
  }, [socket]);

  return rooms;
}
