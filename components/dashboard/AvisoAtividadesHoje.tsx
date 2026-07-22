"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";

interface ManejoHoje {
  id: number;
  atividade_nome: string;
  setor_nome: string;
  setor_cor: string;
}

export default function AvisoAtividadesHoje() {
  const usuario = useAuth();
  const [itens, setItens] = useState<ManejoHoje[]>([]);

  useEffect(() => {
    if (!usuario) return;
    const hoje = new Date().toISOString().slice(0, 10);
    fetch(`/api/manejos?funcionario_id=${usuario.id}&data=${hoje}`)
      .then((r) => r.json())
      .then(setItens)
      .catch(() => setItens([]));
  }, [usuario]);

  if (!usuario || itens.length === 0) return null;

  return (
    <div className="card border-brand-300 bg-brand-50 dark:bg-brand-900/20">
      <p className="mb-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
        Voce tem {itens.length} atividade{itens.length > 1 ? "s" : ""} hoje
      </p>
      <div className="space-y-1">
        {itens.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: m.setor_cor }} />
            <span className="font-medium">{m.atividade_nome}</span>
            <span className="text-neutral-500">- {m.setor_nome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
