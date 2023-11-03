<template>
  <div id="app">
    <Navbar @video-selected="changeClippedVideo" @two-videos-selected="populateBothVideos"></Navbar>
    <VideoCompare ref="videoCompare"></VideoCompare>
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
      selectedVideo: '',
    }
  },
  methods: {
    changeClippedVideo(src) {
      this.$refs.videoCompare.setClippedVideoSrc(src);
    },
    populateBothVideos(src1, src2) {
      this.$refs.videoCompare.selectedVideo = "LEFT"
      this.$refs.videoCompare.setClippedVideoSrc(src1);
      this.$refs.videoCompare.selectedVideo = "RIGHT"
      this.$refs.videoCompare.setClippedVideoSrc(src2);
    },
  },
};
</script>


<style scoped>
#app{
  display: grid;
  grid-template-columns: minmax(auto, 20vw) auto;
}
</style>
