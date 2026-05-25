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

export const VILLAGES = ["Pichor","Bamori","Datia","Indergarh","Bhander","Dabra","Karera","Lahar","Mohna","Shivpuri"];

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

export type CustomerSession = {
  id: number;
  name: string;
  phone: string;
  village: string;
  address?: string;
};

export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem("kd_customer");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCustomerSession(c: CustomerSession) {
  localStorage.setItem("kd_customer", JSON.stringify(c));
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
