"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MissingToastContextType {
  showMissingToast: boolean;
  triggerMissingToast: () => void;
  hideMissingToast: () => void;
}

const MissingToastContext = createContext<MissingToastContextType | undefined>(undefined);

export function useMissingToast() {
  const ctx = useContext(MissingToastContext);
  if (!ctx) throw new Error('useMissingToast must be used within MissingToastProvider');
  return ctx;
}

export function MissingToastProvider({ children }: { children: ReactNode }) {
  const [showMissingToast, setShowMissingToast] = useState(false);

  const triggerMissingToast = () => setShowMissingToast(true);
  const hideMissingToast = () => setShowMissingToast(false);

  return (
    <MissingToastContext.Provider value={{ showMissingToast, triggerMissingToast, hideMissingToast }}>
      {children}
    </MissingToastContext.Provider>
  );
}
