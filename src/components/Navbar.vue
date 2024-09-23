<template>
  <div class="navbar">
    <div class="search-bar">
      <input type="text" v-model="searchQuery" placeholder="Search videos..." />
    </div>
    <div class="scene-list">
      <folder-item v-for="folder in filteredSceneList" :key="folder.id" :folder="folder" @can-populate-videos="populateVideos" @video-selected="onVideoChange"
        @toggle-folder="toggleScene"/>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import FolderItem from './FolderItem.vue';


export default {
  components: {
    FontAwesomeIcon,
    FolderItem,
  },
  data() {
    return {
      sceneList: [],
      searchQuery: "",
    };
  },
  async mounted() {
    await this.populateSceneList();
  },
  computed: {
    filteredSceneList() {
      const filterScenes = (scenes, regex) => {
        return scenes.reduce((acc, scene) => {
          const match = regex.test(scene.title);

          const filteredVideos = scene.videoList.filter(video => regex.test(video.title));
          const filteredFolders = filterScenes(scene.subFolders, regex);

          if (match || filteredVideos.length > 0 || filteredFolders.length > 0) {
            const filteredScene = { ...scene };
            if (!match) {
              filteredScene.videoList = filteredVideos;
              filteredScene.subFolders = filteredFolders;
            }
            acc.push(filteredScene);
          }
          return acc;
        }, []);
      };

      if (!this.searchQuery) {
        return this.sceneList;
      }

      let regex;
      try {
        // Directly use the user's input as a regex
        regex = new RegExp(this.searchQuery, 'i');
      } catch (e) {
        // If the regex is invalid, return the full scene list
        return this.sceneList;
      }

      return filterScenes(this.sceneList, regex);
    }
  },

  methods: {
    async populateSceneList() {
      try {
        const response = await fetch('/api/videos/list');
        if (!response.ok) throw new Error('Network response was not ok');
        const scenesData = await response.json();
        this.sceneList = this.transformScenesData(scenesData);
      } catch (error) {
        console.error('Error fetching video list:', error);
      }
    },


    transformScenesData(scenesData) {
      const transformVideos = (videos, path) => {
        return videos.flatMap(video => {
          const videoPath = `${path}/${video.title}`;
          if (video.videos) {
            // If the video has nested videos, treat it as a folder and recursively transform
            return transformFolder(video, videoPath);
          }
          let video_src = import.meta.env.VITE_CLOUDFRONT_URI ? video.cloudfront : `/api/${video.path}`;
          // If the video is a leaf node, transform it into the required format
          return {
            id: video.filename,
            title: video.title,
            src: video_src
          };
        });
      };

      const transformFolder = (folder, path) => {
        const folderPath = `${path}/${folder.title}`;
        const transformedFolder = {
          id: folderPath,
          title: folder.title,
          isOpen: false,
          videoList: [],
          subFolders: []
        };

        if (folder.videos) {
          const videosAndFolders = transformVideos(folder.videos, folderPath);
          // Separate videos and folders based on whether an item has a src property
          transformedFolder.videoList = videosAndFolders.filter(item => item.src);
          transformedFolder.subFolders = videosAndFolders.filter(item => !item.src);
        }

        return transformedFolder;
      };

      return scenesData.map(scene => transformFolder(scene, ''));
    },




    toggleScene(sceneId) {
      const toggleFolder = (folders) => {
        return folders.map(folder => {
          if (folder.id === sceneId) {
            return { ...folder, isOpen: !folder.isOpen };
          } else if (folder.subFolders && folder.subFolders.length > 0) {
            const updatedSubFolders = toggleFolder(folder.subFolders);
            return { ...folder, subFolders: updatedSubFolders };
          }
          return folder;
        });
      };
      this.sceneList = toggleFolder(this.sceneList);
    },

    onVideoChange(videoSrc) {
      const video = {
        src: videoSrc,
        title: this.extractTitleFromSrc(videoSrc)
      };
      this.$emit('video-selected', video);
    },

    extractTitleFromSrc(src) {
      // Split the path by '/', take the last element to get the file name
      const fileName = src.split('/').pop();
      // Use a regular expression to remove the last dot and the file extension that follows it
      const title = fileName.replace(/\.[^/.]+$/, "");
      return title;
    },

    populateVideos(left, right) {
      const leftVideo = {
        src: left,
        title: this.extractTitleFromSrc(left)
      };

      const rightVideo = {
        src: right,
        title: this.extractTitleFromSrc(right)
      };
      this.$emit('populate-videos', leftVideo, rightVideo);
    }

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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  /* Add box-shadow to the transition */
}

.scene-folder:hover {
  background-color: var(--vt-c-black-mute);
  color: var(--vt-c-text-dark-1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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

.search-bar {
  margin-bottom: 20px;
}

.search-bar input[type="text"] {
  width: 100%;
  padding: 10px;
  margin: 0;
  background-color: var(--vt-c-black-soft);
  border: 1px solid var(--vt-c-divider-dark-1);
  border-radius: 6px;
  color: var(--vt-c-text-dark-1);
  font-size: 1rem;
}

.search-bar input[type="text"]::placeholder {
  color: var(--vt-c-text-dark-1);
  opacity: 0.7;
}

.search-bar input[type="text"]:focus {
  outline: none;
  border-color: var(--vt-c-indigo);
  box-shadow: 0 0 0 2px rgba(102, 123, 232, 0.3);
}
</style>
