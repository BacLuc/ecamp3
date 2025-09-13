<template>
  <hr :aria-label="label" />
</template>

<script>
export default {
  name: 'HorizontalRule',
  props: {
    label: { type: String, required: true },
  },
}
</script>

<style lang="scss" scoped>
@use '@/scss/variables' as *;
@import './node_modules/vuetify/src/styles/styles.sass';

hr {
  border: none;
  border-top: 1px solid map-get($blue-grey, 'lighten-3');
  color: map-get($blue-grey, 'base');
  overflow: visible;
  text-align: center;
  margin: 30px 0;
  height: 1px;
  &::after {
    content: attr(aria-label);
    background: #fff;
    padding: 0 4px;
    position: relative;
    top: -0.75em;
  }
}
</style>
