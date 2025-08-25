// ------------- Mapbox init -------------
mapboxgl.accessToken = 'pk.eyJ1IjoibHNqODY4NyIsImEiOiJjbWVodnUwOTAwOTRlMmxvamlkamtuZmpvIn0.CpdZxrrLzYKlJDF__W3B8g';

const map = new mapboxgl.Map({
  container: 'atl-map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-84.39, 33.76],
  zoom: 11.5,
  pitch: 0,
  bearing: 0
});
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

function ensureResizeSoon(){
  setTimeout(() => map.resize(), 0);
  setTimeout(() => map.resize(), 250);
  setTimeout(() => map.resize(), 800);
}
map.on('load', ensureResizeSoon);
window.addEventListener('resize', () => map.resize());

// Resize when the map section snaps into view
const section = document.getElementById('mapbox');
if ('IntersectionObserver' in window && section){
  new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting && ensureResizeSoon());
  }, { threshold: 0.2 }).observe(section);
}

// ------------- COLOR helpers -------------
const rampExpr = (prop, stops) => {
  const expr = ['interpolate', ['linear'], ['to-number', ['get', prop]]];
  stops.forEach(([v, c]) => expr.push(v, c));
  return expr;
};

// Shared color palette for all ramps
const COLORS = ["#FF1744","#FF6D00","#FFD600","#1DE9B6","#00E5FF","#2979FF"];


function makeStops(thresholds, colors = COLORS){
  return thresholds.map((t, i) => [t, colors[i]]);
}
function firstTextLabelLayerId() {
  const layers = map.getStyle().layers || [];
  for (const l of layers) {
    if (l.type === 'symbol' && l.layout && l.layout['text-field']) {
      return l.id; // e.g., "settlement-label" / "place-label" etc.
    }
  }
  return null;
}

// -------- Continuous Ramps (per element) --------
// Composite final_score
const FINAL_THRESH = [0.00, 0.2, 0.4, 0.6, 0.8, 1.00];
const FINAL_STOPS  = makeStops(FINAL_THRESH);
const finalColor   = rampExpr('final_score', FINAL_STOPS);

// POI
const POI_PROP   = 'poi_access_score_adj_ln';
const POI_THRESH = [0.0, 1.0, 1.5, 2.0, 2.5, 3.0];
const POI_STOPS  = makeStops(POI_THRESH);
const poiColor   = rampExpr(POI_PROP, POI_STOPS);

// Transit
const TRANSIT_PROP   = 'transit_score';
const TRANSIT_THRESH = [0, 5, 10, 20, 30, 40];
const TRANSIT_STOPS  = makeStops(TRANSIT_THRESH);
const transitColor   = rampExpr(TRANSIT_PROP, TRANSIT_STOPS);

// Sidewalk (meter)
const SIDEWALK_THRESH = [0, 1, 2, 4, 6, 12];
const SIDEWALK_STOPS  = makeStops(SIDEWALK_THRESH);
const sidewalkColor   = rampExpr('width', SIDEWALK_STOPS);

// Street buffer (meter)
const STREETBUFFER_THRESH = [0, 0.5, 1, 2, 3, 6];
const STREETBUFFER_STOPS  = makeStops(STREETBUFFER_THRESH);
const streetbufferColor   = rampExpr('streetbuffer_width', STREETBUFFER_STOPS);

// Vehicular road (continuous lanes → gradient)
const VEHICLE_PROP   = 'num_lanes';
const VEHICLE_THRESH = [1, 2, 3, 4, 5, 6];     // cap at 6; Mapbox will hold color for >6
const VEHICLE_STOPS  = makeStops(VEHICLE_THRESH); // uses your global COLORS
const lanesColor     = rampExpr(VEHICLE_PROP, VEHICLE_STOPS);

// -------- Categoreis --------
// Median (binary like parking)
const medianColor = [
  'match', ['to-number', ['get', 'median_value']],
  0, '#9e9e9e',   // No
  1, '#e91e63',   // Yes
  '#9e9e9e'       // fallback
];

// Bike lane
const bikeColor = [
  'match', ['to-number', ['get','bike_type']],
  0, '#9e9e9e', 1, '#00c2ff', 2, '#6ee7b7', // 1 Designated // 2 Protected
  '#9e9e9e'
];

