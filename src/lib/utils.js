import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNOK(amount) {
  if (amount == null || isNaN(amount)) return "kr 0,00";
  return `kr ${Number(amount).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export const CATEGORIES = {
  membership_fees: { label: "Medlemsavgift", type: "income" },
  training_fees: { label: "Treningsavgift", type: "income" },
  equipment: { label: "Utstyr", type: "expense" },
  tournaments: { label: "Turneringer", type: "expense" },
  travel: { label: "Reise", type: "expense" },
  referees: { label: "Dommere", type: "expense" },
  sponsors: { label: "Sponsorer", type: "income" },
  grants: { label: "Tilskudd", type: "income" },
  rent: { label: "Leie", type: "expense" },
  insurance: { label: "Forsikring", type: "expense" },
  other_income: { label: "Annen inntekt", type: "income" },
  other_expense: { label: "Annen utgift", type: "expense" },
};

export const PAYMENT_CATEGORIES = {
  membership_fees: "Medlemsavgift",
  training_fees: "Treningsavgift",
  equipment: "Utstyr",
  tournaments: "Turneringer",
  travel: "Reise",
  other: "Annet",
};

export const STATUS_CONFIG = {
  pending: { label: "Venter", colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  partial: { label: "Delvis betalt", colorClass: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Betalt", colorClass: "bg-green-50 text-green-700 border-green-200" },
  overdue: { label: "Forfalt", colorClass: "bg-red-50 text-red-700 border-red-200" },
};