<template>
  <div v-if="show" class="dialog-overlay">
    <div class="dialog-content">
      <h2>Select Video Directory</h2>
      <p>Please select the directory containing your videos:</p>
      <button @click="selectDirectory">Select Directory</button>
    </div>
  </div>
</template>

<script>
import { open } from '@tauri-apps/api/dialog';

export default {
  props: {
    show: Boolean
  },
  methods: {
    async selectDirectory() {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Base Directory for Videos',
      });
      if (selected) {
        this.$emit('directory-selected', selected);
      }
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: var(--vt-c-black-soft);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: var(--vt-c-indigo);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: var(--vt-c-indigo-dark);
}
</style>
