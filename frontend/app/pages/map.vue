<script setup lang="ts">
import { ref, onMounted, type Ref, onUnmounted, h, render } from 'vue';
import { type MapMouseEvent, Popup, Map, Marker, LngLat } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Urgency } from '~/components/types/Urgency';
import MapMarkerPopup from '~/components/map/MapMarkerPopup.vue';

interface MapStyle {
  name: string;
  url: string;
}

const availableMapStyles: MapStyle[] = [
  // World
  { name: 'World Color', url: 'https://sgx.geodatenzentrum.de/gdz_basemapworld_vektor/styles/bm_web_wld_col.json' },
  // Germany Only (https://basemap.de/produkte-und-dienste/web-vektor/)
  { name: 'Germany Color, no terrain', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json' }, // Farbe ohne Gelände
  { name: 'Germany Color, with terrain', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json' }, // Farbe mit Gelände
  { name: 'Germany Grayscale', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_gry.json' }, // Grau
];

const selectedMapSytle: Ref<MapStyle | undefined> = ref(availableMapStyles[0]);
const mapContainer: Ref<HTMLElement | null> = ref(null);
const map: Ref<Map | null> = ref(null);

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
    style: selectedMapSytle.value?.url,
    center: [10.4, 51.3], // [lng, lat] not lat, lng!
    zoom: 6,
  });

  map.value.on('click', (e: MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    createMarker(lng, lat);
  });

  map.value.on('mousemove', () => {
    map.value!.getCanvas().style.cursor = 'default';
  });
});

onUnmounted(() => {
  map.value?.remove();
});

watch(selectedMapSytle,
  (newMapStyle) => {
    if (!newMapStyle) return;
    map.value?.setStyle(newMapStyle.url);
  },
);
</script>

<template>
  <div class="gridContainer">
    <div class="mapStyleSelectorWrapper">
      Available Map Styles:

      <div
        v-for="style in availableMapStyles"
        :key="style.name"
        style="display: inline; width:max-content;"
      >
        <DefaultButton
          v-if="style.url != selectedMapSytle?.url"
          class="mapStyleButton"
          @click="selectedMapSytle = style"
        >
          {{ style.name }}
        </DefaultButton>
        <DefaultButton
          v-else
          class="mapStyleButton"
          :urgency="Urgency.Okay"
          :disabled="true"
        >
          {{ style.name }}
        </DefaultButton>
      </div>
    </div>
    <div
      ref="mapContainer"
      class="map-container"
    />
    <div>Space for more options and settings</div>
  </div>
</template>

<style scoped>
.gridContainer {
    height: 90vh;
    border-width: 0.15rem;
    border-radius: 0.5rem;
    border-color: var(--color-blue1);
    border-style: solid;
    margin-left: auto;

    display: grid;
    grid-template-rows: min-content auto;
    grid-template-columns: 20% auto;
}

.mapStyleSelectorWrapper {
    grid-column: 2;
    justify-self: center;
    align-self: center;
}

.mapStyleButton {
    margin: 0.5rem;
}

.map-container {
    grid-row: 2;
    grid-column: 2;

    border: 0.3rem solid var(--color-green1);
    border-radius: 0.5rem;
}
</style>

<style>
.maplibregl-marker {
    cursor: pointer;
}

.maplibregl-popup-content {
    background-color: var(--main-bg-color);
}

.maplibregl-popup-tip {
    border-top-color: var(--main-bg-color) !important;
}

.maplibregl-popup-close-button {
    color: var(--main-fg-color)
}
</style>
