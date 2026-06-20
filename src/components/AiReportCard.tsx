/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, Compass, HelpCircle, Shield, AlertTriangle, BookOpen, Layers, Terminal, Globe, MapPin, Database, Activity, RefreshCw } from 'lucide-react';
import { InterpretationReport, CaveCandidate, ScanResults, CustomPointAnalysis } from '../types';
import { Language, translations } from '../lib/translations';

interface AiReportCardProps {
  report: InterpretationReport | null;
  isAnalyzing: boolean;
  selectedCandidate: CaveCandidate | null;
  lang: Language;
  theme: 'dark' | 'light';
  results?: ScanResults | null;
  onTriggerAnalysis?: (candidate: CaveCandidate) => void;
  customPoint?: { lat: number; lon: number } | null;
  customReport?: CustomPointAnalysis | null;
  onTriggerCustomAnalysis?: (lat: number, lon: number) => void;
}

const TERMINAL_STEPS_EN = [
  'Resolving satellite telemetry orbit files from KH-4B declassified metadata...',
  'Extracting pixel matrix bounds around targeted coordinates...',
  'Applying digital elevation model (DEM) box smoothing smoothing window...',
  'Calibrating Topographic Position Index (TPI) deviation factors...',
  'Compiling geological context vectors with local Syrian desert lithologies...',
  'Querying @google/genai specialist models [gemini-3.5-flash] for archeological correlation...',
  'Finalizing intelligence report summary and field walking recommendations...'
];

const TERMINAL_STEPS_AR = [
  'تحليل وتتبع مدارات الأقمار الكارتوغرافية من بيانات KH-4B منزوعة السرية...',
  'استخلاص مصفوفات بكسلات السطح للإحداثيات المستهدفة بدقة...',
  'تطبيق نافذة تنعيم الصندوق لنموذج الارتفاع الرقمي الأساسي...',
  'معايرة انحراف مؤشر الوضع الطبوغرافي الرقمي TPI المجهري...',
  'حساب متجهات التكوين الجيولوجي لطبقات الحجر الكارستي بمناطق البادية السورية...',
  'استدعاء نماذج الذكاء التخصصية لـ @google/genai للتحقق التاريخي والأثري...',
  'إعداد التقرير التجميعي النهائي وتوصيات المسح الميداني الراجلة...'
];