// Street Parking
const parkingColor = [
  'match', ['to-number', ['get','predicted_avail']],
  0, '#9e9e9e', 1, '#e91e63', '#9e9e9e'
];

// ---------- HOVER popup (elements) ----------
const hoverPopup = new mapboxgl.Popup({ closeButton:false, closeOnClick:false });

const HOVER_FIELD = {
  composite:   { label:'Composite score',          prop:'final_score',             fmt:v => (+v).toFixed(3) },
  vehicle:     { label:'Number of lanes',          prop:'num_lanes',               fmt:v => String(v) },
  bike:        { label:'Bike lane type',           prop:'bike_type',               fmt:v => (Number(v)===2?'Protected':Number(v)===1?'Designated':'Not existed') },
  poi:         { label:'POI accessibility score',  prop:'poi_access_score_adj_ln', fmt:v => (+v).toFixed(2) },
  parking:     { label:'Parking availability',     prop:'predicted_avail',         fmt:v => (Number(v)===1?'Yes (1)':'No (0)') },
  median:     { label:'Median presence',           prop:'median_value',            fmt: v => (Number(v)===1 ? 'Yes (1)' : 'No (0)')},
  transit:     { label:'Transit stop score',       prop:TRANSIT_PROP,              fmt:v => (+v).toFixed(1) },
  sidewalk:    { label:'Sidewalk width (meter)',      prop:'width',          fmt:v => `${(+v).toFixed(1)} meter` },
  streetbuffer:{ label:'Street buffer width (meter)', prop:'streetbuffer_width',      fmt:v => `${(+v).toFixed(1)} meter` }
};

// ---------- HOVER popup (composite score) ----------
// Currently... all normalized to max 0.125
const SCORE_ITEMS = [
  { label: 'Bike lane',          prop: 'bike_score' },
  { label: 'Vehicular lanes',    prop: 'lane_score' },
  { label: 'Street parking',     prop: 'avail_score' },
  { label: 'Median',             prop: 'median_type_score' },
  { label: 'Amenities',          prop: 'poi_score_score' },
  { label: 'Sidewalk',           prop: 'sidewalk_score' },
  { label: 'Street buffer',      prop: 'street_buffer_score' },
  { label: 'Transit stop',       prop: 'transit_score_score' }
];

