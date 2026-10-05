import type { OutfitId } from "@/identity/avatar";

/**
 * Registri peran/pekerjaan pemain. Peran "public" bisa dipilih sendiri;
 * peran staf hanya diberikan oleh backend (dijaga trigger di database).
 * Tambah peran baru cukup dengan menambah entri di sini.
 */
export type RoleId =
  | "pengunjung"
  | "pembeli"
  | "member"
  | "vip"
  | "kasir"
  | "packing"
  | "gudang"
  | "driver"
  | "admin"
  | "supervisor"
  | "owner"
  | "tamu"
  | "penjual"
  | "pemilik-ruko"
  | "terapis"
  | "dj"
  | "event-staff"
  | "tenant-staff"
  | "host"
  | "security";

export type Permission = "cashier-area" | "warehouse-area" | "logistics" | "management" | "tenant-management" | "wellness-service" | "entertainment-control" | "event-operations" | "security-access";
export type RoleCategory = "visitor" | "member" | "commerce" | "service" | "operations" | "management" | "events";
export type RoleAvailability = "public" | "assigned" | "coming-soon";

export interface RoleDef {
  id: RoleId;
  name: string;
  icon: string;
  /** Warna badge (oklch) — dipakai di UI 2D dan label 3D. */
  color: string;
  description: string;
  selfSelectable: boolean;
  category: RoleCategory;
  availability: RoleAvailability;
  requirement?: string;
  accessLevel: number;
  permissions: Permission[];
  outfit: OutfitId;
}

