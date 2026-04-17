import { useState } from "react";

const KEY = "boomer_counselor_purchases";

export const usePurchases = () => {
  const [purchased, setPurchased] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  });

  const addPurchase = (id) => {
    setPurchased((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const hasPurchased = (id) => purchased.includes(id);
  return { purchased, addPurchase, hasPurchased };
};
