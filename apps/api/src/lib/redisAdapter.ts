import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Server } from "socket.io";

/**
 * Configura o Socket.io Redis Adapter de forma plugável e não-bloqueante.
 *
 * Se REDIS_URL estiver definida no ambiente, conecta os clientes de Pub/Sub
 * e anexa o adaptador distribuído ao Socket.io.
 * Caso contrário, opera com o adaptador padrão in-memory (modo monoinstância).
 */
export async function setupRedisAdapter(io: Server): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log(
      "[Redis] REDIS_URL not configured. Running with default in-memory adapter (Single-instance mode).",
    );
    return false;
  }

  try {
    const pubClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 100, 1000)),
      },
    });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => {
      console.error("[Redis Pub Error]:", err?.message || err);
    });

    subClient.on("error", (err) => {
      console.error("[Redis Sub Error]:", err?.message || err);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    // Mascarar credenciais para exibição segura nos logs
    const maskedUrl = redisUrl.replace(/:([^:@]+)@/, ":****@");
    console.log(`[Redis] Connected and attached adapter to Socket.io (${maskedUrl})`);

    return true;
  } catch (err: any) {
    console.warn(
      "[Redis] Failed to connect to Redis. Falling back to default in-memory adapter:",
      err?.message || err,
    );
    return false;
  }
}
