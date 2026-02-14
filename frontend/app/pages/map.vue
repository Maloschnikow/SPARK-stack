<script setup lang="ts">
import { ref, onMounted, type Ref, onUnmounted, h, render } from 'vue';
import { Popup, Map, Marker, LngLat, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapMarkerPopup from '~/components/map/MapMarkerPopup.vue';

type RightTabId = 'map' | 'grid' | 'layers' | 'objects';
type ToolId =
    | 'select'
    | 'point'
    | 'paint'
    | 'erase'
    | 'circle'
    | 'line'
    | 'polygon'
    | 'cone'
    | 'route'
    | 'symbol';

interface TabItem {
    id: RightTabId;
    title: string;
    icon: string;
}

interface ToolItem {
    id: ToolId;
    title: string;
    icon: string;
}

const tabItems: TabItem[] = [
    {
        id: 'map',
        title: 'Karte',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 3L2 6v15l7-3 6 3 7-3V3l-7 3-6-3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
        id: 'grid',
        title: 'Raster',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
        id: 'layers',
        title: 'Layer',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
        id: 'objects',
        title: 'Objekte',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="5" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
];

const toolItems: ToolItem[] = [
    {
        id: 'select',
        title: 'Auswahl',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor"/></svg>',
    },
    {
        id: 'point',
        title: 'Punkt',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
    },
    {
        id: 'paint',
        title: 'Einfaerben',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4H9v11c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-9h8V4h-3z" fill="currentColor"/></svg>',
    },
    {
        id: 'erase',
        title: 'Loeschen',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>',
    },
    {
        id: 'circle',
        title: 'Kreis',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
        id: 'line',
        title: 'Linie',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    },
    {
        id: 'polygon',
        title: 'Polygon',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><polygon points="12,2 22,9 18,22 6,22 2,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
    {
        id: 'cone',
        title: 'Kegel',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4 L4 20 L20 20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
    {
        id: 'route',
        title: 'Route',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 18 L9 10 L15 14 L20 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="20" cy="6" r="2" fill="currentColor"/></svg>',
    },
    {
        id: 'symbol',
        title: 'Symbol',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
];

const mapContainer: Ref<HTMLElement | null> = ref(null);
const map: Ref<Map | null> = ref(null);

const activeTab = ref<RightTabId>('map');
const activeTool = ref<ToolId>('select');
const isSidebarCollapsed = ref(false);
const selectedMapStyle = ref('basemap-color');
const activeColor = ref('#dc2626');
const coordinatesText = ref('');
const overlayState = ref<Record<string, boolean>>({
    hillshade: false,
    rettungspunkte: false,
    railway: false,
    wanderwege: false,
    radwege: false,
});

const setActiveTab = (tabId: RightTabId) => {
    activeTab.value = tabId;
};

const setActiveTool = (toolId: ToolId) => {
    activeTool.value = toolId;

    if (toolId === 'select') {
        map.value?.getCanvas().style.setProperty('cursor', 'default');
        return;
    }

    if (toolId === 'point') {
        map.value?.getCanvas().style.setProperty('cursor', 'crosshair');
        return;
    }

    map.value?.getCanvas().style.setProperty('cursor', 'default');
};

const onTopAction = (action: 'point' | 'kml' | 'share') => {
    if (action === 'point') {
        setActiveTool('point');
        return;
    }

    console.info(`[placeholder] ${action} noch nicht implementiert.`);
};

const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const toggleOverlay = (key: keyof typeof overlayState.value) => {
    overlayState.value[key] = !overlayState.value[key];
};

const createMarker = (lng: number, lat: number) => {
    if (!map.value) return;

    const popupContent = document.createElement('div');
    const popup = new Popup({ closeOnClick: false })
        .setDOMContent(popupContent)
        .setLngLat(LngLat.convert([lng, lat]));

    const marker = new Marker({ color: activeColor.value })
        .setLngLat(LngLat.convert([lng, lat]))
        .setPopup(popup);

    const component = h(MapMarkerPopup, {
        onDelete: () => {
            marker.remove();
        },
    });

    render(component, popupContent);

    marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation();
        popup.addTo(map.value!);
    });

    marker.addTo(map.value);
};

onMounted(() => {
    map.value = new Map({
        container: mapContainer.value!,
        style: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json',
        center: [10.4, 51.3],
        zoom: 6,
    });

    map.value.on('click', (e: MapMouseEvent) => {
        if (activeTool.value !== 'point') return;

        const { lng, lat } = e.lngLat;
        createMarker(lng, lat);
    });

    map.value.on('mousemove', (e: MapMouseEvent) => {
        coordinatesText.value = `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
    });
});

onUnmounted(() => {
    map.value?.remove();
});
</script>

<template>
    <section id="spark-map-page">
        <header id="app-header">
            <div class="header-left">
                <button class="back-link" type="button" aria-label="Zurueck">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
                <h1 id="mission-title">Mission</h1>
            </div>

            <div class="header-center">
                <div class="timeline-controls">
                    <button class="timeline-btn" title="Rueckgaengig" type="button" disabled>
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor" /></svg>
                    </button>
                    <div class="timeline-slider-container">
                        <input class="timeline-slider" type="range" min="0" max="100" value="100" />
                        <span class="timeline-info">1/1</span>
                    </div>
                    <button class="timeline-btn" title="Wiederholen" type="button" disabled>
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" fill="currentColor" /></svg>
                    </button>
                </div>
            </div>

            <div class="header-right">
                <button class="header-btn" type="button" @click="onTopAction('point')">+ Punkt</button>
                <button class="header-btn" type="button" @click="onTopAction('kml')">KML Import</button>
                <button class="header-btn" type="button" @click="onTopAction('share')">Teilen</button>
                <span class="save-status" />
            </div>
        </header>

        <div id="main-area">
            <aside id="toolbar">
                <div class="toolbar-section">
                    <button
                        v-for="tool in toolItems"
                        :key="tool.id"
                        class="tool-btn"
                        :class="{ active: activeTool === tool.id }"
                        type="button"
                        :title="tool.title"
                        :aria-label="tool.title"
                        @click="setActiveTool(tool.id)"
                    >
                        <span v-html="tool.icon" />
                    </button>
                    <div class="toolbar-divider" />
                    <input id="active-color" v-model="activeColor" class="color-input" type="color" title="Farbe" />
                </div>
            </aside>

            <main id="map-container">
                <div ref="mapContainer" id="map" />

                <aside id="sidebar" class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
                    <button id="sidebar-toggle" class="sidebar-toggle" title="Sidebar ein-/ausklappen" type="button" @click="toggleSidebar">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>

                    <div class="sidebar-content">
                        <nav class="sidebar-tabs">
                            <button
                                v-for="tab in tabItems"
                                :key="tab.id"
                                class="sidebar-tab"
                                :class="{ active: activeTab === tab.id }"
                                :title="tab.title"
                                type="button"
                                @click="setActiveTab(tab.id)"
                            >
                                <span v-html="tab.icon" />
                            </button>
                        </nav>

                        <div class="sidebar-panels">
                            <div v-if="activeTab === 'map'" class="sidebar-panel active">
                                <h3 class="panel-title">Karte</h3>
                                <select id="map-type" v-model="selectedMapStyle">
                                    <option value="basemap-color">basemap.de Farbe</option>
                                </select>
                                <h4 class="panel-subtitle">Overlays</h4>
                                <div class="overlay-toggles">
                                    <label>
                                        <input :checked="overlayState.hillshade" type="checkbox" @change="toggleOverlay('hillshade')" />
                                        Relief
                                    </label>
                                    <label>
                                        <input :checked="overlayState.rettungspunkte" type="checkbox" @change="toggleOverlay('rettungspunkte')" />
                                        Rettungspunkte
                                    </label>
                                    <label>
                                        <input :checked="overlayState.railway" type="checkbox" @change="toggleOverlay('railway')" />
                                        Bahnen
                                    </label>
                                    <label>
                                        <input :checked="overlayState.wanderwege" type="checkbox" @change="toggleOverlay('wanderwege')" />
                                        Wandern
                                    </label>
                                    <label>
                                        <input :checked="overlayState.radwege" type="checkbox" @change="toggleOverlay('radwege')" />
                                        Radwege
                                    </label>
                                </div>
                            </div>

                            <div v-else-if="activeTab === 'grid'" class="sidebar-panel active">
                                <h3 class="panel-title">Raster</h3>
                                <div class="panel-buttons">
                                    <button class="btn-sm btn-primary" type="button">Erstellen</button>
                                    <button class="btn-sm" type="button">Entfernen</button>
                                </div>
                                <div class="info-text">Platzhalter. Funktion folgt.</div>
                            </div>

                            <div v-else-if="activeTab === 'layers'" class="sidebar-panel active">
                                <h3 class="panel-title">Layer</h3>
                                <div class="info-text">Platzhalter. Funktion folgt.</div>
                                <button class="btn-sm btn-full" type="button">+ Layer</button>
                            </div>

                            <div v-else class="sidebar-panel active">
                                <h3 class="panel-title">Objekte</h3>
                                <div class="objects-section">
                                    <div class="section-header">
                                        <span>Punkte <span class="badge">0</span></span>
                                        <button class="section-toggle" type="button">-</button>
                                    </div>
                                </div>
                                <div class="objects-section">
                                    <div class="section-header">
                                        <span>Zeichnungen <span class="badge">0</span></span>
                                        <button class="section-toggle" type="button">-</button>
                                    </div>
                                </div>
                                <div class="objects-section">
                                    <div class="section-header">
                                        <span>Symbole <span class="badge">0</span></span>
                                        <button class="section-toggle" type="button">-</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <div id="coordinates-display">{{ coordinatesText }}</div>
            </main>
        </div>
    </section>
</template>

<style scoped>
#spark-map-page {
    --bg-darkest: #07090d;
    --bg-dark: #111722;
    --bg-panel: rgba(17, 22, 33, 0.92);
    --bg-input: #171f2d;
    --bg-hover: #212c3f;
    --border: rgba(255, 255, 255, 0.1);
    --border-light: rgba(255, 255, 255, 0.16);
    --text: #f1f4ff;
    --text-dim: #9aa7bf;
    --text-muted: #74839f;
    --accent: #e0483c;
    --accent-hover: #f25a4f;
    --accent-glow: rgba(224, 72, 60, 0.35);
    --radius: 10px;
    --radius-sm: 8px;
    --shadow: 0 16px 38px rgba(0, 0, 0, 0.36);
    --transition: 140ms cubic-bezier(0.2, 0.8, 0.2, 1);

    min-height: calc(100vh - 4.5rem);
    display: flex;
    flex-direction: column;
    background:
        radial-gradient(900px 500px at 100% 0%, rgba(224, 72, 60, 0.1), transparent 60%),
        radial-gradient(700px 400px at 0% 100%, rgba(58, 93, 157, 0.16), transparent 62%),
        var(--bg-darkest);
    color: var(--text);
}

* {
    box-sizing: border-box;
}

#app-header {
    height: 52px;
    background: rgba(14, 19, 28, 0.82);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    z-index: 100;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    transition: all var(--transition);
    cursor: pointer;
}

.back-link:hover {
    background: var(--bg-hover);
    color: var(--text);
}

#mission-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
}

.header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    max-width: 400px;
    margin: 0 20px;
}

.timeline-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.timeline-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: var(--bg-input);
    color: var(--text-dim);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
}

.timeline-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text);
}

.timeline-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.timeline-slider-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
}

.timeline-slider {
    flex: 1;
    height: 4px;
    appearance: none;
    background: var(--bg-hover);
    border-radius: 2px;
    margin: 0;
}

.timeline-slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 0 6px var(--accent-glow);
}

.timeline-info {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 40px;
    text-align: right;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-btn {
    padding: 6px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
}

.header-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    transform: translateY(-1px);
}

.save-status {
    font-size: 11px;
    color: var(--text-dim);
}

#main-area {
    display: flex;
    flex: 1;
    min-height: 0;
}

#toolbar {
    width: 56px;
    background: rgba(14, 19, 28, 0.88);
    backdrop-filter: blur(10px);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    z-index: 100;
}

.toolbar-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
}

.tool-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
}

.tool-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.tool-btn.active {
    background: var(--accent);
    color: #ffffff;
    box-shadow: 0 0 0 2px rgba(224, 72, 60, 0.26), 0 8px 20px rgba(224, 72, 60, 0.35);
}

.toolbar-divider {
    width: 24px;
    height: 1px;
    background: var(--border);
    margin: 8px 0;
}

.color-input {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
    background: none;
}

#map-container {
    flex: 1;
    position: relative;
    min-width: 0;
}

#map {
    width: 100%;
    height: 100%;
    background: var(--bg-darkest);
}

.sidebar {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: 276px;
    background: rgba(14, 19, 28, 0.9);
    backdrop-filter: blur(10px);
    border-left: 1px solid var(--border);
    z-index: 500;
    display: flex;
    transition: transform 0.2s ease, width 0.2s ease;
}

.sidebar.collapsed {
    transform: translateX(232px);
}

.sidebar.collapsed .sidebar-content {
    opacity: 0;
    pointer-events: none;
}

.sidebar-toggle {
    position: absolute;
    left: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: 6px 0 0 6px;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sidebar-toggle:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.sidebar.collapsed .sidebar-toggle svg {
    transform: rotate(180deg);
}

.sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: opacity 0.15s ease;
}

.sidebar-tabs {
    display: flex;
    gap: 4px;
    padding: 10px;
    background: rgba(7, 10, 15, 0.82);
    border-bottom: 1px solid var(--border);
}

.sidebar-tab {
    flex: 1;
    padding: 8px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
}

.sidebar-tab:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.sidebar-tab.active {
    background: var(--accent);
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.sidebar-panels {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
}

.sidebar-panel {
    display: none;
}

.sidebar-panel.active {
    display: block;
}

.panel-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    margin: 0 0 10px 0;
}

.panel-subtitle {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin: 12px 0 6px 0;
}

.overlay-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
}

.overlay-toggles label {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    font-size: 10px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
}

.overlay-toggles label:hover {
    background: var(--bg-hover);
}

.overlay-toggles label:has(input:checked) {
    background: var(--accent);
    color: #ffffff;
}

.overlay-toggles input {
    display: none;
}

select {
    width: 100%;
    padding: 6px 8px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 12px;
    outline: none;
}

select:focus {
    border-color: var(--accent);
}

.panel-buttons {
    display: flex;
    gap: 6px;
}

.btn-sm {
    padding: 7px 11px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
}

.btn-sm:hover {
    background: var(--bg-hover);
    border-color: var(--border-light);
}

.btn-sm.btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #ffffff;
}

.btn-sm.btn-primary:hover {
    background: var(--accent-hover);
}

.btn-sm.btn-full {
    width: 100%;
    margin-top: 8px;
}

.info-text {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
}

.objects-section {
    margin-bottom: 10px;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    overflow: hidden;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    user-select: none;
}

.section-header span {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
}

.section-toggle {
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    border-radius: 3px;
    line-height: 1;
}

.badge {
    background: var(--accent);
    color: #ffffff;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 600;
    margin-left: 4px;
}

#coordinates-display {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: var(--bg-panel);
    color: var(--text-dim);
    font-size: 11px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    backdrop-filter: blur(8px);
}

:deep(.maplibregl-popup-content) {
    background: var(--bg-dark) !important;
    color: var(--text) !important;
    border-radius: var(--radius) !important;
    box-shadow: var(--shadow) !important;
    border: 1px solid var(--border) !important;
}

:deep(.maplibregl-popup-tip) {
    border-top-color: var(--bg-dark) !important;
}

:deep(.maplibregl-popup-close-button) {
    color: var(--text);
}

:deep(.maplibregl-ctrl-top-right),
:deep(.maplibregl-ctrl-top-left),
:deep(.maplibregl-ctrl-bottom-right),
:deep(.maplibregl-ctrl-bottom-left) {
    display: none;
}

@media (max-width: 980px) {
    #app-header {
        height: 48px;
        padding: 0 10px;
    }

    .header-center {
        display: none;
    }

    .header-right {
        gap: 6px;
    }

    .header-btn {
        padding: 6px 8px;
        font-size: 10px;
    }

    #toolbar {
        width: 50px;
    }

    .tool-btn {
        width: 36px;
        height: 36px;
    }

    .sidebar {
        width: min(320px, 84vw);
    }

    .sidebar.collapsed {
        transform: translateX(calc(min(320px, 84vw) - 44px));
    }
}
</style>
