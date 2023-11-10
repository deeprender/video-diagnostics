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
      <folder-item v-for="subFolder in folder.subFolders" :key="subFolder.id" :folder="subFolder"
        @video-selected="onVideoChange" @toggle-folder="onToggleFolder" @can-populate-videos="onCanPopulateVideos"/>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import _default from '@videojs-player/vue';

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

      let result = this.canPopulateVideos(this.folder);

      if (result && !this.folder.isOpen) {
        this.$emit('can-populate-videos', result[0], result[1]);
        this.openSubFolders(this.folder)
      }
      // If the folder is being closed, recursively close all subfolders
      if (this.folder.isOpen) {
        console.log("here")
        this.closeSubFolders(this.folder);
      }
    },
    closeSubFolders(folder) {
      folder.subFolders.forEach(subfolder => {
        subfolder.isOpen = false; // Close each subfolder
        this.closeSubFolders(subfolder); // Recursively close deeper levels
      });
    },
    openSubFolders(folder) {
      folder.subFolders.forEach(subfolder => {
        subfolder.isOpen = true;
        this.openSubFolders(subfolder);
      })
    },
    onVideoChange(src) {
      this.$emit('video-selected', src);
    },
    onToggleFolder(folderId) {
      this.$emit('toggle-folder', folderId);
    },
    onCanPopulateVideos(left, right){
      this.$emit('can-populate-videos', left,right)
    },
    canPopulateVideos(folder) {
      // Check if there are more than one video in the current folder and no subfolders
      if (folder.videoList.length > 1 && folder.subFolders.length === 0) {
        return [folder.videoList[0].src, folder.videoList[1].src];
      }
      // Check if there is exactly one subfolder and no videos in the current folder
      else if (folder.subFolders.length === 1 && folder.videoList.length === 0) {
        return this.canPopulateVideos(folder.subFolders[0]);
      }
      return null;
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
