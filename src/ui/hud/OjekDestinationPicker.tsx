import { useEffect, useId, useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";
import type { OjekSpot } from "@/game/ojek/store";

/** Only destinations from the current server snapshot can become a booking target. */
export function OjekDestinationPicker({
  spots,
  value,
  onChange,
  disabled,
}: {
  spots: OjekSpot[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = spots.find((spot) => spot.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const text = selected?.name ?? query;
  const filter = selected ? "" : query.trim().toLocaleLowerCase("id-ID");
  const matches = spots.filter((spot) => spot.name.toLocaleLowerCase("id-ID").includes(filter));
  const expanded = open && !disabled;

  useEffect(() => {
    if (expanded && active >= 0) {
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [active, expanded]);

  const choose = (spot: OjekSpot) => {
    onChange(spot.id);
    setQuery("");
    setOpen(false);
    setActive(-1);
  };

  return (
    <div
      className="ojek-destination"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Mau ke mana?</label>
      <div className="ojek-destination-field">
        <Search aria-hidden="true" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? `${id}-list` : undefined}
          aria-activedescendant={expanded && matches[active] ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          placeholder="Cari tujuan"
          value={text}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange("");
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => {
                if (!matches.length) return -1;
                if (!expanded || index < 0)
                  return event.key === "ArrowDown" ? 0 : matches.length - 1;
                return (
                  (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length
                );
              });
            } else if (event.key === "Enter" && expanded && matches[active]) {
              event.preventDefault();
              choose(matches[active]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setActive(-1);
            }
          }}
        />
        {text && (
          <button
            type="button"
            aria-label="Hapus tujuan"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setQuery("");
              setActive(-1);
              setOpen(true);
              input.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {expanded && (
        <>
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Tujuan yang tersedia">
            {matches.map((spot, index) => (
              <li key={spot.id} role="presentation">
                <button
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={spot.id === value}
                  data-active={active === index || undefined}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(spot)}
                >
                  <MapPin aria-hidden="true" />
                  <span>{spot.name}</span>
                  {spot.id === value && <Check aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p className="ojek-destination-empty" role="status">
              {spots.length
                ? "Tujuan tidak ditemukan. Coba nama lain."
                : "Belum ada tujuan tersedia."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
