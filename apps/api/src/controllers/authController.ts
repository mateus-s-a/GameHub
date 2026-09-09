import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/authService";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(30, "Display name must be at most 30 characters"),
  sessionId: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  sessionId: z.string().optional(),
});

const guestSchema = z.object({
  sessionId: z.string().optional(),
  guestName: z.string().max(30).optional(),
});

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { username, password, displayName, sessionId } = parsed.data;
      const result = await AuthService.register(
        username,
        password,
        displayName,
        sessionId,
      );

      res.status(201).json(result);
    } catch (err: any) {
      if (err.message === "Username already taken") {
        res.status(409).json({ error: err.message });
        return;
      }
      console.error("[AuthController.register] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { username, password, sessionId } = parsed.data;
      const result = await AuthService.login(username, password, sessionId);

      res.status(200).json(result);
    } catch (err: any) {
      if (err.message === "Invalid username or password") {
        res.status(401).json({ error: err.message });
        return;
      }
      console.error("[AuthController.login] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async guest(req: Request, res: Response): Promise<void> {
    try {
      const parsed = guestSchema.safeParse(req.body);
      const sessionId = parsed.success ? parsed.data.sessionId : undefined;
      const guestName = parsed.success ? parsed.data.guestName : undefined;

      const session = await AuthService.getOrCreateSession(sessionId, guestName);
      res.status(200).json({
        sessionId: session.id,
        guestName: session.guestName,
      });
    } catch (err) {
      console.error("[AuthController.guest] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async me(req: Request, res: Response): Promise<void> {
    try {
      // req.user is set by requireAuth middleware
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userPayload = (req as any).user;
      if (!userPayload?.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const user = await AuthService.getUserById(userPayload.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({ user });
    } catch (err) {
      console.error("[AuthController.me] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
