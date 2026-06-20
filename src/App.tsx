/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Compass, Cpu, Satellite, Radio, Globe, RefreshCcw, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { ScanResults, CaveCandidate, InterpretationReport, CustomPointAnalysis } from './types';
import SectorSidebar from './components/SectorSidebar';
import DemGridDisplay from './components/DemGridDisplay';
import AnalyticsPanel from './components/AnalyticsPanel';
import AiReportCard from './components/AiReportCard';
import { Language, translations } from './lib/translations';
import AiAnalysisDesk from './components/AiAnalysisDesk';

// Start coordinates center: Palmyra Valley of Tombs
const PALMYRA_LAT = 34.5512;
const PALMYRA_LON = 38.2530;

export default function App() {
  // Localization and theme states
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const t = translations[lang];

  // Core Scanning coordinates
  const [lat, setLat] = useState(PALMYRA_LAT);
  const [lon, setLon] = useState(PALMYRA_LON);
  const [radius, setRadius] = useState(0.005);
  const [tpiThreshold, setTpiThreshold] = useState(-2.5);

  // CORONA spy-satellite timelines
  const [coronaYear, setCoronaYear] = useState<number>(1968);
  const [coronaOpacity, setCoronaOpacity] = useState<number>(0.4);

  // Status flags
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Active results
  const [results, setResults] = useState<ScanResults | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

  // Cache reports for candidates so switching is instant and elegant
  // We identify cache key by: `lat_lon_candidateId`
  const [reportCache, setReportCache] = useState<Record<string, InterpretationReport>>({});

  // Custom hand-pinned coordinates state of interest on the map
  const [customPoint, setCustomPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [customReport, setCustomReport] = useState<CustomPointAnalysis | null>(null);

  // Core trigger for physical coordinate scanner
  const runSensingScan = async (targetLat = lat, targetLon = lon, targetRadius = radius, overrideThreshold?: number) => {
    setIsScanning(true);
    setErrorStatus(null);
    try {
      const response = await fetch(`/api/analyze_cave?lat=${targetLat}&lon=${targetLon}&radius=${targetRadius}`);
      if (!response.ok) {
        throw new Error(`Sensing Server returned status Code ${response.status}`);
      }
      const data: ScanResults = await response.json();
      
      if (data.status === 'success') {
        // Apply filter on candidates based on our dynamic slider threshold
        // (Server returns preset targets, filter threshold mimics client-side sensitivity)
        const thresholdToUse = overrideThreshold !== undefined ? overrideThreshold : tpiThreshold;
        const filteredCandidates = data.candidates.filter(
          (c) => c.intensity <= thresholdToUse
        );

        const filteredResults: ScanResults = {
          ...data,
          candidates: filteredCandidates
        };

        setResults(filteredResults);
        
        // Default select the first candidate index
        if (filteredCandidates.length > 0) {
          setSelectedCandidateId(filteredCandidates[0].id);
        } else {
          setSelectedCandidateId(null);
        }
      } else {
        throw new Error('Sensing returned invalid pipeline status');
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Subsurface telemetry pipeline failure');
    } finally {
      // Small simulated buffer to ensure smooth CSS scanning sweeps
      setTimeout(() => {
        setIsScanning(false);
      }, 700);
    }
  };

  // Immediate init scan around Palmyra on startup
  useEffect(() => {
    runSensingScan(PALMYRA_LAT, PALMYRA_LON);
  }, []);

  const handleCoordinatesChange = (newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    setCustomPoint(null);
    setCustomReport(null);
    runSensingScan(newLat, newLon);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    setCustomPoint(null);
    setCustomReport(null);
    runSensingScan(lat, lon, newRadius);
  };

  const handleThresholdChange = (newThreshold: number) => {
    setTpiThreshold(newThreshold);
    // If results already exist, apply filtering on the fly
    if (results) {
      runSensingScan(lat, lon, radius);
    }
  };

  const handleRecallPreset = (pLat: number, pLon: number, pRadius: number, pThreshold: number) => {
    setLat(pLat);
    setLon(pLon);
    setRadius(pRadius);
    setTpiThreshold(pThreshold);
    setCustomPoint(null);
    setCustomReport(null);
    runSensingScan(pLat, pLon, pRadius, pThreshold);
  };

  // Handler for custom coordinate selection by clicking the map
  const handleMapClick = (clickLat: number, clickLon: number) => {
    setSelectedCandidateId(null); // Clear selected candidate to highlight custom mode
    setCustomPoint({ lat: clickLat, lon: clickLon });
    setCustomReport(null); // Reset previous report to prompt new AI scan
  };

  // Handler for querying Gemini or simulation for arbitrary coordinates
  const handleTriggerCustomPointAnalysis = async (cLat: number, cLon: number) => {
    setIsAnalyzing(true);
    setCustomReport(null);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/gemini/analyze_point', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: cLat,
          lon: cLon,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI coordinate analysis returned error: Status ${response.status}`);
      }

      const data = await response.json();
      if (data.report) {
        setCustomReport(data.report);
      } else {
        throw new Error('Analyst returned invalid custom report schema');
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'AI Custom Probe analysis failure');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for querying Gemini AI archaeological geology model
  const handleTriggerAiAnalysis = async (candidate: CaveCandidate) => {
    if (!results) return;
    
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${candidate.id}`;
    
    // Check if report already exists in our client cache
    if (reportCache[cacheKey]) {
      return; // already loaded
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate,
          region: results.region_name,
          context: results.geological_context,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI interpretation error: State ${response.status}`);
      }

      const data = await response.json();
      if (data.report) {
        setReportCache((prev) => ({
          ...prev,
          [cacheKey]: data.report,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus('AI Specialist downlink error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Identify current active candidate report if cached
  const getActiveReport = () => {
    if (!results || selectedCandidateId === null) return null;
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${selectedCandidateId}`;
    return reportCache[cacheKey] || null;
  };

  const selectedCandidate = results?.candidates.find((c) => c.id === selectedCandidateId) || null;

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${
        theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-slate-50 text-slate-900'
      }`} 
      id="app-root"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch" id="workspace">
        {/* Left Control Column */}
        <SectorSidebar
          currentLat={lat}
          currentLon={lon}
          radius={radius}
          tpiThreshold={tpiThreshold}
          isScanning={isScanning}
          onCoordinatesChange={handleCoordinatesChange}
          onRadiusChange={handleRadiusChange}
          onThresholdChange={handleThresholdChange}
          onScanTrigger={() => runSensingScan()}
          onPresetRecall={handleRecallPreset}
          lang={lang}
          theme={theme}
          onLangChange={setLang}
          onThemeChange={setTheme}
        />

        {/* Central Display Workspace Grid */}
        <div 
          className={`flex-1 flex flex-col min-w-0 transition-colors duration-200 ${
            theme === 'dark' ? 'bg-gray-950' : 'bg-slate-50'
          }`} 
          id="central-display-container"
        >
          <div className="flex-1 flex flex-col">
            {results ? (
              <DemGridDisplay
                results={results}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={(cand) => {
                  setSelectedCandidateId(cand.id);
                  setCustomPoint(null);
                  setCustomReport(null);
                }}
                coronaYear={coronaYear}
                setCoronaYear={setCoronaYear}
                coronaOpacity={coronaOpacity}
                lang={lang}
                theme={theme}
                onMapClick={handleMapClick}
                customPoint={customPoint}
                onCoordinatesChange={handleCoordinatesChange}
              />
            ) : (
              <div 
                className={`flex-1 flex flex-col items-center justify-center p-10 font-mono gap-4 transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-gray-950 text-gray-500' : 'bg-slate-50 text-slate-500'
                }`} 
                id="dem-loading-box"
              >
                <RefreshCcw className="w-10 h-10 animate-spin text-emerald-500/70" />
                <p className="text-xs">{t.initialisingPalsar}</p>
              </div>
            )}
          </div>

          {/* Underlay: Generative AI Heritage dossier report and general summaries */}
          <div 
            className={`border-t p-5 mt-auto flex flex-col gap-6 transition-colors duration-200 ${
              theme === 'dark' ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200'
            }`} 
            id="report-underlay-section"
          >
            {/* AI Geo-Intelligence Document & Vision Lab */}
            <AiAnalysisDesk 
              lang={lang} 
              theme={theme} 
              onPlotCoordinates={handleCoordinatesChange} 
            />

            <AiReportCard
              report={getActiveReport()}
              isAnalyzing={isAnalyzing}
              selectedCandidate={selectedCandidate}
              lang={lang}
              theme={theme}
              results={results}
              onTriggerAnalysis={handleTriggerAiAnalysis}
              customPoint={customPoint}
              customReport={customReport}
              onTriggerCustomAnalysis={handleTriggerCustomPointAnalysis}
            />
          </div>
        </div>

        {/* Right Information Analytics Column */}
        {results && (
          <AnalyticsPanel
            results={results}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={(cand) => {
              setSelectedCandidateId(cand.id);
              setCustomPoint(null);
              setCustomReport(null);
            }}
            onTriggerAnalysis={handleTriggerAiAnalysis}
            isAnalyzing={isAnalyzing}
            coronaYear={coronaYear}
            onCoronaYearChange={setCoronaYear}
            coronaOpacity={coronaOpacity}
            onCoronaOpacityChange={setCoronaOpacity}
            lang={lang}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
