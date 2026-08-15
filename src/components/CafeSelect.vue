<script setup>
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Selecionar' }
})

const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const open = ref(false)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

function selectOption(value) {
  emit('update:modelValue', value)
  open.value = false
}

function handleDocumentClick(event) {
  if (!root.value?.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))
</script>

<template>
  <div ref="root" class="cafe-select">
    <button
      type="button"
      class="cafe-select__trigger comic-border"
      :class="{ 'cafe-select__trigger--open': open }"
      @click="open = !open"
    >
      <span>{{ selectedOption?.label || props.placeholder }}</span>
      <Icon icon="pixelarticons:chevron-down" class="cafe-select__chevron" :class="{ 'rotate-180': open }" />
    </button>

    <div v-if="open" class="cafe-select__menu comic-border">
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        class="cafe-select__option"
        :class="{ 'cafe-select__option--active': option.value === props.modelValue }"
        @click="selectOption(option.value)"
      >
        <span>{{ option.label }}</span>
        <Icon v-if="option.value === props.modelValue" icon="pixelarticons:check" />
      </button>
    </div>
  </div>
</template>
