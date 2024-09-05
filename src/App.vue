<template>
  <div id="app">
    <DialogComponent :show="showDialog" @directory-selected="onDirectorySelected" />
    <Navbar @video-selected="changeClippedVideo" @populate-videos="onPopulateVideos" :videoList="videoList"
      :isDirectorySelected="!!baseDirectory"></Navbar>
    <VideoCompare ref="videoCompare" :leftVideo="leftVideo" :rightVideo="rightVideo" @set-active-video="setActiveVideo"
      @swap-videos="swapVideos">
    </VideoCompare>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import VideoCompare from './components/VideoPlayer.vue';
import DialogComponent from './components/DialogComponent.vue';
import { isTauri } from './utils/environment';
import { invoke } from '@tauri-apps/api/tauri';

export default {
  name: 'App',
  components: {
    Navbar,
    VideoCompare,
    DialogComponent
  },
  data() {
    return {
      leftVideo: { src: '', title: '' },
      rightVideo: { src: '', title: '' },
      activeVideo: 'left',
      baseDirectory: '',
      showDialog: isTauri,
      videoList: [],
    }
  },

  methods: {
    changeClippedVideo(video) {
      if (video && video.src && video.title) {
        if (this.activeVideo === 'left') {
          this.leftVideo = video;
        } else {
          this.rightVideo = video;
        }
        this.$refs.videoCompare.syncVideos();
      } else {
        console.error('Invalid video data received:', video);
      }
    },

    onPopulateVideos(left, right) {
      this.leftVideo = left;
      this.rightVideo = right;
      this.$refs.videoCompare.syncVideos();

    },

    async selectBaseDirectory() {
      if (isTauri) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Base Directory for Videos',
        });
        if (selected) {
          this.baseDirectory = selected;
          await this.loadVideosFromDirectory();
        }
      }
    },
    async loadVideosFromDirectory() {
      console.debug("Loading videos from directory: ", this.baseDirectory);
      if (isTauri && this.baseDirectory) {
        try {
          const videos = await invoke('parse_videos', { path: this.baseDirectory });
          console.debug("Videos loaded: ", videos);
          this.videoList = [videos]; // Wrap in array to match expected structure
        } catch (error) {
          console.error('Error loading videos:', error);
        }
      }
    },

    async onDirectorySelected(directory) {
      this.baseDirectory = directory;
      this.showDialog = false;
      console.log("Directory selected: ", directory);
      await this.loadVideosFromDirectory();
    },

    setActiveVideo(side) {
      this.activeVideo = side; // 'left' or 'right'
    },

    swapVideos() {
      const temp = this.rightVideo
      this.rightVideo = this.leftVideo
      this.leftVideo = temp
    },
  },
  mounted() {
    if (!isTauri) {
      // For web mode, you might want to load videos from an API or use a default list
      this.videoList = [];
    }
  }
};
</script>

<style scoped>
#app {
  display: grid;
  grid-template-columns: 1fr 3fr;
}
</style>
