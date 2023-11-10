<template>
  <div id="app">
    <!-- Added ref to VideoCompare for accessing its methods -->
    <Navbar @video-selected="changeClippedVideo" @populate-videos="onPopulateVideos"></Navbar>
    <VideoCompare ref="videoCompare" :leftVideo="leftVideo" :rightVideo="rightVideo" @set-active-video="setActiveVideo" @swap-videos="swapVideos">
    </VideoCompare>
  </div>
</template>

<script>
import { faThList } from '@fortawesome/free-solid-svg-icons';
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
      activeVideo: 'left', // New data property to track the active video
    }
  },
  watch: {
    leftVideo(newVal, oldVal) {
      console.log('Left video changed:', newVal); // Consider replacing with more robust logging for production
    },
    rightVideo(newVal, oldVal) {
      console.log('Right video changed:', newVal); // Consider replacing with more robust logging for production
    },
  },

  methods: {
    changeClippedVideo(video) {
      if (video && video.src && video.title) {
        console.log(this.activeVideo)
        if (this.activeVideo === 'left') {
          this.leftVideo = video;
        } else {
          this.rightVideo = video;
        }
        this.$refs.videoCompare.syncVideos(); // Sync videos after update
      } else {
        console.error('Invalid video data received:', video);
      }
    },

    onPopulateVideos(left, right) {
      console.log('calling onPopulateVideos')
      this.setActiveVideo('left');
      this.changeClippedVideo(left);
      this.setActiveVideo('right');
      this.changeClippedVideo(right);
    },

    setActiveVideo(side) {
      console.log(side)
      this.activeVideo = side; // 'left' or 'right'
    },

    swapVideos() {
      const temp = this.rightVideo
      this.rightVideo = this.leftVideo
      this.leftVideo = temp
      this.$refs.videoCompare.syncVideos(); // Sync videos after update
    },
  },
};
</script>

<style scoped>
#app {
  display: grid;
  grid-template-columns: 1fr 3fr;
  /* Adjusted for a more responsive layout */
}
</style>
