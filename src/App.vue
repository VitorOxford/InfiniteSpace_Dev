<script setup>
import { RouterView } from 'vue-router'
import SubscriptionModal from '@/components/modals/SubscriptionModal.vue'
import ImageAdjustmentsModal from '@/components/modals/ImageAdjustmentsModal.vue'
import LoadingScreen from '@/components/common/LoadingScreen.vue'
</script>

<template>
  <RouterView />
  <SubscriptionModal />
  <ImageAdjustmentsModal />
  <LoadingScreen />
</template>

<style>
/* Estilos globais */
</style>
