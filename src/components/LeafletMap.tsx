/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CaveCandidate } from '../types';
import { Locate, Layers, Globe, Info } from 'lucide-react';
import { translations } from '../lib/translations';

interface LeafletMapProps {
  lat: number;
  lon: number;
  radius: number; // in degrees
  candidates: CaveCandidate[];
  selectedCandidateId: number | null;
  onSelectCandidate: (candidate: CaveCandidate) => void;
  theme: 'dark' | 'light';
  lang: 'en' | 'ar';
  onMapClick?: (lat: number, lon: number) => void;
  customPoint?: { lat: number; lon: number } | null;
}

export const getCategoryColor = (type: string) => {
  switch (type) {
    case 'Karstic Sinkhole':
      return '#10b981'; // Emerald
    case 'Hypogeum Tomb Chamber':
      return '#a855f7'; // Purple
    case 'Collapse Lava Tube':
      return '#f59e0b'; // Amber/Orange
    case 'Subterranean Cistern':
      return '#06b6d4'; // Cyan
    default:
      return '#3b82f6'; // Blue
  }
};

export const getLocalizedType = (type: string, lang: 'en' | 'ar') => {
  const t = translations[lang];
  switch (type) {
    case 'Karstic Sinkhole':
      return t.typeKarsticSinkhole;
    case 'Hypogeum Tomb Chamber':
      return t.typeHypogeumTomb;
    case 'Collapse Lava Tube':
      return t.typeCollapseLavaTube;
    case 'Subterranean Cistern':
      return t.typeSubterraneanCistern;
    default:
      return type;
  }
};