function barColor(val, max = 0.125){
  const t = Math.max(0, Math.min(1, (val || 0) / max));
  const hue = 210 - 30 * t;
  const sat = 85;
  const light = 55;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function formatPart(val){
  if (!isFinite(val)) return 'n/a';
  const x = val * 100;                       // 0.125 -> 12.5
  return x === 0 ? '0' : x.toFixed(1);       // one digit; 0 -> "0"
}

function buildCompositeHTML(props){
  const MAX_PART = 0.125;
  const fs = Number(props.final_score);

  const header = `
    <div style="font:700 16px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
                margin:0 0 8px 0; text-align:center">
      Completeness score: <b>${isFinite(fs) ? (fs * 100).toFixed(1) : 'n/a'}</b>
    </div>`;

  const rows = SCORE_ITEMS.map(({label, prop}) => {
    const val = Number(props[prop]);
    const pct = isFinite(val) ? Math.max(0, Math.min(100, (val / MAX_PART) * 100)) : 0;
    const color = barColor(isFinite(val) ? val : 0, MAX_PART);

    return `
      <div style="
        display:grid;
        grid-template-columns: 100px 1fr 60px; /* narrower label column -> wider bar */
        gap:10px;
        align-items:center;
        margin:6px 0">
        <div style="text-align:right; opacity:.9; white-space:nowrap">${label}</div>
        <div style="height:10px; background:rgba(255,255,255,.14); border-radius:6px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)">
          <div style="height:100%; width:${pct}%; background:${color}"></div>
        </div>
        <div style="font-variant-numeric: tabular-nums; color:rgba(255,255,255,.92)">${formatPart(val)}</div>
      </div>`;
  }).join('');

  return `
    <div style="min-width:340px; max-width:520px; background:rgba(0,0,0,.85);
                padding:10px 12px 12px; border-radius:10px; color:#fff;">
      ${header}${rows}
    </div>`;
}



// ---------- LEGENED (gradient / ramp / categories) ----------
const toPct = (v, min, max) => ((v - min) / (max - min)) * 100;
const stopsToCssGradient = (stops, min, max) =>
  `linear-gradient(to right, ${stops.map(([v,c]) => `${c} ${toPct(v,min,max).toFixed(2)}%`).join(', ')})`;

const _measureCanvas = document.createElement('canvas');
const _ctx = _measureCanvas.getContext('2d');
const measureTextPx = (t, font='600 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif') => {
  _ctx.font = font; return Math.ceil(_ctx.measureText(t).width);
};

function getLegendWidth(legend){
  if (!legend) return 240;
  if (legend.kind === 'gradient') return 320;
  if (legend.kind === 'ramp'){
    const n = (legend.stops || []).length, sw = 14, gap = 4, pad = 24;
    return Math.min(Math.max(n*sw + (n-1)*gap, 80) + pad + 60, 320);
  }
  if (legend.kind === 'cats'){
    const longest = Math.max(...(legend.cats || []).map(c => measureTextPx(c.label)), 0);
    return Math.min(Math.max(longest + 10 + 10 + 32, 160), 360);
  }
  return 240;
}

// Inject legend CSS once (transparent, shrink-wrap)
function ensureLegendBaseStyles(){
  if (document.getElementById('legend-base-css')) return;
  const css = `
  #map-legend{
    position:absolute; bottom:50px; left:50px;
    background:transparent; border:none; padding:0;
    border-radius:10px; color:#fff;
    font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    display:inline-block; width:auto; max-width:70vw; z-index:1;
    --cat-dot: 12px; --cat-gap: 10px;
  }
  #map-legend .legend-title{ margin-bottom:8px; color:rgba(255,255,255,.9); font-weight:600 }
  #map-legend .legend-title.indent-for-cats{ padding-left: calc(var(--cat-dot) + var(--cat-gap)); }
  #map-legend .legend-bar{ width:var(--bar-w,320px); height:12px; border-radius:999px;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.25); position:relative; }
  #map-legend .legend-ticks{ position:relative; height:20px; margin-top:6px }
  #map-legend .legend-ticks .tick{ position:absolute; transform:translateX(-50%); text-align:center }
  #map-legend .tick-mark{ display:block; width:1px; height:8px; margin:0 auto 3px auto; background:rgba(255,255,255,.7) }
  #map-legend .tick-label{ display:inline-block; color:rgba(255,255,255,.85); font-weight:600; white-space:nowrap }
  #map-legend .ramp{ display:flex; gap:4px; margin-bottom:6px }
  #map-legend .swatch{ width:14px; height:10px; border-radius:2px }
  #map-legend .labels{ display:flex; justify-content:space-between; font-weight:600 }
  #map-legend .cats{ display:grid; grid-template-columns: var(--cat-dot) 1fr; gap:6px var(--cat-gap); align-items:center; margin-top:18px}
  #map-legend .dot{ width:10px; height:10px; border-radius:50% }`;
  const style = document.createElement('style');
  style.id = 'legend-base-css';
  style.textContent = css;
  document.head.appendChild(style);
}

function renderGradientLegend(el, { title, min, max, stops, format=v=>String(v), tickVals, barWidth=320 }){
  const ticks = (tickVals && tickVals.length) ? tickVals : stops.map(([v]) => v);
  const ttl = document.createElement('div'); ttl.className = 'legend-title'; ttl.textContent = title;
  const bar = document.createElement('div'); bar.className = 'legend-bar'; bar.style.setProperty('--bar-w', `${barWidth}px`);
  bar.style.background = stopsToCssGradient(stops, min, max);
  const tickWrap = document.createElement('div'); tickWrap.className = 'legend-ticks';
  ticks.forEach(v => {
    const t = document.createElement('div');
    t.className = 'tick';
    t.style.left = `${toPct(v, min, max)}%`;
    t.innerHTML = `<span class="tick-mark"></span><span class="tick-label">${format(v)}</span>`;
    tickWrap.appendChild(t);
  });
  el.innerHTML = ''; el.appendChild(ttl); el.appendChild(bar); el.appendChild(tickWrap);
}

function renderLegend(legend){
  const el = document.getElementById('map-legend');
  if (!el) return;
  if (!legend){ el.innerHTML = ''; return; }
  ensureLegendBaseStyles();

  const targetW = (legend.width ?? getLegendWidth(legend));
  el.style.width = `${targetW}px`;
  el.style.bottom = (legend.bottom != null) ? `${legend.bottom}px` : '';

  if (legend.kind === 'gradient'){
    renderGradientLegend(el, { ...legend, barWidth: targetW });
    if (legend.extraCats?.length){
      const cats = document.createElement('div');
      cats.className = 'cats';
      cats.innerHTML = legend.extraCats.map(c => `<div class="dot" style="background:${c.color}"></div><div>${c.label}</div>`).join('');
      el.appendChild(cats);
    }
    return;
  }
  if (legend.kind === 'ramp'){
    const sw = legend.stops.map(([v,c]) => `<div class="swatch" style="background:${c}"></div>`).join('');
    el.innerHTML = `
      <h4 class="legend-title">${legend.title}</h4>
      <div class="ramp">${sw}</div>
      <div class="labels">
        <span>${legend.format ? legend.format(legend.stops[0][0]) : legend.stops[0][0]}</span>
        <span>${legend.format ? legend.format(legend.stops.at(-1)[0]) : legend.stops.at(-1)[0]}</span>
      </div>`;
    if (legend.extraCats?.length){
      const cats = document.createElement('div');
      cats.className = 'cats';
      cats.innerHTML = legend.extraCats.map(c => `<div class="dot" style="background:${c.color}"></div><div>${c.label}</div>`).join('');
      el.appendChild(cats);
    }
    return;
  }
  if (legend.kind === 'cats'){
    el.innerHTML = `<h4 class="legend-title indent-for-cats">${legend.title}</h4>
      <div class="cats">${legend.cats.map(c => `
        <div class="dot" style="background:${c.color}"></div><div>${c.label}</div>`).join('')}</div>`;
  }
}

// ------------- DUAL-STROKE links (map) -------------
function makeLinePaint(colorExpr, widthStops, opacity, blur = 0){
  const paint = {
    'line-color': colorExpr,
    'line-width': ['interpolate', ['linear'], ['zoom'], ...widthStops],
    'line-opacity': opacity
  };
  if (blur > 0) paint['line-blur'] = blur;
  return paint;
}
function extractWidthStops(paint){
  const w = paint?.['line-width'];
  return (Array.isArray(w) && w[0] === 'interpolate') ? w.slice(3) : [10, 2, 14, 6];
}
function scaleWidthStops(widthStops, factor){
  const out = widthStops.slice();
  for (let i = 1; i < out.length; i += 2) out[i] = out[i] * factor;
  return out;
}

// ------------- LAYERS -------------
const LAYER_DEFS = [
  {
    key: 'composite',
    title: 'Composite final_score',
    sourceId: 'composite_score',
    sourceUrl: 'mapbox://lsj8687.9ranu5mv',
    layerId: 'composite_score-line',
    type: 'line',
    sourceLayer: 'temp_SCORE-3jih01',
    paint: { 'line-color': finalColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: true,
    legend: { kind:'gradient', title:'Completeness Score', min: FINAL_THRESH[0], max: FINAL_THRESH.at(-1), stops: FINAL_STOPS, format: v => Math.round(v*100), width: 380, bottom: 60 }
  },
  {
    key: 'vehicle',
    title: 'Vehicular road (num_lanes)',
    sourceId: 'vehilce_lane',
    sourceUrl: 'mapbox://lsj8687.7i973wyp',
    layerId: 'vehilce_lane-line',
    type: 'line',
    sourceLayer: 'VEHICLELANE_top10_v2-blw431',
    paint: { 'line-color': lanesColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: false,
    legend: {
      kind: 'gradient',
      title: 'Number of lanes',
      min: VEHICLE_THRESH[0],
      max: VEHICLE_THRESH.at(-1),
      stops: VEHICLE_STOPS,
      tickVals: [1, 2, 3, 4, 5, 6],
      format: v => (v === 6 ? '6+' : v.toFixed(0))
    }
  },
  {
    key: 'bike',
    title: 'Bike lane (bike_type)',
    sourceId: 'bike_lane',
    sourceUrl: 'mapbox://lsj8687.cumhsq4k',
    layerId: 'bike_lane-line',
    type: 'line',
    sourceLayer: 'BIKELANE_top10_v2-0c94a0',
    paint: { 'line-color': bikeColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: false,
    legend: { kind:'cats', title:'Lane type', width: 180, cats:[
      {label:'Not existed', color:'#9e9e9e'},
      {label:'Designated', color:'#00c2ff'},
      {label:'Protected',  color:'#6ee7b7'}
    ]}
  },
  {
    key: 'poi',
    title: 'Amenities (poi_access_score_adj_ln)',
    sourceId: 'poi',
    sourceUrl: 'mapbox://lsj8687.d56dca7h',
    layerId: 'poi-line',
    type: 'line',
    sourceLayer: 'POI_top10_v2-8qbwcw',
    paint: { 'line-color': poiColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: false,
    legend: { kind:'gradient', title:'Accessibility score', min:POI_THRESH[0], max:POI_THRESH.at(-1), stops:POI_STOPS, format:v=>v.toFixed(1) }
  },
  {
    key: 'parking',
    title: 'Street parking (predicted_avail)',
    sourceId: 'street_parking',
    sourceUrl: 'mapbox://lsj8687.atdhbq42',
    layerId: 'street_parking-line',
    type: 'line',
    sourceLayer: 'STREETPARKING_20m_top10_v2-799bu4',
    paint: { 'line-color': parkingColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: false,
    styleMods: { underScale: 1.8, overScale: 0.6 },
    legend: { kind:'cats', title:'Parking availability', width: 150, cats:[
      {label:'No',  color:'#9e9e9e'},
      {label:'Yes', color:'#e91e63'}
    ]}
  },
  {
    key: 'transit',
    title: `Transit (${TRANSIT_PROP})`,
    sourceId: 'transit_stop',
    sourceUrl: 'mapbox://lsj8687.1z2p7ywa',
    layerId: 'transit_stop-line',
    type: 'line',
    sourceLayer: 'TRANSITSTOP_top10_v2-6aqb06',
    paint: { 'line-color': transitColor, 'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6], 'line-opacity': 0.95 },
    visibleByDefault: false,
    legend: { kind:'gradient', title:'Transit score', min:TRANSIT_THRESH[0], max:TRANSIT_THRESH.at(-1), stops:TRANSIT_STOPS, format:v=>v.toFixed(1) }
  },
  {
    key: 'sidewalk',
    title: 'Sidewalk (sidewalk_width)',
    sourceId: 'sidewalk',
    sourceUrl: 'mapbox://lsj8687.dm744rhw',
    layerId: 'sidewalk-line',
    type: 'line',
    sourceLayer: 'SIDEWALK_15m_top10_v2-2tw6ic',
    paint: {
      'line-color': [
        'case', ['==', ['to-number', ['get', 'width']], 0], '#9e9e9e',
        sidewalkColor
      ],
      'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6],
      'line-opacity': 0.95
    },
    visibleByDefault: false,
    styleMods: { underScale: 1.8, overScale: 0.6 },
    legend: {
      kind: 'gradient', title: 'Sidewalk width (meter)',
      min: SIDEWALK_THRESH[1], max: SIDEWALK_THRESH.at(-1),
      stops: SIDEWALK_STOPS.filter(([v]) => v > 0),
      tickVals: [1,2,4,6,12], format: v => (v===12?'12+':v.toFixed(0)),
      extraCats: [ {label:'No sidewalk', color:'#9e9e9e'} ]
    }
  },
  {
    key: 'median',
    title: 'Median (median_value)',
    sourceId: 'median',
    sourceUrl: 'mapbox://lsj8687.d78ajg1k',              
    layerId: 'median-line',
    type: 'line',
    sourceLayer: 'MEDIAN_top10_v2-c4r8f4',  
    paint: {
      'line-color': medianColor,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 6],
      'line-opacity': 0.95
    },
    visibleByDefault: false,
    legend: {
      kind: 'cats', title: 'Median', width: 150,
      cats: [
        {label: 'No', color: '#9e9e9e'},
        {label: 'Yes', color: '#e91e63'}
      ]
    }
  },
  {
    key: 'streetbuffer',
    title: 'Street buffer (streetbuffer_width)',
    sourceId: 'street_buffer',
    sourceUrl: 'mapbox://lsj8687.8h82hxa4',
    layerId: 'street_buffer-line',
    type: 'line',
    sourceLayer: 'STREETBUFFER_20m_top10_v2-arcpq3',
    paint: {
      'line-color': [
        'case', ['==', ['to-number', ['get', 'streetbuffer_width']], 0], '#9e9e9e',
        streetbufferColor
      ],
      'line-width': ['interpolate',['linear'],['zoom'],10,2,14,6],
      'line-opacity': 0.95
    },
    visibleByDefault: false,
    styleMods: { underScale: 1.8, overScale: 0.6 },
    legend: {
      kind:'gradient', title:'Street buffer width (meter)',
      min: STREETBUFFER_THRESH[1], max: STREETBUFFER_THRESH.at(-1),
      stops: STREETBUFFER_STOPS.filter(([v]) => v > 0),
      tickVals: [0.5,1,2,3,6], format:v=> (v===6?'6+':v.toFixed(1)),
      extraCats: [ {label:'No buffer', color:'#9e9e9e'} ]
    }
  }
];

// ------------- Build dual layers -------------
function addAllLineLayers(){
  // compute once per style load
  const labelBeforeId = firstTextLabelLayerId();

  LAYER_DEFS.forEach(def => {
    if (!map.getSource(def.sourceId)){
      map.addSource(def.sourceId, { type:'vector', url:def.sourceUrl });
    }

    const colorExpr = def.paint['line-color'];
    const baseStops = extractWidthStops(def.paint);

    const m             = def.styleMods || {};
    const underScale    = m.underScale    ?? 2.6;
    const overScale     = m.overScale     ?? 1.0;
    const underOpacity  = m.underOpacity  ?? 0.25;
    const overOpacity   = m.overOpacity   ?? (def.paint['line-opacity'] ?? 0.95);
    const underBlur     = m.underBlur     ?? 0.5;

    const underPaint = makeLinePaint(colorExpr, scaleWidthStops(baseStops, underScale), underOpacity, underBlur);
    const overPaint  = makeLinePaint(colorExpr, scaleWidthStops(baseStops, overScale),  overOpacity, 0);

    const underId = `${def.layerId}-under`;
    const overId  = `${def.layerId}-over`;

    if (!map.getLayer(underId)){
      const spec = {
        id: underId, type: def.type, source: def.sourceId,
        'source-layer': def.sourceLayer, paint: underPaint,
        layout: { visibility: def.visibleByDefault ? 'visible' : 'none' }
      };
      // place below labels if we found a label layer
      map.addLayer(spec, labelBeforeId || undefined);
    }
    if (!map.getLayer(overId)){
      const spec = {
        id: overId, type: def.type, source: def.sourceId,
        'source-layer': def.sourceLayer, paint: overPaint,
        layout: { visibility: def.visibleByDefault ? 'visible' : 'none' }
      };
      map.addLayer(spec, labelBeforeId || undefined);
    }
  });
}


// ------------- Toggle & events use the top layer -------------
function setActiveLayer(key){
  LAYER_DEFS.forEach(def => {
    const vis = def.key === key ? 'visible' : 'none';
    map.setLayoutProperty(`${def.layerId}-under`, 'visibility', vis);
    map.setLayoutProperty(`${def.layerId}-over`,  'visibility', vis);
  });
  hoverPopup.remove();
  document.querySelectorAll('.mapboxgl-popup').forEach(el => el.remove());
  const def = LAYER_DEFS.find(d => d.key === key);
  if (def) { renderLegend(def.legend); updateButtons(key); }
}

function updateButtons(activeKey){
  const wrap = document.getElementById('map-controls');
  if (!wrap) return;
  wrap.querySelectorAll('button[data-layer]').forEach(btn => {
    const on = btn.dataset.layer === activeKey;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function initButtons(){
  const wrap = document.getElementById('map-controls');
  if (!wrap) return;
  wrap.querySelectorAll('button[data-layer]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveLayer(btn.dataset.layer);
    });
  });
}

// ------------- Boot -------------
map.on('load', () => {
  addAllLineLayers();
  initButtons();
  setActiveLayer('composite');

  // Hover popups for all layers (bind to TOP layer)
  LAYER_DEFS.forEach(def => {
    const meta = HOVER_FIELD[def.key];
    const topId = `${def.layerId}-over`;
    if (!meta) return;

    map.on('mousemove', topId, (e) => {
      const f = e.features?.[0];
      if (!f){ hoverPopup.remove(); return; }
      const v = f.properties?.[meta.prop];
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(`<div>${meta.label}: <b>${meta.fmt ? meta.fmt(v) : (v ?? 'n/a')}</b></div>`)
        .addTo(map);
    });
    map.on('mouseleave', topId, () => hoverPopup.remove());
  });

  // Click popup for composite mini dashboard (bind to TOP layer)
  map.on('click', 'composite_score-line-over', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    hoverPopup.remove();
    new mapboxgl.Popup({ closeButton:true, maxWidth:'420px' })
      .setLngLat(e.lngLat)
      .setHTML(buildCompositeHTML(f.properties || {}))
      .addTo(map);
  });
});

// Only zoom with Ctrl (or ⌘ on Mac)
map.scrollZoom.disable();

// ---- One-time "Hold Ctrl to zoom" hint ----
// ---- One-time "Hold Ctrl to zoom" hint (Fix 1 + Fix 2) ----
(function () {
  const HINT_KEY = 'zoomHintSeen_v3';

  // Use sessionStorage in dev so it resets each tab refresh
  const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  const STORE = DEV_HOSTS.has(location.hostname) ? sessionStorage : localStorage;

  const section = document.getElementById('mapbox');
  if (!section || STORE.getItem(HINT_KEY)) return;

  let hintEl, hideTimer, io;

  function createHint() {
    if (hintEl) return hintEl;
    hintEl = document.createElement('div');
    hintEl.className = 'map-hint';
    hintEl.setAttribute('role', 'status');
    hintEl.setAttribute('aria-live', 'polite');
    hintEl.innerHTML = `
      <span>Hold</span>
      <span class="kbd">Ctrl</span>
      <span class="sep">/</span>
      <span class="kbd">⌘</span>
      <span>+ scroll to zoom</span>
    `;
    section.appendChild(hintEl);
    return hintEl;
  }

  function showHint() {
    const el = createHint();
    // trigger CSS transition
    requestAnimationFrame(() => el.classList.add('show'));
    // Auto-hide after 4s, but DO NOT persist (Fix 1)
    hideTimer = setTimeout(() => dismissHint({ persist: false }), 4000);
  }

  function dismissHint({ persist = false } = {}) {
    if (!hintEl) return;
    hintEl.classList.remove('show');
    if (hideTimer) clearTimeout(hideTimer);
    if (persist) STORE.setItem(HINT_KEY, '1'); // only persist on real Ctrl/⌘ zoom
  }

  // If <main> is the scroll container, observe inside it (prevents missing first view)
  const mainEl = document.querySelector('main');
  const cs = mainEl ? getComputedStyle(mainEl) : null;
  const isScrollable = cs && ['auto', 'scroll', 'overlay'].includes(cs.overflowY);
  const ioRoot = isScrollable ? mainEl : null;

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) {
        showHint();
        obs.disconnect();
      }
    }, { threshold: 0.5, root: ioRoot });
    io.observe(section);
  } else {
    // Fallback if IO not supported: show shortly after map loads
    map.once('load', () => setTimeout(showHint, 600));
  }

  // Persist the "seen" flag only when the user actually Ctrl/⌘+scrolls (Fix 1)
  map.on('wheel', (e) => {
    const ev = e.originalEvent;
    if (ev.ctrlKey || ev.metaKey) dismissHint({ persist: true });
  });

  // Debug helpers (optional)
  window.__resetZoomHint = () => STORE.removeItem(HINT_KEY);
  window.__showZoomHint = () => { STORE.removeItem(HINT_KEY); showHint(); };
})();


map.on('wheel', (e) => {
  const ev = e.originalEvent;
  const ctrlLike = ev.ctrlKey || ev.metaKey; // support Mac ⌘

  if (ctrlLike) {
    // prevent browser page-zoom + let Mapbox handle it
    ev.preventDefault();
    map.scrollZoom.enable();
    // disable again after this zoom interaction ends
    map.once('moveend', () => map.scrollZoom.disable());
  } else {
  }
});
