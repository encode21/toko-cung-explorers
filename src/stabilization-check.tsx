import {createRoot} from 'react-dom/client';
import {KioskOverlay} from './ui/kiosk/KioskOverlay';
function KioskMount(){const open=useGame(s=>s.overlay==='kiosk');return open?<KioskOverlay/>:null}
import {GameCanvas} from './game/engine/GameCanvas';
import {useEffect} from 'react';
import {Hud} from './ui/hud/Hud';
import {MobileControls} from './ui/hud/MobileControls';
import {WorldChat} from './ui/chat/WorldChat';
import {useWorldViewport} from './hooks/use-world-viewport';
import {useProfile} from './identity/profile-store';
import {useNet} from './net/net-store';
import {useGame} from './state/game-store';
import {useHud} from './state/hud-store';
import {playerId} from './net/useWorldChannel';
import {trafficDistances,handleTrafficSnap} from './game/traffic/traffic-sync';
import {trafficActors,trafficVehicles} from './game/traffic/traffic-runtime';
import {_roots,advance} from '@react-three/fiber';
import './styles.css';
Object.assign(window,{qa:{useProfile,useNet,useGame,useHud,playerId,trafficDistances,handleTrafficSnap,trafficActors,trafficVehicles,roots:_roots,advance}});
function App(){const ref=useWorldViewport();useEffect(()=>{void useProfile.getState().load()},[]);return <main ref={ref} className="world-viewport overflow-hidden"><GameCanvas/><Hud/><KioskMount/><WorldChat/><MobileControls/></main>}
createRoot(document.getElementById('root')!).render(<App/>);
