import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float, Text, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Activity, Battery, Sun, Zap, AlertTriangle, ShieldCheck, 
  RotateCcw, Play, Info, Settings, LayoutDashboard, Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** UTILS **/
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

/** 3D COMPONENTS **/
const EnergyFlow = ({ from, to, active, color }: { from: [number, number, number], to: [number, number, number], active: boolean, color: string }) => {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to]);
  const lineRef = useRef<THREE.LineLoop>(null);

  useFrame((state) => {
    if (lineRef.current && active) {
      lineRef.current.material.dashOffset -= 0.01;
    }
  });

  if (!active) return null;

  return (
    <line ref={lineRef}>
      <bufferGeometry attach="geometry" setFromPoints={points} />
      <lineDashedMaterial 
        attach="material" 
        color={color} 
        dashSize={0.5} 
        gapSize={0.2} 
        transparent 
        opacity={0.6} 
      />
    </line>
  );
};

const SolarPanel = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 4, 0, 0]}>
      <boxGeometry args={[1.5, 2.5, 0.1]} />
      <meshStandardMaterial color="#1a202c" roughness={0.1} metalness={0.8} />
    </mesh>
    <mesh position={[0, -0.8, -0.5]}>
      <cylinderGeometry args={[0.05, 0.05, 1.5]} />
      <meshStandardMaterial color="#4a5568" />
    </mesh>
  </group>
);

const DigitalTwinScene = ({ state }: { state: any }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Solar Farm */}
      {Array.from({ length: 15 }).map((_, i) => (
        <SolarPanel key={i} position={[(i % 5) * 3 - 6, 0, Math.floor(i / 5) * 4 - 4]} />
      ))}

      {/* Battery Unit */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[8, 1, 0]}>
          <boxGeometry args={[3, 4, 3]} />
          <meshStandardMaterial color="#1e293b" />
          <Text position={[0, 2.5, 0]} fontSize={0.4} color="white">BESS STORAGE</Text>
          {/* SoC Visualization */}
          <mesh position={[0, -2 + state.soc * 4 / 2, 1.51]}>
            <planeGeometry args={[2, state.soc * 4]} />
            <meshBasicMaterial color={state.soc > 0.2 ? "#10b981" : "#f59e0b"} transparent opacity={0.8} />
          </mesh>
        </mesh>
      </Float>

      {/* Grid Connection */}
      <mesh position={[-8, 3, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 6]} />
        <meshStandardMaterial color="#475569" />
        <Text position={[0, 3.5, 0]} fontSize={0.4} color="white">UTILITY GRID</Text>
      </mesh>

      {/* Dynamic Flows */}
      <EnergyFlow from={[0, 0, 0]} to={[8, 1, 0]} active={state.solarActual > 0} color="#fbbf24" />
      <EnergyFlow from={[8, 1, 0]} to={[-8, 1, 0]} active={state.gridExport > 0} color="#3b82f6" />
      <EnergyFlow from={[-8, 1, 0]} to={[8, 1, 0]} active={state.gridImport > 0} color="#ef4444" />

      <ContactShadows opacity={0.4} scale={20} blur={2.4} far={4.5} />
      <OrbitControls makeDefault />
    </>
  );
};

