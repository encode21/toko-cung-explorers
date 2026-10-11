/** Exercise the actual command store with delayed transport; no live accounts. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const waits=[];
globalThis.__questQa={
 profile:{getState:()=>({profile:null})},
 game:{getState:()=>({playerPos:[0,.83,0],setToast:()=>{}})},
 transport:({data})=>new Promise((resolve,reject)=>waits.push({data,resolve,reject})),
};
let source=await readFile(new URL('../src/game/core/store.ts',import.meta.url),'utf8');
source=source.replace(/import \{ useProfile \}[^;]+;/,'const useProfile = globalThis.__questQa.profile;')
 .replace(/import \{ useGame \}[^;]+;/,'const useGame = globalThis.__questQa.game;')
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
console.log('PASS real quest store: background never locks buttons, queued click executes once, current revision, failure recovery, logout discards old work');
