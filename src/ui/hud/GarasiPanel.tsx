import { useEffect, useState } from "react";
import { CarFront, Plus, Users } from "lucide-react";
import { garasiCommand, summonVehicle, useGarasi, type GarasiSnapshot } from "@/game/garasi/store";
import { isShowroomRoom } from "@/game/showroom/layout";
import { regularVehicleImage, SHOWROOM_MODELS, showroomVehicleImage } from "@/game/showroom/models";
import { openShowroomDirections } from "@/game/showroom/navigation";
import { VEHICLE_DEFINITIONS, type VehicleKind } from "@/game/vehicles/definitions";
import { MOTORCYCLES, isMotorcycle, motorThumbnail } from "@/game/vehicles/motorcycles";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameButton, GameIconButton } from "@/ui/game-ui/GamePanel";
import { ShowroomVehiclePreview } from "./ShowroomVehiclePreview";
import "./garasi-panel.css";

type GarageVehicle = {
  id: string;
  model: VehicleKind;
  name: string;
  category: string;
  color: string;
  image?: string | undefined;
  description?: string | undefined;
};

const motorcycles = Object.keys(MOTORCYCLES).filter(isMotorcycle);

function ownedVehicles({ catalog, garasi }: GarasiSnapshot): GarageVehicle[] {
  const owns = (kind: "car" | "showroom", id: string) =>
    garasi.owned.some((entry) => entry.kind === kind && entry.itemId === id);
  const motor = garasi.motor;
  const motorModel =
    motorcycles.find((model) => MOTORCYCLES[model].id === motor?.id) ?? "motorcycle";
  const paint = garasi.owned.find((entry) => entry.kind === "paint" && entry.equipped);
  const paintColor = catalog.paint.find((item) => item.id === paint?.itemId)?.color;

  return [
    ...(motor
      ? [
          {
            id: "motor",
            model: motorModel,
            color: paintColor ?? MOTORCYCLES[motorModel].color,
            category: "Motor",
            image: motorThumbnail(motor.id),
            name: motor.name,
          },
        ]
      : []),
    ...catalog.car
      .filter(({ id }) => owns("car", id))
      .map(({ id, name, model, color, blurb }): GarageVehicle => ({
        id,
        name,
        model: model && Object.hasOwn(VEHICLE_DEFINITIONS, model) ? (model as VehicleKind) : "car",
        color,
        category: "Mobil",
        image: regularVehicleImage(id),
        description: blurb,
      })),
    ...(catalog.showroom ?? [])
      .filter(({ id }) => owns("showroom", id))
      .map(({ id, name, blurb }) => ({
        id,
        model: id,
        name,
        color: SHOWROOM_MODELS[id].color,
        category: SHOWROOM_MODELS[id].category,
        image: showroomVehicleImage(id),
        description: blurb,
      })),
  ];
}

export function GarasiPanel() {
  const data = useGarasi((s) => s.data);
  const busy = useGarasi((s) => s.busy);
  const error = useGarasi((s) => s.error);
  const inShowroom = useGame((s) => isShowroomRoom(s.playerPos[0], s.playerPos[2]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => void garasiCommand("read"), []);

  const vehicles = data ? ownedVehicles(data) : [];
  const vehicle = vehicles.find(({ id }) => id === selectedId) ?? vehicles[0];

  function summon(id: string, at: "here" | "garasi") {
    useHud.getState().setSheet(null);
    void summonVehicle(id, at);
  }

  return (
    <div className="garasi-panel">
      <div className="garasi-preview" aria-label="Tampilan garasi">
        <ShowroomVehiclePreview
          variant="garage"
          model={vehicle?.model ?? null}
          name={vehicle?.name ?? "Garasi kosong"}
          color={vehicle?.color ?? "#59616a"}
          image={vehicle?.image}
        />
      </div>
      <div className="garasi-side">
        <section className="garasi-detail" aria-label="Detail kendaraan">
          {error && (
            <div className="garasi-load-error">
              <p role="alert">{error}</p>
              <GameButton disabled={busy} onClick={() => void garasiCommand("read")}>
                Muat ulang
              </GameButton>
            </div>
          )}
          {vehicle ? (
            <>
              <div className="garasi-detail-copy">
                <p className="garasi-kind">{vehicle.category}</p>
                <h3>{vehicle.name}</h3>
                <p className="garasi-seats">
                  {VEHICLE_DEFINITIONS[vehicle.model].seats.length} kursi
                </p>
                {vehicle.description && <p className="garasi-description">{vehicle.description}</p>}
              </div>
              <div className="garasi-manage">
                <div className="garasi-vehicle-actions">
                  <GameButton
                    disabled={busy || inShowroom}
                    onClick={() => summon(vehicle.id, "here")}
                  >
                    Panggil
                  </GameButton>
                  <GameButton
                    className="game-button-soft"
                    disabled={busy}
                    title={`Parkir di ${data?.garasi.spotName}`}
                    onClick={() => summon(vehicle.id, "garasi")}
                  >
                    Parkir
                  </GameButton>
                </div>
                {inShowroom && (
                  <p className="garasi-indoor-hint">
                    Keluar dari showroom untuk memanggil kendaraan.
                  </p>
                )}
              </div>
            </>
          ) : data ? (
            <div className="garasi-detail-empty">
              <h3>Garasi masih kosong</h3>
              <p>Ketuk + untuk melihat kendaraan di Cung Motor.</p>
            </div>
          ) : !error ? (
            <p className="garasi-loading" role="status">
              Memuat garasi…
            </p>
          ) : null}
        </section>
        <section className="garasi-collection" aria-labelledby="garasi-mine-title">
          <h4 id="garasi-mine-title">Kendaraanku</h4>
          <div className="garasi-rail">
            <nav className="garasi-vehicles" aria-label="Kendaraanku">
              {vehicles.map(({ id, name, image }) => (
                <button
                  key={id}
                  type="button"
                  className="garasi-vehicle-choice"
                  aria-label={name}
                  aria-pressed={vehicle?.id === id}
                  onClick={() => setSelectedId(id)}
                >
                  <span className="garasi-vehicle-art" aria-hidden>
                    {image ? (
                      <img src={image} alt="" width={78} height={49} decoding="async" />
                    ) : (
                      <CarFront size={25} strokeWidth={1.6} />
                    )}
                  </span>
                  <span className="garasi-vehicle-name">{name}</span>
                </button>
              ))}
            </nav>
            <GameIconButton
              label="Ke Showroom"
              className="garasi-showroom-add"
              onClick={openShowroomDirections}
            >
              <Plus size={23} aria-hidden />
            </GameIconButton>
          </div>
        </section>
      </div>
    </div>
  );
}
