<template>
  <div>
    <div class="scene-title" @click="toggleItem">
      <font-awesome-icon class="folder-icon" :icon="item.src ? 'video' : (item.isOpen ? 'folder-open' : 'folder')" />{{ item.title }}
    </div>
    <div v-if="item.isOpen">
      <navbar-item v-for="child in item.children" :key="child.id" :item="child" @video-selected="$emit('video-selected', $event)"/>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  components: {
    FontAwesomeIcon,
  },
  props: {
    item: Object,
  },
  methods: {
    toggleItem() {
      if (this.item.src) {
        this.$emit('video-selected', this.item.src);
      } else {
        this.item.isOpen = !this.item.isOpen;
        this.$forceUpdate();  // force Vue to re-render the component
      }
    },
  },
};
</script>

<style scoped>
.navbar {
  grid-column: 1;
  height: 100vh;
  width: auto;
  padding: 10px;
  background-color: var(--vt-c-black);
  color: var(--vt-c-text-dark-1);
  border-right: 1px solid var(--vt-c-divider-dark-1);
  overflow-y: auto;
}

h3 {
  margin-bottom: 10px;
}

.scene-list {
  width: 100%;
}


.scene-folder {
  display: flex;
  flex-direction: column;
  width: auto;
  padding: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  background-color: var(--vt-c-black-soft);
  border-radius: 6px;
}

.scene-folder:hover {
  background-color: var(--vt-c-black-mute);
  color: var(--vt-c-text-dark-1);
}

.scene-title {
  display: flex;
  align-items: center;
}

.folder-icon {
  margin-right: 5px;
}

.video-tile {
  display: flex;
  align-items: center;
  width: auto;
  color: var(--vt-c-text-dark-1);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 20px;
  margin-bottom: 5px;
}

.video-tile:hover {
  background-color: var(--vt-c-indigo);
  color: var(--vt-c-text-dark-1);
}

.tree-branch {
  margin-right: 5px;
}
</style>
