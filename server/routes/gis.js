import express from 'express';
import { mockStore } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/gis/map-data - Get full GIS layer data for Leaflet map
router.get('/map-data', (req, res) => {
  const { mine_id } = req.query;

  // Filter mines based on scope
  let activeMines = [...mockStore.mines];
  if (req.user && (req.user.role === 'supervisor' || req.user.role === 'miner') && req.user.mine_id) {
    activeMines = activeMines.filter(m => m.id === req.user.mine_id);
  } else if (mine_id && mine_id !== 'all' && mine_id !== 'undefined') {
    const matched = activeMines.filter(m => m.id === mine_id);
    if (matched.length > 0) {
      activeMines = matched;
    }
  }

  if (activeMines.length === 0) {
    activeMines = [mockStore.mines[0]];
  }

  // Build GeoJSON polygons for mines
  const minePolygons = activeMines.map(mine => {
    const sub = mockStore.subsidiaries.find(s => s.id === mine.subsidiary_id);
    const boundary = Array.isArray(mine.geojson_boundary)
      ? mine.geojson_boundary.map(([lat, lng]) => [lng, lat])
      : [];
    return {
      type: 'Feature',
      properties: {
        id: mine.id,
        name: mine.name,
        code: mine.code,
        subsidiary: sub?.code || 'CIL',
        state: mine.state,
        mine_type: mine.mine_type,
        risk_score: mine.current_risk_score,
        target_tonnes: mine.monthly_target_tonnes,
        actual_tonnes: mine.actual_production_tonnes
      },
      geometry: {
        type: 'Polygon',
        coordinates: [boundary]
      }
    };
  });

  // Collect violation pins
  const targetMineIds = activeMines.map(m => m.id);
  const violationPins = mockStore.violations
    .filter(v => targetMineIds.includes(v.mine_id))
    .map((v, idx) => {
      const mine = mockStore.mines.find(m => m.id === v.mine_id) || activeMines[0];
      const lat = typeof v.latitude === 'number' && !isNaN(v.latitude) ? v.latitude : (mine.latitude + (idx * 0.001 - 0.002));
      const lng = typeof v.longitude === 'number' && !isNaN(v.longitude) ? v.longitude : (mine.longitude + (idx * 0.001 - 0.002));
      return {
        id: v.id,
        title: v.title,
        type: 'violation',
        category: v.category,
        severity: v.severity || 'medium',
        status: v.status,
        latitude: lat,
        longitude: lng,
        location: v.location_description,
        photo_url: v.photo_url,
        mine_name: mine?.name || 'Site'
      };
    })
    .filter(v => typeof v.latitude === 'number' && !isNaN(v.latitude) && typeof v.longitude === 'number' && !isNaN(v.longitude));

  // Collect field report / incident pins
  const incidentPins = mockStore.field_reports
    .filter(r => targetMineIds.includes(r.mine_id))
    .map((r, idx) => {
      const mine = mockStore.mines.find(m => m.id === r.mine_id) || activeMines[0];
      const lat = typeof r.latitude === 'number' && !isNaN(r.latitude) ? r.latitude : (mine?.latitude ? mine.latitude + (idx * 0.0008 - 0.0015) : 23.7508);
      const lng = typeof r.longitude === 'number' && !isNaN(r.longitude) ? r.longitude : (mine?.longitude ? mine.longitude + (idx * 0.0008 - 0.0015) : 86.4192);
      return {
        id: r.id,
        title: r.suggested_category || 'Hazard Observation',
        type: 'field_report',
        severity: r.severity || 'medium',
        description: r.description,
        latitude: lat,
        longitude: lng,
        reporter: r.worker_name,
        created_at: r.created_at
      };
    })
    .filter(r => typeof r.latitude === 'number' && !isNaN(r.latitude) && typeof r.longitude === 'number' && !isNaN(r.longitude));

  // Collect active location-aware incidents
  const incidentList = (mockStore.incidents || [])
    .filter(i => targetMineIds.includes(i.mine_id) || i.mine_id === 'mine-demo-01');

  // Heatmap points with intensity based on risk & severity
  const heatmapPoints = [
    ...violationPins.map(v => [
      v.latitude,
      v.longitude,
      v.severity === 'critical' ? 1.0 : v.severity === 'high' ? 0.8 : 0.5
    ]),
    ...incidentPins.map(i => [
      i.latitude,
      i.longitude,
      i.severity === 'high' || i.severity === 'critical' ? 0.75 : 0.4
    ]),
    ...incidentList.map(i => [
      i.latitude,
      i.longitude,
      i.severity === 'CRITICAL' ? 1.0 : i.severity === 'HIGH' ? 0.85 : 0.6
    ]),
    ...activeMines
      .filter(m => typeof m.latitude === 'number' && !isNaN(m.latitude) && typeof m.longitude === 'number' && !isNaN(m.longitude))
      .map(m => [
        m.latitude,
        m.longitude,
        (m.current_risk_score || 50) / 100
      ])
  ].filter(pt => Array.isArray(pt) && typeof pt[0] === 'number' && !isNaN(pt[0]) && typeof pt[1] === 'number' && !isNaN(pt[1]));

  res.json({
    mines: activeMines,
    geojsonBoundaries: {
      type: 'FeatureCollection',
      features: minePolygons
    },
    pins: [...violationPins, ...incidentPins],
    incidents: incidentList,
    heatmapPoints
  });
});

// GET /api/gis/mines - Get all mines list with GIS polygons
router.get('/mines', authenticateToken, (req, res) => {
  res.json(mockStore.mines);
});

export default router;
