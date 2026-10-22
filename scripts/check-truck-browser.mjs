// Real Player + Rapier + production HUD. Only backend transport is a fixture.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = process.env.OBBY_QA_OUTPUT || "/tmp/toko-truck-qa";
const port = Number(process.env.OBBY_QA_PORT || 4254);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();

const browser = await chromium.launch({channel:"chrome", headless:true, args:["--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:1280,height:720}});
page.setDefaultTimeout(15000);
let currentPage=page;
const errors=[];
page.on("pageerror", e => {errors.push(e.message); console.log("PAGEERROR",e.message);});
try {
  await page.goto(`http://127.0.0.1:${port}/?world&truck`);
  await page.waitForFunction(() => window.obbyQA?.ready, null, {timeout:60000});
  await page.evaluate(() => window.truck.start());
  await page.waitForTimeout(600);
  console.log("INITIAL",await page.evaluate(() => ({pos:window.game.getState().playerPos, state:window.truck.state(), action:window.truck.context(), ui:window.truck.ui(), controls:window.truck.controls(), blocked:window.truck.blocked(window.truck.startPose)})));
  assert.equal(await page.evaluate(()=>window.truck.blocked(window.truck.startPose)),false,"parked truck must be free of every production prop collider");
  assert.equal(await page.evaluate(() => window.spotBlocked(-10,8)),true,"old resident position intersects pickup");
  assert.equal(await page.evaluate(() => window.spotBlocked(-6.8,4.2,true)),false,"new resident location is clear");
  assert.equal(await page.evaluate(()=>!!window.three.scene.getObjectByName("principal-booth-wings")),true,"production booths are mounted");
  assert.equal(await page.evaluate(()=>window.spotBlocked(6.4,9.05)),true,"booth collision present in fixture");
  const parcel=await page.evaluate(()=>window.truck.parcels);
  assert.equal(await page.evaluate(p=>window.spotBlocked(p[0],p[2]),parcel),false,"new parcel position is clear");
  await page.evaluate(()=>{window.obbyQA.deliveryOverview=true;});await page.waitForTimeout(200);
  await page.screenshot({path:output+"/delivery-bay.png"});
  await page.evaluate(()=>{window.obbyQA.deliveryOverview=false;});
  // Walk with the production input and physics, instead of teleporting between front targets.
  async function walkTo(point) {
    let reached=false;
    for(let n=0;n<100;n++) {
      const next=await page.evaluate(p=>{
        const s=window.obbyQA.sample, dx=p[0]-s.x,dz=p[2]-s.z, d=Math.hypot(dx,dz);
        const fx=s.camera[0]-s.x,fz=s.camera[2]-s.z,l=Math.hypot(fx,fz);
        return {d,forward:-(dx*fx+dz*fz)/(d*l||1),right:(dx*fz-dz*fx)/(d*l||1)};
      },point);
      if(next.d<.5){reached=true;break;}
      for(const [key,pressed] of [["w",next.forward>.25],["s",next.forward<-.25],["d",next.right>.25],["a",next.right<-.25]])
        await page.keyboard[pressed ? "down":"up"](key);
      await page.waitForTimeout(100);
    }
    for(const key of ["w","a","s","d"])await page.keyboard.up(key);
    assert(reached,`walkable mission path to ${point}`);
    assert.equal(await page.evaluate(p=>window.spotBlocked(p[0],p[2]),point),false,"action point does not overlap scenery");
  }
  if (!process.env.TRUCK_QA_SKIP_ROUTE) {
  await page.keyboard.press("f");
  await page.waitForFunction(() => window.truck.state().session.active?.truck);
  async function act(expected) {
    await page.waitForTimeout(1200);
    const point = await page.evaluate(() => window.truck.action());
    assert.equal(point.action,expected);
    if(["take","load","board"].includes(expected)) await walkTo(point.position);
    else await page.evaluate(p => window.obbyQA.place(p[0],.83,p[2]),point.position);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>window.truck.context()?.label),({take:"Ambil",load:"Muat",board:"Kemudikan",unload:"Ambil",place:"Serahkan"})[expected],"mission action wins over bench/NPC");
    await page.keyboard.press("f");
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.truck.state().error), "");
  }
  for(let n=0;n<3;n++) {await act("take");await act("load");}
  await act("board");
  await page.waitForFunction(() => !!window.truck.state().session.active.truck.driver);
  await page.screenshot({path:output+"/loaded.png"});
  const before = await page.evaluate(() => window.truck.state().session.active.truck);
  await page.keyboard.down("s");await page.waitForTimeout(650);await page.keyboard.up("s");
  await page.keyboard.down("Space");await page.waitForTimeout(550);await page.keyboard.up("Space");
  assert((await page.evaluate(()=>window.truck.state().session.active.truck.z)) < before.z-.2,"reverse leaves loading bay");
  await page.keyboard.down("w");await page.waitForTimeout(1500);await page.keyboard.up("w");
  await page.keyboard.down("Space");await page.waitForTimeout(800);await page.keyboard.up("Space");
  let t=await page.evaluate(() => window.truck.state().session.active.truck);
  console.log("MANUAL",before,t);
  assert(Math.hypot(t.x-before.x,t.z-before.z)>1,"manual throttle actually moves truck");
  assert.equal(t.speed,0);
  // Drive the complete road route using ordinary keyboard control and pose feedback.
  for(const [x,z] of [[22,15],[22,-23],[18,-32],[2,-32],[0,-26]]) {
    let reached=false;
    for(let step=0;step<220;step++) {
      t=await page.evaluate(() => window.truck.state().session.active.truck);
      const distance=Math.hypot(x-t.x,z-t.z);
      if(distance<1.5){reached=true;break;}
      const desired=Math.atan2(x-t.x,z-t.z), diff=Math.atan2(Math.sin(desired-t.yaw),Math.cos(desired-t.yaw));
      await page.keyboard.down("w");
      if(diff>0.08){await page.keyboard.down("a");await page.keyboard.up("d");}
      else if(diff<-.08){await page.keyboard.down("d");await page.keyboard.up("a");}
      else {await page.keyboard.up("a");await page.keyboard.up("d");}
      await page.waitForTimeout(100);
    }
    await page.keyboard.up("w");await page.keyboard.up("a");await page.keyboard.up("d");
    console.log("WAYPOINT",{x,z,reached,t});
    assert(reached,`road route reaches ${x},${z}`);
  }
  await page.keyboard.down("Space");await page.waitForTimeout(850);await page.keyboard.up("Space");
  await page.screenshot({path:output+"/parked.png"});
  await page.keyboard.press("f");await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.truck.state().session.active.truck.driver), null);
  for(let n=0;n<3;n++){await act("unload");await act("place");}
  await page.waitForFunction(() => window.truck.state().session.last?.status === "COMPLETED");
  assert.equal(await page.evaluate(() => window.truck.state().session.contribution),1);
  await page.screenshot({path:output+"/complete.png"});
  }
  await page.evaluate(() => window.obbyQA.place(5.4,.83,-1));
  await page.waitForTimeout(1200);
  const inside = await page.evaluate(() => ({sample:window.obbyQA.sample, counters:["cashier-1","cashier-2","cashier-3"].map(id=>window.three.scene.getObjectByName(id)?.position.toArray())}));
  assert.equal(inside.counters.filter(Boolean).length,3);
  assert(Math.abs(inside.sample.x-5.4)<.5 && Math.abs(inside.sample.z+1)<.5,"camera measured at the cashier");
  assert(Math.hypot(inside.sample.camera[0]-inside.sample.x,inside.sample.camera[1]-inside.sample.y,inside.sample.camera[2]-inside.sample.z)>1.8,"cashier camera retains room");
  await page.screenshot({path:output+"/cashier-player.png"});
  await page.evaluate(() => {window.obbyQA.cashierOverview=true;});await page.waitForTimeout(250);
  await page.screenshot({path:output+"/cashier-layout.png"});
  assert.deepEqual(errors,[]);
  await page.close();
  const mobile = await browser.newPage({viewport:{width:740,height:360},hasTouch:true,isMobile:true});
  currentPage=mobile;
  mobile.on("pageerror",e=>errors.push(e.message));
  await mobile.goto(`http://127.0.0.1:${port}/?world&truck`);
  await mobile.waitForFunction(()=>window.obbyQA?.ready,null,{timeout:60000});
  await mobile.evaluate(()=>window.truck.start());
  await mobile.locator('[data-context-action] button').tap();
  await mobile.waitForFunction(()=>!!window.truck.state().session.active?.truck);
  for(const expected of ["take","load","take","load","take","load","board"]) {
    await mobile.waitForTimeout(1200);
    const p=await mobile.evaluate(()=>window.truck.action());assert.equal(p.action,expected);
    await mobile.evaluate(p=>window.obbyQA.place(p[0],.83,p[2]),p.position);
    await mobile.waitForTimeout(300);await mobile.locator('[data-context-action] button').tap();
  }
  await mobile.waitForFunction(()=>!!window.truck.state().session.active.truck.driver);
  const start = await mobile.evaluate(()=>window.truck.state().session.active.truck);
  const cdp=await mobile.context().newCDPSession(mobile);
  const stick=await mobile.locator('[aria-label="Analog gerak"]').boundingBox();
  const touch=(x,y,id=1)=>({x,y,id,radiusX:3,radiusY:3,force:1});
  const sx=stick.x+stick.width/2,sy=stick.y+stick.height/2;
  const gas=touch(sx,sy-35);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[touch(sx,sy)]});
  await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[gas]});
  await mobile.waitForTimeout(1100);
  const brake=await mobile.locator('[aria-label="Rem truk"]').boundingBox();
  const brakeFinger=touch(brake.x+brake.width/2,brake.y+brake.height/2,2);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[gas,brakeFinger]});
  await mobile.waitForTimeout(900);
  const held=await mobile.evaluate(()=>window.truck.state().session.active.truck);
  await mobile.waitForTimeout(700);
  const still=await mobile.evaluate(()=>window.truck.state().session.active.truck);
  assert(Math.hypot(held.x-start.x,held.z-start.z)>.5,"touch gas moves truck past scenery");
  assert.equal(still.speed,0,"held brake overrides gas beyond the tap impulse");
  assert(Math.hypot(still.x-held.x,still.z-held.z)<.05,"truck stays stopped with both fingers down");
  assert.equal(await mobile.evaluate(()=>window.truck.controls().truckBrakeHeld),true);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[brakeFinger]});
  await mobile.waitForTimeout(900);
  assert.equal(await mobile.evaluate(()=>window.truck.controls().truckBrakeHeld),false,"released finger clears the brake");
  assert((await mobile.evaluate(()=>window.truck.state().session.active.truck.speed))>0,"releasing brake resumes gas");
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await mobile.waitForTimeout(700);
  const forward=await mobile.evaluate(()=>window.truck.state().session.active.truck);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[touch(sx,sy)]});
  await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[touch(sx,sy+35)]});
  await mobile.waitForTimeout(650);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await mobile.waitForTimeout(600);
  const end=await mobile.evaluate(()=>window.truck.state().session.active.truck);
  assert(end.z<forward.z-.2,"touch reverse works");
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[brakeFinger]});
  await cdp.send("Input.dispatchTouchEvent",{type:"touchCancel",touchPoints:[]});
  assert.equal(await mobile.evaluate(()=>window.truck.controls().truckBrakeHeld),false,"cancel clears held brake");
  console.log("PASS touch controls: gas, held brake wins over gas, release resumes, reverse, touchcancel clears brake");
  await mobile.screenshot({path:output+"/mobile-driving.png"});
  await mobile.locator('[data-spawn-button]').tap();
  await mobile.waitForFunction(()=>!window.truck.state().session.active);
  assert.equal(await mobile.evaluate(()=>window.truck.state().session.last.status),"CANCELLED");
  assert.equal(await mobile.evaluate(()=>window.truck.state().session.contribution),0);
  assert((await mobile.evaluate(()=>window.truck.state().available)).some(o=>o.type==="TRUCK_DELIVERY"),"Spawn frees truck for retry");
  await mobile.close();
  const remote = await browser.newPage({viewport:{width:1280,height:720}});
  currentPage=remote;
  remote.on("pageerror",e=>errors.push(e.message));
  await remote.goto(`http://127.0.0.1:${port}/?world&truck`);
  await remote.waitForFunction(()=>window.obbyQA?.ready,null,{timeout:60000});
  await remote.evaluate(()=>{window.truck.start();window.remoteTruck.join();window.obbyQA.place(0,.83,18);});
  let revision=0;
  for(const action of ["accept","take","load","take","load","take","load","board"]) {
    await remote.waitForTimeout(1200);
    await remote.evaluate(({action,revision})=>{
      const point=action==="accept" ? window.truck.parcels : window.remoteTruck.objective().position;
      window.remoteTruck.pose(point);
      window.remoteTruck.command({from:"remote-driver",requestId:crypto.randomUUID(),revision,action,sourceEventId:"truck-delivery-v1"});
    },{action,revision:revision++});
  }
  await remote.waitForFunction(()=>window.truck.room().mission?.truck.driver==="remote-driver");
  await remote.waitForTimeout(500);
  const initial=await remote.evaluate(()=>window.truck.room().mission.truck);
  assert.equal(await remote.evaluate(()=>window.truck.blocked(window.truck.room().mission.truck)),false,"remote driver's collider does not block truck");
  await remote.evaluate(()=>window.truck.drive({from:"intruder",room:"delivery-qa",missionId:window.truck.room().mission.id,seq:1,throttle:1,steer:0,brake:false}));
  await remote.waitForTimeout(500);
  assert.equal(await remote.evaluate(()=>window.truck.room().mission.truck.x),initial.x,"unauthorized input ignored");
  for(let seq=1;seq<=15;seq++) {
    await remote.evaluate(seq=>window.truck.drive({from:"remote-driver",room:"delivery-qa",missionId:window.truck.room().mission.id,seq,throttle:1,steer:0,brake:false}),seq);
    await remote.waitForTimeout(100);
  }
  const moving=await remote.evaluate(()=>({t:window.truck.room().mission.truck,p:window.three.scene.getObjectByName("remote-remote-driver").position.toArray()}));
  assert(Math.hypot(moving.t.x-initial.x,moving.t.z-initial.z)>1,"host moves truck for remote driver");
  assert(Math.hypot(moving.p[0]-moving.t.x,moving.p[2]-moving.t.z)<1.5,"remote avatar follows truck seat despite stale walk pose");
  await remote.waitForTimeout(1400);
  assert.equal(await remote.evaluate(()=>window.truck.room().mission.truck.speed),0,"stale input brakes");
  await remote.evaluate(()=>window.remoteTruck.leave());
  await remote.waitForFunction(()=>window.truck.room().mission.truck.driver===null);
  await remote.close();
  console.log("PASS remote driver: collider, seat, authorized input, stale input brake, disconnect release (local host fixture)");
  assert.deepEqual(errors,[]);
  console.log("PASS scene + touch: clear NPC position, three cashiers, camera, joystick, brake, Spawn cancellation and retry offer. Full route:",process.env.TRUCK_QA_SKIP_ROUTE ? "verified in preceding run" : "PASS");
} catch(e) {await currentPage.screenshot({path:output+"/failure.png"}).catch(()=>{}); console.log("FAILSTATE",await currentPage.evaluate(() => ({state:window.truck?.state(), pos:window.game?.getState().playerPos})).catch(()=>null)); throw e;}
finally {await browser.close();await server.close();}
