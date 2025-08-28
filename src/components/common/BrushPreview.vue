<template>
  <div class="brush-preview" :style="{ width: `${size}px`, height: `${size}px` }">
    <div
      class="brush-shape"
      :style="brushShapeStyle"
    ></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 20,
  },
  hardness: {
    type: Number,
    default: 0.9, // 0 a 1
  },
});

const brushShapeStyle = computed(() => {
  const radius = props.size / 2;
  // A dureza controla o desfoque da borda
  // 1 (dura) = 0px blur; 0 (suave) = tamanho total do pincel blur
  const blur = (1 - props.hardness) * radius;

  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: '50%',
    backgroundColor: 'black',
    filter: `blur(${blur}px)`, // Aplica o desfoque com base na dureza
    opacity: 0.8, // Um pouco de opacidade para simular o efeito do pincel
  };
});
</script>

<style scoped>
.brush-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Garante que o blur não ultrapasse o limite do container */
  /* Remove a borda para não interferir na visualização do blur */
  border-radius: 50%; /* Para garantir que o preview seja sempre redondo */
}
.brush-shape {
  /* Os estilos são definidos via computed property */
  background-color: black;
}
</style>
