<template>
  <div class="container">
    <!-- Main Video is on the right! -->
    <!-- Clipped Video is on the left! -->
    <div class="video-compare-container" ref="container" @mousedown="startSeeking">
      <div v-show="rightVideo.src && mainVideoLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>
      <video
        class="video-main"
        :style="{ zIndex: mainVideoZIndex }"
        :class="{ 'fullscreen': isFullscreen }"
        muted
        autoplay
        ref="mainVideo"
        preload="auto"
        @loadedmetadata="videoLoaded"
        @error="videoError"
      >
        <source :src="rightVideo.src" type="video/mp4">
        <div v-show="mainVideoLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
        </div>
      </video>
      <div class="video-clipper" ref="clipper">
        <div v-show="leftVideo.src && clippedVideoLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
        </div>
        <video
          class="video-clipped"
          :class="{ 'fullscreen': isFullscreen }"
          :style="{ zIndex: clippedVideoZIndex }"
          muted
          autoplay
          preload="auto"
          ref="clippedVideo"
          @loadedmetadata="videoLoaded"
          @error="videoError"
        >
          <source :src="leftVideo.src" type="video/mp4">
          <div v-show="clippedVideoLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>

        </video>
      </div>
      <div class="split-line" ref="splitLine"></div>
      
      <!-- Progress Bar -->
      <div class="progress-container" ref="progressBar" @mousemove="updateLinePosition($event)" @click="seek($event)">
        <div class="progress-bar" :style="{ width: progressBarWidth }"></div>
      </div>


    </div>



    <!-- Video Labels -->
    <div class="video-labels" :class="{ 'stacked-labels': isStacked }">
      <label  @click="emitSetActive('left')">
        <input type="radio" name="video-selection" value="LEFT" v-model="selectedVideo" />
        <span v-if="!isStacked || clippedVideoZIndex > mainVideoZIndex" :class="['video-label', { 'active-label': isStacked && clippedVideoZIndex > mainVideoZIndex }]">LEFT: {{ leftVideo.title }}</span>
      </label>
      <label  @click="emitSetActive('right')">
        <input type="radio" name="video-selection" value="RIGHT" v-model="selectedVideo" />
        <span v-if="!isStacked || clippedVideoZIndex < mainVideoZIndex" :class="['video-label', { 'active-label': isStacked && clippedVideoZIndex < mainVideoZIndex }]">RIGHT: {{ rightVideo.title }}</span>
      </label>

    </div>

    <!-- Control Buttons -->
    <div class="button-container">
      <button class="video-button" @click="toggleStackMode">
          <font-awesome-icon :icon="isStacked ? 'layer-group' : 'arrows-left-right'" />
          {{ isStacked ? 'Stacked mode [S]' : 'Split mode [S]' }}
        </button>
      <button class="video-button" @click="swapVideos">
          <font-awesome-icon icon="exchange-alt" />
          Swap [P]
        </button>
        <button class="video-button" @click="resetVideos">
          <font-awesome-icon icon="step-forward" />
          Reset [R]
        </button>
        <button class="video-button" @click="togglePlayPause">
          <font-awesome-icon :icon="isPlaying ? 'pause' : 'play'" />
          {{ isPlaying ? 'Pause [SPACE]' : 'Play [SPACE]' }}
        </button>

        <button class="video-button" @click="toggleFullscreen">
          <font-awesome-icon icon="expand" />
          Fullscreen [F]
        </button>        
     
    </div>
  </div>
</template>


