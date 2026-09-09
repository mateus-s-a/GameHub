"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  sessionId: "",
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("gh_session_id");
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("gh_session_id", id);
  }
  return id;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const apiBase =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  // Bootstrap session and auth on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentSessionId = getSessionId();
    setSessionId(currentSessionId);

    const savedToken = localStorage.getItem("gh_auth_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    setToken(savedToken);

    // Verify token with backend
    fetch(`${apiBase}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${savedToken}`,
      },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("gh_player_name", data.user.displayName);
        }
      })
      .catch(() => {
        localStorage.removeItem("gh_auth_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [apiBase]);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, sessionId }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Login failed" };
        }

        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("gh_auth_token", data.token);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("gh_session_id", data.sessionId);
        }
        localStorage.setItem("gh_player_name", data.user.displayName);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Connection error" };
      }
    },
    [apiBase, sessionId],
  );

  const register = useCallback(
    async (username: string, password: string, displayName: string) => {
      try {
        const res = await fetch(`${apiBase}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            displayName,
            sessionId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Registration failed" };
        }

        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("gh_auth_token", data.token);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("gh_session_id", data.sessionId);
        }
        localStorage.setItem("gh_player_name", data.user.displayName);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Connection error" };
      }
    },
    [apiBase, sessionId],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("gh_auth_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionId,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
