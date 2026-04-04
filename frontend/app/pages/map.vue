<script setup lang="ts">
import { ref, onMounted, type Ref, onUnmounted, h, render, watch } from 'vue';
import { type MapMouseEvent, Popup, Map, Marker, LngLat, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapMarkerPopup from '~/components/map/MapMarkerPopup.vue';
import cursorSvg from '~/assets/svgs/cursor.svg?raw';
import dotSvg from '~/assets/svgs/dot.svg?raw';
import lineSvg from '~/assets/svgs/line.svg?raw';
import trashSvg from '~/assets/svgs/trash.svg?raw';
import { buildGrid, autoGridOptions, latLngToMgrs } from '~/utils/utm';

interface MapStyle {
  name: string;
  url: string;
}

type PanelName = 'map' | 'grid' | 'layers' | 'objects';

const availableMapStyles: MapStyle[] = [
  { name: 'World Color', url: 'https://sgx.geodatenzentrum.de/gdz_basemapworld_vektor/styles/bm_web_wld_col.json' },
  { name: 'Germany Color', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json' },
  { name: 'Germany Topography', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json' },
  { name: 'Germany Grayscale', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_gry.json' },
];

const initialMapStyleUrl: string = availableMapStyles[0]?.url ?? '';
const selectedMapStyleUrl: Ref<string> = ref<string>(initialMapStyleUrl);
const mapContainer: Ref<HTMLElement | null> = ref(null);
const map: Ref<Map | null> = ref(null);
const hoveredCoordinates: Ref<string> = ref<string>('');
const hoveredMgrs: Ref<string> = ref<string>('');
const activePanel: Ref<PanelName> = ref<PanelName>('map');
const isSidebarCollapsed: Ref<boolean> = ref<boolean>(false);

// ─── Grid settings ────────────────────────────────────────────────────────
const gridEnabled   = ref(false);
const gridType      = ref<'mgrs' | 'utm'>('mgrs');
const gridPrecision = ref<'auto' | '100000' | '10000' | '1000' | '100'>('auto');
const showGzd       = ref(true);
const showLabels    = ref(true);
const gridOpacity   = ref(0.75);
const gridColor     = ref('#ffffff');

// ─── Marker helper ────────────────────────────────────────────────────────
const createMarker = (lng: number, lat: number) => {
  if (!map.value) return;

  const popupContent = document.createElement('div');
  const popup = new Popup({ closeOnClick: false })
    .setDOMContent(popupContent)
    .setLngLat(LngLat.convert([lng, lat]));

  const marker = new Marker()
    .setLngLat(LngLat.convert([lng, lat]))
    .setPopup(popup);

  const component = h(MapMarkerPopup, {
    onDelete: () => marker.remove(),
  });
  render(component, popupContent);

  marker.getElement().addEventListener('click', (e) => {
    e.stopPropagation();
    popup.addTo(map.value!);
  });

  marker.addTo(map.value);
};

// ─── Grid layer management ────────────────────────────────────────────────
function initGridLayers(): void {
  if (!map.value) return;

  // Clean up if layers already exist (e.g. after style change)
  for (const id of ['grid-labels-layer', 'grid-sub', 'grid-100k', 'grid-gzd']) {
    if (map.value.getLayer(id)) map.value.removeLayer(id);
  }
  for (const id of ['grid-lines', 'grid-labels']) {
    if (map.value.getSource(id)) map.value.removeSource(id);
  }

  map.value.addSource('grid-lines',  { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.value.addSource('grid-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

  map.value.addLayer({
    id: 'grid-gzd',
    type: 'line',
    source: 'grid-lines',
    filter: ['==', ['get', 'kind'], 'gzd'],
    paint: { 'line-color': gridColor.value, 'line-width': 1.5, 'line-opacity': gridOpacity.value },
  });
  map.value.addLayer({
    id: 'grid-100k',
    type: 'line',
    source: 'grid-lines',
    filter: ['==', ['get', 'kind'], '100k'],
    paint: { 'line-color': gridColor.value, 'line-width': 1.0, 'line-opacity': gridOpacity.value },
  });
  map.value.addLayer({
    id: 'grid-sub',
    type: 'line',
    source: 'grid-lines',
    filter: ['==', ['get', 'kind'], 'sub'],
    paint: { 'line-color': gridColor.value, 'line-width': 0.5, 'line-opacity': gridOpacity.value },
  });
  map.value.addLayer({
    id: 'grid-labels-layer',
    type: 'symbol',
    source: 'grid-labels',
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': ['match', ['get', 'kind'], 'gzd', 13, 10],
      'text-padding': 2,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': gridColor.value,
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 2,
      'text-opacity': gridOpacity.value,
    },
  });

  updateGrid();
}

function updateGrid(): void {
  if (!map.value) return;
  const empty = { type: 'FeatureCollection' as const, features: [] };
  const linesSrc  = map.value.getSource('grid-lines')  as GeoJSONSource | undefined;
  const labelsSrc = map.value.getSource('grid-labels') as GeoJSONSource | undefined;
  if (!linesSrc || !labelsSrc) return;

  if (!gridEnabled.value) {
    linesSrc.setData(empty);
    labelsSrc.setData(empty);
    return;
  }

  const bounds = map.value.getBounds();
  const zoom   = map.value.getZoom();

  let show100k: boolean;
  let subInterval: number;

  if (gridPrecision.value === 'auto') {
    const ag = autoGridOptions(zoom);
    show100k    = ag.show100k;
    subInterval = ag.subInterval;
  } else {
    const prec = parseInt(gridPrecision.value, 10);
    show100k    = prec <= 100_000;
    subInterval = prec < 100_000 ? prec : 0;
  }

  const result = buildGrid(
    bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
    { showGzd: showGzd.value, show100k, subInterval, showLabels: showLabels.value },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linesSrc.setData(result.lines as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelsSrc.setData(result.labelPoints as any);
}

function applyGridStyle(): void {
  if (!map.value) return;
  for (const id of ['grid-gzd', 'grid-100k', 'grid-sub']) {
    if (!map.value.getLayer(id)) continue;
    map.value.setPaintProperty(id, 'line-color',   gridColor.value);
    map.value.setPaintProperty(id, 'line-opacity',  gridOpacity.value);
  }
  if (map.value.getLayer('grid-labels-layer')) {
    map.value.setPaintProperty('grid-labels-layer', 'text-color',   gridColor.value);
    map.value.setPaintProperty('grid-labels-layer', 'text-opacity',  gridOpacity.value);
  }
}

// ─── Map init ─────────────────────────────────────────────────────────────
onMounted(() => {
  if (!selectedMapStyleUrl.value) return;

  map.value = new Map({
    container: mapContainer.value!,
    style: selectedMapStyleUrl.value,
    center: [10.4, 51.3],
    zoom: 6,
  });

  map.value.on('click', (e: MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    createMarker(lng, lat);
  });

  map.value.on('mousemove', (e: MapMouseEvent) => {
    const { lat, lng } = e.lngLat;
    hoveredCoordinates.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    hoveredMgrs.value = latLngToMgrs(lat, lng, 5);
    map.value!.getCanvas().style.cursor = 'default';
  });

  map.value.once('load', () => {
    initGridLayers();
    map.value!.on('moveend', updateGrid);
  });
});

// Style change → re-add grid layers after style loads
watch(selectedMapStyleUrl, (newUrl) => {
  if (!map.value) return;
  map.value.setStyle(newUrl);
  const onStyleData = () => {
    if (map.value?.isStyleLoaded()) {
      map.value.off('styledata', onStyleData);
      initGridLayers();
    }
  };
  map.value.on('styledata', onStyleData);
});

// Grid settings changes
watch([gridEnabled, showGzd, gridPrecision, showLabels, gridType], updateGrid);
watch([gridColor, gridOpacity], applyGridStyle);

onUnmounted(() => {
  map.value?.remove();
});
</script>

<template>
  <section class="spark-map-page">
    <header class="app-header">
      <div class="header-left">
        <h1>Mission Map</h1>
      </div>
      <div class="header-right">
        <button
          class="header-btn"
          type="button"
        >
          + Point
        </button>
        <button
          class="header-btn"
          type="button"
        >
          Share
        </button>
      </div>
    </header>

    <div class="main-area">
      <aside class="toolbar">
        <button
          class="tool-btn active"
          type="button"
          title="Select"
        >
          <span v-html="cursorSvg" />
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Point"
        >
          <span v-html="dotSvg" />
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Draw"
        >
          <span v-html="lineSvg" />
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Erase"
        >
          <span v-html="trashSvg" />
        </button>
      </aside>

      <main class="map-shell">
        <div
          ref="mapContainer"
          class="map-canvas"
        />

        <aside
          class="sidebar"
          :class="{ collapsed: isSidebarCollapsed }"
        >
          <button
            class="sidebar-toggle"
            type="button"
            @click="isSidebarCollapsed = !isSidebarCollapsed"
          >
            {{ isSidebarCollapsed ? '<' : '>' }}
          </button>

          <div class="sidebar-content">
            <nav class="sidebar-tabs">
              <button
                class="sidebar-tab"
                :class="{ active: activePanel === 'map' }"
                type="button"
                @click="activePanel = 'map'"
              >
                Map
              </button>
              <button
                class="sidebar-tab"
                :class="{ active: activePanel === 'grid' }"
                type="button"
                @click="activePanel = 'grid'"
              >
                Grid
              </button>
              <button
                class="sidebar-tab"
                :class="{ active: activePanel === 'layers' }"
                type="button"
                @click="activePanel = 'layers'"
              >
                Layers
              </button>
              <button
                class="sidebar-tab"
                :class="{ active: activePanel === 'objects' }"
                type="button"
                @click="activePanel = 'objects'"
              >
                Objects
              </button>
            </nav>

            <div class="sidebar-panels">
              <!-- ── Map panel ──────────────────────────────────── -->
              <div
                v-show="activePanel === 'map'"
                class="sidebar-panel"
              >
                <h3 class="panel-title">
                  Map
                </h3>
                <select v-model="selectedMapStyleUrl">
                  <option
                    v-for="style in availableMapStyles"
                    :key="style.url"
                    :value="style.url"
                  >
                    {{ style.name }}
                  </option>
                </select>
              </div>

              <!-- ── Grid panel ─────────────────────────────────── -->
              <div
                v-show="activePanel === 'grid'"
                class="sidebar-panel"
              >
                <h3 class="panel-title">
                  Grid
                </h3>

                <!-- Enable toggle -->
                <div class="setting-row">
                  <span class="setting-label">Grid anzeigen</span>
                  <label class="toggle-switch">
                    <input
                      v-model="gridEnabled"
                      type="checkbox"
                    >
                    <span class="toggle-track"><span class="toggle-thumb" /></span>
                  </label>
                </div>

                <template v-if="gridEnabled">
                  <!-- Grid type -->
                  <div class="setting-row">
                    <span class="setting-label">Typ</span>
                    <select
                      v-model="gridType"
                      class="setting-select"
                    >
                      <option value="mgrs">
                        MGRS
                      </option>
                      <option value="utm">
                        UTM
                      </option>
                    </select>
                  </div>

                  <!-- Precision -->
                  <div class="setting-row">
                    <span class="setting-label">Genauigkeit</span>
                    <select
                      v-model="gridPrecision"
                      class="setting-select"
                    >
                      <option value="auto">
                        Automatisch
                      </option>
                      <option value="100000">
                        100 km
                      </option>
                      <option value="10000">
                        10 km
                      </option>
                      <option value="1000">
                        1 km
                      </option>
                      <option value="100">
                        100 m
                      </option>
                    </select>
                  </div>

                  <!-- Zone boundaries -->
                  <div class="setting-row">
                    <span class="setting-label">Zonengrenzen (GZD)</span>
                    <label class="toggle-switch">
                      <input
                        v-model="showGzd"
                        type="checkbox"
                      >
                      <span class="toggle-track"><span class="toggle-thumb" /></span>
                    </label>
                  </div>

                  <!-- Labels -->
                  <div class="setting-row">
                    <span class="setting-label">Beschriftung</span>
                    <label class="toggle-switch">
                      <input
                        v-model="showLabels"
                        type="checkbox"
                      >
                      <span class="toggle-track"><span class="toggle-thumb" /></span>
                    </label>
                  </div>

                  <!-- Opacity -->
                  <div class="setting-row">
                    <span class="setting-label">Deckkraft</span>
                    <div class="setting-right">
                      <input
                        v-model.number="gridOpacity"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        class="setting-slider"
                      >
                      <span class="setting-value">{{ Math.round(gridOpacity * 100) }}%</span>
                    </div>
                  </div>

                  <!-- Color -->
                  <div class="setting-row">
                    <span class="setting-label">Farbe</span>
                    <input
                      v-model="gridColor"
                      type="color"
                      class="setting-color"
                    >
                  </div>
                </template>
              </div>

              <!-- ── Layers panel ───────────────────────────────── -->
              <div
                v-show="activePanel === 'layers'"
                class="sidebar-panel"
              >
                <h3 class="panel-title">
                  Layers
                </h3>
                <p class="info-text">
                  Layer settings area.
                </p>
              </div>

              <!-- ── Objects panel ──────────────────────────────── -->
              <div
                v-show="activePanel === 'objects'"
                class="sidebar-panel"
              >
                <h3 class="panel-title">
                  Objects
                </h3>
                <p class="info-text">
                  Object list area.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div class="coordinates-display">
          <template v-if="gridEnabled && gridType === 'mgrs' && hoveredMgrs">
            {{ hoveredMgrs }}
          </template>
          <template v-else>
            {{ hoveredCoordinates }}
          </template>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.spark-map-page {
  --bg-darkest: #07090d;
  --bg-dark: #111722;
  --bg-panel: rgba(17, 22, 33, 0.92);
  --bg-input: #171f2d;
  --bg-hover: #212c3f;
  --border: rgba(255, 255, 255, 0.1);
  --text: #f1f4ff;
  --text-dim: #9aa7bf;
  --text-muted: #74839f;
  --accent: #e0483c;
  --accent-hover: #f25a4f;
  --radius: 10px;
  --radius-sm: 8px;

  height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
  color: var(--text);
  /* Space Grotesk by Florian Karsten — https://github.com/floriankarsten/space-grotesk */
  font-family: "Space Grotesk", system-ui, sans-serif;
  background:
    radial-gradient(900px 500px at 100% 0%, rgba(224, 72, 60, 0.1), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(58, 93, 157, 0.16), transparent 62%),
    var(--bg-darkest);
}

.app-header {
  height: 52px;
  background: rgba(14, 19, 28, 0.82);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.01em;
}

.header-btn {
  padding: 6px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 11px;
  cursor: pointer;
  transition: 140ms ease;
}

.header-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
}

.toolbar {
  width: 56px;
  background: rgba(14, 19, 28, 0.88);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: 140ms ease;
}

.tool-btn span {
  display: contents;
}

.tool-btn svg {
  width: 18px;
  height: 18px;
}

.tool-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.tool-btn.active {
  background: var(--accent);
  color: #fff;
}

.map-shell {
  flex: 1;
  position: relative;
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: rgba(14, 19, 28, 0.9);
  border-left: 1px solid var(--border);
  z-index: 50;
  display: flex;
  transition: transform 0.2s ease;
}

.sidebar.collapsed {
  transform: translateX(236px);
}

.sidebar-toggle {
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 44px;
  border: 1px solid var(--border);
  border-right: none;
  border-radius: 6px 0 0 6px;
  background: var(--bg-dark);
  color: var(--text-dim);
  cursor: pointer;
}

.sidebar-toggle:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-tabs {
  display: flex;
  gap: 4px;
  padding: 10px;
  border-bottom: 1px solid var(--border);
}

.sidebar-tab {
  flex: 1;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
}

.sidebar-tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.sidebar-tab.active {
  background: var(--accent);
  color: #fff;
}

.sidebar-panels {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
}

select {
  width: 100%;
  padding: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
}

.info-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.coordinates-display {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: var(--bg-panel);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

/* ── Grid settings ───────────────────────────────────────────────────────── */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.setting-label {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
}

.setting-select {
  width: auto;
  flex: 1;
  max-width: 130px;
  padding: 5px 8px;
  font-size: 11px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.setting-slider {
  width: 80px;
  accent-color: var(--accent);
  cursor: pointer;
}

.setting-value {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 30px;
  text-align: right;
}

.setting-color {
  width: 36px;
  height: 26px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  padding: 0;
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-switch input {
  display: none;
}

.toggle-track {
  position: absolute;
  inset: 0;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 20px;
  transition: background 0.18s, border-color 0.18s;
}

.toggle-thumb {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  top: 3px;
  left: 3px;
  transition: transform 0.18s, background 0.18s;
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-track .toggle-thumb {
  transform: translateX(16px);
  background: #fff;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 980px) {
  .spark-map-page {
    height: calc(100vh - 48px);
  }

  .sidebar {
    width: min(320px, 84vw);
  }

  .sidebar.collapsed {
    transform: translateX(calc(min(320px, 84vw) - 44px));
  }
}

:deep(.maplibregl-marker) {
  cursor: pointer;
}

:deep(.maplibregl-popup-content) {
  background: var(--bg-dark);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

:deep(.maplibregl-popup-tip) {
  border-top-color: var(--bg-dark) !important;
}

:deep(.maplibregl-popup-close-button) {
  color: var(--text);
}
</style>
