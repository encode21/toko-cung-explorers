// Own Laravel WorldDailyQuests contract. QA setup/pose stand in for validated server presence/events.
const http = require("http");
http
  .createServer(async (req, res) => {
    const d = req.body || {};
    const reply = (status, value) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    let state = await pm.state.get("daily:state");
    if (req.url === "/qa/reset") {
      state = { snapshot: d, position: [0, 0.83, 0], requests: [], seen: [], fail: false };
      await pm.state.set("daily:state", state);
      return reply(200, { ok: true });
    }
    if (!state) return reply(200, { enabled: false });
    const s = state.snapshot;
    const settle = () => {
      for (const q of s.quests.filter((q) => q.status === "CLAIMABLE")) {
        q.status = "CLAIMED";
        s.claimedCount++;
        q.receipt = {
          cungPoint: 20,
          requestedPoint: 20,
          xp: 50,
          bonusXp: s.claimedCount === 5 ? 150 : 0,
        };
        s.wallet.current_balance += 20;
        s.profile.xp += 50 + q.receipt.bonusXp;
        s.profile.missions_completed++;
      }
      s.revision++;
    };
    const complete = (q) => {
      if (
        q.status === "ACTIVE" &&
        q.definition.objectives.every((o, i) => q.progress[i] >= o.required)
      ) {
        q.status = "CLAIMABLE";
        s.completedCount++;
      }
    };
    if (req.url === "/qa/position") {
      state.position = d.position;
      await pm.state.set("daily:state", state);
      return reply(200, { ok: true });
    }
    if (req.url === "/qa/fail") {
      state.fail = true;
      await pm.state.set("daily:state", state);
      return reply(200, { ok: true });
    }
    if (req.url === "/qa/event") {
      for (const q of s.quests.filter((q) => q.status === "ACTIVE")) {
        q.definition.objectives.forEach((o, i) => {
          if (o.type === d.type && (!o.targetId || o.targetId === d.targetId))
            q.progress[i] = o.required;
        });
        complete(q);
      }
      settle();
      await pm.state.set("daily:state", state);
      return reply(200, s);
    }
    if (req.url === "/qa/state") return reply(200, state);
    if (req.url !== "/api/world/daily-quests")
      return reply(501, { message: "Endpoint outside this QA contract." });
    state.requests.push(d);
    if (state.fail && d.action === "interact") {
      state.fail = false;
      await pm.state.set("daily:state", state);
      return reply(503, { message: "Koneksi terputus. Coba lagi." });
    }
    if (state.seen.includes(d.requestId)) {
      settle();
      await pm.state.set("daily:state", state);
      return reply(200, s);
    }
    const near = (p) =>
      Math.hypot(state.position[0] - p[0], state.position[2] - p[2]) <= 2.5 &&
      Math.abs(state.position[1] - 0.83 - p[1]) <= 1.8;
    if (
      ["open", "accept"].includes(d.action) &&
      (!near([2.8, 0, 5.5]) || d.npcId !== "npc_daily_cung")
    )
      return reply(422, { message: "Dekati Koko Cung." });
    if (d.action === "open") s.introduced = true;
    if (d.action === "accept")
      for (const q of s.quests) if (q.status === "AVAILABLE") q.status = "ACTIVE";
    if (d.action === "interact") {
      const q = s.quests.find((q) => q.id === d.instanceId),
        o = q?.definition.objectives[d.objective];
      if (
        !q ||
        q.status !== "ACTIVE" ||
        !o ||
        o.targetId !== d.targetId ||
        (q.definition.ordered &&
          q.progress.findIndex((p, i) => p < q.definition.objectives[i].required) !==
            d.objective) ||
        !near(o.position)
      )
        return reply(422, { message: "Tujuan tidak valid atau terlalu jauh." });
      q.progress[d.objective] = o.required;
      complete(q);
    }
    if (
      d.action === "claim" &&
      !s.quests.some((q) => q.id === d.instanceId && ["CLAIMABLE", "CLAIMED"].includes(q.status))
    )
      return reply(422, { message: "Hadiah belum dapat diambil." });
    state.seen.push(d.requestId);
    settle();
    await pm.state.set("daily:state", state);
    return reply(200, s);
  })
  .listen(process.env.PORT || 4522);
