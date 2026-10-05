/**
 * Toko Cung World — asset inventory.
 *
 * Sumber: Kenney CC0 packs (Mini Characters, City Kit Commercial, Furniture Kit,
 * Food Kit). Semua file disimpan di /public/models dengan ORIGINAL FILENAME —
 * jangan rename. Mapping di bawah adalah satu-satunya tempat nama file dipakai,
 * sehingga GLB Toko Cung asli bisa ditukar tanpa menyentuh kode game.
 *
 * Catatan migrasi: project `toko-cung-insights` tidak menyimpan file GLB apa pun
 * (hanya daftar kredit + stand-in prosedural), jadi model di sini disediakan dari
 * pack CC0 sambil mempertahankan peran/slot yang sama (RetailArea, CashierStation,
 * WarehouseArea, NakamaWorkers, dst.).
 */

const CHAR = "/models/characters";
const CITY = "/models/city";
const FURN = "/models/furniture";
const FOOD = "/models/food";

export const GAME_ASSETS = {
  // Bangunan & lingkungan
  tokoCungBuilding: `${CITY}/building-a.glb`,
  neighborBuildings: [
    `${CITY}/building-b.glb`,
    `${CITY}/building-c.glb`,
    `${CITY}/building-d.glb`,
    `${CITY}/building-e.glb`,
    `${CITY}/building-f.glb`,
    `${CITY}/building-g.glb`,
  ],
  skyline: [
    `${CITY}/low-detail-building-a.glb`,
    `${CITY}/low-detail-building-c.glb`,
    `${CITY}/low-detail-building-e.glb`,
  ],
  awning: `${CITY}/detail-awning-wide.glb`,
  parasol: `${CITY}/detail-parasol-a.glb`,

  // Interior toko
  shelfTall: `${FURN}/bookcaseOpen.glb`,
  shelfLow: `${FURN}/bookcaseOpenLow.glb`,
  shelfClosed: `${FURN}/bookcaseClosedWide.glb`,
  fridge: `${FURN}/kitchenFridgeLarge.glb`,
  counter: `${FURN}/kitchenBar.glb`,
  counterEnd: `${FURN}/kitchenBarEnd.glb`,
  posScreen: `${FURN}/computerScreen.glb`,
  desk: `${FURN}/desk.glb`,
  chair: `${FURN}/chairDesk.glb`,
  doormat: `${FURN}/rugDoormat.glb`,
  doorway: `${FURN}/doorwayOpen.glb`,
  ceilingLamp: `${FURN}/lampSquareCeiling.glb`,
  plant: `${FURN}/pottedPlant.glb`,
  plantSmall: `${FURN}/plantSmall1.glb`,
  radio: `${FURN}/radio.glb`,
  boxClosed: `${FURN}/cardboardBoxClosed.glb`,
  boxOpen: `${FURN}/cardboardBoxOpen.glb`,

  // Karakter (slot mengikuti mapping lama Toko Cung)
  cashier: `${CHAR}/character-female-a.glb`,
  owner: `${CHAR}/character-male-a.glb`,
  nakamaWarehouse: `${CHAR}/character-male-c.glb`,
  nakamaFloor2: `${CHAR}/character-female-c.glb`,
  courier: `${CHAR}/character-male-e.glb`,
  player: `${CHAR}/character-male-b.glb`,
  customers: [
    `${CHAR}/character-female-b.glb`,
    `${CHAR}/character-female-d.glb`,
    `${CHAR}/character-male-d.glb`,
    `${CHAR}/character-female-e.glb`,
    `${CHAR}/character-male-f.glb`,
  ],

  // Props produk
  props: {
    bag: `${FOOD}/bag.glb`,
    cartonSmall: `${FOOD}/carton-small.glb`,
    carton: `${FOOD}/carton.glb`,
    sodaBottle: `${FOOD}/soda-bottle.glb`,
    sodaCan: `${FOOD}/soda-can.glb`,
    bottleOil: `${FOOD}/bottle-oil.glb`,
    bottleKetchup: `${FOOD}/bottle-ketchup.glb`,
    can: `${FOOD}/can.glb`,
    canSmall: `${FOOD}/can-small.glb`,
    chocolate: `${FOOD}/chocolate.glb`,
    cookie: `${FOOD}/cookie.glb`,
    candyBar: `${FOOD}/candy-bar.glb`,
    bread: `${FOOD}/bread.glb`,
    egg: `${FOOD}/egg.glb`,
    apple: `${FOOD}/apple.glb`,
    banana: `${FOOD}/banana.glb`,
    coffeeCup: `${FOOD}/cup-coffee.glb`,
    barrel: `${FOOD}/barrel.glb`,
  },
} as const;

export type PropKey = keyof typeof GAME_ASSETS.props;

/** Kredit lisensi — wajib tetap ada. */
export const ASSET_CREDITS = [
  {
    pack: "Mini Characters",
    creator: "Kenney",
    license: "CC0",
    source: "https://kenney.nl/assets/mini-characters",
  },
  {
    pack: "City Kit (Commercial)",
    creator: "Kenney",
    license: "CC0",
    source: "https://kenney.nl/assets/city-kit-commercial",
  },
  {
    pack: "Furniture Kit",
    creator: "Kenney",
    license: "CC0",
    source: "https://kenney.nl/assets/furniture-kit",
  },
  { pack: "Food Kit", creator: "Kenney", license: "CC0", source: "https://kenney.nl/assets/food-kit" },
];
