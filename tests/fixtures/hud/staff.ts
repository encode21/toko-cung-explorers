import { useAccount } from "@/auth/useSession";
import { useStaff } from "@/game/staff/store";
import { useWarung } from "@/game/warung/store";
import { createSnapshot } from "../warung/data";

/** Real staff/chat/bank screens with a deterministic transport for browser checks. */
export function seedStaffFixture() {
  const w = window as any;
  useAccount.setState({ user: { id: "qa-staff", display_name: "Sari" } as any });
  const warung = createSnapshot("management");
  warung.warung!.cash = 250000;
  warung.warung!.level = 3;
  warung.rent = null;
  warung.event = null;
  warung.debts = [];
  warung.debtHistory = [];
  warung.journal = [];
  useWarung.setState({ data: warung, notices: [], error: null });
  w.warungTransport = async (request: any) => request.action === "contacts" ? { contacts: [] } : structuredClone(warung);
  const staff = {
    enabled: true, kas: 250000, pollSeconds: 60,
    staff: [
      { kind: "guard", name: "Penjaga warung", business: "warung", daily: 40000, monthly: 1200000,
        amountDue: 80000, paymentToken: "a".repeat(64), dueThrough: "2026-11-27", hireCost: 0,
        lateDays: 2, leaveIn: 1, status: "active", eligible: true, startedAt: "2026-11-26T00:00:00Z", paidUntil: "2026-11-25",
        effect: "Melayani pembeli saat kamu pergi dengan laju dasar 90% layanan langsung, maksimal 16 jam. Bisa dipanggil untuk 5 pembeli antre per hari game.", requirement: "Warung level 2" },
      { kind: "courier", name: "Kurir kulakan", business: "warung", daily: 30000, monthly: 900000,
        amountDue: 0, paymentToken: null, dueThrough: null, hireCost: 0,
        lateDays: 0, leaveIn: null, status: "active", eligible: true, startedAt: null, paidUntil: null, restockTargetPercent: 50,
        effect: "Kulakan otomatis saat stok menipis. Ongkir tetap dibayar dari Kas usaha.", requirement: "Warung level 3" },
    ],
    messages: [{ id: 1, type: "STAFF_LATE", kind: "guard", name: "Penjaga warung", at: "2026-11-27T02:00:00Z", text: "Gaji saya belum masuk untuk 2 hari. Tolong transfer lewat CngBank, ya. Kalau 3 hari belum dibayar, saya pamit." }],
    text: { title: "Karyawan", hire: "Rekrut", rehire: "Rekrut lagi", dismiss: "Berhentikan", retry: "Coba lagi",
      rules: "Transfer gaji sendiri lewat CngBank.\nTiga tanggal belum dibayar: karyawan pamit.", rounding: "Gaji bulanan ÷ 30, dibulatkan ke bawah.", cash_low: "Kas belum cukup.", locked: "Syarat rekrut belum terpenuhi.", late_status: ":days hari belum dibayar", salary: ":daily/hari", hire_cost: "Tanpa potongan kas", messages: "Kabar karyawan", active: "Bekerja", vacant: "Belum direkrut", dismissed: "Diberhentikan", left: "Pamit", journal_salary: "Gaji karyawan" },
  };
  w.staff = useStaff;
  w.staffRequests = [];
  const receipts = new Set<string>();
  w.staffTransport = async (request: any) => {
    w.staffRequests.push(structuredClone(request));
    if (request.action === "pay" && !receipts.has(request.requestId)) {
      const e = staff.staff[0]!;
      if (request.paymentToken !== e.paymentToken) throw new Error("Quote changed");
      const amount = e.amountDue;
      staff.kas -= amount;
      warung.warung!.cash = staff.kas;
      e.amountDue = 0; e.lateDays = 0; e.leaveIn = 3;
      e.paymentToken = null;
      staff.messages.unshift({ id: 2, type: "STAFF_SALARY", kind: "guard", name: e.name, at: "2026-11-27T03:00:00Z", text: "Transfer gaji Rp80.000 sudah saya terima. Terima kasih, Bos!" });
      warung.journal.unshift({ id: 2, type: "STAFF_SALARY", itemId: "guard", qty: 2, amount: -amount, at: "2026-11-27T03:00:00Z" } as any);
      receipts.add(request.requestId);
      if (w.loseSalaryReply) { w.loseSalaryReply = false; throw new Error("Koneksi terputus setelah transfer. Cek ulang pembayaran."); }
    }
    if (request.action === "configure") staff.staff[1]!.restockTargetPercent = request.restockTargetPercent;
    return structuredClone(staff);
  };
  useStaff.setState({ data: structuredClone(staff) as any, busy: false, retry: null, error: "" });
  const login = { enabled: true, claimedToday: true, budgetExhausted: false, points: 50, currentDay: 2,
    resetAt: Date.now() + 86400000,
    days: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, points: 50, claimed: i < 2, date: null })),
    kas: { hasWarung: true, claimedToday: false, day: 5, amount: 30000, schedule: [10000, 15000, 20000, 25000, 30000, 40000, 50000] } };
  w.loginTransport = async (operation: string) => {
    if (operation === "daily-login-claim") login.kas.claimedToday = true;
    return structuredClone(login);
  };
}
