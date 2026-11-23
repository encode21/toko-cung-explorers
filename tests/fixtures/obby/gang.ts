import type { GangData } from "@/game/gang/model";
import { useGang } from "@/game/gang/store";

export function startGangFixture() {
  const style = {
    paint: { id: "cream", name: "Cream", color: "#e9dcc1" },
    roof: { id: "tile", name: "Tile", color: "#885a48" },
    fence: { id: "none", name: "None", color: "#a5aaa4" },
    plants: { id: "none", name: "None", color: "#66854a" },
    lamp: { id: "none", name: "None", color: "#e9cc88" },
  };
  const data: GangData = {
    enabled: true,
    gang: 1,
    temporary: false,
    arrival: 1,
    neighbors: { previous: null, next: null },
    home: { gang: 1, number: 1 },
    houses: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      ownerId: null,
      ownerName: null,
      mine: false,
      inactive: false,
      style,
      warung: null,
    })),
    ambient: { mobile_limit: 5, desktop_limit: 7, render_distance: 38, residents: [] },
    catalog: { paint: [], roof: [], fence: [], plants: [], lamp: [] },
    text: {},
    layout: {
      origin: [6000, 0, 3000],
      gate: { x: 6000, z: 2985 },
      house_spacing: 24,
      house_offset: 18,
      render_distance: 52,
    },
  };
  useGang.setState({ inside: 1, data });
}
