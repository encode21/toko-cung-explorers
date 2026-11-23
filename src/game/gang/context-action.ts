import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { enterWarung, useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { gangText, gangName, homeAddress, houseFront } from "./model";
import { useGang, enterGang, leaveGang, openHomeShop } from "./store";

export function gangContextActions(): ContextAction[] {
  const s = useGang.getState(),
    d = s.data;
  if (!d || useWarung.getState().inside || useUsaha.getState().inside) return [];
  const p = useGame.getState().playerPos;
  const actions: ContextAction[] = [];
  const add = (
    id: string,
    label: string,
    title: string,
    at: [number, number, number],
    execute: () => unknown,
  ) => {
    const distance = Math.hypot(p[0] - at[0], p[2] - at[2]);
    if (distance < 4 && Math.abs(p[1] - at[1]) < 2)
      actions.push({
        id,
        label,
        title,
        distance,
        priority: 2,
        busy: s.busy,
        error: s.error,
        execute,
      });
  };
  if (!s.inside) {
    add(
      "gang:enter",
      d.text["enter"]!,
      homeAddress(d),
      [d.layout.gate.x, 0.83, d.layout.gate.z],
      () => enterGang(),
    );
    add(
      "gang:board",
      d.text["directory"]!,
      d.text["open_now"]!,
      [d.layout.gate.x + 6.2, 0.83, d.layout.gate.z + 1.8],
      () => useGang.setState({ board: true }),
    );
    return actions;
  }
  add(
    "gang:leave",
    d.text["leave"]!,
    gangName(d),
    [d.layout.origin[0], 0.83, d.layout.origin[2] - 10],
    () => leaveGang(),
  );
  const end = Math.ceil(d.houses.length / 2) * d.layout.house_spacing + 5;
  for (const side of ["previous", "next"] as const) {
    const target = d.neighbors[side];
    if (target)
      add(
        `gang:${side}`,
        gangText(d, `${side}_gang`, { gang: target }),
        d.text["visit"]!,
        [d.layout.origin[0] + (side === "previous" ? -4 : 4), 0.83, d.layout.origin[2] + end],
        () => enterGang(undefined, { gang: target }),
      );
  }
  for (const house of d.houses) {
    const w = house.warung;
    const at = houseFront(house.number, d.layout);
    if (w && !house.inactive)
      add(
        `gang:shop:${w.id}`,
        w.lot === null ? d.text["visit_shop"]! : d.text["navigate_city_shop"]!,
        w.lot === null ? w.name : `${w.name} · ${gangText(d, "city_shop", { lot: w.lot + 1 })}`,
        at,
        () => (w.lot === null ? enterWarung(w.id) : leaveGang(w.lot)),
      );
    else if (house.mine && !w)
      add("gang:open", d.text["open_shop"]!, d.text["empty_shop"]!, at, openHomeShop);
  }
  return actions;
}
