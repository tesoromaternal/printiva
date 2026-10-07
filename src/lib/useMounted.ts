import { useEffect, useState } from "react";

/**
 * Los stores persistentes leen localStorage, que no existe en el servidor.
 * Hasta montar mostramos el valor "vacío" del SSR para no romper la hidratación.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
