import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "footylive:favorites";

interface FavoritesValue {
  favorites: string[];
  toggle: (teamId: string) => void;
  isFavorite: (teamId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesValue>({
  favorites: [],
  toggle: () => {},
  isFavorite: () => false,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((teamId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((teamId: string) => favorites.includes(teamId), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
