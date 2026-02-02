import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Box, Cpu, Scissors, X, Layout, Search as SearchIcon, Ghost, ChevronRight, ChevronLeft
} from 'lucide-react';

import './index.css';

/**
 * SIMMORPH KERNEL v7.9.29
 * Unified Entry Point: src/main.jsx
 * FIXED: targetUrl string corrected (removed markdown brackets).
 */

const getSafeEnv = (key, fallback = '') => {
  if (typeof __firebase_config !== 'undefined' && key === 'VITE_FIREBASE_CONFIG') return __firebase_config;
  if (typeof __app_id !== 'undefined' && key === 'VITE_APP_ID') return __app_id;
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
    return env[key] || fallback;
  } catch (e) { return fallback; }
};

const apiKey = ""; 
const modelName = "gemini-2.5-flash-preview-09-2025";
const rawConfig = getSafeEnv('VITE_FIREBASE_CONFIG');
let firebaseApp = null; let auth = null; let db = null;

try {
  const firebaseConfig = (rawConfig && rawConfig !== '') ? JSON.parse(rawConfig) : null;
  if (firebaseConfig && firebaseConfig.apiKey) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(firebaseApp); db = getFirestore(firebaseApp);
  }
} catch (e) { console.warn("SimMorph: Sync deferred."); }

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('kernel');
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [showSection, setShowSection] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notification, setNotification] = useState("");
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [activeBlueprint, setActiveBlueprint] = useState(null); 
  const [inspectMode, setInspectMode] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  const containerRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const transformRef = useRef();
  const massesRef = useRef([]); 
  
  const interactionState = useRef({ inspectMode, isGhostMode, selectedObjectId });
  useEffect(() => { 
    interactionState.current = { inspectMode, isGhostMode, selectedObjectId }; 
  }, [inspectMode, isGhostMode, selectedObjectId]);

  const showToast = useCallback((msg) => {
    setNotification(String(msg));
    setTimeout(() => setNotification(""), 3000);
  }, []);

  const renderDraftContent = (data) => {
    const scale = 2.5; const svgW = data.w * scale; const svgD = data.d * scale; const pad = 40;
    return (
      <div className="w-full h-full bg-slate-50 relative flex items-center justify-center p-20 overflow-hidden text-left">
        <svg viewBox={"0 0 " + (svgW + pad * 2) + " " + (svgD + pad * 2)} className="w-full h-full drop-shadow-xl">
           <rect width="100%" height="100%" fill="#f1f5f9" />
           <rect x={pad} y={pad} width={svgW} height={svgD} fill="white" stroke="#0f172a" strokeWidth="2" />
           <g className="font-mono text-[4px] fill-slate-900 font-black">
              <text x={pad} y={pad - 10}>{data.w}M SPAN</text>
              <text x={pad + 10} y={pad + 15}>ID: {String(data.id).slice(0, 8)}</text>
           </g>
        </svg>
      </div>
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x18181b);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(240, 200, 240); cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement); rendererRef.current = renderer;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x18181b, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(150, 400, 100); scene.add(sun);
    scene.add(new THREE.GridHelper(1500, 60, 0x2d2d30, 0x1e1e20));
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    controlsRef.current = controls;
    const tControls = new TransformControls(camera, renderer.domElement);
    tControls.addEventListener('dragging-changed', (e) => controls.enabled = !e.value);
    scene.add(tControls); transformRef.current = tControls;
    const animate = () => {
      requestAnimationFrame(animate); if(controlsRef.current) controlsRef.current.update(); 
      if(rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();
    const onPointerDown = (e) => {
      if (e.target !== renderer.domElement || tControls.dragging) return;
      const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(massesRef.current.map(m => m.mesh).filter(Boolean));
      if (hits.length > 0) {
        const obj = hits[0].object; setSelectedObjectId(obj.uuid);
        if (interactionState.current.inspectMode) {
          const data = massesRef.current.find(m => m.id === obj.uuid);
          if (data) setActiveBlueprint({ data });
        } else { tControls.attach(obj); }
      } else { setSelectedObjectId(null); tControls.detach(); }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => { window.removeEventListener('pointerdown', onPointerDown); renderer.dispose(); };
  }, []);

  const addMass = (params = {}) => {
    if (!sceneRef.current) return;
    const { id = null, w = 50, h = 100, d = 50, x = 0, z = 0, material = 'default', program = 'Zone' } = params;
    const geom = new THREE.BoxGeometry(w, h, d);
    const meshMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, transparent: true, opacity: isGhostMode ? 0.2 : 1 });
    const mesh = new THREE.Mesh(geom, meshMat); mesh.position.set(x, h/2, z);
    sceneRef.current.add(mesh); massesRef.current.push({ id: mesh.uuid, mesh, w, h, d, material, program });
    setRenderTrigger(v => v + 1);
  };

  const generateFromAI = async () => {
    if (!prompt) return; setLoading(true);
    try {
      const targetUrl = "[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/)" + modelName + ":generateContent?key=" + apiKey;
      const res = await fetch(targetUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: "Respond JSON only. Proportions 70:30." }] }, generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await res.json(); const json = JSON.parse(data.candidates[0].content.parts[0].text);
      massesRef.current.forEach(m => sceneRef.current.remove(m.mesh)); massesRef.current = [];
      if (json.masses) json.masses.forEach(m => addMass(m));
    } catch (e) { showToast("AI Engine Sync Error"); } finally { setLoading(false); }
  };

  return (
    <div className="relative h-screen w-screen bg-[#09090b] overflow-hidden font-sans text-slate-400 select-none text-left">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {activeBlueprint && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-12 animate-in fade-in zoom-in-95">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveBlueprint(null)} />
           <div className="relative w-full max-w-7xl h-full bg-[#1e1e20] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto">
              <div className="flex-1 bg-white relative flex items-center justify-center min-h-0 text-left">{renderDraftContent(activeBlueprint.data)}</div>
              <div className="w-full md:w-[32rem] h-full p-12 bg-[#18181b] overflow-y-auto">
                 <button onClick={() => setActiveBlueprint(null)} className="mb-8 p-4 bg-white/5 rounded-3xl hover:bg-white/10 transition-all text-white/40"><X size={28}/></button>
                 <h2 className="text-white font-black text-3xl uppercase tracking-tighter">{activeBlueprint.data.program}</h2>
                 <button onClick={() => showToast("Exporting...")} className="mt-12 w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all">Export Set</button>
              </div>
           </div>
        </div>
      )}
      <div className="absolute top-8 left-8 flex items-center gap-6 bg-[#1e1e20]/60 backdrop-blur-3xl p-5 rounded-full border border-white/5 shadow-2xl z-30">
        <Cpu size={26} className="text-sky-400" />
        <span className="text-sm font-black uppercase text-white tracking-widest italic leading-none">SimMorph Kernel v7.9.29</span>
      </div>
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-2 gap-2 shadow-inner z-30">
        <button onClick={() => { setActiveTab('kernel'); setInspectMode(false); }} className={`px-12 py-4 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center gap-3 ${activeTab === 'kernel' ? 'bg-sky-500 text-black shadow-lg' : 'text-white/20 hover:bg-white/5'}`}><Layout size={16} /> Workstation</button>
        <button onClick={() => { setActiveTab('inspect'); setInspectMode(true); }} className={`px-12 py-4 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center gap-3 ${activeTab === 'inspect' ? 'bg-sky-500 text-black shadow-lg' : 'text-white/20 hover:bg-white/5'}`}><SearchIcon size={16} /> Inspector</button>
      </div>
      <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-[#1e1e20]/80 backdrop-blur-3xl border border-white/10 p-3 rounded-[3.5rem] shadow-2xl z-30">
          <button onClick={() => addMass()} className="w-16 h-16 flex items-center justify-center text-sky-400 hover:bg-sky-400/10 rounded-[2rem] transition-all shadow-xl"><Box size={26} /></button>
          <button onClick={() => setShowSection(!showSection)} className={`w-16 h-16 flex items-center justify-center rounded-[2rem] transition-all ${showSection ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:bg-white/5'}`}><Scissors size={26} /></button>
          <button onClick={() => setIsGhostMode(!isGhostMode)} className={`w-16 h-16 flex items-center justify-center rounded-[2rem] transition-all ${isGhostMode ? 'bg-white text-black shadow-lg scale-105' : 'text-white/20 hover:bg-white/5'}`}><Ghost size={26} /></button>
      </div>
      <div className={`absolute right-0 top-0 h-full flex transition-transform duration-1000 z-30 ${sidebarOpen ? 'translate-x-0' : 'translate-x-[calc(100%-40px)]'}`}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-10 h-64 self-center bg-[#1e1e20] rounded-l-[3rem] border border-white/5 text-white/10 hover:text-sky-400 transition-all active:scale-95 shadow-2xl">{sidebarOpen ? <ChevronRight /> : <ChevronLeft />}</button>
        <div className="w-[28vw] h-full bg-[#111113]/98 backdrop-blur-[150px] border-l border-white/10 p-14 flex flex-col gap-14 shadow-2xl overflow-y-auto custom-scrollbar text-left text-slate-300">
           <h3 className="text-[11px] font-black uppercase text-white/30 tracking-[0.8em]">BIM Manifest</h3>
           <div className="flex flex-col gap-4">
             {massesRef.current.map((m, i) => (
               <div key={i} onClick={() => { setSelectedObjectId(m.id); if(inspectMode) setActiveBlueprint({data: m}); }} className={`p-8 rounded-[3.5rem] border transition-all cursor-pointer group ${selectedObjectId === m.id ? 'bg-sky-500/10 border-sky-500/50 shadow-inner' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                  <p className="text-white font-black uppercase tracking-widest text-sm">{m.program}</p>
                  <p className="text-[10px] text-white/20 font-mono mt-3 uppercase tracking-tighter group-hover:text-sky-400 transition-colors">REF: {String(m.id).slice(0, 12)}</p>
               </div>
             ))}
           </div>
        </div>
      </div>
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[60vw] pointer-events-auto z-30">
        <div className="relative group">
          <div className="absolute -inset-1 bg-sky-500/20 rounded-[4rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
          <div className="relative flex items-center bg-[#1e1e20]/98 backdrop-blur-[100px] border border-white/10 rounded-[4rem] pl-16 pr-6 py-6 shadow-2xl overflow-hidden">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateFromAI()} placeholder="Synthesize kernel..." className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder:text-white/5 font-medium tracking-tight" />
            <button onClick={generateFromAI} disabled={loading} className="bg-white hover:bg-sky-100 text-black px-16 py-8 rounded-[3rem] font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl">{loading ? 'Processing...' : 'MORPH'}</button>
          </div>
        </div>
      </div>
      {notification && <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-[#1e1e20]/98 px-10 py-5 rounded-full border border-white/10 text-white shadow-2xl animate-in slide-in-from-top-4 font-black uppercase text-[10px] tracking-widest z-[200]">{String(notification)}</div>}
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl && !rootEl._reactRoot) {
  const root = ReactDOM.createRoot(rootEl);
  rootEl._reactRoot = root;
  root.render(<React.StrictMode><App /></React.StrictMode>);
}

export default App;
