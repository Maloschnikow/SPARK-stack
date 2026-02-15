<script setup lang="ts">
interface Props {
  external?: boolean;
  to?: string;
}

const props = withDefaults(defineProps<Props>(), {
  external: false,
  to: '#',
});
</script>

<template>
  <NuxtLink
    v-if="props.external"
    :to="props.to"
    target="_blank"
    rel="noopener noreferrer"
  >
    <slot />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    ><title>open-in-new</title><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" /></svg>
  </NuxtLink>

  <NuxtLink
    v-else
    :to="props.to"
    rel="noopener noreferrer"
  >
    <slot />
  </NuxtLink>
</template>

<style scoped>
svg {
    width: 1em;
    height: 1em;
    vertical-align: -0.125em;
    fill: currentColor;
}
</style>