export default function LeafletMap({
  lat,
  lon,
  radius,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  theme,
  lang,
  onMapClick,
  customPoint,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const t = translations[lang];

  // Convert radius in degrees to meters for Leaflet circle
  // 1 degree latitude = ~111,320m
  const radiusInMeters = radius * 111320;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create a Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;

    // Attach map click listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    // Create a layer group for vector markers
    const layers = L.layerGroup().addTo(map);
    layerGroupRef.current = layers;

    // Direct fix for a Leaflet container resizing bug in dashboards
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Base Tile Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove any existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'satellite') {
      // Esri High-Resolution World Imagery
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics'
      }).addTo(map);
    } else {
      // OpenStreetMap Standard Map (Topographic and Streets)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    }
  }, [mapType]);

  // Sync Coordinates Viewport and Animate Selection Zoom smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedCandidateId) {
      const selectedCand = candidates.find((c) => c.id === selectedCandidateId);
      if (selectedCand) {
        map.flyTo([selectedCand.latitude, selectedCand.longitude], 17.5, {
          animate: true,
          duration: 1.5,
        });
      }
    } else if (customPoint) {
      map.flyTo([customPoint.lat, customPoint.lon], 17.0, {
        animate: true,
        duration: 1.2,
      });
    } else {
      map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
    }
  }, [selectedCandidateId, lat, lon, candidates, customPoint]);

  // Sync Markers and Boundaries
  useEffect(() => {
    const map = mapRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    // Clear old drawings
    layers.clearLayers();

    // 1. Draw outer scanning boundary ring
    const scanBoundary = L.circle([lat, lon], {
      radius: radiusInMeters,
      color: theme === 'dark' ? '#10b981' : '#059669',
      weight: 1.5,
      dashArray: '5, 8',
      fillColor: theme === 'dark' ? '#10b981' : '#059669',
      fillOpacity: 0.05,
    });
    scanBoundary.addTo(layers);

    // 2. Draw central target radar pivot
    const scanCenter = L.circle([lat, lon], {
      radius: 8,
      color: '#ef4444',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 0.8,
    });
    scanCenter.bindTooltip(lang === 'ar' ? 'بؤرة توجيه القمر الصناعي' : 'Downlink Sector Focus Target');
    scanCenter.addTo(layers);

    // 3. Draw candidates markers
    candidates.forEach((cand) => {
      const isSelected = cand.id === selectedCandidateId;

      const baseColor = getCategoryColor(cand.type);
      const markerColor = isSelected ? '#f43f5e' : baseColor;
      const markerRadius = isSelected ? 12 : 9;

      const cMarker = L.circleMarker([cand.latitude, cand.longitude], {
        radius: markerRadius,
        color: isSelected ? '#ffffff' : baseColor,
        weight: isSelected ? 3 : 1.5,
        fillColor: markerColor,
        fillOpacity: isSelected ? 0.95 : 0.65,
      });

      // Bind interactive popup information
      const popupContent = `
        <div style="font-family: inherit; font-size: 11px; color: #1e293b; min-width: 130px; border-radius: 4px;">
          <b style="font-size: 12px; color: ${isSelected ? '#be123c' : '#1d4ed8'}">
            ${lang === 'ar' ? 'شذوذ العينة' : 'Anomaly'} #${cand.id}
          </b>
          <div style="margin-top: 3.5px; font-weight: 500;">
            ${lang === 'ar' ? 'النوع:' : 'Type:'} <i>${getLocalizedType(cand.type, lang)}</i>
          </div>
          <div style="margin-top: 2px;">
            ${lang === 'ar' ? 'قيمة TPI الكهرومغناطيسية:' : 'TPI Intensity:'} <span style="font-family: monospace; font-weight: bold; color: #ef4444">${cand.intensity.toFixed(2)}m</span>
          </div>
          <div style="margin-top: 2px;">
            ${lang === 'ar' ? 'نسبة الثقة الاستكشافية:' : 'Confidence:'} <b style="color: #059669">${cand.confidence}%</b>
          </div>
          <div style="margin-top: 2.5px; color: #64748b; font-size: 10px;">
            ${cand.latitude.toFixed(5)}°N, ${cand.longitude.toFixed(5)}°E
          </div>
        </div>
      `;

      cMarker.bindPopup(popupContent, { closeButton: false });
      
      // Bind hover tooltip
      cMarker.bindTooltip(`${lang === 'ar' ? 'الهدف أثر رقم' : 'Target Anomaly'} #${cand.id}`, { direction: 'top' });

      // Click callback to sync parent state selection
      cMarker.on('click', (e) => {
        // Prevent map click handler from triggering simultaneously
        L.DomEvent.stopPropagation(e);
        onSelectCandidate(cand);
      });

      cMarker.addTo(layers);
    });

    // 4. Draw Custom Selected Probe Point
    if (customPoint) {
      const customMarker = L.circleMarker([customPoint.lat, customPoint.lon], {
        radius: 12,
        color: '#ffffff',
        weight: 3,
        fillColor: '#f59e0b', // Amber
        fillOpacity: 0.95,
      });

      const customPopup = `
        <div style="font-family: inherit; font-size: 11px; color: #1e293b; min-width: 140px; border-radius: 4px; padding: 2px;">
          <b style="font-size: 12px; color: #d97706">
            ${lang === 'ar' ? 'نقطة المجهر المخصصة' : 'Custom Core Probe Pin'}
          </b>
          <div style="margin-top: 5.5px; font-weight: 500; font-size: 11px; line-height: 1.4;">
            ${lang === 'ar' ? 'اضغط "تحليل التربة والمكتنزات" للبدء بالتحليل الجيولوجي' : 'Click "Analyze Custom Point" in the report panel to inspect artifacts and buried depths.'}
          </div>
          <div style="margin-top: 6px; color: #64748b; font-size: 10.5px; font-family: monospace; border-top: 1px dashed #cb7a0d; pt-1; mt-1">
            ${customPoint.lat.toFixed(6)}°N, ${customPoint.lon.toFixed(6)}°E
          </div>
        </div>
      `;

      customMarker.bindPopup(customPopup, { closeButton: false });
      customMarker.bindTooltip(lang === 'ar' ? 'الهدف الأثري المختار' : 'User Selected Survey Core', { direction: 'top' });
      customMarker.addTo(layers);

      // Auto-open custom popup shortly after creation
      setTimeout(() => {
        customMarker.openPopup();
      }, 300);
    }
  }, [lat, lon, radiusInMeters, candidates, selectedCandidateId, customPoint, theme, lang]);

  return (
    <div className="relative w-full h-full flex flex-col" id="leaflet-custom-map-layer">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 pointer-events-auto cursor-grab active:cursor-grabbing" style={{ minHeight: '380px' }} />

      {/* Floating Legend Overlay */}
      <div
        className={`absolute bottom-3 right-3 z-10 p-3 rounded-xl border backdrop-blur-md shadow-xl max-w-[240px] text-[10px] font-mono leading-relaxed transition-all duration-300 pointer-events-auto select-none ${
          theme === 'dark'
            ? 'bg-gray-950/90 border-gray-800 text-gray-300'
            : 'bg-white/95 border-slate-200 text-slate-700'
        }`}
        id="leaflet-map-legend"
      >
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider mb-2 text-[11px] border-b pb-1 border-gray-500/20">
          <Info className="w-3.5 h-3.5 text-emerald-500" />
          {t.mapLegendTitle}
        </div>
        <div className="flex flex-col gap-2">
          {/* Categories with distinct colors */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981] border border-white/20 inline-block shrink-0" />
            <span className="truncate">{t.typeKarsticSinkhole}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#a855f7] border border-white/20 inline-block shrink-0" />
            <span className="truncate">{t.typeHypogeumTomb}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white/20 inline-block shrink-0" />
            <span className="truncate">{t.typeCollapseLavaTube}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#06b6d4] border border-white/20 inline-block shrink-0" />
            <span className="truncate">{t.typeSubterraneanCistern}</span>
          </div>
          {/* Metadata markers */}
          <div className="border-t pt-1.5 mt-1 border-gray-500/20 flex flex-col gap-1.5 text-[9px] opacity-90">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f43f5e] border border-white inline-block shrink-0 ring-1 ring-rose-500 animate-pulse" />
              <span className="font-bold text-rose-500">{t.mapLegendSelected}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white inline-block shrink-0 ring-1 ring-amber-500 animate-pulse" />
              <span className="font-bold text-amber-500">{lang === 'ar' ? 'مسبار مخصص' : 'Custom Core Probe'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 border border-dashed border-emerald-500 inline-block shrink-0" />
              <span>{t.mapLegendScanBoundary} ({radiusInMeters.toFixed(0)}m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Layer Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono font-bold border transition-colors shadow-sm cursor-pointer ${
            mapType === 'satellite'
              ? 'bg-emerald-500 text-gray-950 border-emerald-400'
              : theme === 'dark'
                ? 'bg-gray-900/90 border-gray-800 text-gray-300 hover:text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          id="map-toggle-satellite-btn"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'ar' ? 'أقمار صناعية فائقة الدقة' : 'SATELLITE (HI-RES)'}
        </button>
        <button
          type="button"
          onClick={() => setMapType('street')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono font-bold border transition-colors shadow-sm cursor-pointer ${
            mapType === 'street'
              ? 'bg-emerald-500 text-gray-950 border-emerald-400'
              : theme === 'dark'
                ? 'bg-gray-900/90 border-gray-800 text-gray-300 hover:text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          id="map-toggle-streetmap-btn"
        >
          <Layers className="w-3.5 h-3.5" />
          {lang === 'ar' ? 'شوارع وتضاريس' : 'STREETS & TOPO'}
        </button>
      </div>

      {/* Floating Recenter Pin */}
      <button
        type="button"
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lon], 16, { animate: true });
          }
        }}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full border shadow-md transition-colors cursor-pointer pointer-events-auto ${
          theme === 'dark'
            ? 'bg-gray-950/90 border-gray-800 text-gray-300 hover:text-white'
            : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        title={lang === 'ar' ? 'إعادة التوسيط على الإحداثيات' : 'Recenter Satellite Focus'}
        id="map-recenter-fab"
      >
        <Locate className="w-4 h-4 text-rose-500 animate-pulse" />
      </button>
    </div>
  );
}
