import { useEffect, useState } from "react";
import { GameChoice } from "@/ui/game-ui/GamePrimitives";
import {
  Truck,
  MessageCircle,
  UserCheck,
  Wrench,
  Star,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { deliveryCommand, useDelivery } from "@/game/delivery/store";
import { deliverySecondsLeft } from "@/game/delivery/model";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import "./delivery-panel.css";

const VEHICLE_ICON: Record<string, string> = {
  motor: "🏍️",
  viar: "🛺",
  truk: "🚛",
};

export function DeliveryPanel() {
  const data = useWarung((s) => s.data);
  const delivery = data?.delivery;
  const warung = data?.warung;
  const busy = useDelivery((s) => s.busy);
  const error = useDelivery((s) => s.error);
  const setActiveSelfOrderId = useDelivery((s) => s.setActiveSelfOrderId);
  const setSheet = useHud((s) => s.setSheet);

  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | "">("");
  const [selectedCourierId, setSelectedCourierId] = useState<number | "self">("self");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void deliveryCommand("delivery_read");
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!warung || !delivery) {
    return (
      <div className="delivery-panel">
        <p className="delivery-muted">Memuat data pengantaran...</p>
      </div>
    );
  }

  if (!delivery.unlocked) {
    return (
      <div className="delivery-panel">
        <div className="delivery-section">
          <div className="delivery-section-header">
            <h4>
              <Truck size={18} aria-hidden /> Pengantaran Barang Terkunci
            </h4>
            <span className="delivery-badge">Level 1 · {warung.levelName}</span>
          </div>
          <p className="delivery-muted">
            Upgrade warungmu ke <strong>Level 2 (Warung Kelontong)</strong> untuk membuka fitur
            pesan antar dengan Motor, lalu berkembang ke Viar (Level 3), Agen 2 Viar + 2 Motor +
            Kurir NPC (Level 4), hingga Truk Grosir (Level 5).
          </p>
        </div>
      </div>
    );
  }

  const preparedOrders = delivery.orders.filter((o) => o.status === "PREPARED");
  const pendingOrders = delivery.orders.filter((o) => o.status === "PENDING");
  const transitOrders = delivery.orders.filter(
    (o) => o.status === "DISPATCHED" || o.status === "IN_TRANSIT",
  );
  const idleVehicles = delivery.vehicles.filter((v) => v.status === "IDLE");
  const selectedBoxes = delivery.orders
    .filter((o) => selectedOrders.includes(o.id))
    .reduce((total, o) => total + o.boxes, 0);
  // Kendaraan yang tidak muat untuk paket terpilih tidak ditawarkan.
  const fitVehicles = idleVehicles.filter((v) => v.capacity >= selectedBoxes);
  const vehicleFits = fitVehicles.some((v) => v.id === selectedVehicleId);
  const idleCouriers = delivery.couriers.filter((c) => c.status === "IDLE");
  const unpaidCouriers = delivery.couriers.filter((c) => c.lastPaidDay !== delivery.payDay);

  const toggleSelectOrder = (id: number) => {
    setSelectedOrders((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < delivery.rules.max_orders_per_trip
          ? [...prev, id]
          : prev,
    );
  };

  const handleDispatch = async () => {
    if (!selectedOrders.length || !selectedVehicleId) return;
    const ok = await deliveryCommand("delivery_dispatch", {
      orderIds: selectedOrders,
      vehicleId: Number(selectedVehicleId),
      ...(selectedCourierId !== "self" ? { courierId: Number(selectedCourierId) } : {}),
    });
    if (ok) {
      setSelectedOrders([]);
      setSelectedVehicleId("");
      setSelectedCourierId("self");
    }
  };

  return (
    <div className="delivery-panel">
      {error && (
        <div className="delivery-badge delivery-badge--warn" role="alert">
          {error}
        </div>
      )}

      {/* 1. Armada */}
      <section className="delivery-section">
        <div className="delivery-section-header">
          <h4>
            <Truck size={17} aria-hidden /> Armada ({warung.levelName})
          </h4>
          <span className="delivery-badge">
            Maks {delivery.rules.max_orders_per_trip} order/trip
          </span>
        </div>
        <div className="delivery-grid">
          {delivery.vehicles.map((v) => (
            <div key={v.id} className="delivery-card">
              <div className="delivery-card-title">
                <span>
                  {VEHICLE_ICON[v.type]} {v.label}
                </span>
                <span
                  className={`delivery-badge ${
                    v.status === "BROKEN"
                      ? "delivery-badge--warn"
                      : v.status === "IDLE"
                        ? "delivery-badge--ok"
                        : ""
                  }`}
                >
                  {v.status === "IDLE" ? "Siap" : v.status === "BUSY" ? "Di jalan" : "Rusak"}
                </span>
              </div>
              <div className="delivery-muted">
                Kapasitas: {v.capacity} dus · Kondisi: {v.condition}%
              </div>
              {(v.status === "BROKEN" || v.condition < 85) && v.status !== "BUSY" && (
                <button
                  type="button"
                  className="delivery-btn delivery-btn--warn"
                  disabled={busy}
                  onClick={() => void deliveryCommand("delivery_repair", { vehicleId: v.id })}
                >
                  <Wrench size={14} aria-hidden /> Servis
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Chat Pesan Antar dari NPC */}
      <section className="delivery-section">
        <div className="delivery-section-header">
          <h4>
            <MessageCircle size={17} aria-hidden /> Chat Pesan Antar ({delivery.chats.length})
          </h4>
          <button
            type="button"
            className="delivery-btn delivery-btn--secondary"
            disabled={busy}
            onClick={() => void deliveryCommand("delivery_request_chat")}
          >
            Cek Order Masuk
          </button>
        </div>
        {delivery.chats.length === 0 ? (
          <p className="delivery-muted">
            Belum ada chat pesan antar baru. Buka warung dan pastikan stok tersedia.
          </p>
        ) : (
          delivery.chats.map((chat) => {
            const left = deliverySecondsLeft(chat.expiresAt, now);
            return (
              <div key={chat.id} className="delivery-card">
                <div className="delivery-card-title">
                  <span>
                    {chat.npcName} · {chat.area === "kota" ? "Kota" : "Kampung"}
                  </span>
                  <span className="delivery-badge">{left} dtk</span>
                </div>
                <div className="delivery-muted">
                  “{chat.message}”
                  <br />
                  Barang: {rupiah(chat.goodsTotal)} + Ongkir: {rupiah(chat.ongkir)} ({chat.boxes}{" "}
                  dus)
                </div>
                <div className="delivery-actions">
                  <button
                    type="button"
                    className="delivery-btn delivery-btn--primary"
                    disabled={busy}
                    onClick={() => void deliveryCommand("delivery_accept", { chatId: chat.id })}
                  >
                    Terima Order
                  </button>
                  <button
                    type="button"
                    className="delivery-btn delivery-btn--secondary"
                    disabled={busy}
                    onClick={() => void deliveryCommand("delivery_reject", { chatId: chat.id })}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 3. Pesanan Perlu Disiapkan & Dispatch */}
      {(pendingOrders.length > 0 || preparedOrders.length > 0) && (
        <section className="delivery-section">
          <div className="delivery-section-header">
            <h4>📦 Siapkan &amp; Atur Pengiriman</h4>
          </div>

          {pendingOrders.map((o) => (
            <div key={o.id} className="delivery-card">
              <div className="delivery-card-title">
                <span>
                  #{o.id} {o.npcName} ({o.boxes} dus)
                </span>
                <span className="delivery-badge">Perlu disiapkan</span>
              </div>
              <div className="delivery-muted">
                {o.addressLabel} · {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
              </div>
              <div className="delivery-actions">
                <button
                  type="button"
                  className="delivery-btn delivery-btn--primary"
                  disabled={busy}
                  onClick={() => void deliveryCommand("delivery_prepare", { orderId: o.id })}
                >
                  Siapkan Paket
                </button>
              </div>
            </div>
          ))}

          {preparedOrders.length > 0 && (
            <div className="delivery-dispatch-bar">
              <strong>Pilih Paket Siap Kirim ({selectedOrders.length} dipilih):</strong>
              {preparedOrders.map((o) => {
                const checked = selectedOrders.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`delivery-card ${checked ? "delivery-card--selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="delivery-card-title">
                      <span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOrder(o.id)}
                          style={{ marginRight: 6 }}
                        />
                        #{o.id} {o.npcName} ({o.boxes} dus)
                      </span>
                      <span className="delivery-badge">Ongkir {rupiah(o.ongkir)}</span>
                    </div>
                    <span className="delivery-muted">{o.addressLabel}</span>
                  </label>
                );
              })}

              <span className="delivery-muted">Kendaraan</span>
              {fitVehicles.length ? (
                <GameChoice
                  label="Pilih kendaraan"
                  options={fitVehicles.map((v) => ({
                    value: String(v.id),
                    label: `${VEHICLE_ICON[v.type]} ${v.label} (maks ${v.capacity} dus)`,
                  }))}
                  value={selectedVehicleId === "" ? null : String(selectedVehicleId)}
                  onChange={(id) => setSelectedVehicleId(Number(id))}
                />
              ) : (
                <span className="delivery-muted">
                  {idleVehicles.length
                    ? `Muatan ${selectedBoxes} dus tidak muat di kendaraan yang siap. Kurangi paket.`
                    : "Semua kendaraan sedang dipakai."}
                </span>
              )}

              <span className="delivery-muted">Pengantar</span>
              <GameChoice
                label="Pilih pengantar"
                options={[
                  { value: "self", label: "🧑 Antar Sendiri (100% ongkir, tinggalkan warung)" },
                  ...(delivery.rules.max_couriers > 0
                    ? idleCouriers.map((c) => ({
                        value: String(c.id),
                        label: `🛵 Kurir: ${c.name} (${c.role === "supir_truk" ? "Supir Truk" : "Kurir"}, komisi ${c.commissionPercent}%)`,
                      }))
                    : []),
                ]}
                value={String(selectedCourierId)}
                onChange={(id) => setSelectedCourierId(id === "self" ? "self" : Number(id))}
              />

              <button
                type="button"
                className="delivery-btn delivery-btn--accent"
                disabled={busy || !selectedOrders.length || !vehicleFits}
                onClick={() => void handleDispatch()}
              >
                Berangkatkan Pengiriman
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Sedang Diantar */}
      {transitOrders.length > 0 && (
        <section className="delivery-section">
          <div className="delivery-section-header">
            <h4>🛵 Sedang Dalam Pengantaran ({transitOrders.length})</h4>
          </div>
          {transitOrders.map((o) => {
            const etaLeft = deliverySecondsLeft(o.etaAt, now);
            return (
              <div key={o.id} className="delivery-card">
                <div className="delivery-card-title">
                  <span>
                    #{o.id} {o.npcName}
                  </span>
                  <span className="delivery-badge">
                    {o.assignedSelf
                      ? "Antar Sendiri"
                      : etaLeft > 0
                        ? `Kurir (${etaLeft} dtk)`
                        : "Tiba, menghitung…"}
                  </span>
                </div>
                <div className="delivery-muted">
                  Tujuan: {o.addressLabel} · Total {rupiah(o.goodsTotal + o.ongkir)}
                </div>
                {o.gimmick && (
                  <div className="delivery-badge delivery-badge--warn">
                    <AlertTriangle size={12} aria-hidden /> {o.gimmick.label}: {o.gimmick.text}
                  </div>
                )}
                {o.assignedSelf && (
                  <div className="delivery-muted">
                    {o.status === "DISPATCHED"
                      ? "📦 Angkat paketnya di depan warungmu."
                      : `🚶 Bawa ke ${o.npcName}, serahkan di depan rumahnya.`}
                  </div>
                )}
                {o.assignedSelf && (
                  <div className="delivery-actions">
                    <button
                      type="button"
                      className="delivery-btn delivery-btn--secondary"
                      onClick={() => {
                        setActiveSelfOrderId(o.id);
                        useGame.getState().setWaypoint("delivery-target");
                        setSheet(null);
                      }}
                    >
                      <Navigation size={14} aria-hidden /> Tunjukkan Jalan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* 5. Kurir NPC (Level 4-5) */}
      {delivery.rules.max_couriers > 0 && (
        <section className="delivery-section">
          <div className="delivery-section-header">
            <h4>
              <UserCheck size={17} aria-hidden /> Kurir NPC ({delivery.couriers.length}/
              {delivery.rules.max_couriers})
            </h4>
            {delivery.couriers.length > 0 && (
              <button
                type="button"
                className="delivery-btn delivery-btn--primary"
                disabled={busy || unpaidCouriers.length === 0}
                onClick={() => void deliveryCommand("delivery_courier_pay")}
              >
                {unpaidCouriers.length
                  ? `Bayar Gaji Harian (${rupiah(unpaidCouriers.reduce((t, c) => t + c.dailySalary, 0))})`
                  : "Gaji hari ini lunas"}
              </button>
            )}
          </div>
          {delivery.rules.require_truck_courier && (
            <p className="delivery-muted">
              Level Grosir wajib mempekerjakan minimal 1 kurir/supir truk agar armada truk bisa
              beroperasi.
            </p>
          )}
          <div className="delivery-grid">
            {delivery.couriers.map((c) => (
              <div key={c.id} className="delivery-card">
                <div className="delivery-card-title">
                  <span>{c.name}</span>
                  <span
                    className={`delivery-badge ${
                      c.status === "SICK"
                        ? "delivery-badge--warn"
                        : c.status === "IDLE"
                          ? "delivery-badge--ok"
                          : ""
                    }`}
                  >
                    {c.status === "IDLE" ? "Siap" : c.status === "DELIVERING" ? "Antar" : "Sakit"}
                  </span>
                </div>
                <div className="delivery-muted">
                  {c.role === "supir_truk" ? "Supir Truk" : "Kurir"} · Gaji {rupiah(c.dailySalary)}
                  /hr · Komisi {c.commissionPercent}% · Mood {c.mood}%
                </div>
                {c.status !== "DELIVERING" && (
                  <button
                    type="button"
                    className="delivery-btn delivery-btn--secondary"
                    disabled={busy}
                    onClick={() =>
                      void deliveryCommand("delivery_courier_fire", { courierId: c.id })
                    }
                  >
                    Berhentikan
                  </button>
                )}
              </div>
            ))}
          </div>
          {delivery.couriers.length < delivery.rules.max_couriers && (
            <div className="delivery-actions">
              <button
                type="button"
                className="delivery-btn delivery-btn--secondary"
                disabled={busy}
                onClick={() => void deliveryCommand("delivery_courier_hire", { role: "kurir" })}
              >
                + Rekrut Kurir (Rp15.000)
              </button>
              {warung.level >= 5 && (
                <button
                  type="button"
                  className="delivery-btn delivery-btn--secondary"
                  disabled={busy}
                  onClick={() =>
                    void deliveryCommand("delivery_courier_hire", { role: "supir_truk" })
                  }
                >
                  + Rekrut Supir Truk (Rp35.000)
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* 6. Edukasi Margin & Rating */}
      <section className="delivery-section">
        <div className="delivery-section-header">
          <h4>
            <Star size={17} aria-hidden /> Margin &amp; Rating Delivery
          </h4>
          <span className="delivery-badge">
            ⭐ {delivery.rating.average} ({delivery.rating.count} ulasan)
          </span>
        </div>
        <div className="delivery-economy-row">
          <div className="delivery-stat">
            <span className="delivery-muted">Omzet Antar</span>
            <strong>{rupiah(delivery.economy.income)}</strong>
          </div>
          <div className="delivery-stat">
            <span className="delivery-muted">Gaji &amp; Servis</span>
            <strong>{rupiah(delivery.economy.opex)}</strong>
          </div>
          <div className="delivery-stat">
            <span className="delivery-muted">Margin Bersih</span>
            <strong>{rupiah(delivery.economy.net)}</strong>
          </div>
        </div>
        {delivery.rating.recent.length > 0 && (
          <div className="delivery-muted">
            Ulasan terakhir: “{delivery.rating.recent[0]!.comment}” (
            {delivery.rating.recent[0]!.stars}
            ⭐)
          </div>
        )}
      </section>
    </div>
  );
}
