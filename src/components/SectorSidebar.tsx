/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Target, Layers, Navigation, HelpCircle, Compass, Bookmark, Trash2, Plus, Sun, Moon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface Sector {
  key: string;
  lat: number;
  lon: number;
}

const PRESET_SECTORS: Sector[] = [
  { key: 'palmyra', lat: 34.5512, lon: 38.2530 },
  { key: 'abdulaziz', lat: 36.4350, lon: 40.5050 },
  { key: 'rasAlAyn', lat: 36.8510, lon: 40.0710 },
  { key: 'alsafa', lat: 33.0500, lon: 37.1500 },
  { key: 'aleppo', lat: 36.1992, lon: 37.1626 },
  { key: 'zawiya', lat: 35.7330, lon: 36.6110 },
];

export interface SavedPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius: number;
  threshold: number;
}

interface SectorSidebarProps {
  currentLat: number;
  currentLon: number;
  radius: number;
  tpiThreshold: number;
  isScanning: boolean;
  onCoordinatesChange: (lat: number, lon: number) => void;
  onRadiusChange: (val: number) => void;
  onThresholdChange: (val: number) => void;
  onScanTrigger: () => void;
  onPresetRecall?: (pLat: number, pLon: number, pRadius: number, pThreshold: number) => void;
  lang: Language;
  theme: 'dark' | 'light';
  onLangChange?: (lang: Language) => void;
  onThemeChange?: (theme: 'dark' | 'light') => void;
}

