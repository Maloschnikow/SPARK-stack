<script setup lang="ts">
import { Urgency } from '~/components/types/Urgency';
</script>

<template>
  <div>
    <h1>SPARK</h1>
    <DefaultButton :urgency="Urgency.Okay">
      Okay
    </DefaultButton>
    <DefaultButton :urgency="Urgency.Normal">
      Normal
    </DefaultButton>
    <DefaultButton :urgency="Urgency.Warning">
      Warning
    </DefaultButton>
    <DefaultButton :urgency="Urgency.Danger">
      Danger
    </DefaultButton>
  </div>
</template>
