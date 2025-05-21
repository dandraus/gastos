import React, { createContext, useState, ReactNode } from 'react';

// Contexto para manejar el periodo (YYYY-MM)
export const PeriodoContext = createContext<{
  periodo: string;
  setPeriodo: (periodo: string) => void;
}>({ periodo: '', setPeriodo: () => {} });

export const PeriodoProvider = ({ children }: { children: ReactNode }) => {
  // Valor inicial como mes actual
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0, 7));

  return (
    <PeriodoContext.Provider value={{ periodo, setPeriodo }}>
      {children}
    </PeriodoContext.Provider>
  );
};