<script>
  export default {
    props: {
      leftVideo: {
        type: Object,
        default: () => ({ src: '', title: '' })
      },
      rightVideo: {
        type: Object,
        default: () => ({ src: '', title: '' })
      },
    },
    watch: {
      'leftVideo.src': function(newSrc, oldSrc) {
        if (newSrc !== oldSrc) {
          this.clippedVideoLoading = true;
          this.loadVideo(this.$refs.clippedVideo, newSrc);
        }
      },
      'rightVideo.src': function(newSrc, oldSrc) {
        if (newSrc !== oldSrc) {
          this.mainVideoLoading = true;
          this.loadVideo(this.$refs.mainVideo, newSrc);
        }
      },
    },

    data() {
      return {
        isFullscreen: false,
        selectedVideo: 'RIGHT',
        mainVideoLoading: true,
        clippedVideoLoading: true,
        longestDuration: 0,
        currentTime: 0,
        seeking: false,
        linePosition: 0, // Initial line position
        indexedDB: null, // Database connection
        lastLeftVideoSrc: '',
        lastRightVideoSrc: '',
        isPlaying: true,
        isStacked: false,
        mainVideoZIndex: 2,
        clippedVideoZIndex: 3,
      }
    },
    async mounted() {

      this.trackLocation = this.trackLocation.bind(this);
      this.videoContainer = this.$refs.container;
      this.videoClipper = this.$refs.clipper;
      this.clippedVideo = this.$refs.clippedVideo;
      this.mainVideo = this.$refs.mainVideo;
      this.splitLine = this.$refs.splitLine;

      this.videoContainer.addEventListener('mousemove', this.trackLocation, false);
      this.videoContainer.addEventListener('touchstart', this.trackLocation, false);
      this.videoContainer.addEventListener('touchmove', this.trackLocation, false);
      this.mainVideo.addEventListener('ended', this.resetVideos, false);
      this.clippedVideo.addEventListener('ended', this.resetVideos, false);
      window.addEventListener('keydown', this.handleArrowKeyPress);
      
      this.mainVideo.addEventListener('timeupdate', this.syncPlaybackRates);


      await this.updateCurrentTime();
      this.db = await this.openDB();

      window.addEventListener('keydown', this.handleKeyPress);
    },
    computed: {
      progressBarWidth() {
        return `${(this.currentTime / this.longestDuration) * 100}%`;
      },

      videoLabels() {
        return {
          main: this.mainVideoSrc.split('/').pop(),
          clipped: this.clippedVideoSrc.split('/').pop(),
        }
      }
    },


    methods: {
      setActive(side) {
        this.$emit('set-active-video', side);
      },
      syncPlaybackRates(){
        if (!this.clippedVideo || !this.mainVideo) return;
        if (this.mainVideo.currentTime < 0.1 || this.clippedVideo.currentTime < 0.1) return;

        const timeDelta = Math.abs(this.mainVideo.currentTime - this.clippedVideo.currentTime);
        const timeRatio = this.clippedVideo.currentTime / this.mainVideo.currentTime;
        if (isNaN(timeRatio)) return;
        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        let playbackRate = 1.0;
        if (timeDelta * 1000 > 1.0) {
            playbackRate = Math.pow(timeRatio, 10.0);
            playbackRate = clamp(playbackRate, 0.5, 10.0);
        } else {
            playbackRate = Math.pow(timeRatio, 1.0);
            playbackRate = clamp(playbackRate, 0.5, 2.0);
        }
        this.mainVideo.playbackRate = playbackRate;
    },


      emitSetActive(side) {
        this.setActive(side);
      },

      // part of progress bar line which is commented out
      updateLinePosition(event) {
        const bounds = this.$refs.progressBar.getBoundingClientRect();
        const position = (event.clientX - bounds.left) / bounds.width * 100;
        this.linePosition = position;
      },

      videoLoaded(event) {
        const duration = event.target.duration;
        if (duration > this.longestDuration) {
          this.longestDuration = duration;
        }

        if (event.target === this.$refs.mainVideo) {
          this.mainVideoLoading = false;
        } else if (event.target === this.$refs.clippedVideo) {
          this.clippedVideoLoading = false;
        } 
        const currentTime = Math.min(this.$refs.mainVideo.currentTime, this.$refs.clippedVideo.currentTime);
        this.$refs.mainVideo.currentTime = currentTime;
        this.$refs.clippedVideo.currentTime = currentTime;
      },
      
      async playVideo(videoElement) {
        try {
          await videoElement.play();
          this.isPlaying = true;
        } catch (error) {
          console.error('Error trying to play video:', error);
        }
      },

      startSeeking(event) {
        this.seeking = true;
        this.seek(event); 

        // Add mousemove and mouseup event listeners to the window
        window.addEventListener('mousemove', this.seek);
        window.addEventListener('mouseup', this.stopSeeking);
      },


      seek(event) {
        if (!this.seeking) return;

        const bounds = this.$refs.progressBar.getBoundingClientRect();
        const clickPosition = event.clientX - bounds.left;
        let seekTime = (clickPosition / bounds.width) * this.longestDuration;

        // Calculate the minimum buffered time for both videos
        let minBufferedTime = Math.min(
          this.getBufferedTime(this.$refs.mainVideo, seekTime),
          this.getBufferedTime(this.$refs.clippedVideo, seekTime)
        );

        // Restrict seekTime to minBufferedTime
        seekTime = Math.min(seekTime, minBufferedTime);

        // Update the video's current time and the line position
        this.$refs.mainVideo.currentTime = seekTime;
        this.$refs.clippedVideo.currentTime = seekTime;
        this.currentTime = seekTime;
        this.linePosition = (clickPosition / bounds.width) * 100;
      },

      // Helper method to get buffered time up to a specific time
      getBufferedTime(videoElement, time) {
        for (let i = 0; i < videoElement.buffered.length; i++) {
          if (videoElement.buffered.start(i) <= time && time <= videoElement.buffered.end(i)) {
            return videoElement.buffered.end(i);
          }
        }
        return 0; // If not buffered, return 0
      },


      stopSeeking() {
        this.seeking = false;
        // this.isPlaying = true; 
        
        // Remove the event listeners from the window
        window.removeEventListener('mousemove', this.seek);
        window.removeEventListener('mouseup', this.stopSeeking);
      },

      updateCurrentTime() {
        this.currentTime = Math.max(this.$refs.mainVideo.currentTime, this.$refs.clippedVideo.currentTime);
        requestAnimationFrame(this.updateCurrentTime);
      },

      videoError(event) {
        console.error('Video failed to load');
        if (event.target.classList.contains('video-main')) {
          this.mainVideoLoading = false;
        } else if (event.target.classList.contains('video-clipped')) {
          this.clippedVideoLoading = false;
        }
      },

      trackLocation(e) {
        if (this.isFullscreen) {
          const rect = this.videoContainer.getBoundingClientRect();
          const position = ((e.clientX - rect.left) / rect.width) * 100;
          if (position <= 100) {
            this.updateSliderPosition(position);
          }
        } else {
          // Original logic for normal mode
          const rect = this.videoContainer.getBoundingClientRect();
          const position = ((e.clientX - rect.left) / this.videoContainer.offsetWidth) * 100;
          if (position <= 100) {
            this.updateSliderPosition(position);
          }
        }
      },

      toggleStackMode() {
        this.isStacked = !this.isStacked;
        if (!this.isStacked) {
          // Reset z-index values when exiting stacked mode
          this.mainVideoZIndex = 2;
          this.clippedVideoZIndex = 3;
        }
        this.updateSliderPosition(this.isStacked ? 100 : 50); // Reset to default positions
      },

        updateSliderPosition(position) {
          if (this.isStacked) {
            this.splitLine.style.display = 'none'; // Hide split line
            // Reset styles for stacked mode
            this.videoClipper.style.width = '100%';
            this.clippedVideo.style.width = '100%';
            this.mainVideo.style.width = '100%';
          } else {
            this.splitLine.style.display = 'block'; // Show split line
            // Original logic for side-by-side mode
            this.videoClipper.style.width = position + '%';
            this.clippedVideo.style.width = (100 / position) * 100 + '%';
            this.mainVideo.style.width = '100%';
            this.splitLine.style.left = position + '%';
          }
        },

      async updateVideos() {
        try {
          let updateMainVideo = false;
          let updateClippedVideo = false;

          // Check if the left video source has changed
          if (this.leftVideo.src !== this.lastLeftVideoSrc) {
            updateMainVideo = true;
            this.lastLeftVideoSrc = this.leftVideo.src;
          }

          // Check if the right video source has changed
          if (this.rightVideo.src !== this.lastRightVideoSrc) {
            updateClippedVideo = true;
            this.lastRightVideoSrc = this.rightVideo.src;
          }

          // Load and cache videos based on the update flags
          const updates = [];
          if (updateMainVideo) {
            updates.push(this.updateVideoSource(this.leftVideo.src, this.$refs.clippedVideo, true));
          }
          if (updateClippedVideo) {
            updates.push(this.updateVideoSource(this.rightVideo.src, this.$refs.mainVideo, false));
          }

          await Promise.all(updates);
        } catch (error) {
          console.error("Error loading videos:", error);
        }
      },
      async updateVideoSource(src, videoElement, isLeftVideo) {
        const cachedVideo = await this.getCachedVideo(src);
        if (cachedVideo) {
          videoElement.src = cachedVideo;
        } else {
          const response = await fetch(src);
          const blob = await response.blob();
          const videoURL = URL.createObjectURL(blob);
          this.cacheVideo(src, blob);
          videoElement.src = videoURL;
        }
        if (isLeftVideo) {
          this.mainVideoLoading = false;
        } else {
          this.clippedVideoLoading = false;
        }        
      },

      async openDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('VideoCacheDB', 1);
          request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('videos')) {
              db.createObjectStore('videos');
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },

      async cacheVideo(src, blob) {
        const transaction = this.db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        store.put(blob, src);
      },

      async getCachedVideo(src) {
        const transaction = this.db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(src);
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            if (request.result) {
              resolve(URL.createObjectURL(request.result));
            } else {
              resolve(null);
            }
          };
          request.onerror = () => reject(request.error);
        });
      },

      loadVideo(videoElement, src) {
        return new Promise((resolve, reject) => {
          videoElement.src = src;
          videoElement.load();
          videoElement.oncanplaythrough = () => {

            resolve();
            if(this.isPlaying){
              videoElement.play().catch(e => console.error('Error trying to play video:', e));
            }
          };
          videoElement.onerror = () => reject("Error loading video");
        });
      },

      async syncVideos() {
        try {

          await Promise.all([
            this.$refs.mainVideo.play(),
            this.$refs.clippedVideo.play()
          ])
          this.isPlaying = true
        } catch (error) {
          console.error('Error trying to play video:', error);
        }
      },

      async resetVideos() {
        this.$refs.mainVideo.currentTime = 0;
        this.$refs.clippedVideo.currentTime = 0;
        await Promise.all([
          this.$refs.mainVideo.play(),
          this.$refs.clippedVideo.play()
        ]);
        this.isPlaying = true;
      },

      swapVideos() {
        if (this.isStacked) {
          // Swap the z-index values of the main and clipped videos
          [this.mainVideoZIndex, this.clippedVideoZIndex] = [this.clippedVideoZIndex, this.mainVideoZIndex];
        } else {
          // Default behavior for swapping videos in split mode
          this.$emit('swap-videos');
          this.isPlaying = true;
        }
      },


      async pauseVideos() {
        await this.mainVideo.pause();   
        await this.clippedVideo.pause();
        this.isPlaying = false;
      },

      resumeVideos() {
        this.mainVideo.play();
        this.clippedVideo.play();
        this.isPlaying = true;

      },
      async togglePlayPause() {
        if (this.isPlaying) {
          await this.pauseVideos();
        } else {
          await this.resumeVideos();
        }
      },
      toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        } else {
          const container = this.$refs.container;
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          }
        }
      },

      handleKeyPress(event) {
        if (event.keyCode === 32) { // 32 is the key code for the spacebar
          this.togglePlayPause();
          event.preventDefault(); // Prevent the default spacebar action (scrolling)
        }else if (event.keyCode === 83) { // 'S' key
          this.toggleStackMode();
        }
        else if (event.keyCode === 82){
          this.resetVideos();
        }
        else if (event.keyCode === 70){
          this.toggleFullscreen();
        }
        else if (event.keyCode === 80){
          this.swapVideos();
        }
      },
      handleArrowKeyPress(event) {
        const step = 0.5; // Time to seek in seconds
        if (event.keyCode === 39) { // 39 is the key code for the right arrow
          this.$refs.mainVideo.currentTime = Math.min(this.$refs.mainVideo.currentTime + step, this.$refs.mainVideo.duration);
          this.$refs.clippedVideo.currentTime = Math.min(this.$refs.clippedVideo.currentTime + step, this.$refs.clippedVideo.duration);
        } else if (event.keyCode === 37) { // 37 is the key code for the left arrow
          this.$refs.mainVideo.currentTime = Math.max(0, this.$refs.mainVideo.currentTime - step);
          this.$refs.clippedVideo.currentTime = Math.max(0, this.$refs.clippedVideo.currentTime - step);
        }
      },
      getFileName(src) {
        return src.split('/').pop();
      }
    },
    destroyed() {
      // Remove event listeners if they were added
      window.removeEventListener('mousemove', this.seek);
      window.removeEventListener('mouseup', this.stopSeeking);
      window.removeEventListener('keydown', this.handleArrowKeyPress);
      window.removeEventListener('keydown', this.handleKeyPress);
    }
  }
