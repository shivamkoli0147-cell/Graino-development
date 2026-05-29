import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "अभी";
  if (diff < 3600) return `${Math.floor(diff / 60)} मिनट पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  return `${Math.floor(diff / 86400)} दिन पहले`;
}

export const DELIVERY_SLOTS = [
  { id: "morning",   label: "🌅 सुबह",    time: "8:00 – 11:00 AM" },
  { id: "afternoon", label: "☀️ दोपहर",   time: "12:00 – 3:00 PM" },
  { id: "evening",   label: "🌇 शाम",     time: "4:00 – 7:00 PM"  },
];

export type CartItem = {
  productId: number;
  varietyId: number;
  productName: string;
  productNameEn: string;
  productEmoji: string;
  varietyName: string;
  pricePerKg: number;
  quantityKg: number;
  minKg: number;
};

export type Cart = Record<string, CartItem>;

export function getCartTotal(cart: Cart): number {
  return Object.values(cart).reduce((sum, item) => sum + item.pricePerKg * item.quantityKg, 0);
}

export function getCartCount(cart: Cart): number {
  return Object.keys(cart).length;
}

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type CustomerSession = {
  id: number;
  name: string;
  phone: string;
  village: string;
  address?: string;
  lat?: number;
  lng?: number;
  loginAt?: number; // unix ms — used for 30-day expiry
};

export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem("kd_customer");
    if (!raw) return null;
    const session: CustomerSession = JSON.parse(raw);
    // Auto-expire sessions older than 30 days
    if (session.loginAt && Date.now() - session.loginAt > SESSION_EXPIRY_MS) {
      localStorage.removeItem("kd_customer");
      return null;
    }
    return session;
  } catch { return null; }
}

export function setCustomerSession(c: CustomerSession) {
  const withTimestamp: CustomerSession = { ...c, loginAt: c.loginAt ?? Date.now() };
  localStorage.setItem("kd_customer", JSON.stringify(withTimestamp));
}

export function clearCustomerSession() {
  localStorage.removeItem("kd_customer");
}

export function isSellerSession(): boolean {
  return sessionStorage.getItem("kd_seller") === "true";
}

export function setSellerSession() {
  sessionStorage.setItem("kd_seller", "true");
}

export function clearSellerSession() {
  sessionStorage.removeItem("kd_seller");
}