export const ROLES: RoleDef[] = [
  { id: "pengunjung", name: "Pengunjung", icon: "🚶", color: "#8aa4c8", description: "Menjelajah kota dan bertemu warga.", selfSelectable: true, category: "visitor", availability: "public", accessLevel: 0, permissions: [], outfit: "casual" },
  { id: "pembeli", name: "Pembeli", icon: "🛍️", color: "#4fb39a", description: "Berbelanja dan mengikuti promo dunia.", selfSelectable: true, category: "visitor", availability: "public", accessLevel: 0, permissions: [], outfit: "casual" },
  { id: "member", name: "Member", icon: "⭐", color: "#e0a83a", description: "Pelanggan setia Toko Cung.", selfSelectable: true, category: "member", availability: "public", accessLevel: 1, permissions: [], outfit: "casual" },
  { id: "tamu", name: "Tamu", icon: "👋", color: "#a59bd6", description: "Tamu undangan sementara.", selfSelectable: true, category: "visitor", availability: "public", accessLevel: 0, permissions: [], outfit: "casual" },
  { id: "vip", name: "VIP Member", icon: "💎", color: "#d65a8a", description: "Member prioritas dengan akses khusus.", selfSelectable: false, category: "member", availability: "assigned", requirement: "Diberikan melalui program VIP", accessLevel: 2, permissions: [], outfit: "smart" },
  { id: "penjual", name: "Penjual", icon: "🏪", color: "#4f9b78", description: "Berjualan dan mengelola produk di unit ruko.", selfSelectable: false, category: "commerce", availability: "coming-soon", requirement: "Tenant District", accessLevel: 2, permissions: ["tenant-management"], outfit: "smart" },
  { id: "pemilik-ruko", name: "Pemilik Ruko", icon: "🏬", color: "#397f73", description: "Mengelola identitas dan operasional ruko.", selfSelectable: false, category: "commerce", availability: "coming-soon", requirement: "Kepemilikan unit tenant", accessLevel: 3, permissions: ["tenant-management"], outfit: "smart" },
  { id: "terapis", name: "Terapis", icon: "🌿", color: "#5c9b87", description: "Melayani reservasi di area spa dan wellness.", selfSelectable: false, category: "service", availability: "coming-soon", requirement: "Area Wellness", accessLevel: 2, permissions: ["wellness-service"], outfit: "smart" },
  { id: "dj", name: "DJ", icon: "🎧", color: "#8264ad", description: "Menghidupkan musik di lounge dan event.", selfSelectable: false, category: "events", availability: "coming-soon", requirement: "Lounge & Event Venue", accessLevel: 2, permissions: ["entertainment-control"], outfit: "smart" },
  { id: "kasir", name: "Kasir", icon: "🧾", color: "#d9503f", description: "Melayani pembayaran di kasir.", selfSelectable: false, category: "operations", availability: "assigned", requirement: "Penugasan staf", accessLevel: 3, permissions: ["cashier-area"], outfit: "cashier" },
  { id: "packing", name: "Packing Staff", icon: "📦", color: "#c98a3c", description: "Mengemas pesanan online.", selfSelectable: false, category: "operations", availability: "assigned", requirement: "Penugasan staf", accessLevel: 3, permissions: ["warehouse-area"], outfit: "warehouse" },
  { id: "gudang", name: "Gudang", icon: "🏭", color: "#9b7a4a", description: "Mengelola stok dan palet gudang.", selfSelectable: false, category: "operations", availability: "assigned", requirement: "Penugasan staf", accessLevel: 3, permissions: ["warehouse-area"], outfit: "warehouse" },
  { id: "driver", name: "Driver", icon: "🚚", color: "#3f86c9", description: "Mengantar pesanan ke pelanggan.", selfSelectable: false, category: "operations", availability: "assigned", requirement: "Mitra logistik", accessLevel: 3, permissions: ["logistics"], outfit: "driver" },
  { id: "event-staff", name: "Event Staff", icon: "🎟️", color: "#b86572", description: "Menjalankan acara dan pengalaman pengunjung.", selfSelectable: false, category: "events", availability: "coming-soon", requirement: "Event Venue", accessLevel: 2, permissions: ["event-operations"], outfit: "smart" },
  { id: "tenant-staff", name: "Tenant Staff", icon: "🏷️", color: "#5a8eaa", description: "Melayani pengunjung di tenant terkait.", selfSelectable: false, category: "commerce", availability: "coming-soon", requirement: "Tenant District", accessLevel: 2, permissions: ["tenant-management"], outfit: "smart" },
  { id: "host", name: "Host / MC", icon: "🎤", color: "#bc658d", description: "Memandu acara dan aktivitas komunitas.", selfSelectable: false, category: "events", availability: "coming-soon", requirement: "Event Venue", accessLevel: 2, permissions: ["event-operations"], outfit: "smart" },
  { id: "security", name: "Security", icon: "🛡️", color: "#4f6578", description: "Menjaga keamanan area dan akses khusus.", selfSelectable: false, category: "operations", availability: "coming-soon", requirement: "City Operations", accessLevel: 3, permissions: ["security-access"], outfit: "smart" },
  { id: "admin", name: "Admin", icon: "🛠️", color: "#5c6b80", description: "Mengatur sistem dan data toko.", selfSelectable: false, category: "management", availability: "assigned", requirement: "Penugasan pengelola", accessLevel: 4, permissions: ["management", "cashier-area", "warehouse-area"], outfit: "smart" },
  { id: "supervisor", name: "Supervisor", icon: "📋", color: "#2f9e8f", description: "Mengawasi operasional harian.", selfSelectable: false, category: "management", availability: "assigned", requirement: "Penugasan pengelola", accessLevel: 4, permissions: ["management", "cashier-area", "warehouse-area", "logistics"], outfit: "smart" },
  { id: "owner", name: "Owner", icon: "👑", color: "#c9a227", description: "Pemilik Toko Cung.", selfSelectable: false, category: "management", availability: "assigned", requirement: "Pemilik terverifikasi", accessLevel: 5, permissions: ["management", "cashier-area", "warehouse-area", "logistics", "tenant-management"], outfit: "smart" },
];

export function roleById(id: string | null | undefined): RoleDef {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]!;
}

export function hasPermission(role: string | null | undefined, p: Permission) {
  return roleById(role).permissions.includes(p);
}
