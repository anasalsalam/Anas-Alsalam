/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Camera, 
  Upload, 
  MapPin, 
  Sparkles, 
  RefreshCcw, 
  CheckCircle, 
  AlertTriangle,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { ExtractedSite, VisionAnalysisResult, AerialAnomaly } from '../types';

interface AiAnalysisDeskProps {
  lang: 'en' | 'ar';
  theme: 'dark' | 'light';
  onPlotCoordinates: (lat: number, lon: number, radius?: number) => void;
}

const DEFAULT_HISTORICAL_TEXT = 
  `Expeditionary report from the Palmyrene desert steppe, 1934: Approximately 12 kilometers east of the Wadi al-Miyah river valley (centered near North 34.5420, East 38.3150), we documented a semi-subterranean limestone tomb complex displaying Distinct Severan Roman architectural styling. The primary hypogeum vault is carved into weathered carbonate bedrock. Furthermore, 5 kilometers north of this location, a secondary Byzantine agricultural outpost with collapsed circular water cisterns was surveyed. Coordinates for the Byzantine cistern cluster are North 34.5850, East 38.3120.`;

// Pre-seeded local declassified imagery patch representation (base64 or stylized canvas)
export default function AiAnalysisDesk({ lang, theme, onPlotCoordinates }: AiAnalysisDeskProps) {
  const isDark = theme === 'dark';
  
  // Tab control: 'text' or 'vision'
  const [activeTab, setActiveTab] = useState<'text' | 'vision'>('text');

  // --- TEXT ANALYSIS STATES ---
  const [inputText, setInputText] = useState(DEFAULT_HISTORICAL_TEXT);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSites, setExtractedSites] = useState<ExtractedSite[]>([]);
  const [textAlert, setTextAlert] = useState<{ type: 'success' | 'info'; msg: string } | null>(null);

  // --- VISION ANALYSIS STATES ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64 representation
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResult | null>(null);
  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<number | null>(null);
  const [visionAlert, setVisionAlert] = useState<{ type: 'success' | 'info'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    en: {
      title: 'AI Intelligence Desk',
      subtitle: 'Perform declassified coordinate extraction & aerial cropmark intelligence using Gemini 3.5',
      documentTab: 'Historical Documents',
      visionTab: 'Aerial & Satellite Vision',
      pasteLabel: 'Excavation Reports & Historic Gazeteer Texts',
      extractBtn: 'Extract Site Coordinates',
      detectBtn: 'Analyze Cropmarks & Foundations',
      siteName: 'Site Name',
      era: 'Historical Period',
      coordinates: 'Coordinates',
      actions: 'Actions',
      plotBtn: 'Plot on GIS Map',
      dropzoneTitle: 'Upload Custom Aerial Patch',
      dropzoneSubtitle: 'PNG, JPEG up to 5MB, or use the pre-loaded 1968 declassified CORONA photo',
      useDefaultPreset: 'Use Declassified CORONA Preset Image',
      detectedAnomalies: 'Detected Anomalies & Cropmarks',
      archReasoning: 'Geo-Archaeological Interpretation',
      simulatedWarning: 'Simulated with high-fidelity local models. To query live Gemini API, configure your actual GEMINI_API_KEY in Settings > Secrets.',
      liveSuccess: 'Successfully fetched live analysis report from Gemini 3.5.',
      noSitesFound: 'No sites or coordinate signatures detected in input text.'
    },
    ar: {
      title: 'مكتب استخبارات الاستشعار الطبوغرافي',
      subtitle: 'استخرج الإحداثيات وحلل علامات نمو النبات وظلال الأساسات باستخدام نماذج جيمي ٣.٥ الذكية',
      documentTab: 'الوثائق والتقارير التاريخية',
      visionTab: 'رؤية وتحليل الصور الجوية',
      pasteLabel: 'نصوص التنقيب التاريخية وتقارير الرحالة الأثرية',
      extractBtn: 'استخراج وتحديد الإحداثيات',
      detectBtn: 'تحليل تباين النبات والظلال الأساسية',
      siteName: 'اسم الموقع الأثري',
      era: 'الحقبة الزمنية',
      coordinates: 'الإحداثيات الجغرافية',
      actions: 'الإجراءات والتحليل',
      plotBtn: 'تمثيل على الخارطة',
      dropzoneTitle: 'تحميل رقعة صورة جوية خاصة',
      dropzoneSubtitle: 'صيغ PNG, JPEG حتى ٥ ميغابايت، أو استخدم لقطة قمر CORONA التاريخية الجاهزة',
      useDefaultPreset: 'استخدام لقطة قمر كورونا ١٩٦٨ السرية المدمجة',
      detectedAnomalies: 'الشذوذات وعلامات تباين التربة المرصودة',
      archReasoning: 'التفسير العلمي الجيولوجي الأثري',
      simulatedWarning: 'التقرير يعمل حالياً بنظام المحاكاة الفائقة الدقة محلياً. لتشغيل نظام جيمي الفوري، يرجى إدخال مفتاح GEMINI_API_KEY في الإعدادات.',
      liveSuccess: 'تم سحب تقرير الذكاء الاصطناعي الحي الفوري من نموذج Gemini 3.5 بنجاح.',
      noSitesFound: 'لم يتم رصد وتحديد أي مواقع أثرية أو دلالات جغرافية في النص المدخل.'
    }
  }[lang];

  // Call Text Extraction API
  const handleExtractText = async () => {
    setIsExtracting(true);
    setExtractedSites([]);
    setTextAlert(null);

    try {
      const response = await fetch('/api/gemini/extract_text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error(`Text extract server error ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success' && data.sites) {
        setExtractedSites(data.sites);
        if (data.isSimulated) {
          setTextAlert({ type: 'info', msg: t.simulatedWarning });
        } else {
          setTextAlert({ type: 'success', msg: t.liveSuccess });
        }
      } else {
        setTextAlert({ type: 'info', msg: t.noSitesFound });
      }
    } catch (err: any) {
      console.error(err);
      setTextAlert({ type: 'info', msg: `Downward link failure: ${err.message}` });
    } finally {
      setIsExtracting(false);
    }
  };

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setVisionResult(null);
      setVisionAlert(null);
    };
    reader.readAsDataURL(file);
  };

  // Call Vision Analysis API
  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzingImage(true);
    setVisionResult(null);
    setVisionAlert(null);

    try {
      const response = await fetch('/api/gemini/analyze_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: selectedImage }),
      });

      if (!response.ok) {
        throw new Error(`Vision analyst server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.report) {
        setVisionResult(data.report);
        if (data.isSimulated) {
          setVisionAlert({ type: 'info', msg: t.simulatedWarning });
        } else {
          setVisionAlert({ type: 'success', msg: t.liveSuccess });
        }
      }
    } catch (err: any) {
      console.error(err);
      setVisionAlert({ type: 'info', msg: `Downward vision telemetry error: ${err.message}` });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Preload CORONA default simulated Image
  const handleLoadCoronaPreset = () => {
    // Elegant historical high-contrast satellite aerial photo mockup representation
    // Let's create an elegant, stylized high contrast base64 simulated dark patch
    const simulatedCanvas = document.createElement('canvas');
    simulatedCanvas.width = 400;
    simulatedCanvas.height = 300;
    const ctx = simulatedCanvas.getContext('2d');
    if (ctx) {
      // Base agricultural soil tones
      ctx.fillStyle = '#1e251a'; // Dark military-green tint
      ctx.fillRect(0,0,400,300);

      // Light dustings of sand and loamy channels
      ctx.strokeStyle = '#2d3826';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-20, 100);
      ctx.bezierCurveTo(150, 80, 220, 240, 420, 210);
      ctx.stroke();

      // Grid-like crop fields
      ctx.strokeStyle = '#374730';
      ctx.lineWidth = 1;
      for (let i = 0; i < 400; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 40, 300); ctx.stroke();
      }
      for (let j = 0; j < 300; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(400, j + 20); ctx.stroke();
      }

      // 1. Hellenistic Rectangular cropmark outlines
      ctx.strokeStyle = '#7c9d6d'; // Faint lighter vegetation line
      ctx.lineWidth = 2.5;
      ctx.strokeRect(128, 75, 88, 54);

      // 2. Circular ditch soilmark
      ctx.strokeStyle = '#a4c09d'; // Chalky soil
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(60, 165, 28, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Regular shadow entrance of tomb vestibule
      ctx.fillStyle = '#0a0d08'; // Shadow pit
      ctx.strokeStyle = '#dfecd9'; // Bright limestone edge
      ctx.lineWidth = 1.5;
      ctx.fillRect(248, 45, 32, 36);
      ctx.strokeRect(248, 45, 32, 36);

      // Add a nice HUD crosshair scale
      ctx.strokeStyle = '#rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 380, 280);
      // center crosshair
      ctx.beginPath();
      ctx.moveTo(200, 140); ctx.lineTo(200, 160);
      ctx.moveTo(190, 150); ctx.lineTo(210, 150);
      ctx.stroke();
    }

    setSelectedImage(simulatedCanvas.toDataURL('image/jpeg'));
    setVisionResult(null);
    setVisionAlert(null);
  };

  return (
    <div 
      className={`rounded-2xl border p-5 md:p-6 shadow-xl transition-all duration-300 select-text ${
        isDark 
          ? 'bg-gray-900 border-gray-800 text-gray-100 shadow-slate-950/50' 
          : 'bg-white border-slate-205 text-slate-900 shadow-slate-200/50'
      }`}
      id="ai-intelligence-desk"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed dark:border-gray-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight uppercase font-mono text-emerald-400">
              {t.title}
            </h2>
            <p className={`text-[11px] font-mono leading-relaxed mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-950/50 dark:bg-black/40 border dark:border-gray-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t.documentTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vision'
                ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t.visionTab}</span>
          </button>
        </div>
      </div>

      {/* --- HISTORICAL DOCUMENTS TAB --- */}
      {activeTab === 'text' && (
        <div className="space-y-4 animate-fadeIn" id="text-analysis-panel">
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-700'}`}>
              {t.pasteLabel}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className={`w-full text-xs font-mono p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-400 leading-relaxed ${
                isDark 
                  ? 'bg-gray-950 border-gray-800 text-gray-100 placeholder-gray-600' 
                  : 'bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setInputText(DEFAULT_HISTORICAL_TEXT)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border hover:scale-[1.01] transition-all cursor-pointer ${
                isDark 
                  ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300' 
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {lang === 'ar' ? 'تحميل تقرير تدمر الافتراضي' : 'Load Palmyrene Expedition Report'}
            </button>

            <button
              type="button"
              disabled={isExtracting}
              onClick={handleExtractText}
              className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 ${
                isExtracting
                  ? 'bg-gray-800 text-gray-500 border border-gray-700 pointer-events-none'
                  : 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 text-gray-950'
              }`}
            >
              {isExtracting ? (
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isExtracting ? (lang === 'ar' ? 'جاري الاستخراج...' : 'EXTRACTING...') : t.extractBtn}</span>
            </button>
          </div>

          {textAlert && (
            <div className={`p-3.5 rounded-xl border text-[11px] font-mono leading-relaxed flex items-start gap-2.5 shadow-sm animate-fadeIn ${
              textAlert.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-sky-500/10 border-sky-500/25 text-sky-400'
            }`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{textAlert.msg}</span>
            </div>
          )}

          {/* Extracted Sites Table */}
          {extractedSites.length > 0 && (
            <div className="overflow-hidden rounded-xl border dark:border-gray-850 mt-4 shadow-sm">
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className={isDark ? 'bg-gray-950 text-emerald-400 boundary-dashed' : 'bg-slate-50 text-emerald-800 border-b'}>
                    <th className="p-3 font-semibold">{t.siteName}</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">{t.era}</th>
                    <th className="p-3 font-semibold">{t.coordinates}</th>
                    <th className="p-3 font-semibold text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-850">
                  {extractedSites.map((site, index) => (
                    <tr 
                      key={index} 
                      className={`transition-colors ${
                        isDark ? 'hover:bg-gray-900 text-gray-100' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <td className="p-3 font-bold">
                        <div>{site.site_name}</div>
                        {site.description_extract && (
                          <div className="text-[9px] text-gray-500 mt-1 max-w-xs font-normal font-sans leading-relaxed">
                            {site.description_extract}
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden sm:table-cell text-gray-400 dark:text-gray-400">{site.era}</td>
                      <td className="p-3 text-emerald-500 font-semibold selection:bg-emerald-500/30">
                        {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onPlotCoordinates(site.latitude, site.longitude, 0.005)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase bg-emerald-500 text-gray-950 shadow-sm hover:scale-[1.03] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <MapPin className="w-3 h-3 text-gray-950" />
                          <span>{t.plotBtn}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SATELLITE VISION TAB --- */}
      {activeTab === 'vision' && (
        <div className="space-y-4 animate-fadeIn" id="vision-analysis-panel">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Image Preview & Anomaly Plot Bounding Box Sandbox */}
            <div className={`rounded-xl border p-3 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden ${
              isDark ? 'bg-gray-950 border-gray-850' : 'bg-slate-100 border-slate-200'
            }`}>
              {selectedImage ? (
                <div className="relative w-full max-w-[340px] aspect-[4/3] rounded-lg overflow-hidden border dark:border-gray-800 select-none shadow">
                  <img 
                    src={selectedImage} 
                    alt="Aerial scan preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Bounding Box Highlights Overlays */}
                  {visionResult && visionResult.anomalies.map((anom, i) => {
                    if (!anom.boundingBox) return null;
                    const b = anom.boundingBox;
                    const isHovered = hoveredAnomalyId === i;
                    
                    // Specific highlight color depending on anomaly type
                    const colorMap = {
                      cropmark: 'rgba(16, 185, 129, 0.5)',
                      soilmark: 'rgba(245, 158, 11, 0.5)',
                      shadow: 'rgba(239, 68, 68, 0.5)',
                      unknown: 'rgba(139, 92, 246, 0.5)'
                    };
                    const borderMap = {
                      cropmark: 'border-emerald-500',
                      soilmark: 'border-amber-500',
                      shadow: 'border-rose-500',
                      unknown: 'border-purple-500'
                    };
                    const bgMap = {
                      cropmark: 'bg-emerald-500/20',
                      soilmark: 'bg-amber-500/20',
                      shadow: 'bg-rose-500/20',
                      unknown: 'bg-purple-500/20'
                    };

                    return (
                      <div
                        key={i}
                        className={`absolute border-2 rounded ${borderMap[anom.type]} ${bgMap[anom.type]} hover:backdrop-brightness-125 transition-all cursor-crosshair flex flex-col items-start p-0.5`}
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          width: `${b.width}%`,
                          height: `${b.height}%`
                        }}
                        onMouseEnter={() => setHoveredAnomalyId(i)}
                        onMouseLeave={() => setHoveredAnomalyId(null)}
                      >
                        <span className={`text-[8px] font-mono font-bold leading-none px-1 py-0.5 rounded ${
                          anom.type === 'cropmark' ? 'bg-emerald-600 text-white' :
                          anom.type === 'soilmark' ? 'bg-amber-600 text-white' :
                          anom.type === 'shadow' ? 'bg-rose-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {anom.type.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 cursor-pointer p-5 text-center hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 rounded-xl border border-dashed border-gray-700/60 transition-all w-full h-full"
                >
                  <div className="p-3.5 rounded-full bg-gray-900/60 dark:bg-black/40 border border-gray-800 text-emerald-500">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-emerald-500">{t.dropzoneTitle}</p>
                    <p className={`text-[10px] font-mono leading-relaxed mt-1 max-w-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {t.dropzoneSubtitle}
                    </p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Vision Controls, Preset activation & alerts */}
            <div className="flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleLoadCoronaPreset}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-gray-950 border-gray-800 hover:bg-gray-900 text-emerald-400 hover:text-emerald-300' 
                      : 'bg-emerald-50 border-emerald-150 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-850'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.useDefaultPreset}</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedImage || isAnalyzingImage}
                  onClick={handleAnalyzeImage}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border ${
                    !selectedImage || isAnalyzingImage
                      ? 'bg-gray-800 text-gray-500 border-gray-700 pointer-events-none'
                      : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-gray-950 shadow-md'
                  }`}
                >
                  {isAnalyzingImage ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-gray-950 animate-pulse" />
                  )}
                  <span>{isAnalyzingImage ? (lang === 'ar' ? 'جاري التحيل الفني...' : 'ANALYZING IMAGERY...') : t.detectBtn}</span>
                </button>

                {visionAlert && (
                  <div className={`p-3 rounded-xl border text-[11.5px] font-mono leading-relaxed flex items-start gap-2 ${
                    visionAlert.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      : 'bg-sky-500/10 border-sky-500/25 text-sky-400'
                  }`}>
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{visionAlert.msg}</span>
                  </div>
                )}
              </div>

              {selectedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setVisionResult(null);
                    setVisionAlert(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono text-center hover:bg-rose-500/10 hover:text-rose-400 transition-all ${
                    isDark ? 'border-gray-800 text-gray-400 bg-transparent' : 'border-slate-200 text-slate-500 bg-transparent'
                  }`}
                >
                  {lang === 'ar' ? 'إزالة أو تفريغ الملف' : 'Clear & Reset Image'}
                </button>
              )}
            </div>
          </div>

          {/* Vision Extraction Results List & Reasoning */}
          {visionResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 text-[11px] font-mono leading-relaxed">
              {/* Anomalies List */}
              <div className="space-y-2 border-r border-dashed border-gray-800 pr-3 rtl:border-r-0 rtl:border-l rtl:pl-3">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.detectedAnomalies}</span>
                </h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {visionResult.anomalies.map((anom, idx) => {
                    const isHovered = hoveredAnomalyId === idx;
                    return (
                      <div 
                        key={idx}
                        onMouseEnter={() => setHoveredAnomalyId(idx)}
                        onMouseLeave={() => setHoveredAnomalyId(null)}
                        className={`p-3 rounded-xl border transition-all ${
                          isHovered 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : isDark ? 'bg-gray-950/60 border-gray-850' : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                            anom.type === 'cropmark' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                            anom.type === 'soilmark' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' :
                            'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                          }`}>
                            {anom.type.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-500">Prob: {anom.probability}%</span>
                        </div>
                        <div className="font-bold text-gray-200 mt-2">{anom.name}</div>
                        <div className={`text-[10.5px] mt-1 pr-1 font-sans ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{anom.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Geoarchaeological Reasoning */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.archReasoning}</span>
                </h3>
                <div className={`p-4 rounded-xl border leading-relaxed text-[11px] font-sans flex-1 ${
                  isDark ? 'bg-gray-950/40 border-gray-850 text-gray-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
                }`}>
                  <p className="font-semibold text-emerald-500 mb-1 font-mono">
                    {visionResult.summary}
                  </p>
                  <p className="leading-relaxed whitespace-pre-line text-xs font-medium">
                    {visionResult.reasoning}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