</script>

<style scoped>

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .loading-spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top: 4px solid #fff;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .container {
    display: grid;
    grid-column: 2;
    grid-template-rows: auto 50px 50px;
    /* height: 100vh; */
    height: 99vh;
  }



  .video-compare-container {
    position: relative;
    padding-bottom: 10px;

    margin: auto;
    /* position: absolute; */
    display: inline-block;
    top: 0;
    width: 95%;
    /* padding-top: 56.25%; */
    height: calc(100vh - 200px);
    max-width: 100vw;
    overflow: hidden;
    grid-row: 1;
  }
  .progress-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 10px;
    background-color: #ccc;
    z-index: 3; /* Updated Z-index to be above the video */
  }

  .progress-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px; /* Width of the line */
    background-color: #ff0000; /* Color of the line */
    z-index: 4; /* Ensure it's above the progress bar */
  }


  .progress-bar {
    height: 100%;
    background-color: var(--vt-c-indigo);
    width: 0%; /* This will be controlled by Vue.js */
  }


  .video-main {
    width: 100%;
    position: absolute;
    top: 0;
    height: 100%;
    max-height: 100vh;
    object-fit: contain;
    grid-row: 1;
  }

  .video-clipper {
    top: 0;
    bottom: 0;
    width: 50%;
    position: absolute;
    overflow: hidden;
    max-height: 100vh;
    grid-row: 1;
  }

  .video-clipped {
    width: 200%;
    height: 100%;
    z-index: 1;
    object-fit: contain;
    grid-row: 1;
  }

  .split-line {
    position: absolute;
    top: 0;
    bottom: 10px; 
    width: 0.5px;
    background: #fff;
    z-index: 2;
    grid-row: 1;
    height: calc(100% - 10px); /* Adjust the height to account for the progress bar */

  }

  .video-button {
    width: auto;
    background-color: var(--vt-c-black-soft);
    color: var(--vt-c-text-dark-1);
    padding: 12px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    border: none;
    transition: background-color 0.2s, color 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .video-button:hover {
    background-color: var(--vt-c-indigo);
    color: var(--vt-c-text-dark-1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transform: scale(1.03);
  }
  .video-clipper.stacked {
    width: 100%;
    z-index: 1; /* Adjust as necessary */
  }

  .video-clipped.stacked {
    width: 100%;
  }

  .video-main.stacked {
    width: 100%;
  }

  .button-container {
    /* margin-top: 10px; */
    width: auto;
    display: grid;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
    z-index: 4;
    grid-row: 3;
    grid-template-columns: repeat(5, 1fr);
  }

  .video-labels {
    margin-top: 10px; 
    display: flex;
    justify-content: space-between;
    padding: 0 2.5%;
    grid-row: 2;
  }

  .video-labels label {
    display: flex;
    align-items: center;
    font-size: 16px;
    color: #fff;
    cursor: pointer;
    user-select: none;
  }

  .video-labels input[type="radio"] {
    display: none;
  }

  .video-labels .video-label {
    padding: 5px 10px;
    border: 2px solid #ccc;
    border-radius: 5px;
    margin-left: 10px;

    max-width: 22em; /* Adjust the width as needed */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

  }
  .video-labels .video-label:hover {
    transform: scale(1.03);
  }

  .video-labels input[type="radio"]:checked+.video-label {
    background-color: var(--vt-c-indigo);
    color: #fff;
    border-color: var(--vt-c-indigo);
  }
  .video-labels .video-label.active-label {
    outline: 2px solid red;
  }

  .video-labels.stacked-labels .video-label {
    border-color: transparent; /* Remove the white border */
  }

</style>
