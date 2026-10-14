/** Transport fixture only; real authority is exercised in Laravel/MySQL tests. */
export function dailyFixture() {
  return {
    enabled: true,
    dateKey: "2026-10-14",
    serverTime: "2026-10-14T12:00:00+07:00",
    nextReset: "2026-10-15T00:00:00+07:00",
    setId: "daily-test",
    revision: 0,
    introduced: false,
    streak: 3,
    completedCount: 0,
    claimedCount: 0,
    profile: {
      xp: 100,
      level: 1,
      title: "Pendatang",
      missions_completed: 0,
      lifetime_points_earned: 0,
    },
    wallet: {
      current_balance: 0,
      earned_today: 0,
      lifetime_earned: 0,
      day: "2026-10-14",
      last_updated: "",
    },
    quests: Array.from({ length: 5 }, (_, i) => ({
      id: "daily-" + i,
      questId: "template-" + i,
      status: "AVAILABLE",
      progress: [0],
      receipt: null,
      definition: {
        id: "template-" + i,
        title: [
          "Kenalan Sama Warga",
          "Cek Gudang",
          "Keliling Toko",
          "Paket Datang",
          "Cari Petunjuk",
        ][i],
        description: "Bantu Koko Cung hari ini",
        category: "WORLD",
        minLevel: 1,
        weight: 1,
        reward: { cungPoint: 20, xp: 50 },
        objectives: [
          {
            type: "VISIT",
            label: "Kunjungi Gudang",
            required: 1,
            targetId: "warehouse",
            target: "warehouse",
            position: [6.2, 0, -15],
            radius: 2.2,
          },
        ],
      },
    })),
  };
}
