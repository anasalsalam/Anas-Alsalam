/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CaveCandidate {
  id: number;
  latitude: number;
  longitude: number;
  intensity: number; // Topographic Position Index (TPI) in meters (negative means depression)
  type: 'Karstic Sinkhole' | 'Hypogeum Tomb Chamber' | 'Collapse Lava Tube' | 'Subterranean Cistern';
  confidence: number; // percentage
  dimensions: {
    width: number; // in meters
    length: number; // in meters
    depth_approx: number; // in meters
  };
  geology_notes: string;
}

export interface ScanResults {
  status: 'success' | 'error';
  point: {
    lat: number;
    lon: number;
  };
  radius: number;
  candidates: CaveCandidate[];
  dem_grid: number[][]; // 15x15 matrix mapping local elevation zoom
  tpi_grid: number[][]; // 15x15 matrix mapping Topographic Position Index
  min_elevation: number;
  max_elevation: number;
  region_name: string;
  geological_context: string;
}

export interface InterpretationReport {
  geological_probability: string;
  geological_probability_ar?: string;
  archaeological_relevance: string;
  archaeological_relevance_ar?: string;
  corona_imagery_analysis: string;
  corona_imagery_analysis_ar?: string;
  field_recommendations: string;
  field_recommendations_ar?: string;
  summary: string;
  summary_ar?: string;
}

export interface CustomPointAnalysis {
  status: 'success' | 'error';
  point: { lat: number; lon: number };
  closest_sector: string;
  has_artifacts: boolean;
  artifact_type: string;
  artifact_type_ar: string;
  depth_meters: number;
  estimated_age: string;
  estimated_age_ar: string;
  probability: number;
  geological_layer: string;
  geological_layer_ar: string;
  dossier_report: {
    artifact_description: string;
    artifact_description_ar: string;
    subsurface_structure: string;
    subsurface_structure_ar: string;
    historical_commentary: string;
    historical_commentary_ar: string;
    field_actions: string;
    field_actions_ar: string;
  };
}

export interface ExtractedSite {
  site_name: string;
  era: string;
  latitude: number;
  longitude: number;
  description_extract?: string;
}

export interface AerialAnomaly {
  type: 'cropmark' | 'soilmark' | 'shadow' | 'unknown';
  name: string;
  description: string;
  probability: number;
  boundingBox?: { x: number; y: number; width: number; height: number }; // percentage on image
}

export interface VisionAnalysisResult {
  status: 'success' | 'error';
  summary: string;
  anomalies: AerialAnomaly[];
  reasoning: string;
}

