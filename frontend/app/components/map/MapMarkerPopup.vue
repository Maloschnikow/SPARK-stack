<script setup lang="ts">
import { Urgency } from '../types/Urgency';

const emit = defineEmits(['delete']);

const handleDelete = () => {
  emit('delete');
};
</script>

<template>
  <div>
    <DefaultButton
      :urgency="Urgency.Danger"
      class="delete-btn"
      @click="handleDelete"
    >
      Delete
    </DefaultButton>
  </div>
</template>
