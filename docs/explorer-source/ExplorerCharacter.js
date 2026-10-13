import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Original procedural explorer. +Y up, +Z forward, feet at Y=0; ~2.5 units tall. */
export function createExplorer({ palette = {}, scale = 1 } = {}) {
  if (!(scale > 0) || !Number.isFinite(scale)) throw new RangeError('scale must be positive');
  const colors = { skin: '#c88a5f', hair: '#302720', jacket: '#b92025', trim: '#c0a062',
    shirt: '#f8ead3', pants: '#384947', boots: '#42352d', pack: '#687b61', eyes: '#201f22', ...palette };
  const materials = Object.fromEntries(Object.entries(colors).map(([k,color]) => [k,new THREE.MeshStandardMaterial({color, roughness: k==='eyes' ? .3 : .78})]));
  const root = new THREE.Group(); root.name='Explorer'; root.scale.setScalar(scale);
  const rig = new THREE.Group(); rig.name='Body'; root.add(rig);
  const geometries = new Set(); let id=0;
  function mesh(parent,g,mat,pos=[0,0,0],size=[1,1,1],name) {
    geometries.add(g); const m=new THREE.Mesh(g,materials[mat]); m.position.set(...pos); m.scale.set(...size);
    m.castShadow=true; m.receiveShadow=true; m.name=name || `Detail${id++}`; parent.add(m); return m;
  }
  const sphere = new THREE.SphereGeometry(1,24,16);
  const smallSphere = new THREE.SphereGeometry(1,16,10);
  const roundBox = new RoundedBoxGeometry(1,1,1,3,.17);
  const ell=(p,mat,pos,s,name)=>mesh(p,sphere,mat,pos,s,name);
  const box=(p,mat,pos,s,name)=>mesh(p,roundBox,mat,pos,s,name);
  function pivot(parent,name,pos) { const p=new THREE.Group(); p.name=name; p.position.set(...pos); parent.add(p); return p; }
  function tube(p,mat,points,r=.016) { return mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),20,r,6,false),mat); }
  // Torso is a softened tailored jacket; the small chest compass is actual geometry.
  ell(rig,'pants',[0,.97,0],[.32,.24,.23]);
  box(rig,'jacket',[0,1.3,0],[.69,.68,.43],'Jacket');
  box(rig,'shirt',[0,1.45,.219],[.17,.38,.035]);
  box(rig,'trim',[0,1.21,.235],[.022,.38,.025]);
  box(rig,'jacket',[-.22,1.27,.231],[.16,.15,.04]);
  box(rig,'trim',[-.22,1.34,.258],[.17,.025,.024]);
  mesh(rig,new THREE.CylinderGeometry(.068,.068,.027,24),'trim',[.215,1.47,.247]).rotation.x=Math.PI/2;
  mesh(rig,new THREE.ConeGeometry(.021,.075,3),'shirt',[.215,1.47,.27]).rotation.z=-.5;
  ell(rig,'skin',[0,1.68,0],[.115,.14,.12]);
  // Knotted cream neckerchief.
  mesh(rig,new THREE.TorusGeometry(.135,.046,8,24),'shirt',[0,1.66,0]).rotation.x=Math.PI/2;
  ell(rig,'trim',[0,1.62,.17],[.067,.067,.045]);
  const scarf=mesh(rig,new THREE.ConeGeometry(.074,.23,3),'shirt',[.045,1.50,.215]); scarf.rotation.z=.25;
  // Backpack, piping, flap and rolled blanket on the reverse.
  box(rig,'pack',[0,1.3,-.32],[.58,.66,.30],'Backpack');
  box(rig,'trim',[0,1.46,-.495],[.46,.24,.038]);
  box(rig,'pack',[0,1.17,-.495],[.30,.23,.038]);
  box(rig,'boots',[0,1.34,-.525],[.06,.22,.018]);
  box(rig,'trim',[0,1.29,-.54],[.095,.065,.025]);
  const roll=mesh(rig,new THREE.CapsuleGeometry(.09,.40,4,16),'shirt',[0,1.67,-.33]); roll.rotation.z=Math.PI/2;
  for(const s of [-1,1]) {
    tube(rig,'pack',[[s*.25,1.6,-.1],[s*.28,1.56,.23],[s*.28,1.29,.255],[s*.28,1.08,.20]],.045);
    box(rig,'trim',[s*.278,1.30,.297],[.075,.09,.028]);
  }
  const head=pivot(rig,'Head',[0,1.9,0]);
  ell(head,'skin',[0,.055,0],[.365,.40,.315],'Face');
  for(const s of [-1,1]) {
    ell(head,'skin',[s*.352,.04,0],[.078,.105,.067]);
    ell(head,'hair',[s*.31,.17,-.01],[.055,.15,.19]);
    ell(head,'eyes',[s*.126,.075,.294],[.035,.051,.022]);
    mesh(head,smallSphere,'shirt',[s*.126-.008,.091,.314],[.010,.012,.007]);
    tube(head,'hair',[[s*.07,.175,.292],[s*.12,.19,.30],[s*.18,.17,.282]],.022);
  }
  ell(head,'skin',[0,-.008,.312],[.067,.064,.065]);
  tube(head,'hair',[[-.077,-.11,.284],[0,-.135,.302],[.077,-.11,.284]],.013);
  // Asymmetric fringe visible under a soft adventure cap.
  ell(head,'hair',[-.115,.285,.215],[.21,.092,.13]).rotation.z=-.23;
  ell(head,'trim',[0,.32,-.018],[.375,.23,.325],'CapCrown');
  ell(head,'trim',[0,.232,.185],[.43,.045,.35],'CapBrim');
  box(head,'jacket',[0,.35,.295],[.13,.115,.028]);
  mesh(head,new THREE.ConeGeometry(.028,.063,3),'shirt',[0,.355,.322]);
  const joints={head};
  for(const [side,s] of [['Left',-1],['Right',1]]) {
    const arm=pivot(rig,`${side}Arm`,[s*.40,1.5,0]); arm.rotation.z=s*.10;
    mesh(arm,new THREE.CapsuleGeometry(.12,.19,5,16),'jacket',[0,-.12,0]);
    const elbow=pivot(arm,`${side}Elbow`,[0,-.30,0]);
    mesh(elbow,new THREE.CapsuleGeometry(.09,.20,4,16),'skin',[0,-.11,0]);
    ell(elbow,'skin',[0,-.29,.005],[.105,.12,.095]);
    ell(elbow,'skin',[-s*.08,-.26,.052],[.048,.063,.05]);
    mesh(arm,new THREE.CylinderGeometry(.123,.123,.047,20),'trim',[0,-.23,0]);
    const leg=pivot(rig,`${side}Leg`,[s*.175,.94,0]);
    mesh(leg,new THREE.CapsuleGeometry(.137,.23,5,16),'pants',[0,-.19,0]);
    const knee=pivot(leg,`${side}Knee`,[0,-.43,0]);
    mesh(knee,new THREE.CapsuleGeometry(.105,.16,4,16),'pants',[0,-.12,0]);
    box(knee,'boots',[0,-.375,.065],[.26,.23,.40]);
    box(knee,'hair',[0,-.452,.067],[.28,.065,.42]);
    box(knee,'trim',[0,-.28,.075],[.19,.04,.24]);
    for(let j=0;j<3;j++) box(knee,'shirt',[0,-.35+j*.036,.274-j*.002],[.14,.012,.019]);
    joints[`${side.toLowerCase()}Arm`]=arm; joints[`${side.toLowerCase()}Elbow`]=elbow;
    joints[`${side.toLowerCase()}Leg`]=leg; joints[`${side.toLowerCase()}Knee`]=knee;
  }
  function makeClip(name,duration,walk) {
    const times=Array.from({length:49},(_,i)=>i*duration/48), tracks=[];
    function quatTrack(obj,fn) { const values=[]; times.forEach(t=> { const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...fn(t/duration*Math.PI*2))); values.push(q.x,q.y,q.z,q.w); }); tracks.push(new THREE.QuaternionKeyframeTrack(`${obj.name}.quaternion`,times,values)); }
    quatTrack(rig,p=>[0,walk ? .035*Math.sin(p):.025*Math.sin(p),walk ? .022*Math.sin(p):0]);
    quatTrack(head,p=>[.025*Math.sin(p),.055*Math.sin(p),.018*Math.sin(p)]);
    for(const [side,s] of [['left',-1],['right',1]]) {
      quatTrack(joints[`${side}Arm`],p=>[walk?s*.55*Math.sin(p):.035*Math.sin(p),0,s*.10]);
      quatTrack(joints[`${side}Elbow`],p=>[-.12-(walk ? .16*(1+Math.sin(p*s)):.02*Math.sin(p)),0,0]);
      quatTrack(joints[`${side}Leg`],p=>[walk?-s*.48*Math.sin(p):0,0,0]);
      quatTrack(joints[`${side}Knee`],p=>[walk ? .56*Math.max(0,Math.sin(p)*s):0,0,0]);
    }
    tracks.push(new THREE.VectorKeyframeTrack('Body.position',times,times.flatMap(t=>[0,walk ? .025+.025*Math.cos(t/duration*Math.PI*4):.007*(1-Math.cos(t/duration*Math.PI*2)),0])));
    return new THREE.AnimationClip(name,duration,tracks);
  }
  const clips=[makeClip('Idle',3.2,false),makeClip('Walk',1,true)];
  const mixer=new THREE.AnimationMixer(root); const actions=Object.fromEntries(clips.map(c=>[c.name.toLowerCase(),mixer.clipAction(c)]));
  let current=actions.idle; current.play();
  return { root, joints, clips, mixer, materials,
    setAnimation(name,fade=.25) { const next=actions[name.toLowerCase()]; if(!next) throw new Error(`Unknown animation: ${name}`); if(next===current)return; next.reset().play(); next.crossFadeFrom(current,Math.max(0,fade),false); current=next; },
    update(delta) { if(Number.isFinite(delta)&&delta>=0)mixer.update(Math.min(delta,.1)); },
    setPalette(next) { for(const [key,color] of Object.entries(next)) if(materials[key])materials[key].color.set(color); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); geometries.forEach(g=>g.dispose()); Object.values(materials).forEach(m=>m.dispose()); root.removeFromParent(); }
  };
}
