/** Exercise the actual command store with delayed transport; no live accounts. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const waits=[];
const completions=[];
let dungeonRoom=false;
let dungeonInstance=null;
let requestSequence=0;
globalThis.__questQa={
 profile:{getState:()=>({profile:null})},
 game:{getState:()=>({playerPos:[0,.83,0],setToast:()=>{}})},
 dungeon:{getState:()=>({data:dungeonInstance?{instance:dungeonInstance}:null})},
 isDungeonRoom:()=>dungeonRoom,
 createId:()=>`quest-qa-${++requestSequence}`,
 completion:{getState:()=>({show:(result)=>completions.push(result)})},
 transport:({data})=>new Promise((resolve,reject)=>waits.push({data,resolve,reject})),
};
let source=await readFile(new URL('../src/game/core/store.ts',import.meta.url),'utf8');
source=source.replace(/import \{ useProfile \}[^;]+;/,'const useProfile = globalThis.__questQa.profile;')
 .replace(/import \{ useGame \}[^;]+;/,'const useGame = globalThis.__questQa.game;')
 .replace(/import \{ isDungeonRoom, useDungeon \}[^;]+;/,'const { isDungeonRoom, dungeon: useDungeon } = globalThis.__questQa;')
 .replace(/import \{ createId \}[^;]+;/,'const createId = globalThis.__questQa.createId;')
 .replace(/import \{ useQuestCompletion \}[^;]+;/,'const useQuestCompletion = globalThis.__questQa.completion;')
 .replace(/import \{ gameCommand \}[^;]+;/,'const gameCommand = globalThis.__questQa.transport;');
const zustand=import.meta.resolve('zustand');
source=source.replace('from "zustand"',`from "${zustand}"`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {command,useGameCore,clearGameCore}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const snapshot={profile:{player_id:'test',level:1,title:'Visitor'},quests:[{id:'intro'}],active:null,history:[]};
useGameCore.setState({snapshot});
const pose=command('pose');assert.equal(useGameCore.getState().busy,false);assert.equal(useGameCore.getState().syncing,true);
const accept=command('accept',{questId:'intro'});assert.equal(useGameCore.getState().busy,true);assert.equal(waits.length,1);
assert.equal((await command('accept',{questId:'intro'})).ok,false);
assert.equal((await command('pose')).ok,false);
waits.shift().resolve(snapshot);await pose;assert.equal(waits.length,1);assert.equal(waits[0].data.action,'accept');
const accepted={...snapshot,active:{id:'run',quest_id:'intro',revision:2}};
waits.shift().resolve(accepted);assert.equal((await accept).ok,true);assert.equal(useGameCore.getState().busy,false);
const heartbeat=command('pose');const objective=command('objective',{objective:0});
waits.shift().resolve({...accepted,active:{...accepted.active,revision:3}});await heartbeat;
assert.equal(waits[0].data.revision,3);assert.equal(waits[0].data.runId,'run');
waits.shift().reject(new Error('Network unavailable'));assert.equal((await objective).ok,false);assert.equal(useGameCore.getState().busy,false);assert.match(useGameCore.getState().error,/Network/);
const old=command('pose');const abandoned=command('accept',{questId:'other'});clearGameCore();assert.equal((await abandoned).ok,false);
waits.shift().resolve(accepted);await old;assert.equal(useGameCore.getState().snapshot,null);assert.equal(waits.length,0);

// Only a completed history row for the active run can display a reward.
const rewardQuest={id:'intro',title:'Misi harian QA',theme:'warehouse'};
const rewardRun={id:'run',quest_id:'intro',status:'COMPLETED',duration_seconds:19,xp_awarded:17,point_awarded:0,reward_metadata:{clueXp:6}};
const beforeComplete={...accepted,quests:[rewardQuest]};
for (const history of [
 [{...rewardRun,id:'another-run'}],
 [{...rewardRun,status:'CANCELLED'}],
]) {
 useGameCore.setState({snapshot:beforeComplete});
 const complete=command('complete');
 waits.shift().resolve({...beforeComplete,active:null,history});
 assert.equal((await complete).ok,true);
 assert.equal(completions.length,0,'unrelated or unfinished history cannot award a completion');
}
useGameCore.setState({snapshot:beforeComplete});
const complete=command('complete');
assert.equal(waits[0].data.runId,'run');
assert.equal(waits[0].data.revision,2);
assert.match(waits[0].data.requestId,/^quest-qa-\d+$/);
waits.shift().resolve({...beforeComplete,active:null,history:[rewardRun]});
assert.equal((await complete).ok,true);
assert.deepEqual(completions,[{
 title:'Misi harian QA',durationSeconds:19,xpAwarded:17,clueXp:6,pointAwarded:0,theme:'warehouse',
}],'completion uses actual server awards, including zero Point');

// Both room identity and an active dungeon instance block world mutations; read remains available.
for (const kind of ['room','instance']) {
 dungeonRoom=kind==='room';
 dungeonInstance=kind==='instance'?{id:'dungeon-run'}:null;
 for (const action of ['pose','accept','objective','complete','cancel']) {
  const blocked=await command(action,{questId:'intro',objective:0});
  assert.equal(blocked.ok,false,`${kind}: ${action} must use the dungeon command`);
  assert.match(blocked.error,/dungeon/);
  assert.equal(waits.length,0,'blocked world commands never reach transport');
  assert.equal(useGameCore.getState().busy,false);
 }
 const read=command('read');
 assert.equal(waits.length,1);
 assert.equal(waits[0].data.action,'read');
 waits.shift().resolve(snapshot);
 assert.equal((await read).ok,true);
 assert.equal(useGameCore.getState().syncing,false);
}
console.log('PASS real quest store: queue/revision, failure recovery, session reset, authoritative completion rewards, dungeon guards');
