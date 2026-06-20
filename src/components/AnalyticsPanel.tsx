/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ResponsiveContainer } from 'recharts';
import { 
  Map, 
  Sliders, 
  ListFilter, 
  Download, 
  Star, 
  Sparkles, 
  Film, 
  ArrowRight, 
  Radio,
  Printer,
  X,
  Check,
  Settings,
  Eye,
  Activity
} from 'lucide-react';
import { ScanResults, CaveCandidate } from '../types';
import { Language, translations } from '../lib/translations';

interface AnalyticsPanelProps {
  results: ScanResults;
  selectedCandidateId: number | null;
  onSelectCandidate: (candidate: CaveCandidate) => void;
  onTriggerAnalysis: (candidate: CaveCandidate) => void;
  isAnalyzing: boolean;
  coronaYear: number;
  onCoronaYearChange: (year: number) => void;
  coronaOpacity: number;
  onCoronaOpacityChange: (opacity: number) => void;
  lang: Language;
  theme: 'dark' | 'light';
}

export default function AnalyticsPanel({
  results,
  selectedCandidateId,
  onSelectCandidate,
  onTriggerAnalysis,
  isAnalyzing,
  coronaYear,
  onCoronaYearChange,
  coronaOpacity,
  onCoronaOpacityChange,
  lang,
  theme,
}: AnalyticsPanelProps) {
  const [showExportToast, setShowExportToast] = useState(false);
  const [showRequestSuccess, setShowRequestSuccess] = useState(false);
  
  // Custom States for Compare Targets Mode & Printable report card
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareTab, setCompareTab] = useState<'elevation' | 'tpi'>('elevation');

  // Trigger confirmation message when isAnalyzing becomes true
  useEffect(() => {
    if (isAnalyzing) {
      setShowRequestSuccess(true);
    } else {
      setShowRequestSuccess(false);
    }
  }, [isAnalyzing]);

  // Printable single-candidate PDF report card modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [geologistName, setGeologistName] = useState('');
  const [classificationLevel, setClassificationLevel] = useState('TOP_SECRET');
  const [customNotes, setCustomNotes] = useState('');

  const t = translations[lang];

  const { candidates, dem_grid, tpi_grid, point, radius } = results;

  // Selected candidate entity
  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  // Dynamic localization defaults for PDF agency configurations
  useEffect(() => {
    setAgencyName(lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الجيو-أثرية' : 'GEO-ARCHAEOLOGICAL ADVANCED RES CONGRUENCE');
    setGeologistName(lang === 'ar' ? 'د. سارة المصري، رئيسة الجيولوجيين المعتمدين' : 'Dr. Sarah Al-Masri, Lead Field Geologist');
  }, [lang]);

  const getGridIndices = (cand: CaveCandidate) => {
    const pixelLatDegree = radius / 7.5;
    const pixelLonDegree = radius / 7.5;
    const cy = Math.max(0, Math.min(14, Math.round(7.5 - (cand.latitude - point.lat) / pixelLatDegree)));
    const cx = Math.max(0, Math.min(14, Math.round(7.5 + (cand.longitude - point.lon) / pixelLonDegree)));
    return { cy, cx };
  };

  const getProfileData = () => {
    if (!selectedCandidate) return [];
    const { cy } = getGridIndices(selectedCandidate);
    
    const sliceRow = dem_grid[cy] || dem_grid[7];
    const tpiRow = tpi_grid[cy] || tpi_grid[7];

    return sliceRow.map((elev, x) => {
      const offsetMeters = Math.round((x - 7) * 12.5);
      return {
        name: `${offsetMeters > 0 ? '+' : ''}${offsetMeters}m`,
        Elevation: parseFloat(elev.toFixed(1)),
        TPI: parseFloat(tpiRow[x].toFixed(2)),
        reference: 0,
      };
    });
  };

  const chartData = getProfileData();

  const getGprData = () => {
    if (!selectedCandidate) return [];
    
    const d0 = selectedCandidate.dimensions.depth_approx; // approximate ceiling depth in meters
    const dataPoints = [];
    for (let x = -15; x <= 15; x += 1.5) {
      const soilContact = 1.6 + Math.sin(x * 0.35) * 0.2;
      const horizontalFocusFactor = 0.55;
      const voidCeiling = Math.sqrt(Math.pow(d0, 2) + Math.pow(x * horizontalFocusFactor, 2));
      const thickness = selectedCandidate.dimensions.depth_approx * 0.9;
      const voidFloor = Math.sqrt(Math.pow(d0 + thickness, 2) + Math.pow(x * horizontalFocusFactor, 2));

      dataPoints.push({
        distance: `${x > 0 ? '+' : ''}${x}m`,
        rawDistance: x,
        SoilContact: parseFloat(soilContact.toFixed(2)),
        VoidCeiling: parseFloat(voidCeiling.toFixed(2)),
        VoidFloor: parseFloat(voidFloor.toFixed(2)),
      });
    }
    return dataPoints;
  };

  const gprData = getGprData();

  // Multi-target side-by-side calculation matrix
  const getCombinedCompareData = () => {
    if (compareIds.length < 2) return [];
    const cand1 = candidates.find(c => c.id === compareIds[0]);
    const cand2 = candidates.find(c => c.id === compareIds[1]);
    if (!cand1 || !cand2) return [];

    const idx1 = getGridIndices(cand1);
    const idx2 = getGridIndices(cand2);

    const sliceRow1 = dem_grid[idx1.cy] || dem_grid[7];
    const tpiRow1 = tpi_grid[idx1.cy] || tpi_grid[7];

    const sliceRow2 = dem_grid[idx2.cy] || dem_grid[7];
    const tpiRow2 = tpi_grid[idx2.cy] || tpi_grid[7];

    return sliceRow1.map((elev1, x) => {
      const offsetMeters = Math.round((x - 7) * 12.5);
      return {
        name: `${offsetMeters > 0 ? '+' : ''}${offsetMeters}m`,
        [`Target_${cand1.id}_Elevation`]: parseFloat(elev1.toFixed(1)),
        [`Target_${cand1.id}_TPI`]: parseFloat(tpiRow1[x].toFixed(2)),
        [`Target_${cand2.id}_Elevation`]: parseFloat(sliceRow2[x].toFixed(1)),
        [`Target_${cand2.id}_TPI`]: parseFloat(tpiRow2[x].toFixed(2)),
      };
    });
  };

  const compareChartData = getCombinedCompareData();

  // Create SVG vector lines for perfectly crisp printing on PDF reports
  const getElevationSvgPath = () => {
    if (chartData.length === 0) return { linePath: '', fillPath: '' };
    const width = 450;
    const height = 110;
    const minElev = Math.min(...chartData.map(p => p.Elevation)) - 1.5;
    const maxElev = Math.max(...chartData.map(p => p.Elevation)) + 1.5;
    const range = maxElev - minElev || 1;
    const wStep = width / (chartData.length - 1);

    const mapped = chartData.map((p, idx) => {
      const x = idx * wStep;
      const y = height - ((p.Elevation - minElev) / range) * height * 0.7 - 15;
      return `${x},${y}`;
    });

    return {
      linePath: `M ${mapped.join(' L ')}`,
      fillPath: `M 0,${height} L ${mapped.join(' L ')} L ${width},${height} Z`
    };
  };

  const elevationSvg = getElevationSvgPath();

  const getGprSvgPaths = () => {
    if (gprData.length === 0) return { soil: '', ceiling: '', floor: '' };
    const width = 450;
    const height = 110;
    const wStep = width / (gprData.length - 1);

    const mappedSoil = gprData.map((p, idx) => {
      const x = idx * wStep;
      const y = (p.SoilContact / 16) * height;
      return `${x},${y}`;
    });

    const mappedCeiling = gprData.map((p, idx) => {
      const x = idx * wStep;
      const y = (p.VoidCeiling / 16) * height;
      return `${x},${y}`;
    });

    const mappedFloor = gprData.map((p, idx) => {
      const x = idx * wStep;
      const y = (p.VoidFloor / 16) * height;
      return `${x},${y}`;
    });

    return {
      soil: `M ${mappedSoil.join(' L ')}`,
      ceiling: `M ${mappedCeiling.join(' L ')}`,
      floor: `M ${mappedFloor.join(' L ')}`,
    };
  };

  const gprSvg = getGprSvgPaths();

  const handleToggleCompare = (id: number) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter(x => x !== id);
      } else {
        if (prev.length >= 2) {
          return [prev[0], id];
        }
        return [...prev, id];
      }
    });
  };

  const getStampColor = () => {
    switch (classificationLevel) {
      case 'TOP_SECRET': return 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500 bg-red-50/10';
      case 'SECRET': return 'border-orange-500 text-orange-500 bg-orange-50/10';
      case 'CONFIDENTIAL': return 'border-blue-500 text-blue-500 bg-blue-50/10';
      case 'RESTRICTED': return 'border-yellow-500 text-yellow-500 bg-yellow-50/10';
      default: return 'border-gray-500 text-gray-500 bg-gray-50/10';
    }
  };

  const getStampLabel = () => {
    switch (classificationLevel) {
      case 'TOP_SECRET': return lang === 'ar' ? 'سري للغاية L-4' : 'TOP SECRET L4';
      case 'SECRET': return lang === 'ar' ? 'سري / مأمن' : 'SECRET SECURITY';
      case 'CONFIDENTIAL': return lang === 'ar' ? 'محدود / داخلي' : 'CONFIDENTIAL';
      case 'RESTRICTED': return lang === 'ar' ? 'أكاديمي مقيد' : 'RESTRICTED SCAN';
      default: return lang === 'ar' ? 'عام / أكاديمي' : 'UNCLASSIFIED';
    }
  };

  const handleRowClick = (cand: CaveCandidate) => {
    if (compareMode) {
      handleToggleCompare(cand.id);
    } else {
      onSelectCandidate(cand);
    }
  };

  const handleExportData = () => {
    const geoJson = {
      type: 'FeatureCollection',
      metadata: {
        region: results.region_name,
        center_pivot: [point.lon, point.lat],
        gdal_warp_reference: 'UTM Zone 37N / WGS84'
      },
      features: candidates.map((c) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [c.longitude, c.latitude]
        },
        properties: {
          id: c.id,
          classification: c.type,
          tpi_intensity_depth: c.intensity,
          confidence_rating: c.confidence,
          dimensions: c.dimensions,
          local_bedrock: c.geology_notes
        }
      }))
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TPI_Cave_Scan_${results.region_name.replace(/\s+/g, '_')}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 4500);
  };

  const handleExportTxt = () => {
    if (!selectedCandidate) return;
    const divider = "================================================================================\n";
    const subDivider = "--------------------------------------------------------------------------------\n";
    
    let content = "";
    content += divider;
    content += `[CLASSIFICATION: ${getStampLabel()}]\n`;
    content += `${agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الجيو-أثرية' : 'GEO-ARCHAEOLOGICAL ADVANCED RES CONGRUENCE')}\n`;
    content += `${lang === 'ar' ? 'تقرير المسح الراداري والارتفاع الشامل للعينة' : 'SUBSURFACE GPR SCAN SHEET: ANOMALY TARGET'} #${selectedCandidate.id}\n`;
    content += divider;
    content += `TARGET ID: #${selectedCandidate.id}\n`;
    content += `CLASSIFICATION: ${selectedCandidate.type}\n`;
    content += `LATITUDE / LONGITUDE: ${selectedCandidate.latitude.toFixed(5)}°N, ${selectedCandidate.longitude.toFixed(5)}°E\n`;
    content += `ESTIMATED DEPTH: ${selectedCandidate.dimensions.depth_approx.toFixed(1)}m\n`;
    content += `DIMENSIONS: ${selectedCandidate.dimensions.width}m width x ${selectedCandidate.dimensions.length}m length\n`;
    content += `CONFIDENCE ACCURACY RATING: ${selectedCandidate.confidence}%\n`;
    content += `SYSTEM REF TIMESTAMP: ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-US')}\n`;
    content += divider;
    content += "\n";

    content += `I. ${lang === 'ar' ? 'الملاحظات والقرائن الجيولوجية والأثرية' : 'SITE GEOLOGY & LOCAL BEDROCK SUMMARY'}\n`;
    content += subDivider;
    content += `${selectedCandidate.geology_notes}\n\n`;

    if (customNotes.trim() !== '') {
      content += `II. ${lang === 'ar' ? 'ملاحظات المسح الإضافية (ملحق الكهف)' : 'CUSTOM OBSERVATION ADDENDUM'}\n`;
      content += subDivider;
      content += `${customNotes}\n\n`;
    }

    content += `III. ${lang === 'ar' ? 'الاعتماد والأختام المعتمدة' : 'VERIFICATION COG SYSTEM ASSURANCE'}\n`;
    content += subDivider;
    content += `Lead Field Geologist: ${geologistName || (lang === 'ar' ? 'د. سارة المصري، رئيسة الجيولوجيين' : 'Dr. Sarah Al-Masri')}\n`;
    content += `Issuing Agency: ${agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الجيو-أثرية' : 'GEO-ARCHAEOLOGICAL ADVANCED RES CONGRUENCE')}\n`;
    content += `Security Classification: ${getStampLabel()}\n`;
    content += divider;

    // Trigger file download inline
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GPR-SURVEY-TARGET-${selectedCandidate.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isDark = theme === 'dark';

  // Selected candidates for comparison
  const cand1 = compareIds[0] ? candidates.find(c => c.id === compareIds[0]) : null;
  const cand2 = compareIds[1] ? candidates.find(c => c.id === compareIds[1]) : null;

  return (
    <div 
      className={`w-full lg:w-10 hover:lg:w-96 border-t lg:border-t-0 py-5 lg:px-0 hover:lg:px-5 flex flex-col gap-5 overflow-y-auto lg:overflow-hidden hover:lg:overflow-y-auto select-none grow-0 shrink-0 transition-all duration-500 ease-in-out group relative ${
        isDark 
          ? 'bg-gray-900 border-gray-800 lg:border-l text-gray-100' 
          : 'bg-white border-slate-200 lg:border-l text-slate-800'
      }`} 
      id="analytics-panel"
    >
      {/* Sleek Vertical Indicator when collapsed (desktop only) */}
      <div className="hidden lg:flex group-hover:hidden flex-col items-center gap-6 w-10 h-full pt-4 text-xs font-mono select-none text-emerald-500 font-bold border-l-2 border-emerald-580/20">
        <Activity className="w-5 h-5 animate-pulse text-emerald-500" />
        <div className="rotate-90 tracking-[0.25em] uppercase origin-left translate-x-[11px] translate-y-12 whitespace-nowrap text-[11px]">
          {lang === 'ar' ? 'التحليلات الجيولوجية 📊' : 'GEOLOGICAL ANALYTICS 📊'}
        </div>
      </div>

      {/* Main Content Container with transition */}
      <div className="flex flex-col gap-5 w-full lg:opacity-0 lg:scale-[0.98] group-hover:lg:scale-100 group-hover:lg:opacity-100 transition-all duration-350 ease-in-out lg:pointer-events-none group-hover:lg:pointer-events-auto h-full">
        {/* Target Candidates Ledger */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className={`text-xs uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <ListFilter className="w-3.5 h-3.5 text-yellow-500" />
            {t.detectedAnomalies} ({candidates.length})
          </h3>

          {/* Toggle Compare Mode */}
          <button
            type="button"
            onClick={() => {
              if (compareMode) {
                setCompareMode(false);
              } else {
                setCompareMode(true);
                // Prepopulate with currently selected and first other
                const activeId = selectedCandidateId || candidates[0]?.id;
                const other = candidates.find(c => c.id !== activeId);
                setCompareIds([activeId, other ? other.id : activeId].filter(Boolean) as number[]);
              }
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
              compareMode
                ? 'bg-amber-500 border-amber-500 text-gray-950 shadow-sm shadow-amber-500/20'
                : isDark
                  ? 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:border-gray-750'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-905 hover:border-slate-400'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>{lang === 'ar' ? 'مقارنة' : 'Compare'}</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {candidates.map((cand) => {
            const isSelected = cand.id === selectedCandidateId;
            const isCompared = compareIds.includes(cand.id);
            const candTypeTranslated = lang === 'ar' 
              ? cand.type.replace('Cave Sinkhole Collapse', 'انهيار فجوة كهفية هابطة').replace('Karstic Tunnel Void', 'تجويف نفق كارستي مائي').replace('Sparsely Obscured Escape Shaft', 'ممر هروب أثري تحت السطح')
              : cand.type;

            return (
              <button
                key={cand.id}
                type="button"
                onClick={() => handleRowClick(cand)}
                className={`text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between relative overflow-hidden ${
                  compareMode
                    ? isCompared
                      ? isDark
                        ? 'bg-amber-950/20 border-amber-500/70 text-amber-200'
                        : 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
                      : isDark
                        ? 'bg-gray-950/50 border-gray-800 hover:border-gray-700 text-gray-350'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-705'
                    : isSelected
                      ? isDark
                        ? 'bg-rose-950/20 border-rose-500/70 text-rose-200'
                        : 'bg-rose-50 border-rose-400 text-rose-900 font-semibold'
                      : isDark
                        ? 'bg-gray-950/50 border-gray-800 hover:border-gray-700 text-gray-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                }`}
                id={`candidate-row-${cand.id}`}
              >
                <div className="flex items-center gap-2.5">
                  {compareMode ? (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompare(cand.id);
                      }}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        isCompared 
                          ? 'bg-amber-500 border-amber-500 text-gray-950' 
                          : isDark ? 'border-gray-800 bg-gray-900' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isCompared && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${
                      isSelected ? 'bg-rose-500 text-white' : 'bg-gray-850 text-gray-400'
                    }`}>
                      {cand.id}
                    </div>
                  )}
                  <div>
                    <span className={`font-semibold block font-display leading-tight ${isSelected && !isDark && !compareMode ? 'text-rose-950' : isDark ? 'text-white' : 'text-slate-800'}`}>
                      {candTypeTranslated}
                    </span>
                    <span className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {cand.latitude.toFixed(5)}°N, {cand.longitude.toFixed(5)}°E
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-mono leading-none block ${
                    cand.confidence > 85 ? 'text-emerald-500' : 'text-blue-500'
                  }`}>
                    {cand.confidence}% {lang === 'ar' ? 'ثقة' : 'Conf'}
                  </span>
                  <span className="text-[11px] font-mono text-rose-500 font-semibold block mt-0.5 animate-pulse">
                    {cand.intensity.toFixed(2)}m TPI
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <hr className={isDark ? 'border-gray-800' : 'border-slate-200'} />

      {/* RENDER DUAL-TARGET SIDE-BY-SIDE COMPARE PANEL if compareMode is active */}
      {compareMode ? (
        <div className="flex flex-col gap-4">
          {cand1 && cand2 ? (
            <>
              {/* Compare targets Side-by-Side metrics card */}
              <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 font-mono text-[11px] ${
                isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-amber-500 border-b pb-1.5 dark:border-gray-900 col-span-3">
                  <span>{lang === 'ar' ? 'مقارنة الخصائص المادية والجيولوجية' : 'PHYSICAL & GEOLOGIC COMPARISON'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">DIFF</span>
                </div>

                <div className="grid grid-cols-3 text-[10px] text-gray-500 tracking-wider">
                  <div>{lang === 'ar' ? 'المؤشر الفني' : 'METRIC'}</div>
                  <div className="text-emerald-500 font-extrabold text-right">#{cand1.id} ({lang === 'ar' ? 'أ' : 'A'})</div>
                  <div className="text-blue-500 font-extrabold text-right">#{cand2.id} ({lang === 'ar' ? 'ب' : 'B'})</div>
                </div>

                <hr className={isDark ? 'border-gray-901' : 'border-slate-150'} />

                {/* Classification */}
                <div className="grid grid-cols-3 items-center">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'النوع السطحي' : 'Classification'}</div>
                  <div className="text-right font-display font-medium text-[10px] truncate px-1" title={cand1.type}>{lang === 'ar' ? (cand1.type.includes('Sinkhole') ? 'بالوعة' : 'نفق') : cand1.type.split(' ')[0]}</div>
                  <div className="text-right font-display font-medium text-[10px] truncate px-1" title={cand2.type}>{lang === 'ar' ? (cand2.type.includes('Sinkhole') ? 'بالوعة' : 'نفق') : cand2.type.split(' ')[0]}</div>
                </div>

                {/* TPI Intensity */}
                <div className="grid grid-cols-3">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'شدة انحراف TPI' : 'TPI Intensity'}</div>
                  <div className="text-right text-emerald-500 font-bold">{cand1.intensity.toFixed(2)}m</div>
                  <div className="text-right text-blue-500 font-bold">{cand2.intensity.toFixed(2)}m</div>
                </div>

                {/* Confidence */}
                <div className="grid grid-cols-3">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'ثقة الاستشعار' : 'Sensing Conf.'}</div>
                  <div className="text-right text-emerald-500 font-semibold">{cand1.confidence}%</div>
                  <div className="text-right text-blue-500 font-semibold">{cand2.confidence}%</div>
                </div>

                {/* Depth */}
                <div className="grid grid-cols-3">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'العمق المقدر' : 'Avg. Depth'}</div>
                  <div className="text-right font-bold text-gray-200">{cand1.dimensions.depth_approx.toFixed(1)}m</div>
                  <div className="text-right font-bold text-gray-200">{cand2.dimensions.depth_approx.toFixed(1)}m</div>
                </div>

                {/* Volume */}
                <div className="grid grid-cols-3">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'الحجم التقريبي' : 'Approx. Volume'}</div>
                  <div className="text-right text-gray-200">{(cand1.dimensions.width * cand1.dimensions.length * cand1.dimensions.depth_approx).toFixed(0)}m³</div>
                  <div className="text-right text-gray-200">{(cand2.dimensions.width * cand2.dimensions.length * cand2.dimensions.depth_approx).toFixed(0)}m³</div>
                </div>

                {/* Lithology */}
                <div className="grid grid-cols-3">
                  <div className="text-gray-400 text-[10px]">{lang === 'ar' ? 'الصخور الجوفية' : 'Lithology'}</div>
                  <div className="text-right truncate px-1" title={cand1.geology_notes}>{lang === 'ar' ? 'جيري جاف' : cand1.geology_notes.split(' ')[0]}</div>
                  <div className="text-right truncate px-1" title={cand2.geology_notes}>{lang === 'ar' ? 'جيري مائي' : cand2.geology_notes.split(' ')[0]}</div>
                </div>
              </div>

              {/* Combined Side-by-Side Recharts Profiler for dual curves */}
              <div className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center pb-1.5 border-b dark:border-gray-950">
                  <span className={`text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    {compareTab === 'elevation' ? (lang === 'ar' ? 'مقارنة مسار الارتفاع الجاف DEM' : 'Elevation Profiles Comparison') : (lang === 'ar' ? 'مقارنة خط انحرافات TPI' : 'TPI Deviation profiles')}
                  </span>

                  {/* Toggle Elevation / TPI Comparison */}
                  <div className="flex p-0.5 rounded-md text-[9px] font-mono bg-gray-900 border border-gray-800">
                    <button
                      type="button"
                      onClick={() => setCompareTab('elevation')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        compareTab === 'elevation' ? 'bg-indigo-500 text-white font-bold' : 'text-gray-450 hover:text-white'
                      }`}
                    >
                      {lang === 'ar' ? 'الارتفاع DEM' : 'DEM'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareTab('tpi')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        compareTab === 'tpi' ? 'bg-indigo-500 text-white font-bold' : 'text-gray-455 hover:text-white'
                      }`}
                    >
                      TPI
                    </button>
                  </div>
                </div>

                <div className="w-full h-40 font-mono text-[9px] mt-2 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={compareChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke={isDark ? '#1f2937' : '#e2e8f0'} vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '7px' }} />
                      <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
                      <Tooltip
                        contentStyle={
                          isDark 
                            ? { backgroundColor: '#111827', borderColor: '#374151', fontSize: '9px', borderRadius: '6px' }
                            : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '9px', borderRadius: '6px', color: '#1e293b' }
                        }
                        labelStyle={{ color: '#9ca3af' }}
                      />
                      {compareTab === 'elevation' ? (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey={`Target_${cand1.id}_Elevation`} 
                            name={`#${cand1.id} ELEV (${lang === 'ar' ? 'أ' : 'A'})`} 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            dot={false} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey={`Target_${cand2.id}_Elevation`} 
                            name={`#${cand2.id} ELEV (${lang === 'ar' ? 'ب' : 'B'})`} 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            strokeDasharray="4 4" 
                            dot={false} 
                          />
                        </>
                      ) : (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey={`Target_${cand1.id}_TPI`} 
                            name={`#${cand1.id} TPI (${lang === 'ar' ? 'أ' : 'A'})`} 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            dot={false} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey={`Target_${cand2.id}_TPI`} 
                            name={`#${cand2.id} TPI (${lang === 'ar' ? 'ب' : 'B'})`} 
                            stroke="#8b5cf6" 
                            strokeWidth={2} 
                            strokeDasharray="4 4" 
                            dot={false} 
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 text-[9.5px] border-t dark:border-gray-900 pt-1.5 font-mono text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-2 h-2 rounded bg-${compareTab === 'elevation' ? 'emerald-500' : 'amber-500'} inline-block`} />
                    <span>#{cand1.id}: {compareTab === 'elevation' ? cand1.type.split(' ')[0] : `${cand1.intensity.toFixed(1)}m`}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 border-l dark:border-gray-900">
                    <span className={`w-2 h-2 rounded bg-${compareTab === 'elevation' ? 'blue-500' : 'purple-500'} inline-block`} />
                    <span>#{cand2.id}: {compareTab === 'elevation' ? cand2.type.split(' ')[0] : `${cand2.intensity.toFixed(1)}m`}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`p-6 border rounded-xl text-xs text-center leading-relaxed ${
              isDark ? 'bg-gray-950/40 border-gray-800/60 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <Activity className="w-8 h-8 mx-auto text-amber-500 mb-2 animate-bounce" />
              <p className="font-semibold font-mono uppercase text-amber-500 text-[10px] tracking-wider mb-1">
                {lang === 'ar' ? 'بانتظار اكمال تحديد الشذوذات' : 'COMPARE TARGETS SELECTION PENDING'}
              </p>
              {lang === 'ar' 
                ? 'يرجى تحديد غرفتين أو عينات كهفية للتحليل والمقارنة في مقطع مدمج.' 
                : 'Select exactly 2 cave targets from the above catalog mapping list to render combined cross-section profiles side-by-side.'}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD SINGLE TARGET VISUALIZERS FLOW */
        <>
          {/* Selected Target Technical Metrics */}
          {selectedCandidate && (
            <div className={`flex flex-col gap-3 p-3.5 rounded-xl border ${
              isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-slate-50 border-slate-200'
            }`} id="candidate-metrics-section">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-emerald-600">
                  {lang === 'ar' ? `المؤشرات الهيكلية للشذوذ #${selectedCandidate.id}` : `Anomaly #${selectedCandidate.id} Structural Profile`}
                </span>
                <span className={`text-[9px] border px-1.5 py-0.5 rounded font-mono ${
                  isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-900/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {lang === 'ar' ? 'محسوب' : 'COMPUTED'}
                </span>
              </div>

              <div className={`grid grid-cols-2 gap-3.5 text-xs font-mono py-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <div>
                  <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.spatialVolume}</span>
                  <span className={`font-semibold flex items-baseline gap-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {(selectedCandidate.dimensions.width * selectedCandidate.dimensions.length * selectedCandidate.dimensions.depth_approx).toFixed(0)}
                    <span className="text-[10px] text-gray-500 font-normal"> m³</span>
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.surfaceArea}</span>
                  <span className={`font-semibold flex items-baseline gap-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {(selectedCandidate.dimensions.width * selectedCandidate.dimensions.length).toFixed(0)}
                    <span className="text-[10px] text-gray-500 font-normal"> m²</span>
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.modeledDepth}</span>
                  <span className="text-rose-500 font-bold">{selectedCandidate.dimensions.depth_approx.toFixed(1)} {t.meters}</span>
                </div>
                <div>
                  <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.lithology}</span>
                  <span className={`truncate block font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`} title={selectedCandidate.geology_notes}>
                    {lang === 'ar' ? 'حجر جيري كارستي' : `${selectedCandidate.geology_notes.split(' ')[0]} Limestone`}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Request AI and Print report PDF */}
              <div className="flex flex-col gap-1.5 mt-1">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => onTriggerAnalysis(selectedCandidate)}
                  className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isAnalyzing
                      ? 'bg-rose-100 text-rose-500 cursor-not-allowed border-rose-200'
                      : isDark
                        ? 'bg-rose-950/40 hover:bg-rose-900/40 border-rose-800 text-rose-300'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm shadow-rose-200/50'
                  }`}
                  id="trigger-gemini-analysis-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  {isAnalyzing ? (lang === 'ar' ? 'جاري إعداد تقرير الخبراء...' : 'Requesting Expert Assessment...') : t.expertAssessment}
                  <ArrowRight className="w-3 h-3 text-rose-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isDark
                      ? 'bg-blue-950/40 hover:bg-blue-900/40 border-blue-800 text-blue-300'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-755 border-blue-200 shadow-sm shadow-blue-200/20'
                  }`}
                  id="trigger-pdf-report-btn"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span>{lang === 'ar' ? 'تصدير وثيقة الملخص (PDF)' : 'Export PDF Report Card'}</span>
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                </button>

                {showRequestSuccess && isAnalyzing && (
                  <div className={`p-2.5 rounded-lg border text-xs font-mono font-medium flex items-start gap-2.5 mt-1.5 animate-pulse ${
                    isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`} id="ai-request-confirmation">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 text-left rtl:text-right">
                      <span className="font-bold">
                        {lang === 'ar' ? 'بدء التحليل الجيولوجي' : 'Analysis Successfully Initiated'}
                      </span>
                      <span className={`text-[10px] leading-normal ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {lang === 'ar'
                          ? `تم إرسال طلب التقرير بنجاح لشذوذ #${selectedCandidate.id}. جاري تشغيل مستشعرات التقييم تحت السطحي...`
                          : `The AI report request for Anomaly #${selectedCandidate.id} has been submitted. The geo-analysis process is now active.`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recharts Cross-Section Graphical Profiler */}
          {selectedCandidate && (
            <div className={`flex flex-col gap-2 rounded-xl border p-3.5 ${
              isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-white border-slate-200'
            }`} id="elevation-profile-chart-section">
              <span className={`text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                {t.elevationProfile}
              </span>

              <div className="w-full h-36 font-mono text-[9px] mt-2 select-none" id="recharts-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke={isDark ? '#1f2937' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '7px' }} />
                    <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={
                        isDark 
                          ? { backgroundColor: '#111827', borderColor: '#374151', fontSize: '9px', borderRadius: '6px' }
                          : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '9px', borderRadius: '6px', color: '#1e293b' }
                      }
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area type="monotone" dataKey="Elevation" name={lang === 'ar' ? 'الارتفاع بالـ DEM' : 'Elevation'} stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorElevation)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <span className={`text-[9px] text-center font-sans tracking-wide leading-relaxed mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                {lang === 'ar' 
                  ? 'يوضح التراجع الطبوغرافي للفجوة تحت السطحية مقارنة بمستوى الأرض الطبيعي المحيط.' 
                  : 'Visualizes structural collapse dip relative to local surrounding terrain slope.'}
              </span>
            </div>
          )}

          {/* Ground Penetrating Radar (GPR) Profiler section */}
          {selectedCandidate && (
            <div className={`flex flex-col gap-2 rounded-xl border p-3.5 ${
              isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-white border-slate-200'
            }`} id="gpr-profile-chart-section">
              <span className={`text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                {t.gprRadarProfile}
              </span>

              <div className="w-full h-36 font-mono text-[9px] mt-1 select-none" id="gpr-recharts-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gprData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke={isDark ? '#1f2937' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="distance" stroke="#6b7280" style={{ fontSize: '7px' }} />
                    <YAxis 
                      domain={[0, 16]} 
                      reversed={true} 
                      stroke="#6b7280" 
                      tickCount={5}
                    />
                    <Tooltip
                      contentStyle={
                        isDark 
                          ? { backgroundColor: '#111827', borderColor: '#374151', fontSize: '9px', borderRadius: '6px' }
                          : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '9px', borderRadius: '6px', color: '#1e293b' }
                      }
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Line type="monotone" dataKey="SoilContact" name={lang === 'ar' ? 'حدود التربة السطحية' : 'Regolith Boundary'} stroke="#d97706" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="VoidCeiling" name={lang === 'ar' ? 'سقف التجويف الكهفي' : 'Cavity Ceiling'} stroke="#f43f5e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="VoidFloor" name={lang === 'ar' ? 'أرضية التجويف الكهفي' : 'Cavity Floor'} stroke="#a855f7" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={`flex justify-between items-center p-2 rounded border text-[9.5px] font-mono mt-1 ${
                isDark ? 'bg-gray-950/60 border-gray-900 text-gray-400' : 'bg-slate-100/95 border-slate-200 text-slate-700'
              }`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-rose-500 inline-block pointer-events-none" />
                  {lang === 'ar' ? 'السقف:' : 'Ceiling:'} {selectedCandidate.dimensions.depth_approx.toFixed(1)} {t.meters}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-purple-500 inline-block pointer-events-none" />
                  {lang === 'ar' ? 'الأرضية:' : 'Floor:'} {(selectedCandidate.dimensions.depth_approx * 1.9).toFixed(1)} {t.meters}
                </span>
                <span className={`text-[8.5px] border px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                  isDark ? 'bg-red-950/40 text-red-400 border-red-900/40' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  250 MHz RF
                </span>
              </div>

              <span className={`text-[9px] text-center font-sans tracking-wide leading-relaxed mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                {lang === 'ar' 
                  ? 'تنعكس مسارات موجات الرادار لأسفل، تشير القمم القطعية إلى تباين النفاذية المغناطيسية للفراغات.' 
                  : 'Radar propagation paths mapped downward. Hyperbola curves indicate top contact echoes of subsurface voids.'}
              </span>
            </div>
          )}
        </>
      )}

      {/* CORONA Espionage Satellite Alignments */}
      <div className={`flex flex-col gap-3 rounded-xl border p-3.5 ${
        isDark ? 'bg-gray-950/70 border-gray-850' : 'bg-white border-slate-200'
      }`} id="corona-intelligence-section">
        <label className={`text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <Film className="w-3.5 h-3.5 text-blue-500" />
          {lang === 'ar' ? 'مواءمة بيانات قمر التجسس الأمريكي (CORONA)' : 'US declassified spy satellite (CORONA)'}
        </label>
        
        {/* Decadel Time-Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{t.chronoTimeline}</span>
            <span className="text-emerald-600 font-bold">{coronaYear} AD</span>
          </div>
          <input
            type="range"
            min="1960"
            max="1980"
            step="1"
            value={coronaYear}
            onChange={(e) => onCoronaYearChange(parseInt(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1 bg-gray-300 rounded appearance-none"
            id="sidebar-corona-year"
          />
          <div className="flex justify-between text-[8px] font-mono text-gray-500">
            <span>{lang === 'ar' ? 'مهمة 1960' : '1960 Era'}</span>
            <span>{lang === 'ar' ? 'مهمة 1970' : '1970 Era'}</span>
            <span>{lang === 'ar' ? 'مهمة 1980' : '1980 Era'}</span>
          </div>
        </div>

        {/* Contrast Matching Slider */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{lang === 'ar' ? 'تطابق تباين النغمات الفضائية' : 'Photo Contrast Match'}</span>
            <span className="text-blue-500 font-semibold">{Math.round(coronaOpacity * 100)}% {lang === 'ar' ? 'تطابق' : 'Match'}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={coronaOpacity}
            onChange={(e) => onCoronaOpacityChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer animate-pulse"
            id="slider-corona-transparency"
          />
        </div>

        <p className={`text-[10px] leading-normal font-sans pt-1 border-t mt-1 ${
          isDark ? 'text-gray-500 border-gray-850/60' : 'text-slate-400 border-slate-150'
        }`}>
          {lang === 'ar' 
            ? 'قم بسحب شريط السلسلة الزمنية لمراقبة تنقل الكثبان الرملية واتساع فتحات الكهوف الطبيعية بسبب العوامل الجوية، وظهور المسارات البشرية الحديثة الملتقطة بعدسات كاميرا التجسس KH-4.' 
            : 'Scrub the timeline slider to monitor active sand dunes shifting, subterranean cavern weathered expansions, and modern human pathways emerging under KH-4 spy telescopes between the 1960s and 1970s.'}
        </p>
      </div>

      {/* GeoJSON Data Exporter Button */}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleExportData}
          className={`w-full py-2 rounded border text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            isDark 
              ? 'bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-800 text-emerald-300' 
              : 'bg-emerald-55 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
          }`}
          id="export-geojson-btn"
        >
          <Download className="w-3.5 h-3.5" />
          {t.exportSurvey}
        </button>

        {showExportToast && (
          <div className="bg-emerald-500 text-gray-950 px-2.5 py-1.5 rounded text-[11px] text-center font-mono leading-relaxed font-bold animate-pulse" id="export-toast">
            {lang === 'ar' 
              ? '✓ تجميع تصدير البيانات بنجاح: تصدير ملفات GeoJSON متوافقة مع الأنظمة الكارتوغرافية العالمية لمصنف WGS84.' 
              : '✓ GeoJSON compiled successfully: Exported declassified GIS vectors for WGS84 mapping.'}
          </div>
        )}
      </div>

      {/* DETAILED PRINTABLE MODAL FOR SINGLE CAVE ANALYSIS */}
      {isPdfModalOpen && selectedCandidate && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 md:p-8 overflow-y-auto no-print animate-fadeIn shadow-2xl" 
          id="print-single-cave-report-backdrop"
        >
          {/* Inject Dynamic Printing CSS to isolate only the report page */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body, html {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              #print-single-cave-report-backdrop {
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                position: static !important;
                overflow: visible !important;
                display: block !important;
              }
              #print-single-cave-dossier-wrapper {
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                display: block !important;
              }
              #print-single-cave-dossier-sheet {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                padding: 1.5cm !important;
                margin: 0 !important;
                background: white !important;
                color: black !important;
                display: block !important;
              }
              .print-border {
                border-color: #111111 !important;
              }
              .print-bg-slate {
                background-color: #f8fafc !important;
              }
              .print-text-dark {
                color: #0b0f19 !important;
              }
            }
          `}} />

          {/* Dialog Space */}
          <div 
            className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 items-stretch select-none"
            id="print-single-cave-dossier-wrapper"
          >
            {/* Left printing controls panel (Hidden on print) */}
            <div className={`w-full lg:w-80 shrink-0 rounded-2xl border p-5 flex flex-col gap-4 no-print text-xs font-mono select-none ${
              isDark ? 'bg-gray-950 border-gray-850 text-gray-200' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
                <Settings className="w-4 h-4 text-rose-500 animate-spin-slow" />
                <span className="font-bold text-[10.5px] uppercase tracking-wider text-rose-400">
                  {lang === 'ar' ? 'تهيئة وثيقة العينة المفردة' : 'SINGLE ANOMALY DOSSIER CONFIG'}
                </span>
              </div>

              {/* Authority Agency */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'هيئة المسح أو الجيولوجيا' : 'Issuing Agency / Authority'}
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="bg-gray-900 hover:bg-gray-850 border border-gray-850 rounded px-2.5 py-1.5 font-bold text-gray-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Specialist Surveyor */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'الجيولوجي المسؤول' : 'Lead Field Geologist / Signature'}
                </label>
                <input
                  type="text"
                  value={geologistName}
                  onChange={(e) => setGeologistName(e.target.value)}
                  className="bg-gray-900 hover:bg-gray-850 border border-gray-850 rounded px-2.5 py-1.5 font-bold text-gray-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Classification Stamper */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'مستوى سرية وثيقة المسح' : 'Security Classification'}
                </label>
                <select
                  value={classificationLevel}
                  onChange={(e) => setClassificationLevel(e.target.value)}
                  className="bg-gray-900 hover:bg-gray-850 border border-gray-850 rounded px-2 px-1.5 font-bold text-gray-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="TOP_SECRET">{lang === 'ar' ? 'سري للغاية L-4' : 'TOP SECRET L4'}</option>
                  <option value="SECRET">{lang === 'ar' ? 'سري' : 'SECRET'}</option>
                  <option value="CONFIDENTIAL">{lang === 'ar' ? 'محدود / داخلي' : 'CONFIDENTIAL'}</option>
                  <option value="RESTRICTED">{lang === 'ar' ? 'أكاديمي مقيد' : 'RESTRICTED'}</option>
                  <option value="UNCLASSIFIED">{lang === 'ar' ? 'عام / أكاديمي' : 'UNCLASSIFIED'}</option>
                </select>
              </div>

              {/* Custom Addendum note */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'ملاحظات المسح الإضافية (ملحق الكهف)' : 'Custom Field Observations'}
                </label>
                <textarea
                  rows={4}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب أي ملاحظات أو توقعات ميدانية إضافية...' : 'Enter custom field observation notes to print in the final document memo...'}
                  className="bg-gray-900 hover:bg-gray-850 border border-gray-850 rounded px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-rose-500 resize-none leading-relaxed font-sans"
                />
              </div>

              <div className="p-2.5 rounded border leading-relaxed text-[10px] font-mono mt-auto bg-amber-950/20 border-amber-900/40 text-amber-400">
                <span className="font-bold uppercase block mb-0.5">{lang === 'ar' ? '💡 نصيحة للطباعة الفائقة:' : '💡 GRAPHICS PRINTING INFO:'}</span>
                {lang === 'ar' 
                  ? 'يرجى التأكد من تفعيل "رسومات الخلفية" في نافذة طباعة المتصفح لضمان تلوين المتجهات والمقاطع الرادارية بشكل ممتاز.' 
                  : 'Ensure you enable "Background Graphics" in your browser print popup to render shaded elevation vectors and subterranean layers perfectly.'}
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-gray-800">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPdfModalOpen(false)}
                    className="flex-1 py-2 rounded bg-gray-900 hover:bg-gray-805 border border-gray-800 hover:text-rose-400 transition-all font-bold text-[10px] text-gray-400 uppercase cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'طباعة التقرير' : 'Print / Save PDF'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleExportTxt}
                  className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] uppercase shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تصدير التقرير كملف نصي (TXT)' : 'Export Dossier to File (.TXT)'}</span>
                </button>
              </div>
            </div>

            {/* Right Printable Sheet (The Paper memo block) */}
            <div 
              className={`flex-1 rounded-2xl border shadow-2xl p-6 md:p-9 flex flex-col gap-6 relative select-text bg-white border-slate-300 text-slate-900 overflow-y-auto max-h-[85vh] lg:max-h-none`}
              id="print-single-cave-dossier-sheet"
            >
              {/* Classification Stamp */}
              <div className={`absolute top-4 right-4 md:top-8 md:right-9 border-2 font-mono font-black tracking-widest uppercase px-3 py-1 rounded rotate-2 select-none text-[10px] md:text-xs print:block ${getStampColor()}`}>
                {getStampLabel()}
              </div>

              {/* Memo Header */}
              <div className="border-b-2 border-double border-slate-700/50 pb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-rose-500" />
                  <span className="text-xs md:text-sm font-mono font-extrabold text-rose-500 uppercase tracking-widest">
                    {agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الجيو-أثرية' : 'GEO-ARCHAEOLOGICAL ADVANCED RESEARCH AGENCY')}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-mono tracking-tight font-black uppercase text-slate-900">
                  {lang === 'ar' ? `تقرير المسح الراداري والارتفاع الشامل للعينة #${selectedCandidate.id}` : `SUBSURFACE GPR SCAN SHEET: ANOMALY TARGET #${selectedCandidate.id}`}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono mt-2 text-slate-500">
                  <span>REF: KH4B-TPI-CAVE-ANOMALY-{selectedCandidate.id}</span>
                  <span>•</span>
                  <span>PRINT DATE: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-US')}</span>
                  <span>•</span>
                  <span>GEOLOGIST: {geologistName}</span>
                </div>
              </div>

              {/* Geographic stats and index details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                  <span className="text-[10px] md:text-xs font-mono text-slate-500 uppercase block">{lang === 'ar' ? 'إحداثيات العينة الدقيقة' : 'GPS Core Location'}</span>
                  <span className="text-xs md:text-xs font-mono font-bold text-slate-900">{selectedCandidate.latitude.toFixed(6)}°N, {selectedCandidate.longitude.toFixed(6)}°E</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                  <span className="text-[10px] md:text-xs font-mono text-slate-500 uppercase block">{lang === 'ar' ? 'الحركيات والخصائص الصخرية' : 'Lithology Matrix'}</span>
                  <span className="text-xs md:text-xs font-bold text-slate-900 uppercase">{lang === 'ar' ? 'حجر جيري كارستي' : `${selectedCandidate.geology_notes.split(' ')[0]} Gneissic`}</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                  <span className="text-[10px] md:text-xs font-mono text-slate-500 uppercase block">{lang === 'ar' ? 'دقة ثقة المستشعر' : 'Radar Conf.'}</span>
                  <span className="text-xs md:text-xs font-mono font-bold text-emerald-600">{selectedCandidate.confidence}% {lang === 'ar' ? 'مؤكدة' : 'VERIFIED'}</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                  <span className="text-[10px] md:text-xs font-mono text-slate-500 uppercase block">{lang === 'ar' ? 'شدة انحراف TPI للسطح' : 'TPI Amplitude'}</span>
                  <span className="text-xs md:text-xs font-mono font-bold text-rose-500">{selectedCandidate.intensity.toFixed(3)}m</span>
                </div>
              </div>

              {/* Dimension / Geometric Calculations */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/20">
                <h3 className="text-xs md:text-xs uppercase font-mono tracking-wider font-extrabold mb-2.5 text-slate-700 h-4 border-b pb-1">
                  {lang === 'ar' ? 'I. الأبعاد المورفولوجية الهيكلية المسجلة' : 'I. SPECIFIC STRUCTURAL & VOLUME METRICS'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-1 text-xs font-mono text-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.spatialVolume}</span>
                    <span className="font-bold text-slate-900">{(selectedCandidate.dimensions.width * selectedCandidate.dimensions.length * selectedCandidate.dimensions.depth_approx).toFixed(1)} m³</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.surfaceArea}</span>
                    <span className="font-bold text-slate-900">{(selectedCandidate.dimensions.width * selectedCandidate.dimensions.length).toFixed(1)} m²</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.modeledDepth}</span>
                    <span className="font-bold text-rose-600">{selectedCandidate.dimensions.depth_approx.toFixed(1)} meters</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'العرض بالملامس الأفقي' : 'Grid Aperture Size'}</span>
                    <span className="font-semibold text-slate-900">{selectedCandidate.dimensions.width}m x {selectedCandidate.dimensions.length}m</span>
                  </div>
                </div>
              </div>

              {/* Vector Charts Section (SVG) for perfect print execution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Elevation SVG Chart */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 font-mono">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-705 mb-2 pb-1 border-b">
                     {lang === 'ar' ? 'مقطع طبوغرافيا الارتفاع (DEM)' : 'TOPOGRAPHIC ELEVATION SLOPE'} (450m Profile)
                  </h4>
                  <div className="w-full flex items-center justify-center p-1 bg-white">
                    <svg viewBox="0 0 450 110" className="w-full overflow-visible">
                      <rect width="450" height="110" fill="#fafafa" rx="4" />
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="50" x2="450" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="80" x2="450" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                      {/* Shaded Area fill */}
                      <path d={elevationSvg.fillPath} fill="#10b981" fillOpacity="0.1" />
                      {/* Bedrock Ridge line */}
                      <path d={elevationSvg.linePath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <span className="text-[8.5px] block text-center mt-1 text-slate-400 uppercase">
                    Horizontal slice centered on GPS reference cy indices
                  </span>
                </div>

                {/* GPR Subsurface Radar SVG Chart */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 font-mono">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-705 mb-2 pb-1 border-b">
                     {lang === 'ar' ? 'مقطع رادار الاختراق الأرضي (GPR)' : 'GROUND PENETRATING RADAR SECTION'} (250 MHz RF)
                  </h4>
                  <div className="w-full flex items-center justify-center p-1 bg-white">
                    <svg viewBox="0 0 450 110" className="w-full overflow-visible">
                      <rect width="450" height="110" fill="#fafafa" rx="4" />
                      {/* Radar depth marker indicators */}
                      <line x1="0" y1="30" x2="450" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="95" x2="450" y2="95" stroke="#f1f5f9" strokeWidth="1" />
                      {/* Soil line */}
                      <path d={gprSvg.soil} fill="none" stroke="#d97706" strokeWidth="1" strokeDasharray="3,3" />
                      {/* Cavity lines */}
                      <path d={gprSvg.ceiling} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                      <path d={gprSvg.floor} fill="none" stroke="#a855f7" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 px-1 mt-1">
                    <span>Ceiling: {selectedCandidate.dimensions.depth_approx.toFixed(1)}m</span>
                    <span>Floor: {(selectedCandidate.dimensions.depth_approx * 1.9).toFixed(1)}m</span>
                    <span>Void span</span>
                  </div>
                </div>
              </div>

              {/* Specialist AI Geological context descriptor */}
              <div className="border-l-4 border-slate-400 p-4 bg-slate-50 leading-relaxed text-slate-700">
                <h3 className="text-xs uppercase font-mono tracking-wider font-bold mb-1.5 text-slate-800">
                  {lang === 'ar' ? 'II. التحليل الجيولوجي للصخور وسياق القطاع' : 'II. REGIONAL LITHOLOGY & SURFACE TERRAIN ANALYSIS'}
                </h3>
                <p className="text-[12px] whitespace-pre-line text-justify leading-relaxed">
                  {selectedCandidate.geology_notes} — {results.geological_context}
                </p>
              </div>

              {/* Custom notes Addendum */}
              {customNotes && (
                <div className="border border-dashed border-slate-350 p-4 rounded-xl leading-relaxed text-slate-750 font-sans print:block bg-yellow-50/5">
                  <h3 className="text-xs uppercase font-mono tracking-wider font-extrabold mb-1.5 text-slate-800">
                    {lang === 'ar' ? 'ملحق استكشافي III: ملاحظات وتوقعات المساح الميداني' : 'ADDENDUM III: SPECIAL SURVEYOR FIELD OBSERVATIONS'}
                  </h3>
                  <p className="text-[11.5px] leading-relaxed whitespace-pre-line text-slate-900 font-medium">
                    {customNotes}
                  </p>
                </div>
              )}

              {/* Signature Seals Area at layout bottom */}
              <div className="mt-auto border-t pt-5 grid grid-cols-2 text-xs font-mono text-slate-500">
                <div>
                  <p className="uppercase font-bold tracking-wider text-slate-700">
                    {lang === 'ar' ? 'الجهة المعتمدة والختم الجغرافي:' : 'VERIFICATION SIGNATURE / STAMP'}
                  </p>
                  <div className="w-24 h-12 border border-slate-300 border-dashed rounded flex items-center justify-center p-1 my-2 bg-slate-50/20 text-[6.5px] uppercase font-bold text-center select-none leading-tight tracking-tight rotate-1">
                    {agencyName ? agencyName.substring(0, 36) : 'SATELLITE INTEL REGISTER'}
                  </div>
                  <p className="text-[9.5px]">REGIST: Copernicus Satellite Alignments KH-4B / UTM</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="uppercase font-bold tracking-wider text-slate-700">{lang === 'ar' ? 'الجيولوجي المسؤول:' : 'AUTHORIZED FIELD SURVEYOR'}</p>
                  <p className="font-sans italic font-semibold text-slate-800 mt-3 border-b border-slate-400 pb-0.5 max-w-[200px] text-[13px]">{geologistName}</p>
                  <p className="text-[9.5px] mt-1 text-slate-450">Chief Specialist Regist. ID #714-SGP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
