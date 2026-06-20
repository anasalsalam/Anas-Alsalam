import React, { useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Maximize2, 
  Layers, 
  Sparkles, 
  Eye, 
  Activity, 
  Compass, 
  Cpu, 
  Info,
  HelpCircle,
  TrendingUp
} from 'lucide-react';

interface Candidate {
  id: number;
  latitude: number;
  longitude: number;
  type: string;
  depth?: number;
  confidence?: number;
  x?: number; // custom grid coordinates if translated
  y?: number;
}

interface Terrain3DViewerProps {
  demGrid: number[][];
  minElevation: number;
  maxElevation: number;
  candidates: Candidate[];
  selectedCandidateId: number | null;
  onSelectCandidate: (candidate: Candidate) => void;
  lang: 'en' | 'ar';
  theme: string;
  getColorForCell: (y: number, x: number, modeOverride?: 'tpi' | 'dem' | 'corona') => string;
}

// Convert rgb(r, g, b) or hex to Float32 color channels
function parseRGBColor(colStr: string): { r: number; g: number; b: number } {
  if (colStr.startsWith('rgb')) {
    const parts = colStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return {
        r: parseInt(parts[0]) / 255,
        g: parseInt(parts[1]) / 255,
        b: parseInt(parts[2]) / 255
      };
    }
  }
  if (colStr.startsWith('#')) {
    const hex = colStr.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
  return { r: 1, g: 1, b: 1 };
}

