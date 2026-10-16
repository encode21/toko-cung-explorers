// Local QA stand-in for docs/WORLD_MOBILITY.md in the Laravel repository.
// Explicit QA registration models an authenticated connection; real permission tests run in PHPUnit.
const http = require('http');
const { randomUUID } = require('crypto');
http.createServer(async (req, res) => {
  const d = req.body || {};
  const state = await pm.state.get('mobility:state') || { members: {}, pairs: [] };
  const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (req.url === '/qa/register') {
    state.members[d.connectionId] = { canFly: !!d.canFly, flying: false, position: [30, 1, -17], until: Date.now() + 8000, available: true };
  } else if (req.url === '/api/world/mobility') {
    const own = state.members[d.connectionId];
    if (!own) return reply(403, { message: 'Koneksi tidak sah.' });
    own.position = d.position; own.available = d.available !== false; own.until = Date.now() + 8000;
    state.pairs = state.pairs.filter(p => p.until > Date.now() && [p.carrier,p.passenger].every(id => state.members[id]?.until > Date.now() && state.members[id].available));
    const pair = state.pairs.find(p => p.id === d.id);
    const busy = id => state.pairs.some(p => p.carrier === id || p.passenger === id);
    const near = target => Math.hypot(...own.position.map((v,i) => v - target.position[i])) <= 3;
    if (d.action === 'request') {
      const target = state.members[d.target];
      if (!target || !target.available || target.until <= Date.now()) return reply(409, { message: 'Pemain belum siap.' });
      if (busy(d.connectionId) || busy(d.target) || own.flying || target.flying) return reply(409, { message: 'Pemain sedang gendong atau terbang.' });
      if (!near(target)) return reply(422, { message: 'Dekati pemain untuk menggendong.' });
      state.pairs.push({ id: randomUUID(), carrier: d.connectionId, passenger: d.target, status: 'pending', until: Date.now() + 20000 });
    }
    if (d.action === 'accept' || d.action === 'decline') {
      if (!pair) return reply(404, { message: 'Undangan sudah berakhir.' });
      if (pair.passenger !== d.connectionId) return reply(403, { message: 'Bukan penerima.' });
      if (d.action === 'accept') { if (!near(state.members[pair.carrier])) return reply(422, { message: 'Dekati pemain.' }); pair.status = 'active'; }
      else state.pairs = state.pairs.filter(p => p !== pair);
    }
    if (d.action === 'release' && pair) {
      if (![pair.carrier,pair.passenger].includes(d.connectionId)) return reply(403, { message: 'Bukan peserta.' });
      state.pairs = state.pairs.filter(p => p !== pair);
    }
    if (!own.canFly || !own.available) own.flying = false;
    if (d.action === 'flight') {
      if (d.enabled && !own.canFly) return reply(403, { message: 'Terbang hanya untuk pengelola World Editor.' });
      if (d.enabled && busy(d.connectionId)) return reply(409, { message: 'Selesaikan gendong.' });
      own.flying = !!d.enabled;
    }
    for (const p of state.pairs) if (p.status === 'active') p.until = Math.min(state.members[p.carrier].until, state.members[p.passenger].until);
    await pm.state.set('mobility:state', state);
    return reply(200, { canFly: own.canFly, flying: own.flying, carries: state.pairs.filter(p => p.status === 'active' || [p.carrier,p.passenger].includes(d.connectionId)).map(({until,...p}) => p) });
  } else return reply(501, { message: 'Endpoint outside this QA contract.' });
  await pm.state.set('mobility:state', state); reply(200, { ok: true });
}).listen(process.env.PORT || 4512);
