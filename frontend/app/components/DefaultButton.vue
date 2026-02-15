<script setup lang="ts">
enum Urgency {
  Okay = 'okay',
  Normal = 'normal',
  Warning = 'warning',
  Danger = 'danger',
}

interface Props {
  urgency?: Urgency;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  urgency: Urgency.Normal,
  disabled: false,
});
</script>

<template>
  <button
    v-if="!disabled"
    :class="props.urgency"
  >
    <slot />
  </button>
  <button
    v-else
    disabled="true"
    :class="props.urgency"
  >
    <slot />
  </button>
</template>

<style scoped>
button {
    color: var(--main-fg-color);
    background-color: var(--main-bg-color);
    border-color: var(--main-fg-color);

    border-style: solid;
    border-radius: 0.2rem;

    cursor: pointer;
}
button:hover {
    color: var(--main-bg-color);
    background-color: var(--main-fg-color);
    border-color: var(--main-bg-color);
}

.okay {
    color: var(--color-green2);
    border-color: var(--color-green2);
}
.okay:hover {
    color: var(--main-bg-color);
    background-color: var(--color-green2);
}

/* .normal {

} */

.warning {
    color: var(--color-yellow2);
    border-color: var(--color-yellow2);
}
.warning:hover {
    color: var(--main-bg-color);
    background-color: var(--color-yellow2);
}

.danger {
    color: var(--color-red3);
    border-color: var(--color-red3);
}
.danger:hover {
    color: var(--main-bg-color);
    background-color: var(--color-red3);
}
</style>
