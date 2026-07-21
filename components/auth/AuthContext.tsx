"use client";

import { createContext, useContext } from "react";

export interface Usuario {
  id: number;
  nome: string;
  tipo: string;
}

export const AuthContext = createContext<Usuario | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}