export default function SectorSidebar({
  currentLat,
  currentLon,
  radius,
  tpiThreshold,
  isScanning,
  onCoordinatesChange,
  onRadiusChange,
  onThresholdChange,
  onScanTrigger,
  onPresetRecall,
  lang,
  theme,
  onLangChange,
  onThemeChange,
}: SectorSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [latInput, setLatInput] = useState(currentLat.toFixed(6));
  const [lonInput, setLonInput] = useState(currentLon.toFixed(6));
  const [showGuide, setShowGuide] = useState(false);

  // Persistence of custom sidebar font size and accent color
  const [sidebarFontSize, setSidebarFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('geo_sidebar_font_size');
    return saved ? Number(saved) : 12;
  });
  const [sidebarTextColor, setSidebarTextColor] = useState<string>(() => {
    const saved = localStorage.getItem('geo_sidebar_accent_color');
    return saved || '#10b981';
  });

  const updateFontSize = (size: number) => {
    setSidebarFontSize(size);
    localStorage.setItem('geo_sidebar_font_size', size.toString());
  };

  const updateTextColor = (color: string) => {
    setSidebarTextColor(color);
    localStorage.setItem('geo_sidebar_accent_color', color);
  };

  // Custom presets states
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [presetNameInput, setPresetNameInput] = useState<string>('');

  const t = translations[lang];

  // Sync inputs back when map marker / default location shifts
  useEffect(() => {
    setLatInput(currentLat.toFixed(6));
    setLonInput(currentLon.toFixed(6));
  }, [currentLat, currentLon]);

  // Load custom presets on mount
  useEffect(() => {
    const saved = localStorage.getItem('geo_explorer_presets_v1');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved presets:', e);
      }
    }
  }, []);

  const handleSectorSelect = (sector: Sector) => {
    setLatInput(sector.lat.toFixed(6));
    setLonInput(sector.lon.toFixed(6));
    onCoordinatesChange(sector.lat, sector.lon);
  };

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(latInput);
    const n = parseFloat(lonInput);
    if (!isNaN(l) && !isNaN(n)) {
      onCoordinatesChange(l, n);
    }
  };

  const savePresets = (updated: SavedPreset[]) => {
    setCustomPresets(updated);
    localStorage.setItem('geo_explorer_presets_v1', JSON.stringify(updated));
  };

  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const name = presetNameInput.trim();
    if (!name) return;

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name,
      lat: currentLat,
      lon: currentLon,
      radius,
      threshold: tpiThreshold,
    };

    const updated = [...customPresets, newPreset];
    savePresets(updated);
    setPresetNameInput('');
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    savePresets(updated);
  };

  const handleRecallCustomPreset = (p: SavedPreset) => {
    setLatInput(p.lat.toFixed(6));
    setLonInput(p.lon.toFixed(6));
    if (onPresetRecall) {
      onPresetRecall(p.lat, p.lon, p.radius, p.threshold);
    } else {
      onCoordinatesChange(p.lat, p.lon);
      onRadiusChange(p.radius);
      onThresholdChange(p.threshold);
      onScanTrigger();
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className={`w-full lg:transition-all lg:duration-500 lg:ease-in-out shrink-0 select-none border-b lg:border-b-0 relative flex flex-col ${
        isExpanded 
          ? 'lg:w-80 p-5 lg:overflow-y-auto' 
          : 'lg:w-14 p-2 lg:p-2 lg:overflow-hidden'
      } ${
        isDark 
          ? 'bg-gray-900 border-gray-800 lg:border-r text-gray-100' 
          : 'bg-white border-slate-200 lg:border-r text-slate-800'
      }`} 
      id="sector-sidebar"
    >
      {/* 1. COLLAPSED VIEW (Desktop and Mobile) */}
      {!isExpanded && (
        <div 
          className="flex flex-row lg:flex-col items-center justify-between lg:justify-start gap-4 lg:gap-6 w-full h-full"
          style={{ fontSize: `${sidebarFontSize}px` }}
        >
          {/* Mobile Collapsed Logo & Heading */}
          <div className="flex items-center gap-2 lg:hidden">
            <Compass className="w-5 h-5 animate-pulse" style={{ color: sidebarTextColor }} />
            <span className="font-bold text-sm tracking-tight" style={{ color: sidebarTextColor }}>{t.appName}</span>
          </div>

          {/* Desktop Logo marker at top */}
          <div 
            className="hidden lg:flex flex-col items-center gap-4 py-2 text-xs font-mono font-bold select-none border-b w-full mb-2"
            style={{ color: sidebarTextColor, borderColor: `${sidebarTextColor}20` }}
          >
            <Compass className="w-6 h-6 animate-pulse" style={{ color: sidebarTextColor }} />
          </div>

          {/* Core Action: "Show Console" / "SHOW" Button */}
          <button
            id="show-sidebar-btn"
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 lg:py-6 lg:px-2 rounded-lg text-black font-semibold text-xs transition-all hover:scale-[1.03] active:scale-[0.97] shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5 lg:w-10 w-auto"
            style={{ 
              backgroundColor: sidebarTextColor,
              boxShadow: `0 4px 12px ${sidebarTextColor}20`
            }}
            title={lang === 'ar' ? 'عرض لوحة التحكم' : 'Show Control Panel'}
          >
            {/* Desktop rotated text */}
            <span className="hidden lg:inline rotate-90 origin-center whitespace-nowrap text-[10px] font-bold tracking-widest uppercase py-4 text-black">
              {lang === 'ar' ? 'عرض الكونسول 📡' : 'SHOW CONSOLE 📡'}
            </span>
            <span className="lg:hidden font-bold flex items-center gap-1 text-black">
              <span>{lang === 'ar' ? 'عرض الكونسول 📡' : 'Show Console 📡'}</span>
            </span>
          </button>

          {/* Desktop Collapsed Spacer/Filler */}
          <div className="hidden lg:flex flex-1" />
        </div>
      )}

      {/* 2. EXPANDED VIEW (Desktop and Mobile) */}
      <div 
        className={`flex flex-col gap-6 w-full h-full transition-all duration-350 ${
          isExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none hidden lg:flex'
        }`}
        style={{ fontSize: `${sidebarFontSize}px` }}
      >
        {/* App Header (Inside Sidebar for layout unity) */}
        <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 animate-pulse" style={{ color: sidebarTextColor }} />
            <h1 className={`text-base font-bold font-sans tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.appName}
            </h1>
          </div>

          {/* "Hide Console" collapse toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold border hover:text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
            style={{
              borderColor: `${sidebarTextColor}30`,
              color: sidebarTextColor,
              backgroundColor: `${sidebarTextColor}08`
            }}
            title={lang === 'ar' ? 'إخفاء لوحة التحكم' : 'Hide Control Panel'}
          >
            {lang === 'ar' ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
            <span>{lang === 'ar' ? 'إخفاء' : 'HIDE'}</span>
          </button>
        </div>

        {/* Bilingual Theme & Language Switcher Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-gray-950/20 dark:bg-black/45 p-0.5 rounded-md border border-slate-205 dark:border-gray-800">
            <button
              type="button"
              onClick={() => onLangChange?.('en')}
              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold transition-all cursor-pointer ${
                lang === 'en'
                  ? 'text-black font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={lang === 'en' ? { backgroundColor: sidebarTextColor } : {}}
              title="Bilingual: English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLangChange?.('ar')}
              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold transition-all cursor-pointer ${
                lang === 'ar'
                  ? 'text-black font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={lang === 'ar' ? { backgroundColor: sidebarTextColor } : {}}
              title="Bilingual: Arabic"
            >
              AR
            </button>
          </div>

          <button
            type="button"
            onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
            className={`p-1 rounded-md border transition-all cursor-pointer ${
              isDark
                ? 'bg-gray-950/20 dark:bg-black/45 border-gray-800 text-yellow-400 hover:text-yellow-300'
                : 'bg-slate-100 border-slate-200 text-indigo-900 hover:bg-slate-200'
            }`}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <p className={`text-xs font-sans leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          {t.appSubtitle}
        </p>

        {/* Dynamic Display Controls Panel */}
        <div 
          className={`mt-1 p-2.5 rounded-lg border flex flex-col gap-2.5 ${
            isDark ? 'bg-gray-950/30 border-gray-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {lang === 'ar' ? 'تعديل حجم الخط ولون الواجهة' : 'Display Customizer'}
            </span>
          </div>

          {/* Slider for Font Size */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#475569' }}>
              {lang === 'ar' ? 'حجم الخط' : 'Font Size'}: <span className="font-mono font-bold" style={{ color: sidebarTextColor }}>{sidebarFontSize}px</span>
            </span>
            <input
              type="range"
              min="11"
              max="16"
              step="1"
              value={sidebarFontSize}
              onChange={(e) => updateFontSize(Number(e.target.value))}
              className="w-24 h-1 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: sidebarTextColor }}
            />
          </div>

          {/* Color pickers */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#475569' }}>
              {lang === 'ar' ? 'اللون المميز' : 'Accent Color'}
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { hex: '#10b981', label: 'Emerald' },
                { hex: '#3b82f6', label: 'Blue' },
                { hex: '#f59e0b', label: 'Amber' },
                { hex: '#e11d48', label: 'Rose' },
                { hex: '#8b5cf6', label: 'Violet' }
              ].map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => updateTextColor(color.hex)}
                  className="w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 focus:outline-none"
                  style={{ 
                    backgroundColor: color.hex,
                    boxShadow: sidebarTextColor === color.hex ? `0 0 0 2px ${isDark ? '#ffffff' : '#000000'}` : 'none'
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <hr className={isDark ? 'border-gray-800' : 'border-slate-200'} />

      {/* Preset Sectors Selection */}
      <div className="flex flex-col gap-2">
        <label className={`text-xs uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <Target className="w-3.5 h-3.5" style={{ color: sidebarTextColor }} />
          {t.targetSectors}
        </label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {PRESET_SECTORS.map((s) => {
            const isSelected = 
              Math.abs(s.lat - currentLat) < 0.001 && Math.abs(s.lon - currentLon) < 0.001;
            const sName = t[`${s.key}Name` as keyof typeof t] || s.key;
            const sDesc = t[`${s.key}Desc` as keyof typeof t] || '';

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSectorSelect(s)}
                className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-0.5 relative overflow-hidden ${
                  isSelected
                    ? isDark
                      ? 'text-white font-semibold'
                      : 'text-slate-950 font-semibold'
                    : isDark
                      ? 'bg-gray-950/45 border-gray-800 hover:border-gray-700 text-gray-300'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                }`}
                style={isSelected ? {
                  borderColor: sidebarTextColor,
                  backgroundColor: isDark ? `${sidebarTextColor}15` : `${sidebarTextColor}08`
                } : {}}
                id={`preset-${s.key}`}
              >
                {isSelected && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-bl" style={{ backgroundColor: sidebarTextColor }} />
                )}
                <span className="font-semibold font-display">{sName}</span>
                <span className={`text-[10px] line-clamp-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{sDesc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Presets Selection */}
      <div className="flex flex-col gap-2">
        <label className={`text-xs uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <Bookmark className="w-3.5 h-3.5 text-amber-500" />
          {lang === 'ar' ? 'البحوث والمسارات المخصصة' : 'My Saved Scans'}
        </label>

        {/* List of custom presets */}
        {customPresets.length > 0 ? (
          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {customPresets.map((p) => {
              const isSelected = 
                Math.abs(p.lat - currentLat) < 0.0001 &&
                Math.abs(p.lon - currentLon) < 0.0001 &&
                Math.abs(p.radius - radius) < 0.0001 &&
                Math.abs(p.threshold - tpiThreshold) < 0.05;

              return (
                <div
                  key={p.id}
                  onClick={() => handleRecallCustomPreset(p)}
                  className={`group text-left p-2 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-amber-950/35 border-amber-500 text-amber-200'
                        : 'bg-amber-50 border-amber-500 text-amber-950 font-semibold'
                      : isDark
                        ? 'bg-gray-950/45 border-gray-850 hover:border-gray-750 text-gray-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                  }`}
                  id={`preset-custom-${p.name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-semibold font-display truncate leading-tight">{p.name}</span>
                    <span className={`text-[9px] font-mono leading-none ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {p.lat.toFixed(4)}°N, {p.lon.toFixed(4)}°E • {(p.radius * 222).toFixed(1)}km • {p.threshold.toFixed(1)}m
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(p.id, e)}
                    className="p-1 text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                    title={lang === 'ar' ? 'حذف هذا الإعداد' : 'Delete Preset'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`p-2.5 rounded-lg border border-dashed text-center text-[10px] ${
            isDark ? 'border-gray-800 bg-gray-950/20 text-gray-500' : 'border-slate-200 bg-slate-50/50 text-slate-400'
          }`}>
            {lang === 'ar' ? 'لا توجد إعدادات مخصصة محفوظة' : 'No custom scan configurations saved.'}
          </div>
        )}

        {/* Save Current as Preset Form */}
        <form onSubmit={handleSaveCurrentAsPreset} className="flex gap-1.5 mt-1">
          <input
            type="text"
            required
            placeholder={lang === 'ar' ? 'تسمية المعايير الحالية...' : 'Name current setup...'}
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            className={`flex-1 rounded px-2.5 py-1.5 text-[11px] font-sans focus:outline-none transition-colors ${
              isDark 
                ? 'bg-gray-950 border border-gray-800 text-white focus:border-amber-500 placeholder-gray-600' 
                : 'bg-white border border-slate-200 text-slate-800 focus:border-amber-500 placeholder-slate-400'
            }`}
          />
          <button
            type="submit"
            className={`px-3 py-1.5 rounded text-[11px] font-bold font-sans transition-colors border flex items-center gap-1 shrink-0 cursor-pointer ${
              isDark 
                ? 'bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-300' 
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800'
            }`}
            title={lang === 'ar' ? 'حفظ المواصفات الحالية' : 'Save current configuration'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'حفظ' : 'Save'}</span>
          </button>
        </form>
      </div>

      {/* Manual Coordinate Scanner */}
      <form 
        onSubmit={handleApplyCoordinates} 
        className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-colors duration-200 ${
          isDark ? 'bg-gray-950/60 border-gray-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <label className={`text-xs uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          {t.sensorPivot}
        </label>
        <div className="flex flex-col gap-3 mt-1.5 font-mono">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.latitude}</span>
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className={`w-full rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-gray-900 border border-gray-800 text-white focus:border-blue-500' 
                    : 'bg-white border border-slate-200 text-slate-800 focus:border-blue-500'
                }`}
                id="lat-input"
              />
            </div>
            <div>
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{t.longitude}</span>
              <input
                type="text"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                className={`w-full rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-gray-900 border border-gray-800 text-white focus:border-blue-500' 
                    : 'bg-white border border-slate-200 text-slate-800 focus:border-blue-500'
                }`}
                id="lon-input"
              />
            </div>
          </div>
          <button
            type="submit"
            className={`w-full py-1.5 rounded text-xs font-medium transition-colors border flex items-center justify-center gap-1 ${
              isDark 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            id="apply-coordinates-btn"
          >
            <Navigation className="w-3.5 h-3.5" />
            {t.lockCoordinates}
          </button>
        </div>
      </form>

      {/* Core Remote Sensing Settings */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className={`text-xs uppercase font-mono tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {t.scanningParams}
          </label>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            id="toggle-guide-btn"
            title={t.whatIsTpiTitle}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {showGuide && (
          <div className={`text-[10px] border rounded-lg p-2.5 leading-normal ${
            isDark ? 'bg-blue-950/20 border-blue-900/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`} id="tpi-guide-box">
            <span className={`font-semibold block mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.whatIsTpiTitle}</span>
            {t.whatIsTpiDesc}
          </div>
        )}

        {/* Scan Radius */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{t.spatialWidth}</span>
            <span className="text-blue-500 font-bold">{(radius * 222).toFixed(1)} {lang === 'ar' ? 'كم' : 'km'}</span>
          </div>
          <input
            type="range"
            min="0.002"
            max="0.015"
            step="0.001"
            value={radius}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
            id="slider-radius"
          />
          <span className={`text-[9px] leading-tight ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {lang === 'ar' 
              ? 'تتحكم في اتساع مصفوفة ارتفاع شبكة الاستشعار من المركز.' 
              : 'Controls width of the local elevation grid matrix from center point.'}
          </span>
        </div>

        {/* Dynamic TPI Threshold Sensitivity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{t.minDepression}</span>
            <span className="font-bold" style={{ color: sidebarTextColor }}>-{Math.abs(tpiThreshold).toFixed(1)} {t.meters}</span>
          </div>
          <input
            type="range"
            min="-4.0"
            max="-1.5"
            step="0.1"
            value={tpiThreshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: sidebarTextColor }}
            id="slider-threshold"
          />
          <span className={`text-[9px] leading-tight ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {lang === 'ar'
              ? 'عتبة الحساسية لتصفية الانخفاضات الضحلة والضوضاء الطبيعية.'
              : 'Sensitivity threshold to filter shallow depressions; lower filters natural noise.'}
          </span>
        </div>
      </div>

      <div className={`mt-auto pt-4 border-t ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
        <button
          type="button"
          disabled={isScanning}
          onClick={onScanTrigger}
          className={`w-full py-3 rounded-lg font-mono font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
            isScanning
              ? 'cursor-not-allowed border'
              : 'text-gray-950 hover:brightness-110 cursor-pointer'
          }`}
          style={isScanning ? {
            borderColor: `${sidebarTextColor}30`,
            color: sidebarTextColor,
            backgroundColor: `${sidebarTextColor}08`
          } : {
            backgroundColor: sidebarTextColor,
            boxShadow: `0 4px 14px ${sidebarTextColor}15`
          }}
          id="initiate-scan-btn"
        >
          {isScanning ? (
            <>
              <span className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin`} />
              {t.sensingBedrock}
            </>
          ) : (
            <>
              {t.executeScan}
            </>
          )}
        </button>
      </div>
      </div>
    </div>
  );
}
