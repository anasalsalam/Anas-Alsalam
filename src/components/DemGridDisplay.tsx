/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Activity, Eye, Info, Film, Clock, Map, Play, Pause, SkipForward, SkipBack, Locate, Download, Printer, Compass, X, Settings, Sparkles, Split, Maximize2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ScanResults, CaveCandidate } from '../types';
import { Language, translations } from '../lib/translations';
import LeafletMap from './LeafletMap';
import ExplorationScenarioDisplay from './ExplorationScenarioDisplay';
import Terrain3DViewer from './Terrain3DViewer';

interface DemGridDisplayProps {
  results: ScanResults;
  selectedCandidateId: number | null;
  onSelectCandidate: (candidate: CaveCandidate) => void;
  coronaYear: number;
  setCoronaYear: (year: number) => void;
  coronaOpacity: number;
  lang: Language;
  theme: 'dark' | 'light';
  onMapClick?: (lat: number, lon: number) => void;
  customPoint?: { lat: number; lon: number } | null;
  onCoordinatesChange?: (lat: number, lon: number) => void;
}

export default function DemGridDisplay({
  results,
  selectedCandidateId,
  onSelectCandidate,
  coronaYear,
  setCoronaYear,
  coronaOpacity,
  lang,
  theme,
  onMapClick,
  customPoint,
  onCoordinatesChange,
}: DemGridDisplayProps) {
  const [viewMode, setViewMode] = useState<'tpi' | 'dem' | 'corona' | 'satellite' | 'exploration' | 'compare' | 'terrain3d'>('tpi');
  const [palsarCompareMode, setPalsarCompareMode] = useState<'tpi' | 'dem'>('tpi');
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number; val: number; tpi: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [customLatInput, setCustomLatInput] = useState<string>('');
  const [customLonInput, setCustomLonInput] = useState<string>('');
  const t = translations[lang];

  // USGS Real-Time Regional Seismic States & Helper
  const [seismicData, setSeismicData] = useState<any[]>([]);
  const [seismicLoading, setSeismicLoading] = useState<boolean>(false);
  const [seismicError, setSeismicError] = useState<string | null>(null);
  const [seismicWarning, setSeismicWarning] = useState<boolean>(false);
  const [seismicCriticalEvents, setSeismicCriticalEvents] = useState<any[]>([]);
  const [lastSeismicFetch, setLastSeismicFetch] = useState<Date | null>(null);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // NASA Specs Display States
  const [showNasaSpecs, setShowNasaSpecs] = useState<boolean>(false);
  const [activeNasaSpecTab, setActiveNasaSpecTab] = useState<'levels' | 'formats' | 'worldview'>('levels');

  // Tactical Operations Deck States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(3000);
  const [hudLogMessage, setHudLogMessage] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Professional Print Customizer States
  const [surveyorName, setSurveyorName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');
  const [classificationLevel, setClassificationLevel] = useState<string>('TOP_SECRET');
  const [includeNarrative, setIncludeNarrative] = useState<boolean>(true);
  const [includeCatalog, setIncludeCatalog] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [customNotes, setCustomNotes] = useState<string>('');

  // 2D Elevation Profile States
  const [lineMode, setLineMode] = useState<'row' | 'col' | 'diag1' | 'diag2' | 'custom'>('row');
  const [selectedRow, setSelectedRow] = useState<number>(7);
  const [selectedCol, setSelectedCol] = useState<number>(7);
  const [customStart, setCustomStart] = useState<{ x: number; y: number } | null>(null);
  const [customEnd, setCustomEnd] = useState<{ x: number; y: number } | null>(null);

  const { dem_grid, tpi_grid, min_elevation, max_elevation, candidates, point, radius } = results;

  const visibleCandidates = typeFilter === 'all'
    ? candidates
    : candidates.filter((cand) => cand.type === typeFilter);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || null;

  // Clear HUD log automatically after 4 seconds
  useEffect(() => {
    if (hudLogMessage) {
      const timer = setTimeout(() => {
        setHudLogMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [hudLogMessage]);

  // Synchronize coordinates field when map is clicked (customPoint is placed)
  // or when the primary sensing database center shifts
  useEffect(() => {
    if (customPoint) {
      setCustomLatInput(customPoint.lat.toFixed(6));
      setCustomLonInput(customPoint.lon.toFixed(6));
    } else {
      setCustomLatInput(point.lat.toFixed(6));
      setCustomLonInput(point.lon.toFixed(6));
    }
  }, [customPoint, point]);

  // Fetch real-time USGS Seismic activity when point coordinates change
  useEffect(() => {
    if (!point?.lat || !point?.lon) return;

    let isMounted = true;
    const fetchSeismic = async () => {
      setSeismicLoading(true);
      setSeismicError(null);
      setSeismicWarning(false);
      setSeismicCriticalEvents([]);

      try {
        // Query recent quakes (e.g., last 120 days) within 250km radial distance
        const date = new Date();
        date.setDate(date.getDate() - 120);
        const starttime = date.toISOString().split('T')[0];

        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${point.lat}&longitude=${point.lon}&maxradiuskm=250&starttime=${starttime}&minmagnitude=2.0`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('USGS status: ' + res.status);
        const json = await res.json();

        if (!isMounted) return;

        const features = json.features || [];
        const parsedEvents = features.map((feat: any) => {
          const eqLon = feat.geometry?.coordinates?.[0];
          const eqLat = feat.geometry?.coordinates?.[1];
          const eqDepth = feat.geometry?.coordinates?.[2];
          const mag = feat.properties?.mag ?? 2.0;
          const place = feat.properties?.place ?? 'Unknown Location';
          const time = feat.properties?.time ? new Date(feat.properties.time) : new Date();
          const title = feat.properties?.title ?? `M ${mag}`;

          const distance = haversineDistance(point.lat, point.lon, eqLat, eqLon);

          return {
            id: feat.id,
            lat: eqLat,
            lon: eqLon,
            depth: eqDepth,
            mag,
            place,
            time,
            title,
            distance,
          };
        }).sort((a: any, b: any) => b.time.getTime() - a.time.getTime());

        setSeismicData(parsedEvents);
        setLastSeismicFetch(new Date());

        // Check if quakes constitute a "significant shift" warning:
        // - magnitude >= 4.5 within 200km OR
        // - magnitude >= 3.5 within 80km
        const critical = parsedEvents.filter((eq: any) => {
          if (eq.mag >= 4.5 && eq.distance <= 180) return true;
          if (eq.mag >= 3.2 && eq.distance <= 75) return true;
          return false;
        });

        if (critical.length > 0) {
          setSeismicWarning(true);
          setSeismicCriticalEvents(critical);
          setHudLogMessage(
            lang === 'ar'
              ? `⚠️ الكشف عن خطر زلزالي قيد التحقق! زلزال بقوة ${critical[0].mag} على بعد ${critical[0].distance.toFixed(1)}كم.`
              : `⚠️ CRITICAL GROUND SHIFT WARNING: ${critical[0].mag} magnitude quake identified ${critical[0].distance.toFixed(1)}km away!`
          );
        }
      } catch (err: any) {
        if (!isMounted) return;
        setSeismicError(err.message || 'Error communicating with USGS.');
      } finally {
        if (isMounted) setSeismicLoading(false);
      }
    };

    fetchSeismic();

    return () => {
      isMounted = false;
    };
  }, [point?.lat, point?.lon]);

  // Handle coordinates search & earthy layer analysis submission
  const handleProberSearch = () => {
    const latNum = parseFloat(customLatInput);
    const lonNum = parseFloat(customLonInput);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setHudLogMessage(
        lang === 'ar' 
          ? 'خطأ: الإحداثيات المدخلة غير صالحة. يرجى إدخال أرقام صحيحة.' 
          : 'Telemetry Error: Please input valid decimal coordinates.'
      );
      return;
    }

    if (latNum < 32.5 || latNum > 37.5 || lonNum < 35.0 || lonNum > 42.5) {
      setHudLogMessage(
        lang === 'ar' 
          ? 'تنبيه: تقع الإحداثيات خارج الحدود الإقليمية للتغطية السورية (20° - 50°)' 
          : 'Sensing Alert: Coordinates occupy spaces outside scanned Syrian borders (32.5° to 37.5°N, 35.0° to 42.5°E).'
      );
      return;
    }

    setHudLogMessage(
      lang === 'ar'
        ? `جاري إعادة توجيه أجهزة الرادار وطبقات الاستشعار لخط العرض: ${latNum.toFixed(4)}، خط الطول: ${lonNum.toFixed(4)}`
        : `Recalibrating SAR sensors & PALSAR elevation matrices to Lat: ${latNum.toFixed(5)}°N, Lon: ${lonNum.toFixed(5)}°E...`
    );

    if (onCoordinatesChange) {
      onCoordinatesChange(latNum, lonNum);
    }
  };

  const calculateDistanceToCenter = (cand: CaveCandidate) => {
    const dLat = cand.latitude - point.lat;
    const dLon = cand.longitude - point.lon;
    const latRad = (point.lat * Math.PI) / 180;
    const distMeters = Math.sqrt(
      Math.pow(dLat * 111320, 2) + 
      Math.pow(dLon * 111320 * Math.cos(latRad), 2)
    );
    return distMeters;
  };

  const selectNextAnomaly = () => {
    if (visibleCandidates.length === 0) return;
    const currentIndex = visibleCandidates.findIndex(c => c.id === selectedCandidateId);
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % visibleCandidates.length;
    }
    onSelectCandidate(visibleCandidates[nextIndex]);
  };

  const selectPrevAnomaly = () => {
    if (visibleCandidates.length === 0) return;
    const currentIndex = visibleCandidates.findIndex(c => c.id === selectedCandidateId);
    let prevIndex = visibleCandidates.length - 1;
    if (currentIndex !== -1) {
      prevIndex = (currentIndex - 1 + visibleCandidates.length) % visibleCandidates.length;
    }
    onSelectCandidate(visibleCandidates[prevIndex]);
  };

  // Autoplay Tour effect
  useEffect(() => {
    if (!isPlaying || visibleCandidates.length === 0) return;
    const interval = setInterval(() => {
      selectNextAnomaly();
    }, playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, visibleCandidates, selectedCandidateId]);

  const handleFindNearest = () => {
    if (visibleCandidates.length === 0) return;
    let nearestCand = visibleCandidates[0];
    let minDistance = calculateDistanceToCenter(nearestCand);

    for (let i = 1; i < visibleCandidates.length; i++) {
      const cand = visibleCandidates[i];
      const dist = calculateDistanceToCenter(cand);
      if (dist < minDistance) {
        minDistance = dist;
        nearestCand = cand;
      }
    }

    onSelectCandidate(nearestCand);
    
    const localizedMsg = lang === 'ar'
      ? `تم اكتشاف وتوسيط: [عينة رقم ${nearestCand.id}] على مسافة بؤرية تبلغ ${minDistance.toFixed(1)}م`
      : `Focal Lock Acquisition: Target Anomaly #${nearestCand.id} found at distance ${minDistance.toFixed(1)}m`;
    
    setHudLogMessage(localizedMsg);
  };

  const handleExportJson = () => {
    const dataPackage = {
      project: "Syrian Subsurface Cave-Detection Geo-Explorer",
      timestamp: new Date().toISOString(),
      scanning_region: results.region_name,
      focal_coordinates: {
        latitude: point.lat,
        longitude: point.lon,
        radius_degrees: radius,
        radius_meters: radius * 111320
      },
      elevation_limits: {
        min_meters: min_elevation,
        max_meters: max_elevation
      },
      historical_coverage: {
        corona_declassified_year: coronaYear
      },
      detected_anomalies_summary: {
        total_found: candidates.length,
        filtered_count: visibleCandidates.length,
        filter_applied: typeFilter
      },
      anomalies_catalog: visibleCandidates.map(c => ({
        id: c.id,
        classification: c.type,
        gps_latitude: c.latitude,
        gps_longitude: c.longitude,
        em_tpi_intensity_meters: c.intensity,
        confidence_factor: c.confidence,
        dimensions: {
          surface_width_meters: c.dimensions.width,
          surface_length_meters: c.dimensions.length,
          ceiling_depth_approx_meters: c.dimensions.depth_approx
        },
        field_notes: c.geology_notes,
        distance_to_center_meters: calculateDistanceToCenter(c)
      }))
    };

    const jsonString = JSON.stringify(dataPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GEO-SURVEY-${results.region_name.toUpperCase().replace(/\s+/g, '-')}-DATA.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Counts of each type in current candidates catalog
  const countByType = (type: string) => candidates.filter((c) => c.type === type).length;
  const countAll = candidates.length;

  const getFilterSummaryText = () => {
    if (lang === 'ar') {
      if (typeFilter === 'all') {
        const parts: string[] = [];
        const sinkholes = countByType('Karstic Sinkhole');
        const tombs = countByType('Hypogeum Tomb Chamber');
        const tubes = countByType('Collapse Lava Tube');
        const cisterns = countByType('Subterranean Cistern');
        if (sinkholes > 0) parts.push(`${sinkholes} بالوعة`);
        if (tombs > 0) parts.push(`${tombs} مدافن`);
        if (tubes > 0) parts.push(`${tubes} قنوات`);
        if (cisterns > 0) parts.push(`${cisterns} خزانات`);
        return `عرض جميع الشذوذات الجغرافية (${parts.join('، ')})`;
      } else {
        const count = visibleCandidates.length;
        let typeNameAr = '';
        if (typeFilter === 'Karstic Sinkhole') typeNameAr = 'البالوعات الكارستية';
        if (typeFilter === 'Hypogeum Tomb Chamber') typeNameAr = 'المدافن الجنائزية';
        if (typeFilter === 'Collapse Lava Tube') typeNameAr = 'القنوات البركانية المنهارة';
        if (typeFilter === 'Subterranean Cistern') typeNameAr = 'خزانات المياه الجوفية';
        return `مصفى حسب [${typeNameAr}]: عثر على ${count} من الشذوذات`;
      }
    } else {
      if (typeFilter === 'all') {
        const parts: string[] = [];
        const sinkholes = countByType('Karstic Sinkhole');
        const tombs = countByType('Hypogeum Tomb Chamber');
        const tubes = countByType('Collapse Lava Tube');
        const cisterns = countByType('Subterranean Cistern');
        if (sinkholes > 0) parts.push(`${sinkholes} Sinkhole${sinkholes > 1 ? 's' : ''}`);
        if (tombs > 0) parts.push(`${tombs} Tomb${tombs > 1 ? 's' : ''}`);
        if (tubes > 0) parts.push(`${tubes} Lava Tube${tubes > 1 ? 's' : ''}`);
        if (cisterns > 0) parts.push(`${cisterns} Cistern${cisterns > 1 ? 's' : ''}`);
        return `Showing All Anomalies (${parts.join(', ')})`;
      } else {
        const count = visibleCandidates.length;
        const labelMap: Record<string, string> = {
          'Karstic Sinkhole': count === 1 ? 'Sinkhole' : 'Sinkholes',
          'Hypogeum Tomb Chamber': count === 1 ? 'Tomb' : 'Tombs',
          'Collapse Lava Tube': count === 1 ? 'Lava Tube' : 'Lava Tubes',
          'Subterranean Cistern': count === 1 ? 'Cistern' : 'Cisterns'
        };
        const typeName = labelMap[typeFilter] || typeFilter;
        return `Showing ${count} ${typeName}`;
      }
    }
  };

  // We pre-calculated coordinates map. The grid is 15x15.
  // We want to map value into standard color ramps
  const getColorForCell = (y: number, x: number, modeOverride?: 'tpi' | 'dem' | 'corona') => {
    const demVal = dem_grid[y][x];
    const tpiVal = tpi_grid[y][x];
    const activeMode = modeOverride || viewMode;

    if (activeMode === 'corona') {
      // Grayscale film simulation: base tone 80 to 200 based on elevation
      const ratio = (demVal - min_elevation) / (max_elevation - min_elevation || 1);
      
      // Create a pseudo-hillshade/slope by looking at current cell vs neighbor
      const nextXVal = x < 14 ? dem_grid[y][x + 1] : demVal;
      const nextYVal = y < 14 ? dem_grid[y + 1][x] : demVal;
      const slopeX = nextXVal - demVal;
      const slopeY = nextYVal - demVal;
      
      // Hillshade factor (light source from northwest) with authentic film contrast
      const hillshade = 140 + (slopeX * 6) - (slopeY * 6);
      let grayscale = Math.max(50, Math.min(225, hillshade));

      // Shifting sand dunes (drifting east-southeast over decades)
      const duneShift = (coronaYear - 1960) * 0.16;
      const dunePattern = Math.sin(x * 0.62 - duneShift + y * 0.44) * 12;
      grayscale += dunePattern;

      // Ancient Camel Caravan Route (diagonal running trail, fading as sand piles up from 1960 to 1980)
      const trailCenter = 11.5;
      const trailWidthIdx = Math.abs(x + y * 0.8 - trailCenter);
      if (trailWidthIdx < 0.65) {
        const trailFadingRatio = Math.max(0, 1 - (coronaYear - 1960) * 0.05);
        grayscale -= 25 * trailFadingRatio;
      }

      // Modern vehicle pathways / local tracks (appearing in 1970s)
      if (coronaYear >= 1970) {
        const trackAgeRatio = Math.min(1, (coronaYear - 1970) / 10);
        // A couple of straight archaeological excavations or truck tracks
        if (Math.abs(y - 3) < 0.25 || Math.abs(x - 11) < 0.25) {
          grayscale += 18 * trackAgeRatio;
        }
      }

      // Cavern Target Anomalies: Grayscale circular shaded pits of cave collapses
      for (const cand of visibleCandidates) {
        const pixelLatDegree = radius / 7.5;
        const pixelLonDegree = radius / 7.5;
        const cy = 7.5 - (cand.latitude - point.lat) / pixelLatDegree;
        const cx = 7.5 + (cand.longitude - point.lon) / pixelLonDegree;
        
        const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        if (dist < 1.8) {
          const erosionFactor = 1.0 + (coronaYear - 1960) * 0.02; // collapse expands 40% from 1960 to 1980
          const shadowEffect = 48 * Math.exp(-Math.pow(dist / (0.85 * erosionFactor), 2));
          grayscale -= shadowEffect;

          // Outer halo
          const lipRadius = 1.25 * erosionFactor;
          if (dist > 0.8 && dist < lipRadius) {
            grayscale -= 14;
          }
        }
      }

      const finalGray = Math.max(15, Math.min(245, Math.round(grayscale)));
      return `rgb(${finalGray}, ${finalGray}, ${finalGray})`;
    }

    if (activeMode === 'dem') {
      // Linear interpolation between absolute heights
      const ratio = (demVal - min_elevation) / (max_elevation - min_elevation || 1);
      
      // Terrain Color Ramp: Desert Depressions (low) to high rocky hills
      if (ratio < 0.15) {
        // Deep sinkhole pit/crater
        return 'rgb(30, 27, 75)'; // deep indigo
      } else if (ratio < 0.4) {
        // Valleys / low basins
        return `rgb(${Math.round(15 + ratio * 80)}, ${Math.round(80 + ratio * 150)}, ${Math.round(100 + ratio * 100)})`; // slate teal-ish
      } else if (ratio < 0.7) {
        // Slopes / sand plateaus
        const rRatio = (ratio - 0.4) / 0.3;
        return `rgb(${Math.round(180 + rRatio * 45)}, ${Math.round(140 + rRatio * 40)}, ${Math.round(90 - rRatio * 30)})`; // sandy bronze
      } else {
        // Limestone or basalt heights
        const hRatio = (ratio - 0.7) / 0.3;
        return `rgb(${Math.round(225 - hRatio * 40)}, ${Math.round(210 - hRatio * 50)}, ${Math.round(195 - hRatio * 60)})`; // off white / gray
      }
    } else {
      // Relative TPI color ramp: Highlight anomalous depressions (< -2.5m)
      if (tpiVal < -2.5) {
        // Strong cavity collapse
        const deepVal = Math.min(Math.abs(tpiVal) / 6, 1);
        return `rgb(${Math.round(16 - deepVal * 10)}, ${Math.round(24 + deepVal * 30)}, ${Math.round(150 + deepVal * 105)})`; // electric blue to bright royal blue
      } else if (tpiVal < -1.0) {
        // Mild hollows
        return 'rgb(30, 58, 138)'; // deep dark blue
      } else if (tpiVal < 1.0) {
        // Flat plateau field / background terrain
        const offset = (tpiVal + 1) / 2; // scale -1..1 to 0..1
        return `rgb(${Math.round(31 + offset * 20)}, ${Math.round(41 + offset * 10)}, ${Math.round(55 + offset * 105)})`; // charcoal slate base
      } else if (tpiVal < 2.5) {
        // Ridge rise
        return 'rgb(180, 83, 9)'; // clay brown
      } else {
        // Topographic peak/ridge
        return 'rgb(245, 158, 11)'; // golden amber
      }
    }
  };

  const getCandidateForCell = (y: number, x: number) => {
    const pixelLatDegree = radius / 7.5;
    const pixelLonDegree = radius / 7.5;

    for (const cand of visibleCandidates) {
      const cy = 7.5 - (cand.latitude - point.lat) / pixelLatDegree;
      const cx = 7.5 + (cand.longitude - point.lon) / pixelLonDegree;
      if (Math.abs(cy - y) < 0.5 && Math.abs(cx - x) < 0.5) {
        return cand;
      }
    }
    return null;
  };

  // Print styling & data evaluation helpers
  const getStampLabel = () => {
    switch (classificationLevel) {
      case 'TOP_SECRET':
        return lang === 'ar' ? 'سري للغاية / ملغى الحظر' : 'TOP SECRET / DECLASSIFIED';
      case 'SECRET':
        return lang === 'ar' ? 'سري / مأمن رقمياً' : 'SECRET / SECURE LAYER';
      case 'CONFIDENTIAL':
        return lang === 'ar' ? 'سري / مراجعة ميدانية' : 'CONFIDENTIAL / FIELD RECON';
      case 'RESTRICTED':
        return lang === 'ar' ? 'للاستخدام الأكاديمي المحدود' : 'RESTRICTED / ACADEMIC USE';
      default:
        return lang === 'ar' ? 'غير مصنف' : 'UNCLASSIFIED';
    }
  };

  const getStampColor = () => {
    switch (classificationLevel) {
      case 'TOP_SECRET':
        return 'border-rose-500 text-rose-500 bg-rose-500/5';
      case 'SECRET':
        return 'border-amber-500 text-amber-500 bg-amber-500/5';
      case 'CONFIDENTIAL':
        return 'border-emerald-500 text-emerald-500 bg-emerald-500/5';
      case 'RESTRICTED':
        return 'border-blue-500 text-blue-500 bg-blue-500/5';
      default:
        return 'border-gray-500 text-gray-500 bg-gray-500/5';
    }
  };

  const handleExportTxt = () => {
    const divider = "================================================================================\n";
    const subDivider = "--------------------------------------------------------------------------------\n";
    
    let content = "";
    content += divider;
    content += `[CLASSIFICATION: ${getStampLabel()}]\n`;
    content += `${agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الموحدة' : 'UNITED SPACE RECONNAISSANCE OFFICE')}\n`;
    content += `${lang === 'ar' ? 'ملف المسح الجيو-أثري وتحليل الصخر الأساسي المتكامل' : 'GEO-ARCHAEOLOGICAL SUBSURFACE RADAR SURVEY DOSSIER'}\n`;
    content += divider;
    content += `REF: KH4B-ALOS-PALSAR-SY-${point.lat.toFixed(2)}-${point.lon.toFixed(2)}\n`;
    content += `SYSTEM DATE: ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-US')}\n`;
    content += `SECURITY LEVEL: ${classificationLevel}\n`;
    content += `PRESET REGION: ${results.region_name}\n`;
    content += `CENTER COORDINATES: ${point.lat.toFixed(5)}°N, ${point.lon.toFixed(5)}°E\n`;
    content += `SEARCH RADIUS: ${radius}m\n`;
    content += `TOTAL MAPPED ANOMALIES: ${totalAnomalies}\n`;
    content += `ESTIMATED MEAN DEPTH: ${avgDepth.toFixed(1)}m\n`;
    content += divider;
    content += "\n";

    if (includeNarrative) {
      content += `I. ${lang === 'ar' ? 'السياق والتحليل الجيولوجي الأساسي للقطاع' : 'GEOLOGICAL CONTEXT & SUBSURFACE LITHOLOGY'}\n`;
      content += subDivider;
      content += `${results.geological_context}\n\n`;
    }

    if (includeCatalog) {
      content += `II. ${lang === 'ar' ? 'كتالوج وجدول تصنيفات الشذوذ تحت السطحية' : 'SUBSURFACE RADAR TARGET CATALOG'}\n`;
      content += subDivider;
      content += `${lang === 'ar' ? 'جدول الأهداف المحددة' : 'Active Target List'}:\n`;
      content += `${lang === 'ar' ? 'ثقة عالية (>=٨٠%):' : 'HIGH CONFIDENCE (>=80%):'} ${highConfidenceCount} / ${totalAnomalies}\n\n`;
      
      visibleCandidates.forEach((c) => {
        content += `Target ID: #${c.id}\n`;
        content += ` - ${lang === 'ar' ? 'التصنيف الهيكلي' : 'Structural Classification'}: ${c.type}\n`;
        content += ` - ${lang === 'ar' ? 'الإحداثيات' : 'GPS Coordinates'}: ${c.latitude.toFixed(5)}°N, ${c.longitude.toFixed(5)}°E\n`;
        content += ` - ${lang === 'ar' ? 'مقدار انحراف TPI' : 'TPI Deviation'}: ${c.intensity.toFixed(2)}m\n`;
        content += ` - ${lang === 'ar' ? 'العمق المقدر' : 'Estimated Depth'}: ${c.dimensions.depth_approx.toFixed(1)}m\n`;
        content += ` - ${lang === 'ar' ? 'الأبعاد' : 'Dimensions'}: ${c.dimensions.width}m x ${c.dimensions.length}m\n`;
        content += ` - ${lang === 'ar' ? 'درجة الثقة' : 'Confidence Level'}: ${c.confidence}%\n`;
        content += ` - ${lang === 'ar' ? 'الملاحظات الجيولوجية' : 'Geological Notes'}: ${c.geology_notes}\n`;
        content += `\n`;
      });
      content += "\n";
    }

    if (customNotes.trim() !== '') {
      content += `III. ${lang === 'ar' ? 'ملاحظات المسح والتنقيب الإضافية (ملحق IV)' : 'CUSTOM FIELD SURVEYOR NOTES (ADDENDUM)'}\n`;
      content += subDivider;
      content += `${customNotes}\n\n`;
    }

    if (includeSignature) {
      content += `IV. ${lang === 'ar' ? 'التوقيع والأختام الرسمية المعتمدة' : 'OFFICIAL STAMPS & VERIFIED SEALS'}\n`;
      content += subDivider;
      content += `Lead Field Surveyor: ${surveyorName || (lang === 'ar' ? 'د. سارة المصري، رئيسة الجيولوجيين' : 'Dr. Sarah Al-Masri, Chief Geologist')}\n`;
      content += `Issuing Agency: ${agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الموحدة' : 'UNITED SPACE RECONNAISSANCE OFFICE')}\n`;
      content += `Status Scorecard: VERIFIED & SEALED [SEC RES-L4]\n`;
    }

    content += divider;

    // Trigger file download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GEO-SURVEY-REF-${point.lat.toFixed(2)}-${point.lon.toFixed(2)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalAnomalies = visibleCandidates.length;
  const avgDepth = totalAnomalies > 0 
    ? visibleCandidates.reduce((acc, curr) => acc + curr.dimensions.depth_approx, 0) / totalAnomalies 
    : 0;
  const avgIntensity = totalAnomalies > 0
    ? visibleCandidates.reduce((acc, curr) => acc + curr.intensity, 0) / totalAnomalies
    : 0;
  const highConfidenceCount = visibleCandidates.filter(c => c.confidence >= 80).length;

  const isDark = theme === 'dark';

  // Bresenham's Line Algorithm to trace custom line points on a 15x15 grid
  const getGridLineCells = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const points: { x: number; y: number }[] = [];
    let x0 = start.x;
    let y0 = start.y;
    const x1 = end.x;
    const y1 = end.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      points.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return points;
  };

  // Check if cell is on the current active profile line
  const isCellOnProfileLine = (y: number, x: number) => {
    let cells: { x: number; y: number }[] = [];
    if (lineMode === 'row') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: selectedRow });
    } else if (lineMode === 'col') {
      for (let i = 0; i < 15; i++) cells.push({ x: selectedCol, y: i });
    } else if (lineMode === 'diag1') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: i });
    } else if (lineMode === 'diag2') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: 14 - i });
    } else if (lineMode === 'custom' && customStart) {
      if (customEnd) {
        cells = getGridLineCells(customStart, customEnd);
      } else {
        cells.push(customStart);
      }
    }
    return cells.some(c => c.x === x && c.y === y);
  };

  // Generate Profile Data for Recharts with local geographic calculations (12.5m spacing)
  const getProfileData = () => {
    let cells: { x: number; y: number }[] = [];
    if (lineMode === 'row') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: selectedRow });
    } else if (lineMode === 'col') {
      for (let i = 0; i < 15; i++) cells.push({ x: selectedCol, y: i });
    } else if (lineMode === 'diag1') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: i });
    } else if (lineMode === 'diag2') {
      for (let i = 0; i < 15; i++) cells.push({ x: i, y: 14 - i });
    } else if (lineMode === 'custom' && customStart) {
      if (customEnd) {
        cells = getGridLineCells(customStart, customEnd);
      } else {
        cells.push(customStart);
      }
    }

    let currentDist = 0;
    return cells.map((cell, idx) => {
      const elev = dem_grid[cell.y]?.[cell.x] ?? 0;
      const tpi = tpi_grid[cell.y]?.[cell.x] ?? 0;
      if (idx > 0) {
        const prevCell = cells[idx - 1];
        const stepDist = Math.sqrt(
          Math.pow((cell.x - prevCell.x) * 12.5, 2) +
          Math.pow((cell.y - prevCell.y) * 12.5, 2)
        );
        currentDist += stepDist;
      }
      const cand = getCandidateForCell(cell.y, cell.x);
      return {
        index: idx,
        label: `[${cell.x},${cell.y}]`,
        x: cell.x,
        y: cell.y,
        elevation: parseFloat(elev.toFixed(1)),
        tpi: parseFloat(tpi.toFixed(2)),
        distance: Math.round(currentDist),
        anomalyId: cand ? cand.id : null,
        anomalyType: cand ? cand.type : null,
      };
    });
  };

  const handleCellClick = (x: number, y: number) => {
    const cand = getCandidateForCell(y, x);
    if (cand) {
      onSelectCandidate(cand);
    }

    if (!customStart || (customStart && customEnd)) {
      setCustomStart({ x, y });
      setCustomEnd(null);
      setLineMode('custom');
      setHudLogMessage(
        lang === 'ar'
          ? `نقطة بداية المقطع: [${x}، ${y}] - حدد نقطة النهاية لمقاس الارتفاع الثنائي`
          : `Custom profile path start set at cell: [${x}, ${y}]. Choose end cell next.`
      );
    } else {
      setCustomEnd({ x, y });
      setLineMode('custom');
      setHudLogMessage(
        lang === 'ar'
          ? `رسم مقطع الارتفاع من [${customStart.x}، ${customStart.y}] إلى [${x}، ${y}]`
          : `Custom profile path locked from [${customStart.x}, ${customStart.y}] to [${x}, ${y}].`
      );
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 border rounded-lg text-xs font-mono shadow-md ${
          isDark ? 'bg-zinc-950/95 border-zinc-800 text-zinc-300' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <p className="font-bold border-b pb-1 dark:border-zinc-800 border-slate-100 mb-1">
            {lang === 'ar' ? `قطاع الخلية [${data.x}, ${data.y}]` : `Cell Sector [${data.x}, ${data.y}]`}
          </p>
          <p><span className="text-emerald-500">■</span> {lang === 'ar' ? 'الارتفاع السطحي:' : 'Surface Elevation:'} <span className="font-bold">{data.elevation}m</span></p>
          <p><span className="text-sky-505 text-sky-500">■</span> {lang === 'ar' ? 'انحراف TPI الدقيق:' : 'TPI Micro-Deviation:'} <span className="font-bold">{data.tpi}m</span></p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{lang === 'ar' ? 'المسافة على المسار:' : 'Cumulative Distance:'} {data.distance}m</p>
          {data.anomalyType && (
            <p className="mt-1.5 p-1 rounded bg-rose-500/10 text-rose-400 font-bold text-center border border-rose-500/20">
              ⚠️ [#{data.anomalyId}] {data.anomalyType}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`flex-1 flex flex-col p-5 select-none relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-gray-950 text-gray-100 grid-dots' : 'bg-slate-50 text-slate-800'
      }`} 
      id="dem-grid-display"
    >
      {/* Radar sweeping scanline overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        <div className="w-full h-1/3 radar-sweep absolute animate-[bounce_6s_infinite_alternate]" style={{ animationTimingFunction: 'linear' }} />
      </div>

      {/* Panel Controls */}
      <div 
        className={`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5 pb-5 border-b z-10 transition-all duration-300 ${
          isDark 
            ? 'border-gray-800 bg-gray-950/20' 
            : 'border-slate-200 bg-slate-50/20'
        }`}
        id="dem-panel-header-controls"
      >
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className={`p-1 rounded-md ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className={`text-xs md:text-sm uppercase font-mono tracking-wider font-bold ${isDark ? 'text-gray-200 font-semibold' : 'text-slate-800 font-bold'}`}>
              {lang === 'ar' ? 'نموذج رقعة الارتفاع الرقمية لـ ALOS PALSAR (بكسل 12.5م)' : 'ALOS PALSAR topographic sector raster (12.5m pixels)'}
            </h2>
          </div>

          {/* Sleek contextual data chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Sector / Location chip */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border shadow-sm ${
              isDark 
                ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <Map className="w-3 h-3 text-emerald-500 shrink-0 select-none mr-1 rtl:ml-1" />
              <span>{results.region_name}</span>
            </span>

            {/* GPS coordinate chip */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border shadow-sm ${
              isDark 
                ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <Locate className="w-3 h-3 text-sky-500 shrink-0 select-none mr-1 rtl:ml-1" />
              <span>{point.lat.toFixed(5)}°N, {point.lon.toFixed(5)}°E</span>
            </span>

            {/* Dynamic Active Filter Summary Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border shadow-sm transition-all gap-1.5 ${
              typeFilter !== 'all'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-[pulse_2.5s_infinite]'
                : isDark ? 'bg-zinc-900 border-zinc-850 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`} id="active-filter-summary">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${typeFilter !== 'all' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              {getFilterSummaryText()}
            </span>
          </div>
        </div>

        {/* Dropdown Filter & Mode Selector Combo wrapper */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3.5 shrink-0 select-none w-full lg:w-auto" id="dem-controls-combo-wrapper">
          {/* Dropdown Filter by Type */}
          <div className="flex items-center justify-between lg:justify-start gap-2.5" id="filter-by-type-wrapper">
            <span className={`text-[10px] uppercase font-mono tracking-wider font-bold shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {t.filterByTypeLabel}:
            </span>
            <div className="relative flex-1 lg:flex-initial">
              <select
                id="candidate-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`text-xs font-mono pl-2.5 pr-7 py-1.5 rounded-lg border w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none ${
                  isDark 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200 focus:border-emerald-500' 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-755 focus:border-slate-400 shadow-sm'
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: lang === 'ar' ? 'left 8px center' : 'right 8px center',
                  paddingLeft: lang === 'ar' ? '28px' : '10px',
                  paddingRight: lang === 'ar' ? '10px' : '28px',
                }}
              >
                <option value="all">{t.allTypesOption}</option>
                <option value="Karstic Sinkhole">{t.typeKarsticSinkhole}</option>
                <option value="Hypogeum Tomb Chamber">{t.typeHypogeumTomb}</option>
                <option value="Collapse Lava Tube">{t.typeCollapseLavaTube}</option>
                <option value="Subterranean Cistern">{t.typeSubterraneanCistern}</option>
              </select>
            </div>
          </div>

          {/* Mode Selector Tab Toggle */}
          <div className={`flex p-1 rounded-xl border select-none w-full xl:w-auto shrink-0 shadow-inner mt-3 lg:mt-4 xl:mt-0 ${
            isDark ? 'bg-zinc-900 border-zinc-805 bg-black/40' : 'bg-slate-100/90 border-slate-200 bg-slate-150/40'
          }`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:flex xl:gap-1 xl:w-auto xl:min-w-max">
              <button
                type="button"
                onClick={() => setViewMode('tpi')}
                title={lang === 'ar' ? 'مصفوفة انحراف TPI للسطح' : 'TPI Deviation Matrix'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  viewMode === 'tpi'
                    ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
                id="btn-view-tpi"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'مصفوفة TPI' : 'TPI Matrix'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('dem')}
                title={lang === 'ar' ? 'الكنتور المطلق لنموذج الارتفاع' : 'Absolute DEM Contour'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  viewMode === 'dem'
                    ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
                id="btn-view-dem"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'ارتفاع DEM' : 'DEM Absolute'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('corona')}
                title={lang === 'ar' ? 'أرشيف كورونا السري الملغى' : 'Declassified CORONA'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  viewMode === 'corona'
                    ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
                id="btn-view-corona"
              >
                <Film className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'أرشيف كورونا' : 'CORONA Spy'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('satellite')}
                title={lang === 'ar' ? 'خريطة عالية الدقة' : 'High Resolution Map'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  viewMode === 'satellite'
                    ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
                id="btn-view-satellite"
              >
                <Map className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'خريطة القمر' : 'Satellite Map'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('compare')}
                title={lang === 'ar' ? 'مقارنة طبقات الطبوغرافيا وكورونا جنباً إلى جنب' : 'Side-by-Side Topography & CORONA Comparison'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  viewMode === 'compare'
                    ? 'bg-emerald-500 text-gray-950 font-extrabold shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
                id="btn-view-compare"
              >
                <Split className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'مقارنة مزدوجة' : 'Compare Split'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('exploration')}
                title={lang === 'ar' ? 'المسح والمسبار الجيوفيزيائي' : 'Depth Surveys / Radar'}
                className={`col-span-2 sm:col-span-1 xl:col-span-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border ${
                  viewMode === 'exploration'
                    ? 'bg-amber-500 text-gray-950 border-amber-500 font-extrabold shadow-sm'
                    : isDark ? 'text-amber-400 border-transparent hover:text-amber-300 hover:bg-amber-500/10' : 'text-amber-700 border-transparent hover:text-amber-900 hover:bg-amber-50'
                }`}
                id="btn-view-exploration"
              >
                <Compass className={`w-3.5 h-3.5 shrink-0 ${viewMode === 'exploration' ? 'text-gray-950' : 'text-amber-500'}`} />
                <span>
                  {lang === 'ar' ? 'التحري العميق' : 'Depth Radar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('terrain3d')}
                title={lang === 'ar' ? 'تضاريس ثلاثية الأبعاد تفاعلية لبيانات SAR' : '3D Interactive Topographic View'}
                className={`col-span-2 sm:col-span-1 xl:col-span-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border ${
                  viewMode === 'terrain3d'
                    ? 'bg-emerald-500 text-gray-950 border-emerald-500 font-extrabold shadow-sm'
                    : isDark ? 'text-emerald-400 border-transparent hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-emerald-700 border-transparent hover:text-emerald-900 hover:bg-emerald-50'
                }`}
                id="btn-view-terrain3d"
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'ar' ? 'تضاريس مسبار ثلاثية الأبعاد' : '3D Terrain'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive HUD Log Alert Overlay - flashes when nearest/actions occur */}
      {hudLogMessage && (
        <div className={`mx-5 mt-3 px-3 py-2 rounded border text-xs font-mono animate-pulse flex items-center justify-between shadow-md transition-all ${
          isDark 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`} id="hud-log-toast">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>{hudLogMessage}</span>
          </div>
          <button type="button" onClick={() => setHudLogMessage(null)} className="hover:text-emerald-500 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Earth Layers Coordinate Prober Form */}
      <div 
        className={`mx-5 mt-4 p-4 rounded-xl border flex flex-col gap-4 shadow-md z-20 transition-all duration-305 ${
          isDark 
            ? 'bg-zinc-950/75 border-amber-500/30 text-gray-300' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        id="earth-layer-prober-panel"
      >
        {/* Header containing directions/instructions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b pb-3.5 dark:border-zinc-900 border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-amber-500/10 text-amber-500">
              <Compass className="w-4 h-4 animate-spin-slow text-amber-500" />
            </div>
            <div>
              <h3 className={`text-xs uppercase font-mono font-bold tracking-wider ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                {lang === 'ar' ? 'مستكشف ومسبار طبقات الأرض الإحداثي (AI-Ready)' : 'TERRAIN COMPONENT PROBE & LAYER ANALYZER'}
              </h3>
              <p className={`text-[10.5px] font-sans leading-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                {lang === 'ar' 
                  ? 'اختر نقطة بالضغط على الخريطة لتعبئة الإحداثيات، أو اكتب خطوط الطول والعرض يدوياً لبدء تحليل طبقات التربة الأساسية.'
                  : 'Click anywhere on the map to snap coordinates, or enter values manually into the fields below to analyze bedrock.'}
              </p>
            </div>
          </div>
          
          {/* Active Custom Marker Status Indicator */}
          {customPoint && (
            <div className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 border shrink-0 ${
              isDark 
                ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' 
                : 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
            }`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{lang === 'ar' ? 'هدف المسبار جاهز' : 'Grid probe locked'}</span>
            </div>
          )}
        </div>

        {/* Input group */}
        <div className="flex flex-col md:flex-row items-end gap-3.5 font-mono">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            {/* Latitude Field */}
            <div className="flex flex-col gap-1.5">
              <span className={`text-[10px] uppercase tracking-wide font-bold flex justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <span>{lang === 'ar' ? 'عرض جغرافي (N)' : 'Latitude (N)'}</span>
                {customPoint && <span className="text-amber-500 text-[9px] font-medium animate-pulse">{lang === 'ar' ? '(مبني على الخريطة)' : '(Active Map Pin)'}</span>}
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={customLatInput}
                  onChange={(e) => setCustomLatInput(e.target.value)}
                  placeholder="e.g. 34.551200"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-colors border ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  id="prober-lat-input"
                />
              </div>
            </div>

            {/* Longitude Field */}
            <div className="flex flex-col gap-1.5">
              <span className={`text-[10px] uppercase tracking-wide font-bold flex justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <span>{lang === 'ar' ? 'طول جغرافي (E)' : 'Longitude (E)'}</span>
                {customPoint && <span className="text-amber-500 text-[9px] font-medium animate-pulse">{lang === 'ar' ? '(مبني على الخريطة)' : '(Active Map Pin)'}</span>}
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={customLonInput}
                  onChange={(e) => setCustomLonInput(e.target.value)}
                  placeholder="e.g. 38.253000"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-colors border ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  id="prober-lon-input"
                />
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleProberSearch}
            className={`w-full md:w-auto px-5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border transition-all shadow-sm cursor-pointer hover:bg-opacity-95 hover:scale-[1.01] active:scale-[0.99] shrink-0 ${
              isDark 
                ? 'bg-amber-500 text-gray-950 border-amber-400' 
                : 'bg-amber-500 text-gray-950 border-amber-400 font-bold'
            }`}
            id="prober-search-btn"
          >
            <Sparkles className="w-4 h-4 text-gray-950 animate-pulse" />
            <span>{lang === 'ar' ? 'مسح وتحليل طبقات الأرض بالإحداثيات الجديدة' : 'Search & Analyze Bedrock Layers'}</span>
          </button>
        </div>
      </div>

      {/* Geospatial Operations Deck */}
      <div 
        className={`mx-5 mt-4 p-4 rounded-xl border flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center shadow-sm z-20 ${
          isDark ? 'bg-gray-900/60 border-gray-850' : 'bg-white border-slate-200'
        }`}
        id="geospatial-operations-deck"
      >
        {/* Find Nearest Tool Section */}
        <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3 border-b lg:border-b-0 pb-4 lg:pb-0 border-dashed border-gray-800/10 dark:border-gray-800/60">
          <button
            type="button"
            onClick={handleFindNearest}
            disabled={visibleCandidates.length === 0}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border shadow-sm transition-all cursor-pointer ${
              visibleCandidates.length === 0
                ? 'opacity-40 cursor-not-allowed bg-gray-900 border-gray-800 text-gray-500'
                : isDark
                  ? 'bg-gray-900 hover:bg-gray-800 border-gray-850 hover:border-gray-700 text-emerald-400 focus:ring-1 focus:ring-emerald-500'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-700 hover:text-emerald-800 focus:ring-1 focus:ring-emerald-400'
            }`}
            id="btn-find-nearest"
            title="Find closest declassified anomaly relative to current satellite focal center coordinate"
          >
            <Compass className="w-4 h-4 animate-spin-slow" />
            {t.findNearestBtn}
          </button>

          {/* Current selected candidate coordinates and distance display */}
          <div className="flex flex-col justify-center">
            {selectedCandidate ? (
              <div className="text-[11px] font-mono leading-relaxed">
                <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>#{selectedCandidate.id} {selectedCandidate.type}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  GPS: {selectedCandidate.latitude.toFixed(5)}°N, {selectedCandidate.longitude.toFixed(5)}°E | 
                  <span className="font-bold text-emerald-500 dark:text-emerald-400 mx-1">
                    {calculateDistanceToCenter(selectedCandidate).toFixed(1)}m
                  </span> 
                  {lang === 'ar' ? 'من البؤرة' : 'from focus center'}
                </div>
              </div>
            ) : (
              <span className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'لم يتم تحديد أي شذوذ جغرافي للقياس' : 'No anomaly target is selected for measurement'}
              </span>
            )}
          </div>
        </div>

        {/* Auto-Cycle Scanning Player */}
        <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-center gap-3.5 py-3 lg:py-0 border-b lg:border-b-0 pb-4 lg:pb-0 border-dashed border-gray-800/10 dark:border-gray-800/60 lg:border-x lg:border-dashed lg:px-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {lang === 'ar' ? 'رحلة الاستطلاع التلقائي' : 'AUTOPILOT TOUR'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Prev button */}
            <button
              type="button"
              onClick={selectPrevAnomaly}
              disabled={visibleCandidates.length === 0}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isDark ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Previous target"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause toggle */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={visibleCandidates.length === 0}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition-all ${
                isPlaying 
                  ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
                  : isDark 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              id="btn-auto-cycle-play"
              title={isPlaying ? t.autoCyclePause : t.autoCyclePlay}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 animate-pulse" />
                  <span>{lang === 'ar' ? 'إيقاف جولة' : 'PAUSE'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تشغيل' : 'LIVE TOUR'}</span>
                </>
              )}
            </button>

            {/* Next button */}
            <button
              type="button"
              onClick={selectNextAnomaly}
              disabled={visibleCandidates.length === 0}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isDark ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Next target"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed settings */}
          <div className="flex items-center gap-1.5" id="cycle-speed-settings">
            <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{lang === 'ar' ? 'السرعة:' : 'Interval:'}</span>
            <div className="flex bg-slate-200 dark:bg-gray-900 p-0.5 rounded border dark:border-gray-800">
              {[1500, 3000, 5000].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-all ${
                    playSpeed === speed
                      ? 'bg-emerald-500 text-[10px] font-bold text-gray-950'
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {(speed / 1000).toFixed(1)}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Exports Suite */}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 border shadow-sm transition-all cursor-pointer ${
              isDark
                ? 'bg-gray-900 hover:bg-gray-800 border-gray-850 hover:border-gray-750 text-gray-300 hover:text-emerald-400'
                : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700 hover:text-emerald-600'
            }`}
            title={t.exportJson}
            id="btn-export-json"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDossierOpen(true)}
            className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 border shadow-sm transition-all cursor-pointer ${
              isDark
                ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-gray-950 focus:ring-1 focus:ring-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white focus:ring-1 focus:ring-emerald-500'
            }`}
            title={t.exportAllDetails}
            id="btn-export-dossier"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تقرير PDF طباعة' : 'PRINT REPORT'}</span>
          </button>
        </div>
      </div>

      {/* Dual Column Layout: Left raster, Right hover info card */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 items-stretch mt-5 z-10">
        
        {/* Core Raster Map Canvas Box */}
        <div className={`flex-1 flex flex-col items-center justify-center rounded-xl border p-4 relative ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-200'}`} id="raster-container">
          
          {/* NASA Data Specs Trigger Button */}
          <button
            type="button"
            onClick={() => setShowNasaSpecs(!showNasaSpecs)}
            className={`absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'} z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border shadow-md transition-all cursor-pointer ${
              showNasaSpecs
                ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
                : isDark
                  ? 'bg-gray-900 border-gray-850 hover:bg-gray-800 text-emerald-400 hover:text-emerald-300'
                  : 'bg-emerald-50 border-emerald-150 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800'
            }`}
            id="btn-nasa-specs-toggle"
            title="NASA Earthdata Spaceborne Specifications & Standard Formats"
          >
            <Layers className="w-3.5 h-3.5 animate-pulse" />
            <span>{showNasaSpecs ? (lang === 'ar' ? 'إغلاق المواصفات' : 'CLOSE SPECS') : (lang === 'ar' ? 'مواصفات ناسا الخرائطية' : 'NASA COG SPECS')}</span>
          </button>

          {showNasaSpecs && (
            <div className={`absolute inset-0 z-40 p-4 rounded-xl flex flex-col gap-3 select-text backdrop-blur-md animate-fadeIn ${
              isDark ? 'bg-gray-950/95 text-gray-100' : 'bg-white/95 text-slate-900'
            }`} id="nasa-specs-panel">
              <div className="flex justify-between items-center border-b border-dashed dark:border-gray-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-500">
                    {lang === 'ar' ? 'مواصفات الفضاء والمستويات للأقمار الصناعية لـ NASA' : 'NASA SPECTRO-SPATIAL DESCRIPTORS'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNasaSpecs(false)}
                  className="p-1 rounded hover:bg-gray-800/25 dark:hover:bg-white/10 text-gray-500 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specification Tabs */}
              <div className="flex gap-1 border-b dark:border-gray-800/65 pb-1 select-none">
                <button
                  type="button"
                  onClick={() => setActiveNasaSpecTab('levels')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    activeNasaSpecTab === 'levels'
                      ? 'bg-emerald-500 text-gray-950'
                      : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? 'المستويات من 1 إلى 4' : 'NASA Levels 1-4'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNasaSpecTab('formats')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    activeNasaSpecTab === 'formats'
                      ? 'bg-emerald-500 text-gray-950'
                      : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? 'التنسيقات و COG' : 'Formats & COG'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNasaSpecTab('worldview')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    activeNasaSpecTab === 'worldview'
                      ? 'bg-emerald-500 text-gray-950'
                      : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? 'وورلد فيو وتفسير' : 'Worldview & Interpretation'}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto pr-1 text-[11px] leading-relaxed font-mono flex flex-col gap-2.5 scrollbar-thin">
                {activeNasaSpecTab === 'levels' && (
                  <>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest border-l-2 border-emerald-500 pl-1.5 font-bold mb-1">
                      {lang === 'ar' ? 'تفصيل مستويات معالجة بيانات ناسا للأقمار الصناعية' : 'NASA Data Processing Levels (1-4)'}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Level 1 (L1B)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'معاد بناءه ومقاس بالوحدات الفيزيائية لمعايرة أجهزة استشعار الرادار ومرتبط زمنياً بالكامل.' 
                            : 'Reconstructed instrument telemetry packets at full resolution, calibrated into sensor physical units and precisely geolocated.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Level 2 (L2)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'معاملات جيو-فيزيائية مستخرجة مباشرة بنفس الدقة الهندسية والزاوية لمستقبِل القمر الصناعي.' 
                            : 'Derived geophysical parameters mapped directly along the satellite spatial swath paths at original spatial sensor resolution.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Level 3 (L3)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'إسقاط البيانات على نموذج شبكي جغرافي موحد الدقة والمسافات للتغطية الإقليمية المستقرة.' 
                            : 'Variables or parameters mapped on uniform space-time raster grids, projecting absolute orthorectified elevation cells.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Level 4 (L4)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'مخرجات مبنية على تحليل نماذج رياضية لبيانات المستويات الأدنى (مثل رصد الشذوذ التضاريسي TPI للتجاويف والبالوعات).' 
                            : 'Model outputs or results from data assimilation techniques applied to lower levels (such as our computed TPI subterranean cavern indicators).'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {activeNasaSpecTab === 'formats' && (
                  <>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest border-l-2 border-emerald-500 pl-1.5 font-bold mb-1">
                      {lang === 'ar' ? 'تنسيقات ملفات الخرائط المدعومة ورقعة COG' : 'Supported Mapping Data Formats & COG'}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Cloud Optimized GeoTIFF (COG)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'ملف GeoTIFF مستضاف على خادم سحابي يدعم طلب نطاقات البايتات (HTTP Range), مما يسمح للعميل بتنزيل الخلاصة المحدودة لبقعة الدراسة فورا دون جلب الملف الضخم كاملاً.' 
                            : 'An advanced, cloud-hosted GeoTIFF designed to support efficient HTTP range-requests. Clients request only the specific spatial tiles of interest instantly, bypassing massive global file downloads.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Traditional GeoTIFF (.tif / .tiff)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'المعيار المرجعي العالمي لصور الراستر الخرائطية متضمنة معلمات الإسناد الجغرافي والنقاط المرجعية للشبكة.' 
                            : 'Georeferenced raster file structure carrying spatial bounds, datum parameters, and absolute elevation height values.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">HDF5 / NetCDF (.nc / .h5)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'مصفوفات علمية هرمية مرنة تلائم دراسات الفضاء الجوي، الغلاف الجوي، والخصائص الكهرومغناطيسية للمياه الجوفية.' 
                            : 'Highly optimized multi-dimensional arrays preferred for satellite products, mapping multi-temporal radar backscatter coefficients over dry bedrock.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">ASCII Grids & Vector Sets (Shapefile / GeoJSON)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'تمثيل مصفوفات الارتفاع رقمياً، وجداول الإحداثيات المصنفة للشذوذ لتسهيل مكاملة النقل الميداني والطباعة.' 
                            : 'Plain-text matrix files for elevation datasets, paired with lightweight coordinate nodes and attributes for GPS target deployment.'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {activeNasaSpecTab === 'worldview' && (
                  <>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest border-l-2 border-emerald-500 pl-1.5 font-bold mb-1">
                      {lang === 'ar' ? 'منصة ناسا العالمية للصور وتحليل الرصد البصري ورادار الكهوف' : 'NASA Worldview & Radar Visual Interpretation'}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">NASA Worldview (EOSDIS) Integration</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'منصة تابعة لناسا تتيح استعراض وتحميل أكثر من 1000 طبقة قمرية قريبة من الوقت الفعلي لدراسة التغيرات الترابية والتاريخية للأرض.' 
                            : 'The NASA Earth Observing System Data and Information System (EOSDIS) portal, supporting direct visualization of historic declassified and modern multi-spectral bands.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Cavern/Sinkhole Visual Interpretation Rules</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'أدلة تفسير التغير الطبوغرافي: البالوعات والسراديب تظهر كانخفاض ميكروي معزول في قنوات الوديان الجافة والطفوح البازلتية للكهوف البركانية.' 
                            : 'Structural cavern channels leave faint thermal/topographic micro-depressions. Visual rules look for low-reflectance basalt sinkholes or aligned pits in classic declassified spy imagery.'}
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-gray-900/60 border-gray-800/40' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-emerald-500 font-bold block">Cross-Radar Correlation (L-Band ALOS PALSAR)</span>
                        <span className={`text-[10.5px] font-sans ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {lang === 'ar' 
                            ? 'أجهزة استشعار الرادار بعيدة المدى تخترق رمال الصحراء الجافة لتغوص عميقاً وتقيس الارتداد المعاكس للصخور السطحية.' 
                            : 'Active L-band radar waves (approx. 24cm wavelength) penetrate dry sandy veneers to highlight structural faulting and deep cavern hollows.'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Informational Footer in Specs Overlay */}
              <div className="border-t border-dashed dark:border-gray-800 pt-2 flex justify-between items-center text-[9px] text-gray-400 font-mono">
                <span>PROJECT: Syrian Cave-Detection Geo-Scanner</span>
                <span className="text-emerald-500 font-bold">SOURCE: NASA earthdata (EOSDIS)</span>
              </div>
            </div>
          )}

          {viewMode === 'exploration' ? (
            <div className="w-full h-full flex-1 rounded-lg overflow-y-auto border border-gray-800/10 dark:border-gray-850 relative p-0 pointer-events-auto">
              <ExplorationScenarioDisplay
                lang={lang}
                theme={theme}
                currentLat={point.lat}
                currentLon={point.lon}
              />
            </div>
          ) : viewMode === 'satellite' ? (
            <div className="w-full h-full min-h-[380px] flex-1 rounded-lg overflow-hidden border border-gray-800/10 relative p-0 pointer-events-auto">
              <LeafletMap
                lat={point.lat}
                lon={point.lon}
                radius={radius}
                candidates={visibleCandidates}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={onSelectCandidate}
                theme={theme}
                lang={lang}
                onMapClick={onMapClick}
                customPoint={customPoint}
              />
            </div>
          ) : viewMode === 'terrain3d' ? (
            <div className="w-full h-full min-h-[460px] flex-1 rounded-xl overflow-hidden border border-gray-800/10 dark:border-gray-800/40 relative p-0 pointer-events-auto flex flex-col">
              <Terrain3DViewer
                demGrid={dem_grid}
                minElevation={min_elevation}
                maxElevation={max_elevation}
                candidates={visibleCandidates}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={onSelectCandidate}
                lang={lang}
                theme={theme}
                getColorForCell={getColorForCell}
              />
            </div>
          ) : viewMode === 'compare' ? (
            <>
              <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full gap-5 xl:gap-8 mb-1 px-2">
                {/* Left Side: PALSAR Topographic Grid */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-mono font-bold uppercase text-gray-400 dark:text-gray-500">
                      {lang === 'ar' ? 'رادار تضاريس PALSAR:' : 'PALSAR Topography:'}
                    </span>
                    <div className="flex bg-slate-200 dark:bg-gray-900 p-0.5 rounded border dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setPalsarCompareMode('tpi')}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-all ${
                          palsarCompareMode === 'tpi'
                            ? 'bg-emerald-500 text-gray-950 font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        id="compare-palsar-tpi-toggle"
                      >
                        TPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPalsarCompareMode('dem')}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-all ${
                          palsarCompareMode === 'dem'
                            ? 'bg-emerald-500 text-gray-950 font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        id="compare-palsar-dem-toggle"
                      >
                        DEM
                      </button>
                    </div>
                  </div>

                  {/* PALSAR Grid */}
                  <div className="flex flex-col gap-[2.5px] p-2 border border-gray-850 dark:border-zinc-800/60 rounded-xl bg-black/10">
                    {dem_grid.map((row, y) => (
                      <div key={y} className="flex gap-[2.5px]">
                        {row.map((elev, x) => {
                          const tpiVal = tpi_grid[y][x];
                          const color = getColorForCell(y, x, palsarCompareMode);
                          const cand = getCandidateForCell(y, x);
                          const isSelectedCand = cand && cand.id === selectedCandidateId;
                          const isCurrentlyHovered = hoverCell && hoverCell.x === x && hoverCell.y === y;

                          const isLineCell = isCellOnProfileLine(y, x);
                          const isStart = customStart && customStart.x === x && customStart.y === y && lineMode === 'custom';
                          const isEnd = customEnd && customEnd.x === x && customEnd.y === y && lineMode === 'custom';
                          const highlightClass = isStart
                            ? 'outline outline-[1.5px] outline-emerald-400 z-30 scale-105 font-bold'
                            : isEnd
                              ? 'outline outline-[1.5px] outline-rose-500 z-30 scale-105 font-bold'
                              : isLineCell
                                ? 'outline outline-[1.5px] outline-amber-400/90 z-20'
                                : '';

                          return (
                            <button
                              key={x}
                              type="button"
                              onMouseEnter={() => setHoverCell({ x, y, val: elev, tpi: tpiVal })}
                              onMouseLeave={() => setHoverCell(null)}
                              onClick={() => handleCellClick(x, y)}
                              style={{ backgroundColor: color }}
                              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 rounded-[2px] transition-all relative flex items-center justify-center cursor-crosshair group ${highlightClass} ${
                                isSelectedCand 
                                  ? 'ring-2 ring-rose-500 scale-105 z-20 shadow-lg shadow-rose-500/20' 
                                  : isCurrentlyHovered
                                    ? 'ring-2 ring-emerald-400 scale-105 z-10 shadow-md shadow-emerald-400/20'
                                    : 'hover:ring-1 hover:ring-slate-400 hover:scale-105 hover:z-20'
                              }`}
                              id={`cell-left-${y}-${x}`}
                            >
                              {cand && (
                                <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-mono font-bold shadow-md cursor-pointer animate-pulse ${
                                  isSelectedCand 
                                    ? 'bg-rose-500 text-white' 
                                    : 'bg-emerald-400 text-gray-950 group-hover:bg-rose-500 group-hover:text-white group-hover:scale-110'
                                }`}>
                                  {cand.id}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: CORONA Spy Satellite Imagery */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 h-6 select-none">
                    <span className="text-[10px] font-mono font-bold uppercase text-gray-400 dark:text-gray-500">
                      {lang === 'ar' ? 'أرشيف كورونا المسرّح:' : 'Declassified CORONA:'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 select-text">
                      {coronaYear} AD
                    </span>
                  </div>

                  {/* CORONA Grid */}
                  <div className="flex flex-col gap-[2.5px] p-2 border border-gray-850 dark:border-zinc-800/60 rounded-xl bg-black/10">
                    {dem_grid.map((row, y) => (
                      <div key={y} className="flex gap-[2.5px]">
                        {row.map((elev, x) => {
                          const tpiVal = tpi_grid[y][x];
                          const color = getColorForCell(y, x, 'corona');
                          const cand = getCandidateForCell(y, x);
                          const isSelectedCand = cand && cand.id === selectedCandidateId;
                          const isCurrentlyHovered = hoverCell && hoverCell.x === x && hoverCell.y === y;

                          const isLineCell = isCellOnProfileLine(y, x);
                          const isStart = customStart && customStart.x === x && customStart.y === y && lineMode === 'custom';
                          const isEnd = customEnd && customEnd.x === x && customEnd.y === y && lineMode === 'custom';
                          const highlightClass = isStart
                            ? 'outline outline-[1.5px] outline-emerald-400 z-30 scale-105 font-bold'
                            : isEnd
                              ? 'outline outline-[1.5px] outline-rose-500 z-30 scale-105 font-bold'
                              : isLineCell
                                ? 'outline outline-[1.5px] outline-amber-400/90 z-20'
                                : '';

                          return (
                            <button
                              key={x}
                              type="button"
                              onMouseEnter={() => setHoverCell({ x, y, val: elev, tpi: tpiVal })}
                              onMouseLeave={() => setHoverCell(null)}
                              onClick={() => handleCellClick(x, y)}
                              style={{ backgroundColor: color }}
                              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 rounded-[2px] transition-all relative flex items-center justify-center cursor-crosshair group ${highlightClass} ${
                                isSelectedCand 
                                  ? 'ring-2 ring-rose-500 scale-105 z-20 shadow-lg shadow-rose-500/20' 
                                  : isCurrentlyHovered
                                    ? 'ring-2 ring-emerald-400 scale-105 z-10 shadow-md shadow-emerald-400/20'
                                    : 'hover:ring-1 hover:ring-slate-400 hover:scale-105 hover:z-20'
                              }`}
                              id={`cell-right-${y}-${x}`}
                            >
                              {cand && (
                                <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-mono font-bold shadow-md cursor-pointer animate-pulse ${
                                  isSelectedCand 
                                    ? 'bg-rose-500 text-white' 
                                    : 'bg-emerald-400 text-gray-950 group-hover:bg-rose-500 group-hover:text-white group-hover:scale-110'
                                }`}>
                                  {cand.id}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compass Rose Badge */}
              <div className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-mono ${isDark ? 'bg-gray-900/80 border-gray-800 text-gray-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {lang === 'ar' ? 'مسار رادار مزدوج: مفعل' : 'Dual Radar Scope: Locked'}
              </div>

              <div className={`absolute bottom-3 ${lang === 'ar' ? 'left-3' : 'right-3'} flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-mono ${isDark ? 'bg-gray-900/80 border-gray-800 text-gray-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'}`}>
                {lang === 'ar' ? 'تفسير مقارن: نشط' : 'Comparative Interpretation: Active'}
              </div>

              {/* Chronological Timeline Scrub Overlay - Styled bottom drawer */}
              <div className={`w-full max-w-md mt-4 border px-3 py-2 rounded-lg flex flex-col gap-1 z-20 shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    {t.chronoTimeline}
                  </span>
                  <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>
                    {t.reconstruction}: <span className={isDark ? 'text-white font-semibold' : 'text-slate-800 font-bold'}>{coronaYear < 1970 ? t.reconEarly : t.reconLate}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>1960</span>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="1960"
                      max="1980"
                      step="1"
                      value={coronaYear}
                      onChange={(e) => setCoronaYear(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-gray-300 rounded appearance-none"
                      id="grid-timeline-slider"
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>1980</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-50 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    AD: {coronaYear}
                  </span>
                </div>
                {/* Dynamic context readout */}
                <div className={`text-[9px] font-mono leading-none flex items-center h-4 select-text ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {coronaYear < 1964 && t.timelineInfo1}
                  {coronaYear >= 1964 && coronaYear < 1970 && t.timelineInfo2}
                  {coronaYear >= 1970 && coronaYear < 1974 && t.timelineInfo3}
                  {coronaYear >= 1974 && t.timelineInfo4}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center w-full mb-1">
                {/* Spatial Grid Framework */}
                <div className="flex flex-col gap-[3px]">
                  {dem_grid.map((row, y) => (
                    <div key={y} className="flex gap-[3px]">
                      {row.map((elev, x) => {
                        const tpiVal = tpi_grid[y][x];
                        const color = getColorForCell(y, x);
                        const cand = getCandidateForCell(y, x);
                        const isSelectedCand = cand && cand.id === selectedCandidateId;

                        const isLineCell = isCellOnProfileLine(y, x);
                        const isStart = customStart && customStart.x === x && customStart.y === y && lineMode === 'custom';
                        const isEnd = customEnd && customEnd.x === x && customEnd.y === y && lineMode === 'custom';
                        const highlightClass = isStart
                          ? 'outline outline-[2px] outline-emerald-400 z-30 scale-105 font-bold shadow-md shadow-emerald-400/20'
                          : isEnd
                            ? 'outline outline-[2px] outline-rose-500 z-30 scale-105 font-bold shadow-md shadow-rose-500/20'
                            : isLineCell
                              ? 'outline outline-[1.5px] outline-amber-400/90 z-20'
                              : '';

                        return (
                          <button
                            key={x}
                            type="button"
                            onMouseEnter={() => setHoverCell({ x, y, val: elev, tpi: tpiVal })}
                            onMouseLeave={() => setHoverCell(null)}
                            onClick={() => handleCellClick(x, y)}
                            style={{ backgroundColor: color }}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[3px] transition-all relative flex items-center justify-center cursor-crosshair group ${highlightClass} ${
                              isSelectedCand 
                                ? 'ring-2 ring-rose-500 scale-105 z-20 shadow-lg shadow-rose-500/20' 
                                : 'hover:ring-1 hover:ring-slate-400 hover:scale-105 hover:z-20'
                            }`}
                            id={`cell-${y}-${x}`}
                          >
                            {/* Interactive target overlays */}
                            {cand ? (
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shadow-md cursor-pointer animate-pulse ${
                                isSelectedCand 
                                  ? 'bg-rose-500 text-white translate-y-[-2px]' 
                                  : 'bg-emerald-400 text-gray-950 group-hover:bg-rose-500 group-hover:text-white group-hover:scale-110'
                              }`} title={`Sensing Target Anomaly: ${cand.type}`}>
                                {cand.id}
                              </div>
                            ) : (
                              // Tiny dot for center grid coordinate
                              y === 7 && x === 7 && (
                                <div className="w-1.5 h-1.5 bg-red-500/75 rounded-full pointer-events-none" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Compass Rose Badge */}
              <div className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-mono ${isDark ? 'bg-gray-900/80 border-gray-800 text-gray-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {lang === 'ar' ? 'زاوية شبكية السمت: شمال-0' : 'Grid Azimuth: N-0°'}
              </div>

              <div className={`absolute bottom-3 ${lang === 'ar' ? 'left-3' : 'right-3'} flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-mono ${isDark ? 'bg-gray-900/80 border-gray-800 text-gray-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'}`}>
                {lang === 'ar' ? 'الدقة المكانية: 12.5م/بكسل' : 'Spatial Resolution: 12.5m/px'}
              </div>

              {/* Chronological Timeline Scrub Overlay - Styled bottom drawer */}
              <div className={`w-full max-w-md mt-4 border px-3 py-2 rounded-lg flex flex-col gap-1 z-20 shadow-lg ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    {t.chronoTimeline}
                  </span>
                  <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>
                    {t.reconstruction}: <span className={isDark ? 'text-white font-semibold' : 'text-slate-800 font-bold'}>{coronaYear < 1970 ? t.reconEarly : t.reconLate}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>1960</span>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="1960"
                      max="1980"
                      step="1"
                      value={coronaYear}
                      onChange={(e) => setCoronaYear(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-gray-300 rounded appearance-none"
                      id="grid-timeline-slider"
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>1980</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-50 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    AD: {coronaYear}
                  </span>
                </div>
                {/* Dynamic context readout */}
                <div className={`text-[9px] font-mono leading-none flex items-center h-4 select-text ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {coronaYear < 1964 && t.timelineInfo1}
                  {coronaYear >= 1964 && coronaYear < 1970 && t.timelineInfo2}
                  {coronaYear >= 1970 && coronaYear < 1974 && t.timelineInfo3}
                  {coronaYear >= 1974 && t.timelineInfo4}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Indicator & Live Coordinates Panel */}
        <div className={`w-full md:w-56 border rounded-xl p-4 flex flex-col gap-4 select-none relative ${isDark ? 'bg-gray-950/80 border-gray-800 text-gray-200' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div>
            <h3 className={`text-xs uppercase font-mono tracking-wider font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {t.colorIndicators}
            </h3>
            <div className="flex flex-col gap-2 mt-2">
              {viewMode === 'tpi' && (
                <>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(245, 158, 11)' }} />
                    <span>{lang === 'ar' ? 'قمة جبلية طبوغرافية لـ TPI (> +2.5م)' : 'Topographic Ridge (> +2.5m)'}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(40, 48, 62)' }} />
                    <span>{lang === 'ar' ? 'أراضي مستوية طبيعية (±0.5م)' : 'Average Flatland (±0.5m)'}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(30, 58, 138)' }} />
                    <span>{lang === 'ar' ? 'منخفضات أحواض رسوبية بسيطة' : 'Mild Basin Depressions'}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(16, 24, 200)' }} />
                    <span className="font-semibold text-rose-500">{t.anomalousCavern}</span>
                  </div>
                </>
              )}
              {viewMode === 'dem' && (
                <>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(215, 205, 190)' }} />
                    <span>{t.highElevation}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(190, 150, 95)' }} />
                    <span>{t.midElevation}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(35, 120, 155)' }} />
                    <span>{t.lowElevation}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(30, 27, 75)' }} />
                    <span className="font-semibold text-purple-600">{lang === 'ar' ? 'بالوعات انهيار عميقة' : 'Deep Volcanic/Sink Holes'}</span>
                  </div>
                </>
              )}
              {viewMode === 'corona' && (
                <>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(210, 210, 210)' }} />
                    <span>{t.sandyDune}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(140, 140, 140)' }} />
                    <span>{t.erodedSteppe}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(80, 80, 80)' }} />
                    <span>{t.caravanTrail}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    <span className="w-3" style={{ height: '12px', backgroundColor: 'rgb(25, 25, 25)' }} />
                    <span className="font-semibold text-rose-500">{t.anomalousCavern}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <hr className={isDark ? 'border-gray-800' : 'border-slate-200'} />

          {/* Matrix Inspector Data Feed */}
          <div className="flex-1 flex flex-col justify-end">
            <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              <Info className="w-3 h-3" />
              {lang === 'ar' ? 'بيانات البكسل المباشرة' : 'Live Feed Scanner'}
            </span>
            {hoverCell ? (
              <div className={`border rounded p-2.5 font-mono text-[11px] flex flex-col gap-1.5 animate-fadeIn ${
                isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`} id="cell-hover-card">
                <div className={`text-[10px] font-bold border-b pb-1 flex justify-between ${
                  isDark ? 'text-emerald-400 border-gray-800' : 'text-emerald-600 border-slate-200'
                }`}>
                  <span>{lang === 'ar' ? 'مؤشرات القياس' : 'METRIC INDICES'}</span>
                  <span>[{hoverCell.x}, {hoverCell.y}]</span>
                </div>
                <div>
                  <span className={`text-[10px] block ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{lang === 'ar' ? 'الإزاحة النسبية' : 'Relative Coord'}</span>
                  <span className={isDark ? 'text-white' : 'text-slate-800'}>{((hoverCell.x - 7.5) * 12.5).toFixed(0)}m E, {((7.5 - hoverCell.y) * 12.5).toFixed(0)}m N</span>
                </div>
                <div>
                  <span className={`text-[10px] block ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{lang === 'ar' ? 'ارتفاع DEM السطحي' : 'DEM Elevation'}</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{hoverCell.val.toFixed(2)} {t.meters}</span>
                </div>
                <div>
                  <span className={`text-[10px] block ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{lang === 'ar' ? 'انحراف طبوغرافيا TPI' : 'TPI Deviation'}</span>
                  <span className={`font-semibold ${hoverCell.tpi < -2.5 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                    {hoverCell.tpi > 0 ? '+' : ''}{hoverCell.tpi.toFixed(2)} {t.meters}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`border rounded p-3 text-center text-xs italic ${
                isDark ? 'bg-gray-900/40 border-gray-800/60 text-gray-500' : 'bg-slate-50/80 border-slate-200/60 text-slate-400'
              }`}>
                {lang === 'ar' 
                  ? 'ضع مؤشر الماوس على أي خلية لفحص بيانات السطح الأساسية مجهرياً' 
                  : 'Hover any cell sector to inspect local bedrock data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Regional Seismic Activity Monitor (USGS API FEED) */}
      <div
        className={`mt-4 p-5 rounded-xl border flex flex-col gap-4 shadow-sm z-20 relative transition-all duration-300 ${
          isDark
            ? 'bg-zinc-950/75 border-zinc-800 text-gray-300'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        id="seismic-monitor-section"
      >
        {/* Warning Overlay if significant shifts impacted the site */}
        {seismicWarning && (
          <div className="absolute inset-x-0 top-0 bg-rose-500/10 border-b border-rose-500/30 px-5 py-3 rounded-t-xl z-30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <div className="font-mono text-xs">
                <span className="text-rose-500 font-extrabold uppercase mr-1.5">[CRITICAL SITE DISPLACEMENT WARNING]</span>
                <span className={isDark ? 'text-rose-300 font-semibold' : 'text-rose-900 font-semibold'}>
                  {lang === 'ar' 
                    ? 'تم تسجيل هزات أرضية قوية جداً مؤخراً بالقرب من موقع المسبار! احتمال كبير لحدوث تشققات هيكلية وتصدعات في تجاويف الأرض.'
                    : 'Significant seismic activity recorded recently in this search corridor! Local cavern structural alignments may have experienced shifts or collapses.'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b ${isDark ? 'border-zinc-900' : 'border-slate-100'} pb-4 ${seismicWarning ? 'pt-8' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg shrink-0 ${seismicWarning ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className={`text-sm uppercase font-mono font-bold tracking-wider ${isDark ? 'text-emerald-400' : 'text-slate-900'}`}>
                {lang === 'ar' ? 'مراقب الهزات والصدوع الزلزالية الفعلي (USGS Feed)' : 'USGS REAL-TIME REGIONAL SEISMIC MONITOR'}
              </h3>
              <p className={`text-xs font-sans leading-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                {lang === 'ar'
                  ? 'رابط مباشر مع هيئة المساحة الجيولوجية الأمريكية لرصد أي هزات أرضية نشطة أثرت على سلامة موقع الاستكشاف.'
                  : 'Direct real-time query interface to USGS monitoring network checking tectonic stability since radar capture.'}
              </p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] select-none">
            <div className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              seismicWarning 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold' 
                : seismicData.length > 0 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${seismicWarning ? 'bg-rose-500 animate-ping' : seismicData.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} inline-block`} />
              <span>
                STATUS:{' '}
                {seismicWarning 
                  ? (lang === 'ar' ? 'خطر تصدع' : 'DISPLACED') 
                  : seismicData.length > 0 
                    ? (lang === 'ar' ? 'صدع زلزالي نشط' : 'MINOR regional quakes') 
                    : (lang === 'ar' ? 'مستقر تماما' : 'GEOLOGICALLY STABLE')}
              </span>
            </div>
            
            {lastSeismicFetch && (
              <span className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-805 text-zinc-500' : 'bg-slate-50 border-slate-205 text-slate-500'}`}>
                UPDATED: {lastSeismicFetch.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* USGS Body Content */}
        {seismicLoading ? (
          <div className="p-8 border border-dashed rounded-lg border-zinc-800 text-center text-xs font-mono flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="animate-pulse">{lang === 'ar' ? 'جاري الاتصال بقواعد بيانات USGS للزلزال الفوري...' : 'Querying USGS planetary seismic database for near-recent regional fault tremors...'}</p>
          </div>
        ) : seismicError ? (
          <div className="p-5 border border-dashed rounded-lg border-rose-500/20 bg-rose-500/5 text-center text-xs font-mono flex flex-col items-center justify-center gap-2">
            <span className="text-rose-500 font-bold">⚠️ CONNECTION DIAGNOSTIC ERROR</span>
            <p className="text-zinc-500">{seismicError}</p>
          </div>
        ) : seismicData.length === 0 ? (
          <div className="p-6 border border-dashed rounded-lg dark:border-zinc-800 border-slate-200 text-center text-xs font-mono text-zinc-500 italic">
            {lang === 'ar' ? 'لا توجد أي أنشطة أو اهتزازات أرضية مسجلة حديثاً في شعاع 250 كم من هذا الموقع.' : 'No seismic tremors detected within 250km radial search zone over the past 120 days.'}
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-5 items-stretch">
            {/* Seismic Activity Logs Timeline List */}
            <div className="flex-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
              {seismicData.map((eq: any) => {
                const isCriticalEvent = (eq.mag >= 4.5 && eq.distance <= 180) || (eq.mag >= 3.2 && eq.distance <= 75);
                return (
                  <div
                    key={eq.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-xs transition-all ${
                      isCriticalEvent
                        ? 'bg-rose-500/10 border-rose-500/25 animate-pulse'
                        : isDark
                          ? 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-300'
                          : 'bg-slate-50 border-slate-150 hover:bg-slate-100 hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Magnitude Indicator */}
                      <span className={`px-2 py-1 rounded text-[11px] font-extrabold flex items-center justify-center min-w-[50px] ${
                        eq.mag >= 4.5 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' 
                          : eq.mag >= 3.0 
                            ? 'bg-amber-500 text-gray-950 font-bold' 
                            : 'bg-zinc-500 text-white'
                      }`}>
                        M {eq.mag.toFixed(1)}
                      </span>

                      <div>
                        <span className={`block font-bold truncate max-w-[200px] md:max-w-xs ${isCriticalEvent ? 'text-rose-405 font-extrabold' : isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                          {eq.place}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          Depth: {eq.depth.toFixed(1)}km | {eq.time.toLocaleDateString()} at {eq.time.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 self-end sm:self-auto">
                      <span className="text-zinc-505">{lang === 'ar' ? 'المسافة لـ PALSAR:' : 'Dist to PALSAR:'}</span>
                      <span className={`px-2 py-0.5 rounded border font-semibold ${
                        eq.distance < 80 
                          ? 'text-rose-500 bg-rose-500/5 border-rose-500/10' 
                          : isDark
                            ? 'text-zinc-300 bg-zinc-950 border-zinc-800'
                            : 'text-slate-700 bg-white border-slate-250'
                      }`}>
                        {eq.distance.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick tectonic analysis readout card */}
            <div className={`w-full xl:w-72 border rounded-lg p-4 flex flex-col justify-between font-mono text-xs select-none ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-205 text-slate-600'
            }`}>
              <div>
                <div className="flex items-center gap-1.5 pb-2 mb-2 border-b dark:border-zinc-800 border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span className={`font-bold uppercase ${isDark ? 'text-zinc-305' : 'text-slate-800'}`}>
                    {lang === 'ar' ? 'تفسير نشاط الصدع الجيولوجي' : 'SEISMIC FAULT MATRIX'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-[11px] leading-relaxed">
                  <p>
                    {lang === 'ar' 
                      ? 'تم رصد الصدوع التكتونية في نطاق 250 كم من إحداثيات رقعة مسبار الرادار.'
                      : 'Real-time USGS telemetry scans for active seismic slips in the Eastern Mediterranean / Syrian Arc rift lines.'}
                  </p>
                  <p className="mt-1 text-xs">
                    {lang === 'ar' ? (
                      <>
                        إجمالي الهزات القريبة: <span className="font-bold text-emerald-400">{seismicData.length}</span> هزة.
                        {seismicWarning ? (
                          <span className="text-rose-450 font-extrabold block mt-1">⚠️ خطر تصدعات نشط في قنوات رادار الكهوف!</span>
                        ) : (
                          <span className="text-emerald-400 font-bold block mt-1">✓ الاستقرار الهيكلي الداخلي صلب وآمن.</span>
                        )}
                      </>
                    ) : (
                      <>
                        Regional events: <span className="font-semibold text-zinc-100">{seismicData.length} quakes</span>.<br />
                        {seismicWarning ? (
                          <span className="text-rose-400 font-extrabold block mt-1 animate-pulse">⚠️ WARNING: Structural instability detected at active sinkhole nodes!</span>
                        ) : (
                          <span className="text-emerald-400 font-bold block mt-1">✓ No significant tremors recorded; cavern alignments are geologically locked.</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="text-[9px] text-zinc-500 leading-normal border-t dark:border-zinc-800 border-slate-200 pt-2.5 mt-2.5">
                🌐 Source: USGS Earthquake Hazards Program (FDSNWS) Server API.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2D Elevation Profile Section */}
      <div
        className={`mt-4 p-5 rounded-xl border flex flex-col gap-4 shadow-sm z-20 relative transition-all duration-300 ${
          isDark
            ? 'bg-zinc-950/75 border-gray-800 text-gray-305'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        id="elevation-profile-section"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b dark:border-zinc-900 border-slate-105 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-sm uppercase font-mono font-bold tracking-wider ${isDark ? 'text-emerald-400' : 'text-slate-900'}`}>
                {lang === 'ar' ? 'مقطع الارتفاع الطبوغرافي ثنائي الأبعاد (2D Elevation Profile)' : '2D TOPOGRAPHIC ELEVATION PROFILE'}
              </h3>
              <p className={`text-xs font-sans leading-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                {lang === 'ar'
                  ? 'اعرض وتحرك عبر الارتفاعات وانحرافات TPI على طول خط مقطع محدد على رقعة الرادار.'
                  : 'Analyze elevation and micro-topography cross-sections along a selected linear slice of the SAR raster study area.'}
              </p>
            </div>
          </div>

          {/* Slicing Controls / Presets */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] select-none">
            <button
              type="button"
              onClick={() => setLineMode('row')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                lineMode === 'row'
                  ? 'bg-emerald-500 border-emerald-505 text-gray-950 font-bold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'صف أفقي' : 'Row Preset'}
            </button>
            <button
              type="button"
              onClick={() => setLineMode('col')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                lineMode === 'col'
                  ? 'bg-emerald-500 border-emerald-500 text-gray-950 font-bold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'عمود رأسي' : 'Col Preset'}
            </button>
            <button
              type="button"
              onClick={() => setLineMode('diag1')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                lineMode === 'diag1'
                  ? 'bg-emerald-500 border-emerald-500 text-gray-950 font-bold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'قطر NW-SE' : 'NW-SE Diagonal'}
            </button>
            <button
              type="button"
              onClick={() => setLineMode('diag2')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                lineMode === 'diag2'
                  ? 'bg-emerald-500 border-emerald-500 text-gray-950 font-bold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'قطر SW-NE' : 'SW-NE Diagonal'}
            </button>
            <button
              type="button"
              onClick={() => {
                setLineMode('custom');
                if (!customStart) {
                  setCustomStart({ x: 3, y: 7 });
                  setCustomEnd({ x: 11, y: 7 });
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                lineMode === 'custom'
                  ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-amber-500 hover:text-amber-400 hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-amber-700 hover:bg-slate-100 hover:text-amber-900'
              }`}
            >
              🛠️ {lang === 'ar' ? 'مخصص (اختر خلايا)' : 'Custom Draw Line'}
            </button>
          </div>
        </div>

        {/* Dynamic Parameter Sliders when Preset is Selected */}
        {(lineMode === 'row' || lineMode === 'col') && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/10 dark:bg-black/10 p-3 rounded-lg border dark:border-zinc-800/80 border-slate-100 font-mono text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider shrink-0">
              {lineMode === 'row'
                ? (lang === 'ar' ? 'تحريك الصف النشط:' : 'Select Scan Row:')
                : (lang === 'ar' ? 'تحريك العمود النشط:' : 'Select Scan Column:')}
            </span>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={lineMode === 'row' ? selectedRow : selectedCol}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (lineMode === 'row') setSelectedRow(val);
                  else setSelectedCol(val);
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-300 dark:bg-zinc-800 rounded-lg appearance-none"
              />
              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-center min-w-[50px] inline-block">
                {lineMode === 'row' ? `Y=${selectedRow}` : `X=${selectedCol}`}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-zinc-500 leading-none">
              {lineMode === 'row'
                ? (lang === 'ar' ? 'يقطع رقعة الرادار أفقياً من الشرق للغرب' : 'Cuts through the terrain profile horizontally West-to-East')
                : (lang === 'ar' ? 'يقطع رقعة الرادار عمودياً من الشمال للجنوب' : 'Cuts through the terrain profile vertically North-to-South')}
            </span>
          </div>
        )}

        {/* Custom Draw Line Instructions / Actions */}
        {lineMode === 'custom' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-amber-500/5 p-3 rounded-lg border border-amber-500/25 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>
                {lang === 'ar' ? (
                  <>
                    مسار مخصص: {customStart ? `البداية [${customStart.x}, ${customStart.y}]` : 'انقر خلية'} {customEnd ? `• النهاية [${customEnd.x}, ${customEnd.y}]` : '• انقر خلية ثانية'}
                  </>
                ) : (
                  <>
                    Custom Trail: {customStart ? `Start [${customStart.x}, ${customStart.y}]` : 'Click a grid sector'} {customEnd ? `➜ End [${customEnd.x}, ${customEnd.y}]` : '➜ Click second cell'}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomStart({ x: 3, y: 7 });
                  setCustomEnd({ x: 11, y: 7 });
                }}
                className={`px-2.5 py-1 rounded border text-[10px] cursor-pointer ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-705'
                }`}
              >
                {lang === 'ar' ? 'إعادة تعيين الافتراضي' : 'Reset Default'}
              </button>
              {(customStart || customEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStart(null);
                    setCustomEnd(null);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-400 text-[10px] cursor-pointer"
                >
                  {lang === 'ar' ? 'مسح النقاط' : 'Clear Custom Points'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid Profile Layout: Left chart, Right metrics checklist */}
        <div className="flex flex-col lg:flex-row gap-5 items-stretch min-h-[280px]">
          {/* Main profile chart container */}
          <div className="flex-1 min-h-[260px] relative flex flex-col justify-center">
            {lineMode === 'custom' && !customEnd ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-lg border-zinc-805 text-center text-gray-500 text-xs italic">
                <p>{lang === 'ar' ? 'يرجى النقر على خلية ثانية على رقعة الرادار لإتمام تحديد الخط وطباعة مقاس الارتفاع.' : 'Please click a second cell on the radar grid to define the custom line endpoint and load the 2D path.'}</p>
              </div>
            ) : (
              <div className="w-full h-full min-h-[260px] text-xs font-mono">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={getProfileData()}
                    margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="tpiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#e2e8f0'} />
                    <XAxis
                      dataKey="distance"
                      tick={{ fill: isDark ? '#a1a1aa' : '#4b5563' }}
                      label={{
                        value: lang === 'ar' ? 'المسافة طول المحور (متر)' : 'Distance Along Path (m)',
                        position: 'insideBottom',
                        offset: -5,
                        fill: isDark ? '#71717a' : '#6b7280',
                      }}
                      stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: isDark ? '#a1a1aa' : '#4b5563' }}
                      label={{
                        value: lang === 'ar' ? 'الارتفاع المطلق لـ DEM (م)' : 'DEM Elevation (m)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 5,
                        fill: isDark ? '#71717a' : '#6b7280',
                      }}
                      domain={['auto', 'auto']}
                      stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: isDark ? '#60a5fa' : '#3b82f6' }}
                      label={{
                        value: lang === 'ar' ? 'مؤشر انحراف TPI (م)' : 'TPI micro-dev (m)',
                        angle: 90,
                        position: 'insideRight',
                        offset: 5,
                        fill: isDark ? '#60a5fa' : '#3b82f6',
                      }}
                      domain={['auto', 'auto']}
                      stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="elevation"
                      name={lang === 'ar' ? 'ارتفاع السطح' : 'Surface Elevation'}
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#elevationGrad)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="tpi"
                      name={lang === 'ar' ? 'انحراف TPI الأساسي' : 'TPI Deviation'}
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#tpiGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Slicing tabular statistics panel */}
          <div className={`w-full lg:w-64 border rounded-lg p-4 flex flex-col justify-between font-mono text-xs select-none ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-1.5 border-b pb-2 mb-2 dark:border-zinc-800 border-slate-200">
                <span className="w-2 h-2 rounded bg-amber-500 animate-pulse" />
                <span className={`font-bold ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                  {lang === 'ar' ? 'مؤشرات قطاع المسح' : 'SLICE INTERPRETATION'}
                </span>
              </div>

              {/* Statistical calculations along current path */}
              {(() => {
                const pData = getProfileData();
                const elevations = pData.map(d => d.elevation);

                const minEl = elevations.length > 0 ? Math.min(...elevations) : 0;
                const maxEl = elevations.length > 0 ? Math.max(...elevations) : 0;
                const avgEl = elevations.length > 0 ? elevations.reduce((a, b) => a + b, 0) / elevations.length : 0;

                const detectedAnos = pData.filter(d => d.anomalyId !== null);

                return (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{lang === 'ar' ? 'أقصى ارتفاع:' : 'Max Elevation:'}</span>
                      <span className="font-bold text-emerald-500">{maxEl.toFixed(1)}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{lang === 'ar' ? 'أدنى ارتفاع:' : 'Min Elevation:'}</span>
                      <span className="font-bold text-sky-500">{minEl.toFixed(1)}m</span>
                    </div>
                    <div className="flex justify-between border-b dark:border-zinc-800 border-slate-200 pb-2">
                      <span className="text-zinc-500">{lang === 'ar' ? 'متوسط الارتفاع:' : 'Mean Elevation:'}</span>
                      <span className="font-semibold">{avgEl.toFixed(1)}m</span>
                    </div>

                    <div className="mt-1">
                      <span className="text-zinc-400 block mb-1 font-bold">{lang === 'ar' ? 'الشذوذات المقاطعة للخط:' : 'Intercepted Anomalies:'}</span>
                      {detectedAnos.length === 0 ? (
                        <div className="p-2 border border-dashed rounded dark:border-zinc-800 border-slate-200 text-center text-zinc-500 text-[10px] italic">
                          {lang === 'ar' ? 'لا توجد شذوذات حالية تتقاطع مع المخطط' : 'No anomalies intersect path'}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1 scrollbar-thin">
                          {detectedAnos.map((ano, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const originalCand = candidates.find(c => c.id === ano.anomalyId);
                                if (originalCand) onSelectCandidate(originalCand);
                              }}
                              className="text-left w-full p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/15 transition-all text-[10px] flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">#{ano.anomalyId} - {ano.anomalyType}</span>
                              <span className="shrink-0 text-[10px] bg-rose-500 text-white px-1 rounded ml-1">@{ano.distance}m</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="text-[10px] text-zinc-500 leading-normal border-t dark:border-zinc-800 border-slate-200 pt-2.5 mt-2.5">
              💡 {lang === 'ar' ? 'ملاحظة: طول كل خلية في مصفوفة الارتفاع يعادل بدقة 12.5 متر.' : 'System spec: Distance is calculated directly using actual 12.5m pixel widths on map.'}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report / Declassified Site Survey Dossier Modal */}
      {isDossierOpen && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 md:p-8 overflow-y-auto no-print animate-fadeIn" 
          id="print-report-dossier-modal-backdrop"
        >
          {/* Inject Dynamic Printing styles custom encapsulating printable layout */}
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
              #print-report-dossier-modal-backdrop {
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                position: static !important;
                overflow: visible !important;
                display: block !important;
              }
              #print-report-dossier-modal-wrapper {
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                display: block !important;
              }
              #print-report-dossier-modal-container {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
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
            }
          `}} />

          {/* Dialog Container */}
          <div 
            className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-stretch select-none"
            id="print-report-dossier-modal-wrapper"
          >
            {/* LEFT SIDEBAR: Professional Control Panel (Hidden on print) */}
            <div className={`w-full lg:w-96 shrink-0 rounded-2xl border p-5 flex flex-col gap-4 no-print text-xs font-mono select-none ${
              isDark ? 'bg-gray-950 border-gray-800 text-gray-200' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
                <Settings className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">
                  {lang === 'ar' ? 'لوحة تهيئة التقرير الاحترافي' : 'PRO-REPORT GENERATOR CONFIG'}
                </span>
              </div>

              {/* Authority Agency */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'جهة / هيئة المساحة المسؤولة' : 'Issuing Agency / Authority'}
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder={lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الموحدة' : 'UNITED SPACE RECONNAISSANCE OFFICE'}
                  className="bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded px-2.5 py-1.5 font-bold text-gray-200 focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                />
              </div>

              {/* Lead Field Geologist */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'اسم المساح والجيولوجي المعتمد' : 'Lead Field Geologist / Signature Certifier'}
                </label>
                <input
                  type="text"
                  value={surveyorName}
                  onChange={(e) => setSurveyorName(e.target.value)}
                  placeholder={lang === 'ar' ? 'د. سارة المصري، رئيسة الجيولوجيين' : 'Dr. Sarah Al-Masri, Chief Geologist'}
                  className="bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded px-2.5 py-1.5 font-bold text-gray-200 focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                />
              </div>

              {/* Classification Stamps Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold mb-0.5">
                  {lang === 'ar' ? 'مستوى سرية وثيقة المسح' : 'Security Classification Stamp'}
                </label>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  {[
                    { id: 'TOP_SECRET', label: lang === 'ar' ? 'سري للغاية L-4' : 'TOP SECRET L4' },
                    { id: 'SECRET', label: lang === 'ar' ? 'سري / مأمن' : 'SECRET' },
                    { id: 'CONFIDENTIAL', label: lang === 'ar' ? 'محدود / داخلي' : 'CONFIDENTIAL' },
                    { id: 'RESTRICTED', label: lang === 'ar' ? 'أكاديمي مقيد' : 'RESTRICTED' },
                    { id: 'UNCLASSIFIED', label: lang === 'ar' ? 'عام / أكاديمي' : 'UNCLASSIFIED' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setClassificationLevel(lvl.id)}
                      className={`py-1 px-2 border rounded font-bold transition-all ${
                        classificationLevel === lvl.id
                          ? 'bg-emerald-500 text-gray-950 border-emerald-500'
                          : 'bg-gray-900/40 border-gray-850 hover:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections Visibility Toggles */}
              <div className="flex flex-col gap-1.5 py-2 border-t border-b border-gray-800 my-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold mb-0.5">
                  {lang === 'ar' ? 'تضمين بنود التقرير المطبوع' : 'Document Content Toggles'}
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer py-0.5 text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={includeNarrative}
                    onChange={(e) => setIncludeNarrative(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-800"
                  />
                  <span>{lang === 'ar' ? 'تضمين التحليل الجيولوجي الرئيسي (البند I)' : 'Section I: Geology Context'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-0.5 text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={includeCatalog}
                    onChange={(e) => setIncludeCatalog(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-800"
                  />
                  <span>{lang === 'ar' ? 'تضمين جدول الشذوذات الكامل (البند II)' : 'Section II: Full Target Catalog'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-0.5 text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-800"
                  />
                  <span>{lang === 'ar' ? 'تضمين التوقيع والأختام الرسمية المعتمدة' : 'Official Stamps & Verified Seals'}</span>
                </label>
              </div>

              {/* Custom Addendum notes */}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 uppercase text-[9px] font-bold">
                  {lang === 'ar' ? 'ملاحظات المسح والتنقيب الإضافية (ملحق IV)' : 'Custom Field Surveyor Notes (Addendum)'}
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'أضف أي ملاحظات ميدانية إضافية لطباعتها في التقرير...' : 'Enter custom field observations to print in the final addendum...'}
                  className="bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-emerald-500 placeholder-gray-500 resize-none leading-relaxed font-sans"
                />
              </div>

              {/* Printing Tips Display */}
              <div className={`p-2.5 rounded border leading-relaxed text-[10px] font-mono mt-auto ${
                isDark ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-emerald-50/10 border-emerald-900/20 text-emerald-300'
              }`}>
                <span className="font-bold uppercase block mb-0.5">{lang === 'ar' ? 'تلميحة للطباعة الممتازة:' : '💡 PRO PRINTING TIP:'}</span>
                {lang === 'ar' 
                  ? 'يرجى تفعيل "خيارات الخلفية ورسوماتها" في لوحة إعدادات الطباعة بالمتصفح لإخراج تدرجات الألوان وخلايا الكهوف بدقة تامة.' 
                  : 'Ensure you enable "Background Graphics" and "Print Background Colors" in your browser print window to render shaded elevation targets and metrics correctly.'}
              </div>

              {/* Close, Download, and Print Button Controls */}
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-800">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDossierOpen(false)}
                    className="flex-1 py-2 rounded bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:text-rose-400 transition-all font-bold text-[10px] text-gray-400 uppercase cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer"
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

            {/* RIGHT COLUMN: Live Document Canvas Preview (Actual print paper rendering) */}
            <div 
              className={`flex-1 rounded-2xl border shadow-2xl p-6 md:p-9 flex flex-col gap-6 relative select-text transition-colors overflow-y-auto ${
                isDark ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-slate-300 text-slate-900'
              }`} 
              id="print-report-dossier-modal-container"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Classification/Status Stamp Indicator in Preview */}
              <div className={`absolute top-4 right-4 md:top-8 md:right-9 border-2 font-mono font-black tracking-widest uppercase px-3 py-1 rounded rotate-2 select-none text-[10px] md:text-xs ${getStampColor()}`}>
                {getStampLabel()}
              </div>

              {/* Document Header */}
              <div className="border-b-2 border-double print-border border-gray-800/20 dark:border-gray-800/60 pb-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Compass className="w-5 h-5 text-emerald-500 animate-spin-slow" />
                  <span className="text-xs md:text-sm font-mono font-extrabold text-emerald-500 uppercase tracking-widest">
                    {agencyName || (lang === 'ar' ? 'هيئة استطلاع الفضاء الدولية الموحدة' : 'UNITED SPACE RECONNAISSANCE OFFICE')}
                  </span>
                </div>
                <h1 className="text-xl md:text-3xl font-mono tracking-tight font-black uppercase">
                  {lang === 'ar' ? 'ملف المسح الجيو-أثري وتحليل الصخر الأساسي المتكامل' : 'GEO-ARCHAEOLOGICAL SUBSURFACE RADAR SURVEY DOSSIER'}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono mt-2 text-gray-500 dark:text-gray-400">
                  <span>REF: KH4B-ALOS-PALSAR-SY-{point.lat.toFixed(2)}-{point.lon.toFixed(2)}</span>
                  <span>•</span>
                  <span>SYSTEM DATE: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-US')}</span>
                  <span>•</span>
                  <span>SECURITY: UNCLASSIFIED ACADEMIC RECORD</span>
                </div>
              </div>

              {/* Geological/Local stats grid with dynamic calculations */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border print-border rounded-lg p-3 bg-slate-50/50 dark:bg-gray-950/50">
                  <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase block">{lang === 'ar' ? 'منطقة القطاع والمسح' : 'Sector Region name'}</span>
                  <span className="text-xs md:text-sm font-bold uppercase">{results.region_name}</span>
                </div>
                <div className="border print-border rounded-lg p-3 bg-slate-50/50 dark:bg-gray-950/50">
                  <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase block">{lang === 'ar' ? 'الإحداثيات المركزية للبؤرة' : 'Reference GPS Pivot'}</span>
                  <span className="text-xs md:text-sm font-mono font-semibold">{point.lat.toFixed(5)}°N, {point.lon.toFixed(5)}°E</span>
                </div>
                <div className="border print-border rounded-lg p-3 bg-slate-50/50 dark:bg-gray-950/50">
                  <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase block">{lang === 'ar' ? 'مجموع الشذوذات المكتشفة' : 'Mapped Anomalies'}</span>
                  <span className="text-xs md:text-sm font-mono font-bold text-emerald-500">{totalAnomalies} / {candidates.length} {lang === 'ar' ? 'أهداف' : 'Targets'}</span>
                </div>
                <div className="border print-border rounded-lg p-3 bg-slate-50/50 dark:bg-gray-950/50">
                  <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase block">{lang === 'ar' ? 'متوسط عمق التجويف والبالوعة' : 'Est. Mean Depth'}</span>
                  <span className="text-xs md:text-sm font-mono font-bold text-indigo-500 dark:text-indigo-400">{avgDepth.toFixed(1)}m</span>
                </div>
              </div>

              {/* Section I: Geological Narrative Summary */}
              {includeNarrative && (
                <div className="border print-border rounded-xl p-4 md:p-5 bg-slate-100/50 dark:bg-gray-950/40 border-l-4 border-l-indigo-500" style={{ pageBreakInside: 'avoid' }}>
                  <h3 className="text-xs md:text-sm uppercase font-mono tracking-wider font-extrabold mb-2 text-emerald-500">
                    I. {lang === 'ar' ? 'السياق والتحليل الجيولوجي الأساسي للقطاع' : 'GEOLOGICAL CONTEXT & SUBSURFACE LITHOLOGY'}
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line text-justify text-gray-700 dark:text-gray-300">
                    {results.geological_context}
                  </p>
                </div>
              )}

              {/* Section II: Mapped Targets Table */}
              {includeCatalog && (
                <div style={{ pageBreakInside: 'avoid' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs md:text-sm uppercase font-mono tracking-wider font-extrabold text-emerald-500">
                      II. {lang === 'ar' ? 'كتالوج وجدول تصنيفات الشذوذ تحت السطحية' : 'SUBSURFACE RADAR TARGET CATALOG'}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      {lang === 'ar' ? 'ثقة عالية (>=٨٠%):' : 'HIGH CONFIDENCE (>=80%):'} {highConfidenceCount} / {totalAnomalies}
                    </span>
                  </div>
                  <div className="overflow-x-auto border print-border rounded-lg">
                    <table className="w-full text-left border-collapse text-xs md:text-sm font-mono">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-gray-950/80 border-b print-border dark:border-gray-800 text-[10px] uppercase text-gray-500 font-bold">
                          <th className="p-2 border-r print-border dark:border-gray-800 text-center">ID</th>
                          <th className="p-2 border-r print-border dark:border-gray-800">{lang === 'ar' ? 'التصنيف الهيكلي للهدف' : 'Structural Classification'}</th>
                          <th className="p-2 border-r print-border dark:border-gray-800 text-center">{lang === 'ar' ? 'الإحداثيات الجغرافية' : 'GPS Coordinates'}</th>
                          <th className="p-2 border-r print-border dark:border-gray-800 text-center">{lang === 'ar' ? 'مقدار انحراف TPI' : 'TPI Dev'}</th>
                          <th className="p-2 border-r print-border dark:border-gray-800 text-center">{lang === 'ar' ? 'العمق المقدر' : 'Est. Depth'}</th>
                          <th className="p-2 border-r print-border dark:border-gray-800 text-center">{lang === 'ar' ? 'الأبعاد (م)' : 'Dims (m)'}</th>
                          <th className="p-2 text-center">{lang === 'ar' ? 'الثقة %' : 'Conf%'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleCandidates.map((c) => {
                          const isTargetSelected = c.id === selectedCandidateId;
                          return (
                            <tr 
                              key={c.id} 
                              className={`border-b print-border last:border-b-0 dark:border-gray-800 text-[11px] ${
                                isTargetSelected 
                                  ? 'bg-emerald-500/15 font-bold dark:bg-emerald-500/20' 
                                  : 'hover:bg-slate-50/50 dark:hover:bg-gray-900/40'
                              }`}
                            >
                              <td className="p-2 border-r print-border dark:border-gray-800 text-center font-bold text-gray-950 dark:text-white">{c.id}</td>
                              <td className="p-2 border-r print-border dark:border-gray-800 font-sans md:font-mono">{c.type}</td>
                              <td className="p-2 border-r print-border dark:border-gray-800 text-center">{c.latitude.toFixed(5)}°N, {c.longitude.toFixed(5)}°E</td>
                              <td className="p-2 border-r print-border dark:border-gray-800 text-center">{c.intensity.toFixed(2)}m</td>
                              <td className="p-2 border-r print-border dark:border-gray-800 text-center font-bold text-black dark:text-emerald-400">{c.dimensions.depth_approx.toFixed(1)}m</td>
                              <td className="p-2 border-r print-border dark:border-gray-800 text-center">{c.dimensions.width}x{c.dimensions.length}m</td>
                              <td className="p-2 text-center font-bold text-emerald-500">{c.confidence}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section III: Currently Selected Highlight Detail */}
              {selectedCandidate && (
                <div className="border print-border rounded-xl p-4 md:p-5 bg-slate-50 dark:bg-gray-950/30 border-l-4 border-l-emerald-500 shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                  <div className="flex items-center justify-between gap-4 border-b dark:border-gray-800 pb-2.5 mb-2.5">
                    <h4 className="text-xs md:text-sm uppercase font-mono tracking-wider font-extrabold text-emerald-500">
                      III. {lang === 'ar' ? 'فحص تفصيلي للموقع المكتشف (الهدف الحالي)' : 'FEATURED TARGET DETAILED ASSESSMENT'}
                    </h4>
                    <span className="text-[10px] md:text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 uppercase">
                      ACTIVE TARGET FOCUS: #{selectedCandidate.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-xs leading-relaxed font-mono">
                      <div><span className="text-gray-500 uppercase text-[10px] block">{lang === 'ar' ? 'النوع المصنف' : 'Target Type:'}</span> <span className="font-bold">{selectedCandidate.type}</span></div>
                      <div className="mt-2"><span className="text-gray-500 uppercase text-[10px] block">{lang === 'ar' ? 'الإزاحة النسبية من البؤرة' : 'Proximity distance:'}</span> <span className="font-bold text-emerald-500">{calculateDistanceToCenter(selectedCandidate).toFixed(1)} meters</span></div>
                      <div className="mt-2"><span className="text-gray-500 uppercase text-[10px] block">{lang === 'ar' ? 'الأبعاد التقريبية للهيكل الجوفي' : 'Approximate Cavity Dims:'}</span> <span className="font-bold">{selectedCandidate.dimensions.width}m width x {selectedCandidate.dimensions.length}m length</span></div>
                    </div>
                    <div className="text-xs leading-relaxed font-sans md:font-mono">
                      <span className="text-gray-500 uppercase text-[10px] block font-mono">{lang === 'ar' ? 'الملاحظات والقرائن الجيولوجية والأثرية' : 'Expert site geology notes:'}</span>
                      <span className="italic block mt-1 text-gray-700 dark:text-gray-300">"{selectedCandidate.geology_notes}"</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section IV: Custom field surveyor observations Addendum */}
              {customNotes && (
                <div className="border print-border rounded-xl p-4 md:p-5 bg-slate-50 dark:bg-gray-950/30 border-l-4 border-l-amber-500 shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                  <h4 className="text-xs md:text-sm uppercase font-mono tracking-wider font-extrabold text-amber-500 border-b dark:border-gray-800 pb-2.5 mb-2.5">
                    IV. {lang === 'ar' ? 'ملحق التعليقات والملاحظات الميدانية الإضافية' : 'IV. ADDENDUM: SURVEYOR FIELD COMMENTS'}
                  </h4>
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300 font-sans">
                    {customNotes}
                  </p>
                </div>
              )}

              {/* Section V: Footer with Signatures and Stamp simulation */}
              {includeSignature && (
                <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 border-t border-dashed print-border border-gray-800/20 dark:border-gray-800/60 pt-6 mt-8" style={{ pageBreakInside: 'avoid' }}>
                  <div className="flex flex-col gap-2 justify-center max-w-md">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-500">{lang === 'ar' ? 'ضمان صحة البيانات الميدانية' : 'VERIFICATION COG SYSTEM ASSURANCE'}</span>
                    <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 leading-relaxed uppercase">
                      THIS SURVEY DATA WAS AUTO-EXTRACTED VIA AN IN-SITU COG RADAR ALGORITHM LAYER WITH ZERO INTERPOLATION ASSUMPTIONS. DIGITAL FOOTPRINTS GEOLOCATED WITHIN THE COOPERATIVE FIELD PROTOCOLS METRICS.
                    </p>
                  </div>
                  
                  {/* Real Signature Lines */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-end w-44">
                      <div className="border-b print-border border-dashed border-gray-600/60 w-full mb-1 text-center font-serif text-sm italic text-gray-500 select-none pb-1 pointer-events-none">
                        {surveyorName || (lang === 'ar' ? 'د. سارة المصري' : 'Dr. Sarah Al-Masri')}
                      </div>
                      <span className="text-[9px] font-mono text-gray-450 uppercase tracking-widest block text-center">
                        {lang === 'ar' ? 'توقيع الجيولوجي المعتمد' : 'CERTIFIED GEOLOGIST'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-end w-44">
                      <div className="border-b print-border border-dashed border-gray-600/60 w-full mb-1 text-center font-serif text-xs px-2 select-none text-emerald-500 font-bold pb-2 uppercase tracking-wide">
                        {lang === 'ar' ? 'خيار توقيع المشرف' : 'USRO-GRID ACTIVE'}
                      </div>
                      <span className="text-[9px] font-mono text-gray-450 uppercase tracking-widest block text-center">
                        {lang === 'ar' ? 'ختم الاعتماد الفيدرالي' : 'OFFICIAL USRO COMMISSION'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Footer Marks */}
              <div className="flex items-center justify-between gap-4 border-t print-border border-gray-805 dark:border-gray-800/45 pt-4 text-[9px] text-gray-450 font-mono mt-auto" style={{ pageBreakInside: 'avoid' }}>
                <div>
                  <p>ENVIRO-SATELLITE SY-GRID GEOSYSTEM COG INTERCONNECTION V1.92</p>
                  <p className="text-gray-500">DECLASSIFIED SYSTEM FILE VERIFIED THROUGH KH4B-ALOS PROTOCOLS</p>
                </div>
                <div className="text-right text-[9px] font-mono flex flex-col items-end leading-none font-bold text-gray-400">
                  <span className="border border-emerald-500/30 text-emerald-500 px-1.5 py-0.5 rounded select-none text-[8px] tracking-wider">
                    USRO COG-VERIFIED
                  </span>
                  <span className="mt-1 text-gray-500">SEC-ID: WGS-84-SYN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
