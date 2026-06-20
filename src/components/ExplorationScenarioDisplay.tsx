/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Tv, 
  Waves, 
  Compass, 
  Zap, 
  TrendingUp, 
  Gauge, 
  Grid, 
  Sparkles, 
  Sliders, 
  Play, 
  RefreshCw,
  Database,
  Search,
  ChevronRight,
  Info 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Language } from '../lib/translations';

interface ExplorationScenarioDisplayProps {
  lang: Language;
  theme: 'dark' | 'light';
  currentLat: number;
  currentLon: number;
}

export default function ExplorationScenarioDisplay({
  lang,
  theme,
  currentLat,
  currentLon,
}: ExplorationScenarioDisplayProps) {
  // Navigation for phases/stages
  const [activeStage, setActiveStage] = useState<'shallow' | 'medium' | 'deep'>('shallow');
  // Sub-instruments inside stages
  const [activeInstrument, setActiveInstrument] = useState<string>('gpr');

  const isDark = theme === 'dark';

  // -------------------------------------------------------------
  // STATE PARAMETERS
  // -------------------------------------------------------------
  
  // GPR parameters
  const [gprFrequency, setGprFrequency] = useState<number>(500); // MHz
  const [gprDielectric, setGprDielectric] = useState<number>(9); // 4 for dry sand, 9 for limestone, 15 for wet clay
  const [gprGain, setGprGain] = useState<number>(4);
  const [gprTargetDepth, setGprTargetDepth] = useState<number>(2.2); // meters

  // Magnetometer parameters
  const [magDipoleOffset, setMagDipoleOffset] = useState<number>(0); // meters from center
  const [magTargetDepth, setMagTargetDepth] = useState<number>(1.8); // meters
  const [magBackground, setMagBackground] = useState<number>(43500); // nT
  const [magContrast, setMagContrast] = useState<number>(320); // susceptability nT shift
  const [activeMagSensorX, setActiveMagSensorX] = useState<number>(5);

  // Pulse Induction 3D parameters
  const [piWidth, setPiWidth] = useState<number>(150); // microseconds duration
  const [piSensitivity, setPiSensitivity] = useState<number>(85); // %
  const [piScanning, setPiScanning] = useState<boolean>(false);
  const [piScanProgress, setPiScanProgress] = useState<number>(0);
  const [piFoundTargets, setPiFoundTargets] = useState<Array<{ id: number, type: string, confidence: number, depth: number, x: number, y: number }>>([]);

  // ERT parameters
  const [ertElectrodeSpacing, setErtElectrodeSpacing] = useState<number>(4); // meters
  const [ertCurrent, setErtCurrent] = useState<number>(250); // mA
  const [ertArrayType, setErtArrayType] = useState<'wenner' | 'schlumberger' | 'dipoledipole'>('wenner');
  const [activeERTShot, setActiveERTShot] = useState<number | null>(null);

  // Seismic Refraction parameters
  const [seismicGeophones, setSeismicGeophones] = useState<number>(12);
  const [seismicBedrockDepth, setSeismicBedrockDepth] = useState<number>(18); // meters
  const [seismicSoilVelocity, setSeismicSoilVelocity] = useState<number>(650); // m/s
  const [seismicRockVelocity, setSeismicRockVelocity] = useState<number>(3200); // m/s
  const [seismicTriggered, setSeismicTriggered] = useState<boolean>(false);

  // Automatically switch default active instrument when activeStage switches
  useEffect(() => {
    if (activeStage === 'shallow') {
      setActiveInstrument('gpr');
    } else if (activeStage === 'medium') {
      setActiveInstrument('pi3d');
    } else if (activeStage === 'deep') {
      setActiveInstrument('ert');
    }
  }, [activeStage]);

  // -------------------------------------------------------------
  // DYNAMIC DATA GENERATION
  // -------------------------------------------------------------

  // 1. GPR Data Calculations
  // Velocity of EM wave in medium = c / sqrt(dielectric)
  // c ~ 0.3 m/ns. So vel (m/ns) = 0.3 / sqrt(gprDielectric)
  // Two-way travel time t (ns) = 2 * depth / velocity
  const emVelocity = 0.3 / Math.sqrt(gprDielectric); // m/ns
  
  const getGprRadargramPoints = () => {
    const points = [];
    const targetApexX = 0; // centered
    const targetYTime = (2 * gprTargetDepth) / emVelocity; // ns travel time of apex

    for (let x = -10; x <= 10; x += 0.5) {
      // Hyperbolas equation for reflection:
      // t_x = sqrt( t_0^2 + (2*x/v)^2 )
      const t0 = targetYTime;
      const xOffsetMeters = x * 0.8;
      const tX = Math.sqrt(Math.pow(t0, 2) + Math.pow((2 * xOffsetMeters) / emVelocity, 2));
      
      // Soil/Ground boundary (minor wavy interface)
      const tSoil = 4 + Math.sin(x * 1.5) * 0.4;
      
      // Calculate amplitude of hyperbola peak based on frequency and gain
      // Higher frequencies (e.g. 900 MHz) decay faster but give sharper hyperbolas
      const attenuation = Math.exp(-0.06 * gprTargetDepth * (gprFrequency / 300));
      const amp = Math.max(5, Math.min(100, 45 * gprGain * attenuation));
      
      points.push({
        distance: `${x > 0 ? '+' : ''}${x.toFixed(1)}m`,
        rawX: x,
        SoilBoundary: parseFloat((tSoil).toFixed(2)),
        CavernHyperbola: parseFloat((tX).toFixed(2)),
        HyperbolaAmplitude: parseFloat((amp * (1 - Math.abs(xOffsetMeters) * 0.15)).toFixed(1)),
      });
    }
    return points;
  };

  const gprPoints = getGprRadargramPoints();

  // 2. Magnetometer Dipole Generation
  // Dipole formula: Bz = magnetic field anomaly profile
  const getMagGridAndProfile = () => {
    const gridRows = 10;
    const gridCols = 10;
    const grid = [];
    const profile = [];

    // Map dipole anomaly center based on magDipoleOffset (-5 to 5m)
    // Map grid x: 0 to 9, maps -5m to +5m
    const centerX = 5 + magDipoleOffset; 
    const centerY = 4; // y is constant depth-wise relative to profile

    for (let y = 0; y < gridRows; y++) {
      const row = [];
      for (let x = 0; x < gridCols; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

        // Ideal dipole magnetic formula:
        // Bz = (3 * (m_vector . r_vector) * dy / r^5) - m_vector / r^3
        // Creates the classic dual-pole anomaly (one positive red lobe, one negative blue lobe adjacent!)
        const dipoleAngle = 45 * (Math.PI / 180); // tilt
        const proj = dx * Math.cos(dipoleAngle) + dy * Math.sin(dipoleAngle);
        const force = magContrast * (3 * proj * dx / Math.pow(dist, 4.2) - Math.cos(dipoleAngle) / Math.pow(dist, 2.5));

        row.push(Math.max(-450, Math.min(450, Math.round(force))));
      }
      grid.push(row);
    }

    // Generate accurate 1D cross-section profile for Recharts at constant latitude line (centerY)
    // With geophone or sensor probe tracking
    for (let col = 0; col < gridCols; col++) {
      const mOffset = (col - 5) * 1.5;
      const gridVal = grid[centerY][col];
      profile.push({
        pointName: `${mOffset > 0 ? '+' : ''}${mOffset.toFixed(1)}m`,
        magneticIntensity: gridVal,
        background: magBackground,
        totalField: magBackground + gridVal,
        sensorActive: col === activeMagSensorX,
      });
    }

    return { grid, profile };
  };

  const { grid: magGrid, profile: magProfile } = getMagGridAndProfile();

  // 3. Pulse Induction 3D Sweep Simulate
  const startPI3DScan = () => {
    setPiScanning(true);
    setPiScanProgress(0);
    setPiFoundTargets([]);

    const interval = setInterval(() => {
      setPiScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPiScanning(false);
          // Spawn targets
          const items = [
            { id: 101, type: lang === 'ar' ? 'قرابين برونزية ونبلاء (أثرية)' : 'Bronze Cache & Noble Relics', confidence: 91, depth: 6.2, x: 2, y: 3 },
            { id: 102, type: lang === 'ar' ? 'عملات فضية / حديد ممتد (مغناطيسي)' : 'Silver Coins & Metal Accretions', confidence: 84, depth: 8.5, x: 6, y: 7 },
            { id: 103, type: lang === 'ar' ? 'فراغ نفق مشيد من الحجر' : 'Man-made Masonry Void Tunnel', confidence: 95, depth: 11.2, x: 4, y: 2 },
          ];
          // Filter out based on sensitivity parameter
          const filtered = items.filter(item => item.confidence >= (120 - piSensitivity));
          setPiFoundTargets(filtered);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // 4. ERT Layer Generation
  // Horizontal meters (0 to 40m profile)
  // Depth levels (0 to 25m deep)
  const getERTData = () => {
    const layers = [];
    const widthSteps = 20; // 0 to 40 meters
    const depthSteps = 10; // 0 to 25 meters

    // Resistivity (ohm-meters): 
    // Top dry soil / sand ~ 1500 ohm-m (very high)
    // Saturated silt or marl layer ~ 30 ohm-m (very wet, low)
    // Bedrock limestone ~ 800 ohm-m (moderate-high)
    // Cave void fill ~ 5000 ohm-m (extremely high resistivity because it's dry air!)
    
    for (let d = 0; d < depthSteps; d++) {
      const depthMeters = d * 2.5;
      const row = [];
      for (let w = 0; w < widthSteps; w++) {
        const distMeters = w * 2.0;
        let baseResistivity = 400;

        // Geological strata classification
        if (depthMeters < 3.5) {
          baseResistivity = 1200 - depthMeters * 100; // top soil dry sand
        } else if (depthMeters >= 3.5 && depthMeters < 9) {
          baseResistivity = 35 + Math.sin(distMeters * 0.1) * 5; // wet silt layer
        } else {
          baseResistivity = 750 + (depthMeters - 9) * 20; // limestone base
        }

        // Subsurface cave vault anomaly (centered at 18m, depth 15m, radius 4m)
        const caveCenterX = 22;
        const caveCenterY = 14;
        const dx = distMeters - caveCenterX;
        const dy = depthMeters - caveCenterY;
        const distToCave = Math.sqrt(dx * dx + dy * dy);

        if (distToCave < 4.8) {
          // Extremely dry air void produces massive resistivity ceiling
          baseResistivity = Math.max(baseResistivity, 6200 - distToCave * 500);
        }

        // Subsurface water table anomaly (far left, deep)
        const waterdx = distMeters - 8;
        const waterdy = depthMeters - 20;
        if (Math.sqrt(waterdx * waterdx + waterdy * waterdy) < 6) {
          baseResistivity = 18; // electrical highway (very low resistivity!)
        }

        row.push({
          x: distMeters,
          y: depthMeters,
          resistivity: Math.round(baseResistivity)
        });
      }
      layers.push(row);
    }
    return layers;
  };

  const ertGrid = getERTData();

  // 5. Seismic Refraction Data Generation
  // Travel time t = x / v_1 (direct wave)
  // Travel time t = (x / v_2) + 2 * d * sqrt(v_2^2 - v_1^2) / (v_1 * v_2) (refracted wave)
  const v1 = seismicSoilVelocity; // superficial velocity m/s
  const v2 = seismicRockVelocity; // deep limestone velocity m/s
  
  // Critical distance where refracted wave becomes first arrival
  // x_crit = 2 * d * sqrt( (v2 + v1) / (v2 - v1) )
  const critFactor = Math.sqrt((v2 + v1) / (v2 - v1));
  const tcRatio = 2 * seismicBedrockDepth * critFactor;

  const getSeismicPoints = () => {
    const points = [];
    // Calculate critical distance
    const criticalDistance = 2 * seismicBedrockDepth * Math.sqrt((v2*v2 - v1*v1)) / (v1 * v2) * (v1 * v2 / (v2 - v1)); 

    for (let x = 0; x <= 100; x += 5) {
      // Direct wave travel time (ms)
      const tDirect = (x / v1) * 1000;
      
      // Refracted wave (only physically exists past critical index, but mathematically modeled)
      const cosTheta = Math.sqrt(v2*v2 - v1*v1) / v2;
      const intercept = (2 * seismicBedrockDepth * cosTheta) / v1;
      const tRefracted = ((x / v2) + intercept) * 1000;

      // The first arrival is the minimum of direct and refracted travel time
      const firstArrival = x === 0 ? 0 : Math.min(tDirect, tRefracted);

      points.push({
        meters: x,
        DirectWave: parseFloat(tDirect.toFixed(1)),
        RefractedWave: parseFloat(tRefracted.toFixed(1)),
        FirstArrival: parseFloat(firstArrival.toFixed(1)),
      });
    }
    return points;
  };

  const seismicPoints = getSeismicPoints();

  return (
    <div className={`w-full flex flex-col h-full grow select-none relative z-10 p-2 md:p-3 transition-colors duration-200 ${
      isDark ? 'text-gray-100' : 'text-slate-800'
    }`}>
      
      {/* HEADER BANNER OF EXPLORATION SCENARIO */}
      <div className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 mb-3 ${
        isDark ? 'bg-gray-950/80 border-gray-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm leading-none flex items-center gap-1.5 uppercase tracking-wider">
              {lang === 'ar' ? 'المسح والمسبار الجيوفيزيائي متكامل الأعماق' : 'MULTI-DEPTH GEOPHYSICAL SIMULATOR'}
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                isDark ? 'bg-indigo-950/65 text-indigo-300 border border-indigo-900/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                SCENARIO v2.4
              </span>
            </h3>
            <p className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {lang === 'ar' ? 'نمذجة مسبقة وسيناريوهات استكشاف متكاملة لفحص باطن الأرض بمختلف عمق الموجات' : 'Evaluate active subsurface structures, ancient tunnels, and bedrock faults in 3 interactive stages.'}
            </p>
          </div>
        </div>

        {/* STAGE SELECTOR BUTTONS */}
        <div className={`flex p-0.5 rounded-lg border text-xs font-mono shrink-0 select-none ${
          isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveStage('shallow')}
            className={`px-3 py-1.5 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              activeStage === 'shallow'
                ? 'bg-amber-500 text-gray-950 font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الضحل (٠-٥م)' : 'Shallow (0-5m)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStage('medium')}
            className={`px-3 py-1.5 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              activeStage === 'medium'
                ? 'bg-amber-500 text-gray-950 font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المتوسط (٥-١٥م)' : 'Medium (5-15m)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStage('deep')}
            className={`px-3 py-1.5 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              activeStage === 'deep'
                ? 'bg-amber-500 text-gray-950 font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'العميق (١٥-٥٠م)' : 'Deep (15-50m)'}</span>
          </button>
        </div>
      </div>

      {/* CORE INSTRUMENT WORKSPACE CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 items-stretch">
        
        {/* SIDE INSTRUMENT NAV & BRIEF */}
        <div className={`lg:col-span-1 rounded-xl p-3.5 border flex flex-col gap-3.5 ${
          isDark ? 'bg-gray-950/60 border-gray-850' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div>
            <span className={`text-[10px] font-mono uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {lang === 'ar' ? 'المرحلة النشطة جاري مسحها:' : 'ACTIVE EXPLORATION PHASE:'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                activeStage === 'shallow' ? 'bg-amber-500' : activeStage === 'medium' ? 'bg-sky-500' : 'bg-purple-500'
              }`} />
              <h4 className="font-display font-extrabold text-base tracking-tight uppercase">
                {activeStage === 'shallow' && (lang === 'ar' ? 'المسح السطحي / الضحل' : 'Stage I: Shallow Survey')}
                {activeStage === 'medium' && (lang === 'ar' ? 'المسح متوسط العمق' : 'Stage II: Medium-Depth')}
                {activeStage === 'deep' && (lang === 'ar' ? 'المسح الجيولوجي العميق' : 'Stage III: Deep Crustal')}
              </h4>
            </div>
          </div>

          <hr className={isDark ? 'border-gray-850' : 'border-slate-200'} />

          {/* INSTRUMENT TOGGLES */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-gray-450">
              {lang === 'ar' ? 'حدد أداة المسح الجوفية:' : 'CHOOSE SUB-SURFACE TOOL:'}
            </span>

            {/* STAGE 1: SHALLOW TOOLS */}
            {activeStage === 'shallow' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveInstrument('gpr')}
                  className={`text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    activeInstrument === 'gpr'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-300 font-bold'
                      : isDark ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    <span>{lang === 'ar' ? 'الرادار الأرضي GPR' : 'GPR Subsurface Radar'}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInstrument('magnetometer')}
                  className={`text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    activeInstrument === 'magnetometer'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                      : isDark ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tv className="w-3.5 h-3.5 text-amber-500" />
                    <span>{lang === 'ar' ? 'مقياس المغناطيسية' : 'Magnetometer Dipole'}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              </>
            )}

            {/* STAGE 2: MEDIUM TOOLS */}
            {activeStage === 'medium' && (
              <button
                type="button"
                onClick={() => setActiveInstrument('pi3d')}
                className={`text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                  activeInstrument === 'pi3d'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold'
                    : isDark ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'ar' ? 'الحث النبضي ثلاثي الأبعاد' : 'Pulse Induction 3D'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
              </button>
            )}

            {/* STAGE 3: DEEP TOOLS */}
            {activeStage === 'deep' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveInstrument('ert')}
                  className={`text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    activeInstrument === 'ert'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-bold'
                      : isDark ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-sky-400" />
                    <span>{lang === 'ar' ? 'المقاومية الكهربائية ERT' : 'ERT Resistivity'}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInstrument('seismic')}
                  className={`text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    activeInstrument === 'seismic'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-300 font-bold'
                      : isDark ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>{lang === 'ar' ? 'المسبار الزلزالي الانكساري' : 'Seismic Refraction'}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              </>
            )}
          </div>

          <hr className={isDark ? 'border-gray-850' : 'border-slate-200'} />

          {/* DYNAMIC INFORMATION PANEL */}
          <div className="mt-auto">
            <div className={`p-2.5 rounded-lg border flex gap-2 items-start text-[10px] leading-relaxed font-sans ${
              isDark ? 'bg-gray-900/40 border-gray-850 text-gray-400' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">{lang === 'ar' ? 'أهمية هذه الأداة:' : 'Geophysical Significance:'}</span>
                {activeInstrument === 'gpr' && (
                  lang === 'ar' 
                    ? 'الرادار الأرضي (GPR) يطلق ترددات كهرومغناطيسية قصيرة لترسم الأقواس القطعية ملامسات الغرف الضحلة والقنوات المردومة بدقة سنتيمترية.' 
                    : 'GPR releases electromagnetic pulses. Radargram hyperbola apexes locate the exact top of shallow rooms and dry voids.'
                )}
                {activeInstrument === 'magnetometer' && (
                  lang === 'ar' 
                    ? 'المسح المغناطيسي يتتبع التشوهات والآثار ذات الشحنات المعدنية المنغرسة، ليكشف الأهداف الفلزية عن طريق رصد أقطاب الممانعة الثنائية.' 
                    : 'Magnetometers scan total field shifts. Localized magnetic dipoles indicate metallic burials, ancient iron armaments, or masonry.'
                )}
                {activeInstrument === 'pi3d' && (
                  lang === 'ar' 
                    ? 'نظام الحث النبضي ثلاثي الأبعاد يعطي موصلية ممتازة للتمييز بين الذهب والنحاس والحديد داخل التجاويف المبنية تحت السطح.' 
                    : 'Pulse induction 3D uses high electromagnetic decay tail mapping to distinguish noble relics from ferrous structural metals.'
                )}
                {activeInstrument === 'ert' && (
                  lang === 'ar' 
                    ? 'أشواط التصوير المقاومتي ERT تستنتج رطوبة وطبيعة الصخور. التجاويف الهوائية تعطي مقاومة كهربية عالية جداً مقارنة بالمياه والصلصال.' 
                    : 'Electrical Resistivity Tomography (ERT) reveals deep structural aquifers. Dry air cave voids show immense resistance contrasts.'
                )}
                {activeInstrument === 'seismic' && (
                  lang === 'ar' 
                    ? 'العدسات الزلزالية الانكسارية تقيس فارق سرعة وصول الموجات الصوتية لتحديد مستوى الصخر الصلب تحت التربة الهشة وخطوط الفوالق التكتونية.' 
                    : 'Seismic refraction parses shockwaves back. Sound speeds jump radically from weak topsoils directly down into basalt bedrock.'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN VISUALIZER WORKSPACE */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* INSTRUMENT CONTROLS PANEL */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-gray-950/80 border-gray-850' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h4 className="text-xs font-mono uppercase tracking-wider font-extrabold text-indigo-500 mb-3 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'معايير التحكم بالمسبار في الوقت الفعلي' : 'REAL-TIME PROBE PARAMETERS'}
            </h4>

            {/* DYNAMIC FORMS ACCORDING TO INSTRUMENT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              
              {/* GPR CONTROLS */}
              {activeInstrument === 'gpr' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'التردد الراداري:' : 'Radar Frequency:'}</span>
                      <span className="text-rose-400 font-bold">{gprFrequency} MHz</span>
                    </div>
                    <input
                      type="range"
                      min="250"
                      max="900"
                      step="50"
                      value={gprFrequency}
                      onChange={(e) => setGprFrequency(parseInt(e.target.value))}
                      className="accent-rose-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>250M (عميق)</span>
                      <span>900M (دقيق)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'المقاومة الكهربية للصخور (Er):' : 'Dielectric Constant (Er):'}</span>
                      <span className="text-rose-400 font-bold">{gprDielectric} ε_r</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="16"
                      step="1"
                      value={gprDielectric}
                      onChange={(e) => setGprDielectric(parseInt(e.target.value))}
                      className="accent-rose-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>4 (رمل جاف)</span>
                      <span>16 (طين رطب)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'العمق المستهدف الفعلي:' : 'Target Cavity Depth:'}</span>
                      <span className="text-rose-400 font-bold">{gprTargetDepth.toFixed(1)} {lang === 'ar' ? 'أمتار' : 'm'}</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.5"
                      step="0.1"
                      value={gprTargetDepth}
                      onChange={(e) => setGprTargetDepth(parseFloat(e.target.value))}
                      className="accent-rose-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>1.0m (ضحل)</span>
                      <span>4.5m (عمق أشد)</span>
                    </div>
                  </div>
                </>
              )}

              {/* MAGNETOMETER CONTROLS */}
              {activeInstrument === 'magnetometer' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'إزاحة القطب الثنائي:' : 'Dipole Offset:'}</span>
                      <span className="text-amber-400 font-bold">{magDipoleOffset > 0 ? '+' : ''}{magDipoleOffset} {lang === 'ar' ? 'أمتار' : 'm'}</span>
                    </div>
                    <input
                      type="range"
                      min="-4"
                      max="4"
                      step="1"
                      value={magDipoleOffset}
                      onChange={(e) => setMagDipoleOffset(parseInt(e.target.value))}
                      className="accent-amber-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>-4m (يسار)</span>
                      <span>+4m (يمين)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'تباين الشحنة المعدنية (nT):' : 'Dipole Amplitude:'}</span>
                      <span className="text-amber-400 font-bold">±{magContrast} nT</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="50"
                      value={magContrast}
                      onChange={(e) => setMagContrast(parseInt(e.target.value))}
                      className="accent-amber-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>100 nT (خفيف)</span>
                      <span>500 nT (قوي جداً)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'مسبار التتبع العمود رقم:' : 'Active Sensor Col:'}</span>
                      <span className="text-amber-400 font-bold">Col #{activeMagSensorX + 1}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="9"
                      step="1"
                      value={activeMagSensorX}
                      onChange={(e) => setActiveMagSensorX(parseInt(e.target.value))}
                      className="accent-amber-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>Col 1</span>
                      <span>Col 10</span>
                    </div>
                  </div>
                </>
              )}

              {/* PULSE INDUCTION 3D CONTROLS */}
              {activeInstrument === 'pi3d' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'عرض النبض المولد:' : 'Pulse Width:'}</span>
                      <span className="text-emerald-400 font-bold">{piWidth} μs</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      step="25"
                      value={piWidth}
                      onChange={(e) => setPiWidth(parseInt(e.target.value))}
                      className="accent-emerald-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>50 μs (سريع)</span>
                      <span>300 μs (شديد)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'حساسية المكتشف الكبروية:' : 'Scan Sensitivity:'}</span>
                      <span className="text-emerald-400 font-bold">{piSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={piSensitivity}
                      onChange={(e) => setPiSensitivity(parseInt(e.target.value))}
                      className="accent-emerald-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>50% (ضعيف)</span>
                      <span>100% (أقصى عمق)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 justify-center">
                    <button
                      type="button"
                      disabled={piScanning}
                      onClick={startPI3DScan}
                      className={`w-full py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        piScanning 
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-900 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-gray-950 border-emerald-400 shadow-sm'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 ${piScanning ? 'animate-spin' : ''}`} />
                      <span>{piScanning ? (lang === 'ar' ? 'جاري بث النبضة والتردد...' : 'Pulse Active...') : (lang === 'ar' ? 'بدء ممر الحث الكهرومغناطيسي' : 'Trigger PI-3D Pulse')}</span>
                    </button>
                  </div>
                </>
              )}

              {/* ERT CONTROLS */}
              {activeInstrument === 'ert' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'تباعد الأقطاب الفعلي:' : 'Electrode Spacing:'}</span>
                      <span className="text-sky-400 font-bold">{ertElectrodeSpacing} {lang === 'ar' ? 'أمتار' : 'm'}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      value={ertElectrodeSpacing}
                      onChange={(e) => setErtElectrodeSpacing(parseInt(e.target.value))}
                      className="accent-sky-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>2m (مفصل)</span>
                      <span>8m (عميق جداً)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'شدة تيار الحقن المستمر:' : 'Injected Current:'}</span>
                      <span className="text-sky-400 font-bold">{ertCurrent} mA</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="50"
                      value={ertCurrent}
                      onChange={(e) => setErtCurrent(parseInt(e.target.value))}
                      className="accent-sky-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>100 mA (أمان)</span>
                      <span>500 mA (طاقة عظمى)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-gray-400">{lang === 'ar' ? 'هندسة توزيع الأقطاب:' : 'Array Geometry:'}</span>
                    <select
                      value={ertArrayType}
                      onChange={(e) => setErtArrayType(e.target.value as any)}
                      className="bg-gray-900 border border-gray-800 text-gray-200 px-2 py-1.5 rounded focus:outline-none focus:border-sky-500 text-xs font-mono"
                    >
                      <option value="wenner">Wenner (γ) - {lang === 'ar' ? 'حساسية عمودية ممتازة' : 'Vertical Stratification'}</option>
                      <option value="schlumberger">Schlumberger - {lang === 'ar' ? 'أفقية وعمودية متزنة' : 'Balanced Mid-depth'}</option>
                      <option value="dipoledipole">Dipole-Dipole - {lang === 'ar' ? 'دقة تفصيلية للفراغات' : 'High Lateral Anomaly'}</option>
                    </select>
                  </div>
                </>
              )}

              {/* SEISMIC CONTROLS */}
              {activeInstrument === 'seismic' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'عمق مستوى الصخر الفولاذي:' : 'Model Bedrock Depth:'}</span>
                      <span className="text-purple-400 font-bold">{seismicBedrockDepth} {lang === 'ar' ? 'أمتار' : 'm'}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="35"
                      step="1"
                      value={seismicBedrockDepth}
                      onChange={(e) => {
                        setSeismicBedrockDepth(parseInt(e.target.value));
                        setSeismicTriggered(true);
                      }}
                      className="accent-purple-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>10m (مرتفع)</span>
                      <span>35m (سحيق)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'سرعة موجات التربة (v1):' : 'Regolith Velocity v1:'}</span>
                      <span className="text-purple-400 font-bold">{seismicSoilVelocity} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="350"
                      max="1200"
                      step="50"
                      value={seismicSoilVelocity}
                      onChange={(e) => {
                        setSeismicSoilVelocity(parseInt(e.target.value));
                        setSeismicTriggered(true);
                      }}
                      className="accent-purple-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>350 m/s (رمال)</span>
                      <span>1200 m/s (سرير متصلب)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{lang === 'ar' ? 'سرعة الصخر الجيري المقاوم (v2):' : 'Limestone Bedrock v2:'}</span>
                      <span className="text-purple-400 font-bold">{seismicRockVelocity} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="2200"
                      max="4800"
                      step="200"
                      value={seismicRockVelocity}
                      onChange={(e) => {
                        setSeismicRockVelocity(parseInt(e.target.value));
                        setSeismicTriggered(true);
                      }}
                      className="accent-purple-500 w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>2200 m/s (طبشوري)</span>
                      <span>4800 m/s (صوان صلب)</span>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* RENDERING SEPARATE OUTPUT CHARTS AND INTERACTIVE LAYOUTS PER INSTRUMENT */}
          <div className={`p-4 rounded-xl border flex-1 flex flex-col min-h-[300px] justify-between ${
            isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-white border-slate-200'
          }`}>
            
            {/* 1A. GPR WORKSPACE (2D AND 3D VISUALIZER) */}
            {activeInstrument === 'gpr' && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-950">
                  <h5 className="text-[11px] font-mono tracking-wider text-rose-400 flex items-center gap-1.5 uppercase font-extrabold">
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                    {lang === 'ar' ? 'مخطط الرادار الأرضي ثنائي وثنائي الأبعاد (GPR Radargram Profile)' : '2D & 3D Interactive Radargram Waveform'}
                  </h5>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">
                    {lang === 'ar' ? 'بث الإشارات: مستمر' : 'RF Downlink: STABLE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  
                  {/* 2D Reflection Wave Hyperbolas Chart */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '١. رادار مقطعي ثنائي الأبعاد (انعكاسات موجات الأقواس القطعية)' : 'I. 2D Cross Section (Hyperbola Echo Depth / t-x)'}
                    </span>
                    <div className="w-full h-52 text-[9px] select-none font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gprPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="distance" stroke="#6b7280" />
                          <YAxis domain={[0, 45]} reversed stroke="#6b7280" label={{ value: lang === 'ar' ? 'زمن الموجة في الثانية النانوية (ns)' : 'Two-way Travel Time (ns)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />
                          <Tooltip 
                            contentStyle={isDark ? { backgroundColor: '#0c0a09', borderColor: '#292524', fontSize: '9px', borderRadius: '6px' } : { fontSize: '9px' }}
                          />
                          <Line type="monotone" dataKey="SoilBoundary" name={lang === 'ar' ? 'سطح التربة' : 'Regolith Base'} stroke="#d97706" dot={false} strokeWidth={1} strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="CavernHyperbola" name={lang === 'ar' ? 'سقف التجويف المكتشف' : 'Cavern Arch Echo'} stroke="#f43f5e" dot={false} strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 3D simulated mesh of hyperbolas */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400 animate-pulse">
                      {lang === 'ar' ? '٢. تمثيل الفراغ الهوائي المجسم ثلاثي الأبعاد (Waterfall Mesh)' : 'II. 3D Spatial Echo Waterfall Array'}
                    </span>
                    
                    {/* Beautiful SVG Isometric Hyperbola slices */}
                    <div className={`flex-1 min-h-[190px] border rounded-lg flex items-center justify-center relative ${
                      isDark ? 'bg-black/40 border-gray-900' : 'bg-slate-50'
                    }`}>
                      <svg width="100%" height="100%" viewBox="0 0 300 180" className="absolute">
                        {/* Draw simulated 3D subsurface planes */}
                        <polygon points="40,20 260,20 280,60 20,60" fill={isDark ? "rgba(31,41,55,0.2)" : "rgba(203,213,225,0.2)"} stroke={isDark ? "#374151" : "#cbd5e1"} strokeWidth="1" />
                        <line x1="20" y1="60" x2="20" y2="150" stroke={isDark ? "#1f2937" : "#e2e8f0"} strokeDasharray="2 2" />
                        <line x1="280" y1="60" x2="280" y2="150" stroke={isDark ? "#1f2937" : "#e2e8f0"} strokeDasharray="2 2" />
                        
                        {/* Level indicators */}
                        <text x="25" y="145" fill="#ef4444" fontSize="8" fontFamily="monospace">0.0m</text>
                        <text x="25" y="110" fill="#ef4444" fontSize="8" fontFamily="monospace">{(gprTargetDepth/2).toFixed(1)}m</text>
                        <text x="25" y="75" fill="#ef4444" fontSize="8" fontFamily="monospace">{(gprTargetDepth).toFixed(1)}m</text>

                        {/* Drawing 3 staggered hyperbola curves to mimic a 3D subsurface dome structure! */}
                        {[-50, 0, 50].map((offsetZ, idx) => {
                          const baseHeight = 110 + idx * 12;
                          const apexX = 150 + offsetZ * 0.45;
                          const apexY = baseHeight - (gprTargetDepth * 14) + (gprFrequency / 35);
                          // Calculate path
                          let path = `M ${apexX - 80} ${apexY + 45}`;
                          for (let dX = -80; dX <= 80; dX += 5) {
                            const curveY = apexY + Math.sqrt(300 + dX*dX * (16 / gprDielectric)) * 0.9;
                            path += ` L ${apexX + dX} ${curveY}`;
                          }
                          const strokeColor = idx === 1 ? "#ef4444" : idx === 0 ? "#ec4899" : "#a855f7";

                          return (
                            <path 
                              key={idx} 
                              d={path} 
                              fill="none" 
                              stroke={strokeColor} 
                              strokeWidth={idx === 1 ? "2.5" : "1.2"} 
                              opacity={0.3 + (idx * 0.3)} 
                            />
                          );
                        })}

                        {/* Apex indicator spot */}
                        <circle cx="150" cy={110 - (gprTargetDepth * 14) + (gprFrequency / 35) + 16} r="4" fill="#10b981" />
                        <text x="160" y={110 - (gprTargetDepth * 14) + (gprFrequency / 35) + 18} fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {lang === 'ar' ? 'سقف الكهف الموثق' : 'TOP OF CAVERN'}
                        </text>

                        {/* Background mesh grid lines */}
                        <path d="M 40,30 L 260,30 M 40,40 L 260,40 M 40,50 L 260,50" stroke={isDark ? "#111827" : "#f1f5f9"} strokeWidth="0.5" />
                      </svg>
                      
                      {/* Depth math metrics overlay */}
                      <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded bg-black/80 font-mono text-[9px] text-gray-400 border border-gray-800">
                        <span className="text-gray-500 uppercase block mb-0.5">{lang === 'ar' ? 'حساب المعاوقة الرادارية:' : 'RADAR PROPAGATION CALCULATOR'}</span>
                        Wave Velocity: <span className="text-white font-bold">{emVelocity.toFixed(3)} m/ns</span><br />
                        Ceiling Depth: <span className="text-emerald-400 font-extrabold">{gprTargetDepth.toFixed(2)} meters</span><br />
                        Reflectivity Amp: <span className="text-rose-400 font-bold">{(75 * gprGain * Math.exp(-0.04 * gprTargetDepth)).toFixed(0)} dB</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 1B. MAGNETOMETER WORKSPACE (DIPOLE MAPS & PROFILES) */}
            {activeInstrument === 'magnetometer' && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-950">
                  <h5 className="text-[11px] font-mono tracking-wider text-amber-400 flex items-center gap-1.5 uppercase font-extrabold">
                    <Tv className="w-4 h-4 text-amber-500 animate-[bounce_4s_infinite]" />
                    {lang === 'ar' ? 'دراسة القطب المغناطيسي المزدوج (Magnetic Dipole & Quadrupole Spatial Map)' : 'Magnetic Dipole Anomaly Matrix & Grid Profile'}
                  </h5>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">
                    {lang === 'ar' ? 'الحث: مغناطيسي أرضي' : 'Source: Earth Geomagnetic Vector'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  
                  {/* Heatmap of dipole anomaly */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '١. شبكة الحث المغناطيسي الجزئية (Magnetic Dipole Heatmap)' : 'I. Magnetic Flux Dipole Heatmap (nT Anomaly Dev)'}
                    </span>
                    <div className="flex flex-col gap-1 items-center justify-center flex-1 border dark:border-gray-900 rounded-lg p-3">
                      <div className="grid grid-cols-10 gap-0.5" style={{ width: '180px', height: '180px' }}>
                        {magGrid.map((row, rIdx) => 
                          row.map((val, cIdx) => {
                            // Map positive to red, negative to blue, intermediate to neutral gray
                            let cellBg = 'rgb(30, 41, 59)'; // neutral Slate
                            if (val > 25) {
                              const trans = Math.min(1, val / 450);
                              cellBg = `rgba(239, 68, 68, ${trans})`; // Positive red
                            } else if (val < -25) {
                              const trans = Math.min(1, Math.abs(val) / 450);
                              cellBg = `rgba(59, 130, 246, ${trans})`; // Negative blue
                            }
                            
                            const isProbeCol = cIdx === activeMagSensorX;

                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                style={{ backgroundColor: cellBg }}
                                className={`w-4 h-4 rounded-[1px] transition-all relative cursor-pointer flex items-center justify-center border ${
                                  isProbeCol ? 'border-amber-400/80 scale-105 z-10' : 'border-black/20'
                                }`}
                                title={`Col ${cIdx+1}, Row ${rIdx+1}: ${val > 0 ? '+' : ''}${val} nT`}
                                onClick={() => setActiveMagSensorX(cIdx)}
                              />
                            );
                          })
                        )}
                      </div>
                      
                      {/* Horizontal column geophone index line */}
                      <div className="flex gap-[2px] text-[8px] font-mono text-gray-500 mt-1" style={{ width: '180px', justifyContent: 'space-between' }}>
                        <span>-7.5m</span>
                        <span>0m (Center)</span>
                        <span>+7.5m</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic 1D Profile charts of column */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '٢. المظهر الجانبي للنبض المغناطيسي (Geomagnetic Cross Section)' : 'II. Selected Col cross section gradient (Bz nT Curve)'}
                    </span>
                    <div className="w-full h-44 text-[9px] select-none font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={magProfile} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMag" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="pointName" stroke="#6b7280" />
                          <YAxis domain={[-450, 450]} stroke="#6b7280" label={{ value: 'Bz Anomaly (nT)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />
                          <Tooltip contentStyle={isDark ? { backgroundColor: '#0c0a09' } : {}} />
                          <CartesianGrid strokeDasharray="2 2" stroke={isDark ? "#292524" : "#e2e8f0"} />
                          <Area type="monotone" dataKey="magneticIntensity" name="Local Anomaly" stroke="#f59e0b" strokeWidth={2} fill="url(#colorMag)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Sensor Probe status line */}
                    <div className={`p-2 rounded border text-[10px] font-mono ${
                      isDark ? 'bg-black/40 border-gray-900 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <span className="text-amber-400 font-bold">{lang === 'ar' ? 'حالة مسبار العمود المقترن:' : 'COLUMN STATION MONITOR:'}</span>
                      <br />
                      Station: <span className="text-white font-bold">{((activeMagSensorX - 5) * 1.5).toFixed(1)} meters</span>
                      {' | '}
                      Geomagnetic Total Field: <span className="text-white font-bold">{(magBackground + magProfile[activeMagSensorX].magneticIntensity).toFixed(0)} nT</span>
                      {' | '}
                      Delta Shift: <span className="text-rose-500 font-bold">{magProfile[activeMagSensorX].magneticIntensity} nT</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. PULSE INDUCTION 3D (SWEPT TREASURES & CAVITIES) */}
            {activeInstrument === 'pi3d' && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-950">
                  <h5 className="text-[11px] font-mono tracking-wider text-emerald-400 flex items-center gap-1.5 uppercase font-extrabold">
                    <Zap className="w-4 h-4 text-emerald-500 animate-[pulse_1.5s_infinite]" />
                    {lang === 'ar' ? 'مسح التخطيط المجسم ثلاثي الأبعاد بالنبض الكهرومغناطيسي' : 'Electromagnetic Pulse Induction 3D Target Catalog'}
                  </h5>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">
                    {lang === 'ar' ? 'شريحة الأعماق: متوازنة' : 'Slice Resolution: 3D Voxels'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  
                  {/* PI-3D simulated mesh of underground items */}
                  <div className="flex flex-col gap-2 flex-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '١. شبكة المجسمات الممسوحة ثلاثية الابعاد:' : 'I. Volumetric Isometric target array'}
                    </span>

                    <div className={`flex-1 min-h-[190px] border rounded-lg flex items-center justify-center relative p-3 ${
                      isDark ? 'bg-black/50 border-gray-900' : 'bg-slate-50'
                    }`}>
                      {piScanning ? (
                        <div className="text-center flex flex-col items-center gap-2">
                          <Zap className="w-10 h-10 text-emerald-400 animate-bounce pointer-events-none" />
                          <span className="font-mono text-xs text-emerald-500 animate-pulse">{lang === 'ar' ? 'جاري استثارة الموصلية المغناطيسية...' : 'EXCITING INDUCTION COILS...'}</span>
                          <div className="w-40 bg-gray-800 rounded-full h-1.5">
                            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${piScanProgress}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">{piScanProgress}% completed</span>
                        </div>
                      ) : (
                        <div className="w-full h-full relative flex items-center justify-center">
                          {/* Simulated 3D isometric subsurface cubes/targets with pure SVG blocks! */}
                          <svg width="100%" height="100%" viewBox="0 0 300 160" className="absolute">
                            {/* Terrain Base Floor */}
                            <polygon points="40,20 260,20 280,60 20,60" fill="none" stroke={isDark ? "#374151" : "#cbd5e1"} strokeWidth="1" />
                            
                            {/* Staggered Voxel Targets */}
                            {piFoundTargets.map((item, idx) => {
                              // Isometric coordinate conversion
                              // Let grid map be x: 0 to 10, y: 0 to 10
                              // IsoX = 150 + (x - y) * 12
                              // IsoY = 50 + (x + y) * 6 + (depth * 6)
                              const isoX = 150 + (item.x - item.y) * 14;
                              const isoY = 40 + (item.x + item.y) * 7 + (item.depth * 5);
                              
                              const color = item.id === 101 ? "#fbbf24" : item.id === 102 ? "#a855f7" : "#06b6d4";

                              return (
                                <g key={item.id} className="cursor-pointer group">
                                  {/* Translucent depth pole */}
                                  <line x1={isoX} y1="35" x2={isoX} y2={isoY} stroke="#10b981" strokeDasharray="3 3" opacity="0.4" />
                                  
                                  {/* 3D Target Cube drawing */}
                                  {/* Front Face */}
                                  <polygon points={`${isoX-10},${isoY} ${isoX},${isoY+5} ${isoX+10},${isoY} ${isoX},${isoY-5}`} fill={color} stroke="#000" strokeWidth="0.5" opacity="0.9" />
                                  <polygon points={`${isoX-10},${isoY} ${isoX},${isoY+5} ${isoX},${isoY+15} ${isoX-10},${isoY+10}`} fill={color} filter="brightness(0.7)" stroke="#000" strokeWidth="0.5" />
                                  <polygon points={`${isoX},${isoY+5} ${isoX+10},${isoY} ${isoX+10},${isoY+10} ${isoX},${isoY+15}`} fill={color} filter="brightness(0.5)" stroke="#000" strokeWidth="0.5" />

                                  <circle cx={isoX} cy={isoY+5} r="2" fill="#fff" />
                                  <text x={isoX - 25} y={isoY - 12} fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace" className="hidden group-hover:block bg-black p-1">
                                    {item.id === 101 ? 'GOLD/BRONZE' : item.id === 102 ? 'SILVER cache' : 'CAVERN VOID'}
                                  </text>
                                </g>
                              );
                            })}

                            <text x="10" y="20" fill="#6b7280" fontSize="8" fontFamily="monospace">ISO ROTATION: 35°</text>
                            <text x="10" y="32" fill="#6b7280" fontSize="8" fontFamily="monospace">GRID SIZE: 15m x 15m</text>
                          </svg>

                          {piFoundTargets.length === 0 && (
                            <span className="text-gray-500 text-[10px] font-mono absolute p-3 text-center">
                              {lang === 'ar' ? 'قم بالضغط على الزر أعلاه لتتولى النبضة الكهرومغناطيسية شحن المجال المغناطيسي ورسم الخريطة.' : 'Click "Trigger PI-3D Pulse" above to excite target particles.'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metal decay list / specifications */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '٢. النشرة الطيفية لمعدل تلاشي تيار الحث (Metal Decay Catalogs):' : 'II. Pulse Induction Electromagnetic Decay Spectrum'}
                    </span>
                    
                    <div className="flex flex-col gap-2 flex-1 justify-start">
                      {piFoundTargets.length > 0 ? (
                        piFoundTargets.map((target) => (
                          <div
                            key={target.id}
                            className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-center justify-between ${
                              isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-emerald-400">#{target.id} • {target.type}</span>
                              <span className="text-[9.5px] text-gray-500">
                                Spatial Location: Grid ({target.x}, {target.y}) | Modeled Depth: <span className="text-rose-400 font-bold">{target.depth}m</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-400 block">{target.confidence}% {lang === 'ar' ? 'مطابقة' : 'Match'}</span>
                              <span className="text-[9px] text-gray-400">Decay: {target.id === 101 ? 'Slow (Gold)' : target.id === 102 ? 'Medium (Ag)' : 'Immediate'}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={`p-4 rounded-lg border border-dashed text-center text-xs text-gray-400 py-10 ${
                          isDark ? 'border-gray-800' : 'border-slate-200'
                        }`}>
                          {lang === 'ar' ? 'بانتظار مسار إطلاق الحث الكهرومغناطيسي...' : 'Pending electro-induction trigger...'}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 3A. ELECTRICAL RESISTIVITY TOMOGRAPHY (ERT PSEUDO-SECTIONS) */}
            {activeInstrument === 'ert' && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-950">
                  <h5 className="text-[11px] font-mono tracking-wider text-sky-400 flex items-center gap-1.5 uppercase font-extrabold">
                    <Grid className="w-4 h-4 text-sky-500" />
                    {lang === 'ar' ? 'منظور المقاومية الكهربية متعدد القنوات (ERT Tomography Pseudo-Section)' : 'Electrical Resistivity Tomography (ERT) Contrast Section'}
                  </h5>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">
                    {lang === 'ar' ? 'مصفوفة المسح: نشطة' : 'Electrode Array: ACTIVE'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-[10px] font-mono uppercase text-gray-400">
                    {lang === 'ar' ? 'مستويات رطوبة الصخور والمقاومات الكلية لجوف الأرض (عمق ٠-٢٥م):' : 'Strata resistivity mapping (0 to 25 meters deep profile):'}
                  </span>

                  {/* ERT beautiful 2D slice layout */}
                  <div className="flex flex-col gap-1 overflow-x-auto p-2 border dark:border-gray-900 rounded-lg">
                    <div className="flex flex-col gap-1 min-w-[480px]">
                      {ertGrid.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1 items-center">
                          <span className="text-[8.5px] font-mono text-gray-500 w-10 text-right">
                            {(rIdx * 2.5).toFixed(1)}m
                          </span>
                          <div className="flex gap-1 flex-1 justify-between">
                            {row.map((cell, cIdx) => {
                              // Convert resistivity to beautiful theme colors
                              // High resistivity (5000) -> bright purple/yellow
                              // Medium resistivity (1000) -> slate gray/brown
                              // Low wet resistivity (20) -> deep ocean cyan-blue
                              let cellColor = '#1e293b';
                              let lbl = 'Limestone';
                              
                              if (cell.resistivity >= 3000) {
                                cellColor = '#a855f7'; // purple cavity
                                lbl = 'Air Void';
                              } else if (cell.resistivity > 1100) {
                                cellColor = '#eab308'; // dry sand/soil yellow
                                lbl = 'Dry Sand';
                              } else if (cell.resistivity > 450) {
                                cellColor = '#475569'; // hard limestone
                                lbl = 'Limestone';
                              } else if (cell.resistivity > 100) {
                                cellColor = '#3b82f6'; // moist silt
                                lbl = 'Moist Silt';
                              } else {
                                cellColor = '#06b6d4'; // water table cyan
                                lbl = 'Aquifer';
                              }

                              return (
                                <div
                                  key={`${rIdx}-${cIdx}`}
                                  style={{ backgroundColor: cellColor }}
                                  className="w-full h-4 rounded-[1px] cursor-pointer hover:ring-1 hover:ring-white transition-all text-[0px] hover:text-[8px] flex items-center justify-center font-mono text-white font-bold"
                                  title={`Dist: ${cell.x}m, Depth: ${cell.y}m | Res: ${cell.resistivity} Ω-m (${lbl})`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Ground distance rule */}
                    <div className="flex gap-1 items-center justify-between text-[8px] font-mono text-gray-500 min-w-[480px] mt-1 pt-1 border-t border-dashed dark:border-gray-900">
                      <span className="w-10 text-right">0m</span>
                      <span>8m</span>
                      <span>16m</span>
                      <span>24m</span>
                      <span>32m</span>
                      <span>40m (Survey Limit)</span>
                    </div>
                  </div>

                  {/* Heatmap legend keys */}
                  <div className="flex flex-wrap gap-4 text-[9.5px] font-mono mt-1 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-purple-500 inline-block pointer-events-none" />
                      {lang === 'ar' ? 'تجويف هوائي جاف (Air Void): >3000 Ω-m' : 'Dry Cavern Void (>3000 Ω-m)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-yellow-500 inline-block pointer-events-none" />
                      {lang === 'ar' ? 'صخور رسوبية جافة (Lithosol/Sand): ~1200 Ω-m' : 'Sedimentary Overburden (~1200 Ω-m)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-slate-600 inline-block pointer-events-none" />
                      {lang === 'ar' ? 'الحجر الجيري السفلي (Limestone Bedrock): ~750 Ω-m' : 'Basal Limestone Bedrock (~750 Ω-m)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-cyan-500 inline-block pointer-events-none" />
                      {lang === 'ar' ? 'خزانات مياه جوفية (Aquifer/Clay): <50 Ω-m' : 'Deep Wet Aquifer (<50 Ω-m)'}
                    </span>
                  </div>

                </div>
              </div>
            )}

            {/* 3B. SEISMIC REFRACTION SURVEY (P/S-WAVE GRAPHS) */}
            {activeInstrument === 'seismic' && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-950">
                  <h5 className="text-[11px] font-mono tracking-wider text-purple-400 flex items-center gap-1.5 uppercase font-extrabold">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    {lang === 'ar' ? 'مستشعرات تكسير الموجات الصوتية والعمق الصخري (Seismic Velocity Graph)' : 'Seismic Refraction Shockwave Arrival Velocity Graph'}
                  </h5>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">
                    {lang === 'ar' ? 'النبض: مطرقة كهروميكانيكية' : 'Initiator: Hammer Impulse'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  
                  {/* Recharts chart comparing times */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '١. الرسم البياني لزمن ممر الانكسار الهيكلي:' : 'I. Travel Time (t) vs Geophone Distance (x) Curve'}
                    </span>
                    
                    <div className="w-full h-44 text-[9px] select-none font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seismicPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="meters" stroke="#6b7280" label={{ value: lang === 'ar' ? 'المسافة عن الانفجار (m)' : 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#6b7280' }} />
                          <YAxis stroke="#6b7280" label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />
                          <Tooltip contentStyle={isDark ? { backgroundColor: '#0c0a09' } : {}} />
                          <CartesianGrid strokeDasharray="2 2" stroke={isDark ? "#292524" : "#e2e8f0"} />
                          <Line type="monotone" dataKey="DirectWave" name={lang === 'ar' ? 'موجة مباشرة (السطح)' : 'Direct Wave (V1)'} stroke="#e9d5ff" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="RefractedWave" name={lang === 'ar' ? 'موجة منكسرة (الصخر)' : 'Refracted Wave (V2)'} stroke="#a855f7" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="FirstArrival" name={lang === 'ar' ? 'زمن أول وصول فعلي' : 'First Arrival Envelope'} stroke="#c084fc" strokeWidth={3} dot={true} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Calculations & Seismic Parameters explanation */}
                  <div className="flex flex-col gap-2 justify-center">
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {lang === 'ar' ? '٢. النماذج الرياضية واستنتاج عمق الصخر الجيولوجي:' : 'II. Computational Refraction Output'}
                    </span>

                    <div className={`p-3 rounded-lg border text-[11px] font-mono leading-relaxed space-y-1.5 ${
                      isDark ? 'bg-black/40 border-gray-900 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <span className="text-purple-400 font-bold uppercase">{lang === 'ar' ? 'سلسلة الحسابات النشطة:' : 'BEDROCK RECONSTRUCTION FORMULA:'}</span>
                      </div>
                      <div className="text-[10.5px] font-sans">
                        {lang === 'ar' ? 'باقتصاص تلاقي الزمن المباشر والانكساري، نحسب نقطة الكسر الحرج للمسافة:' : 'At critical angle θ_c, waves refract along rock ceiling boundary at higher speed v2.'}
                      </div>
                      
                      <div className="bg-black/30 p-2 rounded text-[10.5px] text-gray-450 border border-gray-900 font-mono">
                        Regolith Layer: <span className="text-white">{v1} m/s</span><br />
                        Bedrock Core: <span className="text-white">{v2} m/s</span><br />
                        Critical Crossing Distance: <span className="text-purple-400 font-bold">{(2 * seismicBedrockDepth * Math.sqrt((v2 + v1)/(v2 - v1))).toFixed(1)} meters</span><br />
                        Estimated Bedrock Top: <span className="text-emerald-400 font-extrabold">{seismicBedrockDepth.toFixed(1)} meters deep</span>
                      </div>

                      <div className="text-[10px] text-gray-500">
                        {lang === 'ar' ? 'حسابات الانكسار تتوافق بالكامل مع معايير طبقات الارض لسهول أدلب وحماة.' : 'Refraction parameters calibrated to Syrian steppe limestone layer interfaces.'}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STATUS AND GEOLOCATION LOCK INFORMATION */}
            <div className={`mt-3 p-2.5 rounded border text-[10px] font-mono flex flex-col md:flex-row justify-between gap-2 ${
              isDark ? 'bg-gray-900/40 border-gray-850 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-650'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-amber-500 animate-pulse inline-block" />
                <span>
                  {lang === 'ar' ? 'مسبار التتبع الجغرافي النشط:' : 'Active Geolocation Sensor Pivot:'}
                </span>
                <span className="text-white font-bold">
                  {currentLat.toFixed(5)}°N, {currentLon.toFixed(5)}°E
                </span>
              </div>
              <span className="text-right text-gray-500 font-bold uppercase">
                {lang === 'ar' ? 'صنفت البيانات طبقاً للمعايرة الجيوفيزيائية السورية' : 'DATA CALIBRATED FOR SYRIAN ARID LIMESTONE STRATA'}
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