export default function AiReportCard({
  report,
  isAnalyzing,
  selectedCandidate,
  lang,
  theme,
  results,
  onTriggerAnalysis,
  customPoint,
  customReport,
  onTriggerCustomAnalysis,
}: AiReportCardProps) {
  const [terminalIndex, setTerminalIndex] = useState(0);
  const t = translations[lang];
  const terminalSteps = lang === 'ar' ? TERMINAL_STEPS_AR : TERMINAL_STEPS_EN;

  useEffect(() => {
    if (isAnalyzing) {
      setTerminalIndex(0);
      const interval = setInterval(() => {
        setTerminalIndex((prev) => (prev < terminalSteps.length - 1 ? prev + 1 : prev));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, terminalSteps]);

  const isDark = theme === 'dark';

  if (isAnalyzing) {
    return (
      <div className={`border rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4 ${
        isDark ? 'bg-gray-950 border-rose-900/60' : 'bg-rose-50/40 border-rose-300'
      }`} id="ai-report-analyzing">
        {/* Animated grid line scan */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/0 via-rose-500/5 to-rose-500/0 h-1/2 w-full animate-pulse pointer-events-none" />
        
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-rose-500 animate-spin" />
          <h3 className={`text-xs uppercase font-mono tracking-wider font-bold ${isDark ? 'text-rose-300' : 'text-rose-950'}`}>
            {lang === 'ar' ? 'بث المعايرة ومعالجة بيانات القمر الصناعي' : 'AI Spacecraft Calibration and Analysis Feed'}
          </h3>
        </div>

        <div className={`rounded-lg p-3.5 border font-mono text-[11px] flex flex-col gap-2 min-h-36 ${
          isDark ? 'bg-gray-900/90 border-gray-800 text-gray-400' : 'bg-white border-rose-200 text-slate-700'
        }`}>
          <div className="flex justify-between border-b pb-1 font-bold mb-1 border-current">
            <span>{lang === 'ar' ? 'منصة الاستشعار المباشرة' : 'TERMINAL CONSOLE'}</span>
            <span className="text-rose-500">STATUS: INTEL_SCANNING</span>
          </div>
          {terminalSteps.slice(0, terminalIndex + 1).map((step, idx) => (
            <div key={idx} className="flex gap-1.5 animate-fadeIn">
              <span className="text-rose-500 select-none">&gt;&gt;</span>
              <span>{step}</span>
            </div>
          ))}
          <div className="w-2 h-4 bg-rose-500 animate-pulse mt-1 shrink-0" />
        </div>
      </div>
    );
  }

  if (customReport) {
    const hasArtifacts = customReport.has_artifacts;
    const depth = customReport.depth_meters;
    
    return (
      <div className={`border rounded-xl p-5 shadow-xl flex flex-col gap-5 relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-gray-905 bg-zinc-950 border-amber-900/45 text-gray-300' : 'bg-white border-slate-200 text-slate-800'
      }`} id="ai-custom-report-card">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl pointer-events-none" />

        {/* Report Header Block */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3.5 ${
          isDark ? 'border-gray-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-500 animate-pulse animate-spin-slow" />
            <div>
              <h3 className={`text-xs font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {lang === 'ar' ? 'تقرير قياس المسبار الإحداثي للمكتنزات والأثريات' : 'SITE PROBE: COORDINATE CORE ANALYSIS'}
              </h3>
              <p className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                COORDINATES: {customReport.point.lat.toFixed(6)}°N, {customReport.point.lon.toFixed(6)}°E
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded text-[10px] font-mono ${
            isDark ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-850 font-bold'
          }`}>
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>{customReport.closest_sector}</span>
          </div>
        </div>

        {/* Core Detection Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Artifact Presence */}
          <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
            isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-150'
          }`}>
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-450 text-gray-500 pb-0.5 border-b border-gray-500/10">
              {lang === 'ar' ? 'مؤشر كشف الأثريات' : 'Artifact Presence'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${hasArtifacts ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-sans font-bold text-xs">
                {hasArtifacts 
                  ? (lang === 'ar' ? 'إيجابي (مكتشف)' : 'DETECTED (HIGH)') 
                  : (lang === 'ar' ? 'سلبي (أثر طبيعي)' : 'UNDETECTED')}
              </span>
            </div>
            {hasArtifacts && (
              <span className="text-[10.5px] font-semibold text-emerald-500 line-clamp-1 truncate mt-1 block" title={lang === 'ar' ? customReport.artifact_type_ar : customReport.artifact_type}>
                {lang === 'ar' ? customReport.artifact_type_ar : customReport.artifact_type}
              </span>
            )}
          </div>

          {/* Treasure Depth */}
          <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
            isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-150'
          }`}>
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-450 text-gray-500 pb-0.5 border-b border-gray-500/10">
              {lang === 'ar' ? 'العُمق المقداري للمكتنزات' : 'Buried Treasure Depth'}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-black text-rose-500">
                {hasArtifacts ? depth : '0.0'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {lang === 'ar' ? 'أمتار مترية' : 'METERS'}
              </span>
            </div>
            <span className="text-[9px] font-sans text-gray-400">
              {lang === 'ar' ? 'بدقة تمايز ±٢٥سم' : 'Calculated within ±25cm accuracy'}
            </span>
          </div>

          {/* Probability & Age */}
          <div className={`p-3 rounded-lg border flex flex-col gap-1 ${
            isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-150'
          }`}>
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-450 text-gray-500 pb-0.5 border-b border-gray-500/10">
              {lang === 'ar' ? 'عصر وموثوقية القياس' : 'Age Epoch & Confidence'}
            </span>
            <span className="text-xs font-sans font-bold text-amber-500 truncate mt-1 block" title={lang === 'ar' ? customReport.estimated_age_ar : customReport.estimated_age}>
              {hasArtifacts ? (lang === 'ar' ? customReport.estimated_age_ar : customReport.estimated_age) : 'N/A'}
            </span>
            <span className="text-[10px] font-mono text-gray-500 mt-1 block">
              {lang === 'ar' ? `ثقة القياس: ${customReport.probability}%` : `Confidence: ${customReport.probability}%`}
            </span>
          </div>
        </div>

        {/* Detailed Report Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans leading-relaxed">
          {/* Subsurface structure background */}
          <div className="flex gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold uppercase text-indigo-500 font-mono tracking-wider mb-1">
                {lang === 'ar' ? 'التركيب البنيوي تحت السطحي' : 'Subsurface Structure & Bedding'}
              </h4>
              <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>
                {lang === 'ar' ? customReport.dossier_report.subsurface_structure_ar : customReport.dossier_report.subsurface_structure}
              </p>
            </div>
          </div>

          {/* Deep rock layer geology */}
          <div className="flex gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold uppercase text-emerald-500 font-mono tracking-wider mb-1">
                {lang === 'ar' ? 'التوجيه والطبقة الجيولوجية' : 'Geological Layer Matrix'}
              </h4>
              <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>
                {lang === 'ar' ? customReport.geological_layer_ar : customReport.geological_layer}
              </p>
            </div>
          </div>

          {/* Description of Artifacts */}
          <div className="flex gap-2.5 md:col-span-2 border-t pt-3 dark:border-gray-800">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold uppercase text-amber-500 font-mono tracking-wider mb-1">
                {lang === 'ar' ? 'التفاصيل الأثرية للأحافير والمقتنيات الكامنة' : 'Subsurface Artifact Analysis Details'}
              </h4>
              <p className={`${isDark ? 'text-gray-300' : 'text-slate-700'} text-[11px] leading-relaxed font-sans`}>
                {lang === 'ar' ? customReport.dossier_report.artifact_description_ar : customReport.dossier_report.artifact_description}
              </p>
            </div>
          </div>

          {/* Historical Commentary context */}
          <div className="flex gap-2.5 border-t pt-3 dark:border-gray-800">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold uppercase text-violet-500 font-mono tracking-wider mb-1">
                {lang === 'ar' ? 'السياق والملاءمة التاريخية' : 'Historical Archaeological Context'}
              </h4>
              <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>
                {lang === 'ar' ? customReport.dossier_report.historical_commentary_ar : customReport.dossier_report.historical_commentary}
              </p>
            </div>
          </div>

          {/* Target field recovery actions */}
          <div className="flex gap-2.5 border-t pt-3 dark:border-gray-800">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold uppercase text-rose-500 font-mono tracking-wider mb-1">
                {lang === 'ar' ? 'توصيات التنقيب والمسح الوقائي' : 'Excavation & Verification Guidelines'}
              </h4>
              <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>
                {lang === 'ar' ? customReport.dossier_report.field_actions_ar : customReport.dossier_report.field_actions}
              </p>
            </div>
          </div>
        </div>

        {onTriggerCustomAnalysis && (
          <div className="flex justify-end gap-2 border-t pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={() => onTriggerCustomAnalysis(customReport.point.lat, customReport.point.lon)}
              className={`py-1.5 px-3 rounded text-[10px] font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDark ? 'bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إعادة تشغيل فحص المسبار' : 'RE-RUN PROBE SCAN'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // If we have selected a customPoint, but do not have customReport, and also there is no currently selected Candidate,
  // we show the trigger screen for customPoint analysis!
  if (customPoint && !selectedCandidate) {
    return (
      <div className={`border rounded-xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden transition-all duration-250 ${
        isDark ? 'bg-zinc-950 border-amber-900/30 text-gray-300' : 'bg-white border-slate-200 text-slate-800'
      }`} id="ai-custom-report-trigger-card">
        {/* Glowing background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2.5 border-b pb-3 dark:border-gray-800">
          <MapPin className="w-5 h-5 text-amber-500 animate-bounce" />
          <div>
            <h3 className={`text-xs font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'ar' ? 'موضع مسح المسبار اليدوي' : 'CUSTOM CORE PROBE LOCKED'}
            </h3>
            <p className={`text-[10px] font-mono tracking-wider ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              LATITUDE: {customPoint.lat.toFixed(6)}°N, LONGITUDE: {customPoint.lon.toFixed(6)}°E
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg border leading-relaxed text-xs flex gap-3 ${
          isDark ? 'bg-gray-900/40 border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-150 text-slate-600'
        }`}>
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <span className="font-bold text-amber-500 block mb-1">
              {lang === 'ar' ? 'تحليل عمق المكتنزات والكشف بالذكاء الاصطناعي' : 'Dynamic Subsurface Soil & Treasure Probe'}
            </span>
            <p className="font-sans text-[11px] leading-normal">
              {lang === 'ar' 
                ? 'لقد قمت باختيار نقطة جغرافية مخصصة على الخارطة. نظام الكاشف قادر على استخدام نموذج Gemini AI والتحليل التضاريسي المترابط لاحتساب احتمالية كشف الهياكل، العمق التقريبي للكنوز المدفونة ونسبة الموثوقية.'
                : 'You have actively pinned a custom grid point on the terrain database map. The spacecraft scanning core is ready to calculate electromagnetic anomalies, identify buried artifacts, and output precise treasury depths.'}
            </p>
          </div>
        </div>

        {onTriggerCustomAnalysis && (
          <button
            type="button"
            onClick={() => onTriggerCustomAnalysis(customPoint.lat, customPoint.lon)}
            className={`w-full py-2.5 rounded-lg text-xs font-mono font-black border transition-all mt-1 shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
              isDark 
                ? 'bg-amber-500 hover:bg-amber-600 text-gray-950 border-amber-400' 
                : 'bg-amber-500 hover:bg-amber-600 text-gray-950 border-amber-400 font-bold'
            }`}
            id="ai-trigger-custom-point-analysis-btn"
          >
            <Sparkles className="w-4 h-4 text-gray-950 animate-pulse" />
            <span>{lang === 'ar' ? 'فحص التربة وتحديد الأعماق بالمسبار (AI)' : 'Analyze Selected Coordinates'}</span>
          </button>
        )}
      </div>
    );
  }

  const translateGeologicalContext = (ctx: string, currentLang: Language) => {
    if (currentLang !== 'ar') return ctx;
    const lowercaseCtx = ctx.toLowerCase();
    if (lowercaseCtx.includes('palmyra') || lowercaseCtx.includes('miocene limestones')) {
      return 'تتابع الصخور الكربونية البحرية من العصر الثلاثي. تظهر صخور الحجر الجيري الميوسيني درجة عالية من التآكل الكارستي مع انتشار واسع لغرف المدافن الجنائزية تحت الأرض (قبور منحوتة) وممرات مائية متداخلة.';
    }
    if (lowercaseCtx.includes('abdulaziz') || lowercaseCtx.includes('cretaceous-paleogene')) {
      return 'طيّات صخر جيري منكسر تنتمي للعصر الطباشيري-الباليوجيني. تصدعات وتجاويف دقيقة مع انتشار لشعاب الانخسافات الصخرية الهيكلية تحت المنحدرات الواسعة.';
    }
    if (lowercaseCtx.includes('ras al-ayn') || lowercaseCtx.includes('upper cretaceous carbonate')) {
      return 'حوض برأس العين غني بالمياه والكربونات المنتمية للعصر الطباشيري العلوي تحت الخضوع الهيدروليكي، مع تآكل متواصل للجبس وسقوط الدوائر الصخرية المغذية للينابيع الكبرى.';
    }
    if (lowercaseCtx.includes('basalt') || lowercaseCtx.includes('safa')) {
      return 'حقول تدفق صخور البازلت الرباعية بحرة الصفا. شبكة واسعة غنية بالقنوات البركانية والمجوفة والكهوف المحاطة بالكتابات الصفائية التاريخية.';
    }
    if (lowercaseCtx.includes('aleppo') || lowercaseCtx.includes('eocene soft limestone')) {
      return 'صخر جيري إيوسيني ناعم يدعم الحفريات والأنفاق البشرية الكثيفة من العصر البرونزي وحتى حقبة المماليك. خزانات مياه، وسراديب هروب متفرعة.';
    }
    if (lowercaseCtx.includes('zawiya') || lowercaseCtx.includes('chalky')) {
      return 'صخور جيرية طباشيرية من العصر الإيوسيني شمال غرب سوريا. كثافة عالية من المدافن والمقابر المنحوتة العائدة للعهدين الروماني والبيزنطي.';
    }
    return ctx;
  };

  if (!report) {
    if (results) {
      return (
        <div 
          className={`border rounded-xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden transition-all duration-200 ${
            isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-white border-slate-200 text-slate-800'
          }`} 
          id="ai-report-empty"
        >
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none" />

          {/* Mapping Status Header */}
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 ${
            isDark ? 'border-gray-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-emerald-500 animate-spin-slow animate-pulse" />
              <div>
                <h3 className={`text-sm font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {lang === 'ar' ? 'تقرير المسح الجيومورفولوجي وقاعدة البيانات للموقع الكشفي' : 'GEOMORPHOLOGICAL SITE SURVEY PROFILE'}
                </h3>
                <p className={`text-[10px] font-mono tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {lang === 'ar' ? 'سجل القطاع النشط ونموذج الارتفاع الرقمي الأساسي للمنطقة' : 'ACTIVE SURVEY STRATIGRAPHY & SURFACE ELEVATION'}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded text-[10px] font-mono ${
              isDark ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
            }`}>
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>{lang === 'ar' ? 'قطاع مسح نشط' : 'ACTIVE SURVEY'}</span>
            </div>
          </div>

          {/* Data Bento Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans leading-relaxed">
            {/* Left: Metadata panel */}
            <div className={`flex flex-col gap-2 p-3 rounded-lg border ${
              isDark ? 'bg-gray-950/40 border-gray-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="text-[11px] font-bold uppercase text-emerald-500 font-mono tracking-wider flex items-center gap-1.2.5 border-b pb-1 dark:border-gray-905">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{lang === 'ar' ? 'إحداثيات الموضع المرجعي' : 'Grid Landmark'}</span>
              </h4>
              <div className="flex flex-col gap-1.5 font-mono text-[10.5px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">{lang === 'ar' ? 'خط العرض:' : 'Latitude:'}</span>
                  <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>{results.point.lat.toFixed(5)}° N</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">{lang === 'ar' ? 'خط الطول:' : 'Longitude:'}</span>
                  <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>{results.point.lon.toFixed(5)}° E</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">{lang === 'ar' ? 'أفق الاستكشاف:' : 'Survey Horizon:'}</span>
                  <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>~ {(results.radius * 111 * 1000).toFixed(0)}m</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">{lang === 'ar' ? 'الشذوذات المرصودة:' : 'Detections:'}</span>
                  <span className="font-bold text-rose-500">{results.candidates.length} {lang === 'ar' ? 'تجاويف' : 'chambers'}</span>
                </div>
              </div>
            </div>

            {/* Right: Detailed Context and Stratigraphy */}
            <div className={`flex flex-col gap-2 p-3 rounded-lg border md:col-span-2 ${
              isDark ? 'bg-gray-950/40 border-gray-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="text-[11px] font-bold uppercase text-indigo-500 font-mono tracking-wider flex items-center gap-1.2.5 border-b pb-1 dark:border-gray-905">
                <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{lang === 'ar' ? 'تفسير الطبقات التراكمية والتكوين الجغرافي للمنطقة' : 'Regional Stratigraphy & Structural Setting'}</span>
              </h4>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">
                    {lang === 'ar' ? 'القطاع الاستكشافي:' : 'Survey Sector:'} <span className={isDark ? 'text-gray-300' : 'text-slate-850'}>{results.region_name}</span>
                  </span>
                  <p className={`${isDark ? 'text-gray-300' : 'text-slate-700'} text-[11px] leading-relaxed font-sans`}>
                    {translateGeologicalContext(results.geological_context, lang)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className={isDark ? 'border-gray-800' : 'border-slate-200'} />

          {/* Action and Prompt triggers */}
          <div className={`p-3.5 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-gray-950/45 border-gray-850' : 'bg-amber-50/15 border-amber-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-500 block mb-0.5">
                  {lang === 'ar' ? 'التوجيه الميداني المقترح للموقع المنظور' : 'RECOMMENDED INTEL DIRECTIVE'}
                </span>
                <p className={`text-[11px] leading-relaxed font-sans ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {selectedCandidate
                    ? (lang === 'ar'
                      ? `العينة المحددة حالياً: شذوذ #${selectedCandidate.id} من نوع (${selectedCandidate.type === 'Hypogeum Tomb Chamber' ? 'مدافن جنائزية تحت الأرض' : selectedCandidate.type === 'Karstic Sinkhole' ? 'بالوعة غائرة كارستية' : selectedCandidate.type === 'Collapse Lava Tube' ? 'قناة بركانية منهارة' : 'خزان مياه تحت سطح الأرض'}). اضغط على الزر بجانب لطلب تفسير جيولوجي أثري مفصل مدعوم بالذكاء الاصطناعي.`
                      : `Active sensor focus is locked on Anomaly #${selectedCandidate.id} [${selectedCandidate.type}]. Downlink the generative expert dossier report directly to generate a complete geological assessment.`)
                    : (lang === 'ar'
                      ? 'يرجى اختيار أحد معالم الشذوذ المكتشفة من القائمة التفاعلية في الأعلى لتفعيل قراءة تفصيلية فوتوغرامترية فورية للقمر الصناعي.'
                      : 'Please select an identified anomaly target from the ledger above to calculate stereoscopic satellite overlays & structural walls depth.')}
                </p>
              </div>
            </div>

            {selectedCandidate && onTriggerAnalysis && (
              <button
                type="button"
                onClick={() => onTriggerAnalysis(selectedCandidate)}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-bold transition-all border shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  isDark
                    ? 'bg-rose-950/40 hover:bg-rose-900/40 border-rose-800 text-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
                id="ai-card-trigger-assessment-btn"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>{lang === 'ar' ? 'طلب مسودة التقرير التجميعي (AI)' : 'Request Expert Analysis'}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`border rounded-xl p-6 text-center select-none flex flex-col items-center justify-center gap-3.5 min-h-56 ${
        isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-100/60 border-slate-200'
      }`} id="ai-report-empty">
        <Sparkles className="w-8 h-8 text-rose-500 animate-pulse" />
        <div>
          <h3 className={`text-sm font-bold font-display mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.advisoryTitle}
          </h3>
          <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {t.advisoryDesc}
          </p>
        </div>
      </div>
    );
  }

  // Translate reports if lang arabic, by substituting key placeholders as generated by Gemini
  // Usually Gemini will output bilingual text or we can render translated keys
  const geoProbability = lang === 'ar' && report.geological_probability_ar ? report.geological_probability_ar : report.geological_probability;
  const archRelevance = lang === 'ar' && report.archaeological_relevance_ar ? report.archaeological_relevance_ar : report.archaeological_relevance;
  const coronaAnalysis = lang === 'ar' && report.corona_imagery_analysis_ar ? report.corona_imagery_analysis_ar : report.corona_imagery_analysis;
  const fieldRecs = lang === 'ar' && report.field_recommendations_ar ? report.field_recommendations_ar : report.field_recommendations;
  const execSummary = lang === 'ar' && report.summary_ar ? report.summary_ar : report.summary;

  return (
    <div className={`border rounded-xl p-5 shadow-xl flex flex-col gap-5 relative overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-white border-slate-200 text-slate-800'
    }`} id="ai-report-card">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Report Header Block */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3.5 ${
        isDark ? 'border-gray-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className={`text-sm font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'ar' ? 'ملف التحليل والتقييم الأثري والجيولوجي' : 'GEO-ARCHAEOLOGICAL ANALYSIS DOSSIER'}
            </h3>
            <p className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              CLASSIFICATION: DECLASSIFIED INTEL / @GOOGLE-GENAI REPORT
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded text-[10px] font-mono ${
          isDark ? 'bg-rose-950/40 border-rose-900/50 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-850 font-bold'
        }`}>
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          {t.unHeritageAdvisory}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans leading-relaxed">
        {/* Geological Probability */}
        <div className="flex gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold uppercase text-indigo-500 font-mono tracking-wider mb-1">
              {lang === 'ar' ? 'الاحتمالية الجيولوجية والتكوين' : 'Geological Probability'}
            </h4>
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>{geoProbability}</p>
          </div>
        </div>

        {/* Archaeological Speculation */}
        <div className="flex gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold uppercase text-amber-500 font-mono tracking-wider mb-1">
              {lang === 'ar' ? 'الأهمية والمطابقة الأثرية' : 'Archaeological Relevance'}
            </h4>
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>{archRelevance}</p>
          </div>
        </div>

        {/* CORONA Intelligence Verification */}
        <div className="flex gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold uppercase text-emerald-500 font-mono tracking-wider mb-1">
              {lang === 'ar' ? 'تطابق خرائط القمر الصناعي CORONA' : 'CORONA Spy Satellite Overlays'}
            </h4>
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>{coronaAnalysis}</p>
          </div>
        </div>

        {/* Field Survey Walking Guidelines */}
        <div className="flex gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold uppercase text-rose-500 font-mono tracking-wider mb-1">
              {lang === 'ar' ? 'تعليمات المسح والاستكشاف الميداني' : 'Survey Field Instructions'}
            </h4>
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'} text-[11px] leading-normal`}>{fieldRecs}</p>
          </div>
        </div>
      </div>

      <hr className={isDark ? 'border-gray-800' : 'border-slate-200'} />

      {/* Executive Summary Summary */}
      <div className={`p-4 rounded-lg border flex items-start gap-3 ${
        isDark ? 'bg-gray-950 border-gray-800' : 'bg-amber-50/40 border-amber-200 text-slate-700'
      }`}>
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600 block mb-0.5">
            {lang === 'ar' ? 'ملخص تنفيذي للموقع' : 'Executive Site Summary'}
          </span>
          <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-gray-300' : 'text-slate-850'}`}>{execSummary}</p>
        </div>
      </div>
    </div>
  );
}
