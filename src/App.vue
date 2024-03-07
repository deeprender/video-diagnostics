<template>
  <div id="app">
    <!-- Added ref to VideoCompare for accessing its methods -->
    <Navbar @video-selected="changeClippedVideo" @populate-videos="onPopulateVideos"></Navbar>
    <VideoCompare ref="videoCompare" :leftVideo="leftVideo" :rightVideo="rightVideo" @set-active-video="setActiveVideo" @swap-videos="swapVideos">
    </VideoCompare>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import VideoCompare from './components/VideoPlayer.vue';

export default {
  name: 'App',
  components: {
    Navbar,
    VideoCompare,
  },
  data() {
    return {
      leftVideo: { src: '', title: '' },
      rightVideo: { src: '', title: '' },
      activeVideo: 'left',
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
        // this.$refs.videoCompare.syncVideos(); // Sync videos after update
      } else {
        console.error('Invalid video data received:', video);
      }
    },

    onPopulateVideos(left, right) {
      this.leftVideo = left;
      this.rightVideo = right;
    },

    setActiveVideo(side) {
      this.activeVideo = side; // 'left' or 'right'
    },

    swapVideos() {
      const temp = this.rightVideo
      this.rightVideo = this.leftVideo
      this.leftVideo = temp
      // this.$refs.videoCompare.syncVideos(); // Sync videos after update
    },
  },
};
</script>

<style scoped>
#app {
  display: grid;
  grid-template-columns: 1fr 3fr;
}
</style>