export default function Terrain3DViewer({
  demGrid,
  minElevation,
  maxElevation,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  lang,
  theme,
  getColorForCell,
}: Terrain3DViewerProps) {
  const isDark = theme === 'dark';
  
  // Interactive Controls state
  const [renderMode, setRenderMode] = useState<'mesh' | 'voxels' | 'wireframe'>('mesh');
  const [colorMode, setColorMode] = useState<'tpi' | 'dem' | 'corona'>('dem');
  const [exaggeration, setExaggeration] = useState<number>(2.0);
  const [showBeacons, setShowBeacons] = useState<boolean>(true);
  
  // Reset key to quickly force recreation of OrbitControls and camera target
  const [resetKey, setResetKey] = useState<number>(0);

  const rows = demGrid.length;
  const cols = demGrid[0]?.length ?? 0;
  const spacing = 0.55;

  // 1. Generation of Connected Mesh Geometry Data
  const meshData = useMemo(() => {
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Pre-calculate heights relative to the minimum
    const heightRange = maxElevation - minElevation || 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const height = demGrid[r]?.[c] ?? minElevation;
        
        // Dynamic scaling
        const vx = c * spacing - ((cols - 1) * spacing) / 2;
        const vy = ((height - minElevation) / heightRange) * 1.5 * exaggeration;
        const vz = r * spacing - ((rows - 1) * spacing) / 2;

        vertices.push(vx, vy, vz);

        // Map colors per cell based on selected color mode
        const colStr = getColorForCell(r, c, colorMode);
        const colFloat = parseRGBColor(colStr);
        colors.push(colFloat.r, colFloat.g, colFloat.b);
      }
    }

    // Two triangles per grid rectangle
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const i00 = r * cols + c;
        const i10 = r * cols + (c + 1);
        const i01 = (r + 1) * cols + c;
        const i11 = (r + 1) * cols + (c + 1);

        // Triangle 1: i00, i01, i10
        indices.push(i00, i01, i10);
        // Triangle 2: i10, i01, i11
        indices.push(i10, i01, i11);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      colors: new Float32Array(colors),
      indices: new Uint16Array(indices),
    };
  }, [demGrid, minElevation, maxElevation, exaggeration, colorMode, spacing]);

  // 2. Map high-fidelity candidate positions to 3D points
  const mappedCandidates = useMemo(() => {
    const list: Array<{
      original: Candidate;
      x: number;
      y: number;
      z: number;
      color: string;
      isSelected: boolean;
    }> = [];

    candidates.forEach((cand) => {
      // Find direct (x, y) coordinates of the candidate in the grid (0-14)
      // Usually the original code has simulated candidate grids which maps to coordinates
      // Let's deduce or parse them. If x/y are not directly on Candidate, let's search for map cell approximations.
      let gridX = cand.x;
      let gridY = cand.y;

      // Fallback: if x/y are missing, map them using some index or derive close estimation
      if (gridX === undefined || gridY === undefined) {
        gridX = Math.floor((cand.id * 11) % cols);
        gridY = Math.floor((cand.id * 17) % rows);
      }

      const height = demGrid[gridY]?.[gridX] ?? minElevation; 
      const heightRange = maxElevation - minElevation || 1;

      const vx = gridX * spacing - ((cols - 1) * spacing) / 2;
      const vy = ((height - minElevation) / heightRange) * 1.5 * exaggeration;
      const vz = gridY * spacing - ((rows - 1) * spacing) / 2;

      // High contrast beacon color
      let colorColor = '#10b981'; // glowing emerald
      if (cand.type.includes('Karstic')) colorColor = '#f59e0b'; // amber
      if (cand.type.includes('Tomb')) colorColor = '#ec4899'; // pink
      if (cand.type.includes('Collapse')) colorColor = '#ef4444'; // red
      if (cand.type.includes('Cistern')) colorColor = '#3b82f6'; // blue

      list.push({
        original: cand,
        x: vx,
        y: vy,
        z: vz,
        color: colorColor,
        isSelected: cand.id === selectedCandidateId,
      });
    });

    return list;
  }, [candidates, demGrid, minElevation, maxElevation, exaggeration, selectedCandidateId, spacing, rows, cols]);

  const handleResetView = () => {
    setExaggeration(2.0);
    setRenderMode('mesh');
    setColorMode('dem');
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-full w-full flex-1" id="threejs-terrain-panel">
      {/* 3D Dashboard Control Bar */}
      <div className={`p-4 border-b flex flex-wrap gap-4 items-center justify-between font-mono text-[11px] select-none ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/10 text-emerald-500">
            <Cpu className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase text-emerald-400">
              {lang === 'ar' ? 'نموذج محاكاة شبكي ثلاثي الأبعاد لنموذج الارتفاع' : '3D TOPOGRAPHIC SURFACE ANALYZER'}
            </span>
            <span className={`block text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              {lang === 'ar' ? 'تفاعل، حرك، وتفقد تضاريس الرادار الفضائي' : 'Real-time interactive spatial radar telemetry rendering'}
            </span>
          </div>
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Render Mode Toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">{lang === 'ar' ? 'طريقة العرض' : 'Surface Render'}</span>
            <div className="flex bg-zinc-900/15 dark:bg-black/40 p-0.5 rounded border dark:border-zinc-800 border-slate-200">
              {(['mesh', 'voxels', 'wireframe'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRenderMode(mode)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    renderMode === mode
                      ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
                      : isDark
                        ? 'text-zinc-500 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {mode === 'mesh' ? (lang === 'ar' ? 'تنظيف مجسم' : 'Smooth') :
                   mode === 'voxels' ? (lang === 'ar' ? 'أعمدة فوكسل' : 'Voxels') :
                   (lang === 'ar' ? 'شبكي' : 'Wireframe')}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode Overlay */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">{lang === 'ar' ? 'الطبقة الملونة' : 'Color Overlay'}</span>
            <div className="flex bg-zinc-900/15 dark:bg-black/40 p-0.5 rounded border dark:border-zinc-800 border-slate-200">
              {(['dem', 'tpi', 'corona'] as const).map((overlay) => (
                <button
                  key={overlay}
                  type="button"
                  onClick={() => setColorMode(overlay)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    colorMode === overlay
                      ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
                      : isDark
                        ? 'text-zinc-500 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {overlay === 'dem' ? 'DEM' : overlay === 'tpi' ? 'TPI' : 'CORONA'}
                </button>
              ))}
            </div>
          </div>

          {/* Exaggeration Slider */}
          <div className="flex flex-col gap-1 min-w-[125px]">
            <div className="flex justify-between items-center text-[9px] uppercase font-bold">
              <span className="text-zinc-500">{lang === 'ar' ? 'مبالغة الارتفاع' : 'Height Scale'}</span>
              <span className="text-emerald-500">{exaggeration.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.25"
                value={exaggeration}
                onChange={(e) => setExaggeration(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-gray-300 dark:bg-zinc-800 rounded"
              />
            </div>
          </div>

          {/* Checkbox show beacons */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">{lang === 'ar' ? 'الشذوذات' : 'Display Targets'}</span>
            <label className="flex items-center gap-1.5 px-2 py-1 rounded border dark:border-zinc-850 border-slate-200 bg-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={showBeacons}
                onChange={(e) => setShowBeacons(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-rose-500 accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px]">{lang === 'ar' ? 'إظهار المنارات' : 'Beacons'}</span>
            </label>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetView}
            title={lang === 'ar' ? 'إعادة الإعدادات الافتراضية للمجسم' : 'Reset interactive camera & variables'}
            className={`p-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
                : 'bg-white border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إعادة الإعدادات' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className={`relative flex-1 min-h-[420px] w-full flex items-stretch md:items-center justify-center ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-800'
      }`}>
        <Canvas
          key={resetKey}
          camera={{ position: [5, 6, 8], fov: 42 }}
          shadows
          className="w-full h-full"
        >
          {/* Background color based on theme */}
          <color attach="background" args={[isDark ? '#09090b' : '#f1f5f9']} />
          
          {/* Realistic Lighting setup with soft shadows */}
          <ambientLight intensity={isDark ? 0.35 : 0.6} />
          
          <directionalLight
            position={[5, 10, 3]}
            intensity={isDark ? 0.9 : 1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />
          <pointLight position={[-6, 4, -4]} intensity={isDark ? 0.25 : 0.4} />

          {/* Connected Terrain component */}
          {renderMode === 'mesh' && (
            <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[meshData.vertices, 3]}
                />
                <bufferAttribute
                  attach="attributes-color"
                  args={[meshData.colors, 3]}
                />
                <bufferAttribute
                  attach="index"
                  args={[meshData.indices, 1]}
                />
              </bufferGeometry>
              <meshStandardMaterial 
                vertexColors 
                side={THREE.DoubleSide} 
                roughness={0.65} 
                metalness={0.15} 
                flatShading={true}
              />
            </mesh>
          )}

          {renderMode === 'wireframe' && (
            <group position={[0, -0.3, 0]}>
              {/* Semi translucent solid mesh underneath for depth */}
              <mesh receiveShadow>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[meshData.vertices, 3]}
                  />
                  <bufferAttribute
                    attach="index"
                    args={[meshData.indices, 1]}
                  />
                </bufferGeometry>
                <meshStandardMaterial 
                  color={isDark ? '#18181b' : '#cbd5e1'} 
                  transparent
                  opacity={0.6}
                  side={THREE.DoubleSide} 
                  roughness={0.9} 
                />
              </mesh>
              {/* Highlight vector wireframe */}
              <mesh>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[meshData.vertices, 3]}
                  />
                  <bufferAttribute
                    attach="attributes-color"
                    args={[meshData.colors, 3]}
                  />
                  <bufferAttribute
                    attach="index"
                    args={[meshData.indices, 1]}
                  />
                </bufferGeometry>
                <meshBasicMaterial 
                  vertexColors 
                  wireframe
                  side={THREE.DoubleSide} 
                />
              </mesh>
            </group>
          )}

          {renderMode === 'voxels' && (
            <group position={[0, -0.3, 0]}>
              {demGrid.map((row, r) =>
                row.map((val, c) => {
                  const width = 0.5;
                  const heightRange = maxElevation - minElevation || 1;
                  const h = ((val - minElevation) / heightRange) * 1.5 * exaggeration + 0.04;
                  
                  const vx = c * spacing - ((cols - 1) * spacing) / 2;
                  const vy = h / 2;
                  const vz = r * spacing - ((rows - 1) * spacing) / 2;
                  
                  const colStr = getColorForCell(r, c, colorMode);

                  return (
                    <mesh key={`${r}-${c}`} position={[vx, vy, vz]} castShadow receiveShadow>
                      <boxGeometry args={[width, h, width]} />
                      <meshStandardMaterial 
                        color={colStr} 
                        roughness={0.7} 
                        metalness={0.1}
                      />
                    </mesh>
                  );
                })
              )}
            </group>
          )}

          {/* Ground plate reference ring representing scan sweep limit */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]} receiveShadow>
            <ringGeometry args={[((cols - 1) * spacing) / 2, ((cols - 1) * spacing) / 2 + 0.06, 64]} />
            <meshBasicMaterial color={isDark ? '#27272a' : '#cbd5e1'} side={THREE.DoubleSide} />
          </mesh>

          {/* Candidate target indicators */}
          {showBeacons && mappedCandidates.map((bc) => {
            const h = bc.y; // terrain height
            // Anchor beacon exactly on top of the terrain point
            return (
              <group key={bc.original.id} position={[bc.x, -0.3, bc.z]}>
                
                {/* Translucent scanner cylinder shaft */}
                <mesh position={[0, h / 2, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, h, 6]} />
                  <meshBasicMaterial 
                    color={bc.isSelected ? '#f43f5e' : bc.color} 
                    transparent 
                    opacity={0.35} 
                  />
                </mesh>

                {/* Floating neon core target sphere */}
                <mesh 
                  position={[0, h, 0]} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCandidate(bc.original);
                  }}
                >
                  <sphereGeometry args={[bc.isSelected ? 0.22 : 0.14, 16, 16]} />
                  <meshBasicMaterial 
                    color={bc.isSelected ? '#f43f5e' : bc.color} 
                    toneMapped={false}
                  />
                </mesh>

                {/* Concentric high-contrast beacon outline if selected */}
                {bc.isSelected && (
                  <mesh position={[0, h, 0]}>
                    <ringGeometry args={[0.26, 0.32, 16]} />
                    <meshBasicMaterial 
                      color="#f43f5e" 
                      side={THREE.DoubleSide} 
                      transparent 
                      opacity={0.8} 
                    />
                  </mesh>
                )}
              </group>
            );
          })}

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2 - 0.05} // prevent going fully under ground level
          />
        </Canvas>

        {/* Floating Controls HUD readout info */}
        <div className="absolute bottom-4 left-4 font-mono text-[9px] pointer-events-none select-none flex flex-col gap-1">
          <div className={`p-2 rounded bg-black/75 backdrop-blur-md border flex items-center gap-1.5 transition-all text-white border-zinc-800`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>
              {lang === 'ar' ? (
                <><b>تحكم:</b> زر الماوس الأيسر + سحب: تدوير • زر الماوس الأيمن + سحب: تحريك • سكرول: زووم</>
              ) : (
                <><b>NAV:</b> Left-Click + Drag: Rotate | Right-Click + Drag: Pan | Scroll: Zoom</>
              )}
            </span>
          </div>
          <div className="p-2 rounded bg-black/75 backdrop-blur-md border flex items-center gap-1.5 transition-all text-white border-zinc-800">
            <Info className="w-3 h-3 text-amber-500 shrink-0" />
            <span>
              {lang === 'ar' ? (
                <>انقر على منارات الأهداف الطائرة لاختيار ودراسة الشذوذ</>
              ) : (
                <>Click on floating neon spheres to select active targets</>
              )}
            </span>
          </div>
        </div>

        {/* Legendary compass arrow pointing North overlay */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 border px-2.5 py-1.5 rounded text-[10px] font-mono bg-black/75 backdrop-blur-md text-white border-zinc-800 select-none">
          <Compass className="w-4 h-4 text-rose-500 animate-spin-slow shrink-0" />
          <span>{lang === 'ar' ? 'شبكة البوصلة: شمال 0' : 'Holo-Azimuth: N-0°'}</span>
        </div>
      </div>
    </div>
  );
}
