import { useState, useEffect, useCallback } from 'react';

// Persistance locale (navigateur) : les outils candidat ne renvoient AUCUNE
// donnée au serveur — tout reste privé, dans localStorage. Tolérant aux
// environnements sans storage (navigation privée, stockage bloqué).
export function useLocalStorage<T>(key: string, initial: T) {
  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  };

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible : on continue sans persistance */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
