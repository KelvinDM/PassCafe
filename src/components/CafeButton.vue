<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  icon: { type: String, default: '' },
  variant: { type: String, default: 'caramel' },
  size: { type: String, default: 'md' },
  block: { type: Boolean, default: false },
  type: { type: String, default: 'button' }
})

const variantClasses = {
  caramel: 'bg-caramel hover:bg-amber-600 text-espresso',
  mint: 'bg-mint hover:bg-emerald-600 text-foam',
  mocha: 'bg-mocha hover:bg-espresso text-foam',
  roast: 'bg-roast hover:bg-espresso text-latte',
  chili: 'bg-chili hover:bg-red-600 text-foam',
  foam: 'bg-foam hover:bg-latte text-espresso'
}

const sizeClasses = {
  sm: 'text-xs px-3 py-2 rounded-lg',
  md: 'text-xs px-4 py-2.5 rounded-xl',
  lg: 'text-base sm:text-lg px-6 py-4 rounded-2xl'
}
</script>

<template>
  <button
    :type="props.type"
    class="cafe-button comic-border font-black inline-flex items-center justify-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed"
    :class="[variantClasses[props.variant] || variantClasses.caramel, sizeClasses[props.size] || sizeClasses.md, props.block ? 'w-full' : '']"
  >
    <Icon v-if="props.icon" :icon="props.icon" class="cafe-button__icon" />
    <slot />
  </button>
</template>
