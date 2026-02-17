<script setup lang="ts">
import { ref, onMounted, type Ref, onUnmounted, h, render } from 'vue';
import { type MapMouseEvent, Popup, Map, Marker, LngLat } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapMarkerPopup from '~/components/map/MapMarkerPopup.vue';

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

const initialMapStyleUrl = availableMapStyles[0]?.url ?? '';
const selectedMapStyleUrl = ref(initialMapStyleUrl);
const mapContainer: Ref<HTMLElement | null> = ref(null);
const map: Ref<Map | null> = ref(null);
const hoveredCoordinates = ref('');
const activePanel = ref<PanelName>('map');
const isSidebarCollapsed = ref(false);

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
    hoveredCoordinates.value = `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
    map.value!.getCanvas().style.cursor = 'default';
  });
});

watch(selectedMapStyleUrl, (newMapStyleUrl) => {
  map.value?.setStyle(newMapStyleUrl);
});

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
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Point"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="5"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Draw"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <line
              x1="4"
              y1="20"
              x2="20"
              y2="4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          class="tool-btn"
          type="button"
          title="Erase"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              fill="currentColor"
            />
          </svg>
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

              <div
                v-show="activePanel === 'grid'"
                class="sidebar-panel"
              >
                <h3 class="panel-title">
                  Grid
                </h3>
                <p class="info-text">
                  Grid settings area.
                </p>
              </div>

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
          {{ hoveredCoordinates }}
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
  margin: 0 0 10px 0;
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
}

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
