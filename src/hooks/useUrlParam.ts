import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Sincroniza un valor con un query param de la URL.
 * Preserva los demás params (ej: ?tab=...).
 */
export function useUrlParam(key: string, defaultValue = ""): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;
  const setValue = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!v || v === defaultValue) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setParams]
  );
  return [value, setValue];
}

export function useUrlNumber(key: string, defaultValue = 1): [number, (v: number) => void] {
  const [str, setStr] = useUrlParam(key, String(defaultValue));
  const n = Number(str) || defaultValue;
  return [n, (v: number) => setStr(String(v))];
}