/** MAIN APPLICATION COMPONENT **/
export default function SolarTwinAI() {
  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<any>({ id: 'NORMAL', severity: 0.5 });
  const [history, setHistory] = useState<any[]>([]);
  const [policyType, setPolicyType] = useState<'STANDARD' | 'TRUST_AWARE'>('TRUST_AWARE');
  const [isRunning, setIsRunning] = useState(false);

  // Simulation parameters
  const BATT_CAP = 200;
  const SOLAR_CAP = 100;
  const DEMAND_BASE = 40;

  const runSimulationStep = () => {
    const hour = step % 24;
    
    // 1. FORECAST AGENT
    const intensity = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
    const forecast = intensity * SOLAR_CAP;
    
    // 2. ENVIRONMENT SENSING (Actual Ground Truth)
    let actual = forecast;
    let currentDemand = DEMAND_BASE + (hour > 17 && hour < 21 ? 40 : 0); // Evening peak
    
    if (scenario.id === 'CLOUDY' && hour >= 10 && hour <= 14) actual *= (1 - 0.8 * scenario.severity);
    if (scenario.id === 'MISMATCH') actual *= 0.6;
    if (scenario.id === 'SPIKE' && hour >= 12 && hour <= 16) currentDemand += 60 * scenario.severity;

    // 3. TRUST MONITOR AGENT
    const deviation = Math.abs(forecast - actual);
    let trust: any = 'NORMAL';
    let reason = "Forecast within nominal bounds.";
    
    if (deviation > 15) {
      trust = 'CAUTION';
      reason = "Significant forecast deviation detected.";
    }
    if (scenario.id === 'MISMATCH' && deviation > 30) {
      trust = 'HIGH_RISK';
      reason = "Model domain mismatch detected. Forecast unreliable.";
    }

    // 4. DECISION AGENT (Policy Selection)
    const prevSoc = history.length > 0 ? history[history.length - 1].soc : 0.5;
    let decision = "";
    let gridImport = 0;
    let gridExport = 0;
    let nextSoc = prevSoc;

    const reserveLimit = (policyType === 'TRUST_AWARE' && trust !== 'NORMAL') ? 0.3 : 0.05;
    const netPower = actual - currentDemand;

    if (netPower > 0) { // Surplus
      const chargeAbility = Math.min(netPower, (1 - prevSoc) * BATT_CAP);
      nextSoc += chargeAbility / BATT_CAP;
      gridExport = netPower - chargeAbility;
      decision = `Surplus of ${netPower.toFixed(1)}kW. Charging battery and exporting remaining.`;
    } else { // Deficit
      const deficit = Math.abs(netPower);
      const availableFromBatt = Math.max(0, (prevSoc - reserveLimit) * BATT_CAP);
      const discharge = Math.min(deficit, availableFromBatt);
      
      nextSoc -= discharge / BATT_CAP;
      gridImport = deficit - discharge;
      decision = discharge >= deficit 
        ? "Deficit met by battery storage." 
        : `Deficit exceeds storage (at ${trust} reserve). Importing ${gridImport.toFixed(1)}kW from grid.`;
    }

    const newStep = {
      step,
      hour,
      solarActual: actual,
      solarForecast: forecast,
      demand: currentDemand,
      soc: nextSoc,
      gridImport,
      gridExport,
      trustLevel: trust,
      decisionTrace: decision,
      reason
    };

    setHistory(prev => [...prev.slice(-23), newStep]);
    setStep(s => s + 1);
  };

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(runSimulationStep, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, step, scenario, policyType]);

  const currentState = history[history.length - 1] || { 
    solarActual: 0, solarForecast: 0, soc: 0.5, demand: 0, trustLevel: 'NORMAL', decisionTrace: 'System Ready', reason: 'Waiting for simulation start.' 
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* TOP NAV */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f1117]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">SolarTwin <span className="text-cyan-400">AI</span></h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Trust-Aware Digital Twin</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", isRunning ? "bg-emerald-500" : "bg-slate-600")} />
            <span className="text-xs font-medium text-slate-400">{isRunning ? "LIVE SIMULATION" : "PAUSED"}</span>
          </div>
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-all font-semibold text-sm"
          >
            {isRunning ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Reset System" : "Launch Simulation"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* LEFT COLUMN: 3D TWIN & METRICS */}
        <div className="col-span-8 flex flex-col gap-4">
          
          {/* METRICS ROW */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Solar Output" value={`${currentState.solarActual.toFixed(1)} kW`} icon={<Sun className="text-amber-400" />} sub={`Forecast: ${currentState.solarForecast.toFixed(1)}`} />
            <MetricCard label="System Demand" value={`${currentState.demand.toFixed(1)} kW`} icon={<Activity className="text-cyan-400" />} />
            <MetricCard label="Battery SoC" value={`${(currentState.soc * 100).toFixed(0)}%`} icon={<Battery className="text-emerald-400" />} progress={currentState.soc} />
            <MetricCard 
              label="Trust Status" 
              value={currentState.trustLevel} 
              icon={<ShieldCheck className={currentState.trustLevel === 'NORMAL' ? 'text-emerald-400' : 'text-amber-500'} />}
              status={currentState.trustLevel}
            />
          </div>

          {/* 3D VIEWPORT */}
          <div className="flex-1 relative bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <span className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Real-time Digital Twin</span>
              <div className="p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
                <div className="flex items-center gap-2 text-xs mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" /> <span className="text-slate-300">Generation Flow</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-slate-300">Grid Export</span>
                </div>
              </div>
            </div>
            <Canvas shadows className="w-full h-full">
              <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={40} />
              <DigitalTwinScene state={currentState} />
            </Canvas>
          </div>

          {/* CHART AREA */}
          <div className="h-64 bg-[#0f1117] border border-slate-800 rounded-xl p-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickFormatter={(val) => `${val}:00`} />
                  <YAxis stroke="#475569" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f1117', border: '1px solid #1e293b', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="solarActual" stroke="#fbbf24" fillOpacity={1} fill="url(#colorSolar)" name="Actual Solar" />
                  <Line type="monotone" dataKey="solarForecast" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Forecast" />
                  <Area type="monotone" dataKey="demand" stroke="#22d3ee" fill="transparent" name="Demand" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTROLS & AUDIT */}
        <div className="col-span-4 flex flex-col gap-4 h-full">
          
          {/* SCENARIO SELECTOR */}
          <section className="bg-[#0f1117] border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Operational Scenarios
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['NORMAL', 'CLOUDY', 'MISMATCH', 'SPIKE'].map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario({ ...scenario, id: s })}
                  className={cn(
                    "px-3 py-2 rounded text-xs font-semibold border transition-all",
                    scenario.id === s 
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>Scenario Severity</span>
                <span>{(scenario.severity * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1" 
                value={scenario.severity}
                onChange={(e) => setScenario({...scenario, severity: parseFloat(e.target.value)})}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
              />
            </div>
          </section>

          {/* POLICY TOGGLE */}
          <section className="bg-[#0f1117] border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Decision Strategy</h3>
            <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button 
                onClick={() => setPolicyType('STANDARD')}
                className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", policyType === 'STANDARD' ? "bg-slate-800 text-white shadow-lg" : "text-slate-500")}
              >Standard</button>
              <button 
                onClick={() => setPolicyType('TRUST_AWARE')}
                className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", policyType === 'TRUST_AWARE' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-500")}
              >Trust-Aware</button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 italic leading-relaxed">
              {policyType === 'TRUST_AWARE' 
                ? "Adaptive: Reserves 30% battery if forecast trust is compromised." 
                : "Aggressive: Prioritizes immediate cost savings regardless of forecast reliability."}
            </p>
          </section>

          {/* AUDIT TRAIL */}
          <section className="flex-1 bg-[#0f1117] border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Database className="w-3 h-3" /> Decision Audit Trail
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {[...history].reverse().map((h, i) => (
                <div key={i} className="p-3 bg-slate-900/50 border-l-2 border-slate-700 rounded-r-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-slate-500">T+{h.step} ({h.hour}:00)</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                      h.trustLevel === 'NORMAL' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>{h.trustLevel}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal mb-1">{h.decisionTrace}</p>
                  <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
                    <Info className="w-3 h-3" /> {h.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon, sub, progress, status }: any) {
  return (
    <div className="bg-[#0f1117] border border-slate-800 p-4 rounded-xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 font-medium">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", progress > 0.2 ? "bg-emerald-500" : "bg-amber-500")} 
            style={{ width: `${progress * 100}%` }} 
          />
        </div>
      )}
      {status && (
         <div className={cn(
           "absolute bottom-0 left-0 h-1 w-full",
           status === 'NORMAL' ? "bg-emerald-500/50" : "bg-amber-500/50"
         )} />
      )}
    </div>
  );
}