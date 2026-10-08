// Temporary local QA transport: shared localStorage persistence + BroadcastChannel.
const uid=new URLSearchParams(location.search).get('user')||'qa-a';
const read=()=>JSON.parse(localStorage.getItem('qa-db')||'{}');
if(!read()[uid]){const db=read();db[uid]={id:uid,display_name:uid,username:null,role:'pengunjung',bio:'',avatar:{},equipped_character:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};localStorage.setItem('qa-db',JSON.stringify(db));}
class Query {
 table:string; filters:Record<string,unknown>={}; patch:any; constructor(t:string){this.table=t;}
 select(){return this;} eq(k:string,v:unknown){this.filters[k]=v;return this;} update(p:any){this.patch=p;return this;}
 upsert(){return this;} maybeSingle(){return this.run();} single(){return this.run();} then(a:any,b:any){return this.run().then(a,b);}
 async run(){await new Promise(r=>setTimeout(r,25));if(this.table==='character_ownership')return {data:[],error:null};const db=read();const row=db[this.filters.id as string];if(!row)return {data:null,error:null};
 if(this.patch){if((window as any).qaFail)return {data:null,error:{message:'QA network failure'}};if(row.updated_at!==this.filters.updated_at)return {data:null,error:{code:'PGRST116'}};if(this.patch.role==='admin')return {data:null,error:{message:'Staff role denied'}};Object.assign(row,this.patch,{updated_at:new Date().toISOString()});localStorage.setItem('qa-db',JSON.stringify(db));}return {data:row,error:null};}
}
class Channel{
 handlers:any[]=[];presence:any={};bc:BroadcastChannel;key:string;status:any;online=true;
 constructor(name:string,config:any){this.key=config.config.presence.key;this.bc=new BroadcastChannel(name);this.bc.onmessage=({data:m})=>{if(!this.online)return;if(m.kind==='ask'){this.bc.postMessage({kind:'presence',key:this.key,meta:this.presence[this.key]?.[0]});}if(m.kind==='presence'&&m.meta){this.presence[m.key]=[m.meta];this.emit('presence','sync',{});}if(m.kind==='leave'){delete this.presence[m.key];this.emit('presence','sync',{});}if(m.kind==='broadcast')this.emit('broadcast',m.event,{payload:m.payload});};}
 emit(t:string,e:string,p:any){this.handlers.filter(h=>h.t===t&&h.e===e).forEach(h=>h.cb(p));} on(t:string,f:any,cb:any){this.handlers.push({t,e:f.event,cb});return this;}
 subscribe(cb:any){this.status=cb;setTimeout(()=>{cb('SUBSCRIBED');this.bc.postMessage({kind:'ask'});},30);(window as any).qaChannel=this;return this;}
 async track(meta:any){this.presence[this.key]=[meta];this.bc.postMessage({kind:'presence',key:this.key,meta});this.emit('presence','sync',{});}
 presenceState(){return this.presence;}async send(m:any){if(this.online)this.bc.postMessage({kind:'broadcast',...m});}
 disconnect(){this.online=false;this.bc.postMessage({kind:'leave',key:this.key});this.status('CHANNEL_ERROR');}
 reconnect(){this.online=true;this.presence={};this.status('SUBSCRIBED');this.bc.postMessage({kind:'ask'});}
 close(){this.bc.postMessage({kind:'leave',key:this.key});this.bc.close();}
}
export const supabase:any={auth:{getUser:async()=>({data:{user:{id:uid}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:(t:string)=>new Query(t),channel:(n:string,c:any)=>new Channel(n,c),removeChannel:(c:Channel)=>c.close()};
