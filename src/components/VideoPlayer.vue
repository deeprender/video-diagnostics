<template>
  <div class="container">

    <div class="video-compare-container" ref="container" @mousedown="startSeeking">
      <div v-show="leftVideo.src && mainVideoLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>
      <video
        class="video-main"
        :class="{ 'fullscreen': isFullscreen }"
        autoplay
        muted
        ref="mainVideo"
        preload="auto"
        @loadedmetadata="videoLoaded"
        @error="videoError"
      >
        <source :src="leftVideo.src" type="video/mp4">
      </video>
      <div class="video-clipper" ref="clipper">
        <div v-show="rightVideo.src && clippedVideoLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
        </div>
        <video
          class="video-clipped"
          :class="{ 'fullscreen': isFullscreen }"
          autoplay
          muted
          preload="auto"
          ref="clippedVideo"
          @loadedmetadata="videoLoaded"
          @error="videoError"
        >
          <source :src="rightVideo.src" type="video/mp4">
        </video>
      </div>
      <div class="split-line" ref="splitLine"></div>
      
      <!-- Progress Bar -->
      <div class="progress-container" ref="progressBar" @mousemove="updateLinePosition($event)" @click="seek($event)" @mousedown="startSeeking">
        <div class="progress-bar" :style="{ width: progressBarWidth }"></div>
        <div class="progress-line" :style="{ left: linePosition + '%' }"></div> 
      </div>


    </div>



    <!-- Video Labels -->
    <div class="video-labels">
      <label @click="emitSetActive('left')">
        <input type="radio" name="video-selection" value="LEFT" v-model="selectedVideo" />
        <span class="video-label">LEFT: {{ leftVideo.title }}</span>
      </label>
      <label @click="emitSetActive('right')">
        <input type="radio" name="video-selection" value="RIGHT" v-model="selectedVideo" />
        <span class="video-label">RIGHT: {{ rightVideo.title }}</span>
      </label>
    </div>

    <!-- Control Buttons -->
    <div class="button-container">
      <button class="video-button" @click="swapVideos">
          <font-awesome-icon icon="exchange-alt" />
          Swap
        </button>
        <button class="video-button" @click="resetVideos">
          <font-awesome-icon icon="step-forward" />
          Reset
        </button>
        <button class="video-button" @click="resumeVideos">
          <font-awesome-icon icon="play" />
          Resume
        </button>
        <button class="video-button" @click="pauseVideos">
          <font-awesome-icon icon="pause" />
          Pause
        </button>
        <button class="video-button" @click="toggleFullscreen">
          <font-awesome-icon icon="expand" />
          Fullscreen
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
      leftVideo: {
        handler() {
          this.mainVideoLoading = true;
          this.updateVideos(); 
        },
        deep: true,
        immediate: true
      },
      rightVideo: {
        handler() {
          this.clippedVideoLoading = true;
          this.updateVideos(); 
        },
        deep: true,
        immediate: true
      }
    },

    data() {
      return {
        isFullscreen: false,
        selectedVideo: 'LEFT',
        mainVideoLoading: true,
        clippedVideoLoading: true,
        longestDuration: 0,
        currentTime: 0,
        seeking: false,
        linePosition: 0, // Initial line position
        indexedDB: null, // Database connection
        lastLeftVideoSrc: '',
        lastRightVideoSrc: '',

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
      this.mainVideo.addEventListener('ended', this.syncVideos, false);
      this.clippedVideo.addEventListener('ended', this.syncVideos, false);
      
      await this.updateCurrentTime();
      this.db = await this.openDB();

      window.addEventListener('keydown', this.handleSpacebarPress);
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

      emitSetActive(side) {
        this.setActive(side);
        this.$emit('active-video-changed', side); // Emitting an event when active video is changed
      },

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
        let seekTime;

        if (event.currentTarget === this.$refs.progressBar) {
          const clickPosition = event.clientX - bounds.left;
          seekTime = (clickPosition / bounds.width) * this.longestDuration;
          this.linePosition = (clickPosition / bounds.width) * 100; 
        } else if (event.type === 'mousedown' && event.currentTarget === this.$refs.container) {
          const videoRect = this.$refs.container.getBoundingClientRect();
          const clickX = event.clientX - videoRect.left;
          const clickRatio = clickX / videoRect.width;
          seekTime = clickRatio * this.longestDuration;
          this.linePosition = clickRatio * 100; 
        }

        this.$refs.mainVideo.currentTime = seekTime;
        this.$refs.clippedVideo.currentTime = seekTime;
        this.currentTime = seekTime;
      },

      stopSeeking() {
        this.seeking = false;
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
        const rect = this.videoContainer.getBoundingClientRect();
        const position = ((e.pageX - rect.left) / this.videoContainer.offsetWidth) * 100;
        if (position <= 100) {
          this.videoClipper.style.width = position + '%';
          this.clippedVideo.style.width = (100 / position) * 100 + '%';
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
            updates.push(this.updateVideoSource(this.leftVideo.src, this.$refs.mainVideo));
          }
          if (updateClippedVideo) {
            updates.push(this.updateVideoSource(this.rightVideo.src, this.$refs.clippedVideo));
          }

          await Promise.all(updates);
          this.syncVideos(); // Sync and play videos after updates
        } catch (error) {
          console.error("Error loading videos:", error);
        }
      },
      async updateVideoSource(src, videoElement) {
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
        console.log("caching video")
        const transaction = this.db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        store.put(blob, src);
      },

      async getCachedVideo(src) {
        console.log("getting cached video")

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
          videoElement.onloadeddata = () => {
            resolve();
            videoElement.play().catch(e => console.error('Error trying to play video:', e));
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
      },

      swapVideos() {
        this.$emit('swap-videos');
      },

      pauseVideos() {
        this.mainVideo.pause();
        this.clippedVideo.pause();

        this.clippedVideo.currentTime = this.mainVideo.currentTime; // ensure that videos are paused on the same frame
      },

      resumeVideos() {
        this.mainVideo.play();
        this.clippedVideo.play();
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

    handleSpacebarPress(event) {
      if (event.keyCode === 32) { // 32 is the key code for the spacebar
        if (this.mainVideo.paused || this.clippedVideo.paused) {
          this.resumeVideos();
        } else {
          this.pauseVideos();
        }
        event.preventDefault(); // Prevent the default spacebar action (scrolling)
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
    height: calc(100% - 20px); /* Adjust the height to account for the progress bar */

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
  }
  .video-labels .video-label:hover {
    transform: scale(1.03);
  }

  .video-labels input[type="radio"]:checked+.video-label {
    background-color: var(--vt-c-indigo);
    color: #fff;
    border-color: var(--vt-c-indigo);
  }
</style>
