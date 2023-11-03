<template>
  <div class="scene-folder">
    <div class="scene-title" @click="toggleFolder">
      <font-awesome-icon class="folder-icon" :icon="folder.isOpen ? 'folder-open' : 'folder'" />
      {{ folder.title }}
    </div>
    <div v-if="folder.isOpen">
      <div v-for="video in folder.videoList" :key="video.id" class="video-tile" @click.stop="onVideoChange(video.src)">
        <font-awesome-icon class="tree-branch" icon="video" />
        {{ video.title }}
      </div>
      <folder-item
        v-for="subFolder in folder.subFolders"
        :key="subFolder.id"
        :folder="subFolder"
        @video-selected="onVideoChange"
        @toggle-folder="onToggleFolder"
      />
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  name: 'FolderItem',
  components: {
    FontAwesomeIcon,
  },
  props: {
    folder: Object,
  },
  methods: {
    toggleFolder() {
      this.$emit('toggle-folder', this.folder.id);

      if (this.isLeafFolder() && !this.folder.isOpen) {
        // If this is a leaf folder and it is being opened, emit the first two videos
        this.$emit('two-videos-selected', this.folder.videoList[0].src, this.folder.videoList[1].src);
      }
    },
    onVideoChange(src) {
      this.$emit('video-selected', src);
    },
    onToggleFolder(folderId) {
      this.$emit('toggle-folder', folderId);
    },
    isLeafFolder() {
      // A leaf folder is a folder with no subfolders and more than one video
      return this.folder.videoList.length > 1 && this.folder.subFolders.length === 0;
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
