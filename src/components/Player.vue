<template>
  <div class="player" @click="handleClick" @mousedown="handleMouseDown">
    <div
      class="progress-bar"
      :class="{
        nyancat: settings.nyancatStyle,
        'nyancat-stop': settings.nyancatStyle && !player.playing,
      }"
      @click.stop
    >
      <vue-slider
        v-model="player.progress"
        :min="0"
        :max="player.currentTrackDuration"
        :interval="1"
        :drag-on-click="true"
        :duration="0"
        :dot-size="12"
        :height="2"
        :tooltip-formatter="formatTrackTime"
        :lazy="true"
        :silent="true"
      ></vue-slider>
    </div>
    <div class="controls">
      <div class="playing">
        <div class="container" @click.stop>
          <img
            :src="currentTrack.al && currentTrack.al.picUrl | resizeImage(224)"
            loading="lazy"
            @click="goToAlbum"
          />
          <div class="track-info" :title="audioSource">
            <div
              :class="['name', { 'has-list': hasList() }]"
              @click="hasList() && goToList()"
            >
              {{ currentTrack.name }}
            </div>
            <div class="artist">
              <span
                v-for="(ar, index) in currentTrack.ar"
                :key="ar.id"
                @click="ar.id && goToArtist(ar.id)"
              >
                <span :class="{ ar: ar.id }"> {{ ar.name }} </span
                ><span v-if="index !== currentTrack.ar.length - 1">, </span>
              </span>
            </div>
          </div>
          <div v-if="!currentTrack.podcast" class="like-button">
            <button-icon
              :title="
                player.isCurrentTrackLiked
                  ? $t('player.unlike')
                  : $t('player.like')
              "
              @click.native="likeATrack(player.currentTrack.id)"
            >
              <svg-icon
                v-show="!player.isCurrentTrackLiked"
                icon-class="heart"
              ></svg-icon>
              <svg-icon
                v-show="player.isCurrentTrackLiked"
                icon-class="heart-solid"
              ></svg-icon>
            </button-icon>
          </div>
        </div>
        <div class="blank"></div>
      </div>
      <div class="middle-control-buttons">
        <div class="blank"></div>
        <div class="container" @click.stop>
          <button-icon
            v-show="!player.isPersonalFM"
            :title="$t('player.previous')"
            @click.native="playPrevTrack"
            ><svg-icon icon-class="previous"
          /></button-icon>
          <button-icon
            v-show="player.isPersonalFM"
            title="不喜欢"
            @click.native="moveToFMTrash"
            ><svg-icon icon-class="thumbs-down"
          /></button-icon>
          <button-icon
            class="play"
            :title="$t(player.playing ? 'player.pause' : 'player.play')"
            @click.native="playOrPause"
          >
            <svg-icon :icon-class="player.playing ? 'pause' : 'play'"
          /></button-icon>
          <button-icon :title="$t('player.next')" @click.native="playNextTrack"
            ><svg-icon icon-class="next"
          /></button-icon>
        </div>
        <div class="blank"></div>
      </div>
      <div class="right-control-buttons">
        <div class="blank"></div>
        <div class="container" @click.stop>
          <button-icon
            :title="$t('player.nextUp')"
            :class="{
              active: $route.name === 'next',
              disabled: player.isPersonalFM,
            }"
            @click.native="goToNextTracksPage"
            ><svg-icon icon-class="list"
          /></button-icon>
          <button-icon
            :class="{
              active: player.repeatMode !== 'off',
              disabled: player.isPersonalFM,
            }"
            :title="
              player.repeatMode === 'one'
                ? $t('player.repeatTrack')
                : $t('player.repeat')
            "
            @click.native="switchRepeatMode"
          >
            <svg-icon
              v-show="player.repeatMode !== 'one'"
              icon-class="repeat"
            />
            <svg-icon
              v-show="player.repeatMode === 'one'"
              icon-class="repeat-1"
            />
          </button-icon>
          <button-icon
            :class="{ active: player.shuffle, disabled: player.isPersonalFM }"
            :title="$t('player.shuffle')"
            @click.native="switchShuffle"
            ><svg-icon icon-class="shuffle"
          /></button-icon>
          <button-icon
            v-if="settings.enableReversedMode"
            :class="{ active: player.reversed, disabled: player.isPersonalFM }"
            :title="$t('player.reversed')"
            @click.native="switchReversed"
            ><svg-icon icon-class="sort-up"
          /></button-icon>
          <div class="volume-control">
            <button-icon :title="$t('player.mute')" @click.native="mute">
              <svg-icon v-show="volume > 0.5" icon-class="volume" />
              <svg-icon v-show="volume === 0" icon-class="volume-mute" />
              <svg-icon
                v-show="volume <= 0.5 && volume !== 0"
                icon-class="volume-half"
              />
            </button-icon>
            <div class="volume-bar">
              <vue-slider
                v-model="volume"
                :min="0"
                :max="1"
                :interval="0.01"
                :drag-on-click="true"
                :duration="0"
                tooltip="none"
                :dot-size="12"
              ></vue-slider>
            </div>
          </div>

          <div class="more-menu-wrapper">
            <button-icon
              class="more-button"
              :class="{ active: sleepTimerActive || player.playbackRate !== 1 }"
              :title="sleepTimerText || $t('player.more')"
              @mousedown.native.prevent
              @click.native="toggleMoreMenu"
              ><svg-icon icon-class="more"
            /></button-icon>
            <div
              v-if="showMoreMenu"
              ref="moreMenu"
              class="more-menu"
              tabindex="-1"
              @blur="showMoreMenu = false"
            >
              <div class="group-title">{{ $t('player.playbackRate') }}</div>
              <div class="chips">
                <div
                  v-for="rate in playbackRates"
                  :key="'rate' + rate"
                  class="chip"
                  :class="{ active: player.playbackRate === rate }"
                  @click="player.playbackRate = rate"
                  >{{ rate }}x</div
                >
              </div>
              <hr />
              <div class="group-title">
                {{ $t('player.sleepTimer') }}
                <span v-if="sleepTimerText" class="subtitle">{{
                  sleepTimerText
                }}</span>
              </div>
              <div
                v-for="minutes in sleepOptions"
                :key="'sleep' + minutes"
                class="item"
                @click="setSleepTimer(minutes)"
                >{{ $t('player.sleepMinutes', { n: minutes }) }}</div
              >
              <div
                class="item"
                :class="{ checked: player.sleepAfterCurrentTrack }"
                @click="setSleepTimer('endOfTrack')"
                >{{ $t('player.sleepEndOfTrack') }}</div
              >
              <div
                v-if="sleepTimerActive"
                class="item"
                @click="setSleepTimer(0)"
                >{{ $t('player.sleepOff') }}</div
              >
              <template v-if="isElectron">
                <hr />
                <div
                  class="item"
                  :class="{ checked: desktopLyricOn }"
                  @click="toggleDesktopLyric"
                  >{{ $t('player.desktopLyric') }}</div
                >
                <div
                  v-if="desktopLyricOn"
                  class="item"
                  :class="{ checked: settings.desktopLyricLocked }"
                  @click="toggleDesktopLyricLock"
                  >{{ $t('player.desktopLyricLock') }}</div
                >
              </template>
            </div>
          </div>
          <button-icon
            class="lyrics-button"
            title="歌词"
            style="margin-left: 12px"
            @click.native="toggleLyrics"
            ><svg-icon icon-class="arrow-up"
          /></button-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import '@/assets/css/slider.css';

import ButtonIcon from '@/components/ButtonIcon.vue';
import VueSlider from 'vue-slider-component';
import { goToListSource, hasListSource } from '@/utils/playList';
import { formatTrackTime } from '@/utils/common';

export default {
  name: 'Player',
  components: {
    ButtonIcon,
    VueSlider,
  },
  data() {
    return {
      mouseDownTarget: null,
      showMoreMenu: false,
      playbackRates: [0.75, 1, 1.25, 1.5, 2],
      sleepOptions: [15, 30, 60, 90],
      now: Date.now(),
      nowTicker: null,
      isElectron: process.env.IS_ELECTRON === true,
    };
  },
  computed: {
    ...mapState(['player', 'settings', 'data']),
    currentTrack() {
      return this.player.currentTrack;
    },
    volume: {
      get() {
        return this.player.volume;
      },
      set(value) {
        this.player.volume = value;
      },
    },
    playing() {
      return this.player.playing;
    },
    desktopLyricOn() {
      return this.$store.state.desktopLyricOn;
    },
    sleepTimerActive() {
      return (
        this.player.sleepTimerEndAt > 0 || this.player.sleepAfterCurrentTrack
      );
    },
    sleepTimerText() {
      if (this.player.sleepAfterCurrentTrack) {
        return this.$t('player.sleepEndOfTrack');
      }
      if (this.player.sleepTimerEndAt <= 0) return '';
      const left = Math.max(0, (this.player.sleepTimerEndAt - this.now) / 1000);
      return this.$t('player.sleepRemaining', {
        time: formatTrackTime(left),
      });
    },
    audioSource() {
      return this.player._howler?._src.includes('kuwo.cn')
        ? '音源来自酷我音乐'
        : '';
    },
  },
  mounted() {
    this.setupMediaControls();
    window.addEventListener('keydown', this.handleKeydown);
    this.nowTicker = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
    clearInterval(this.nowTicker);
  },
  methods: {
    ...mapMutations(['toggleLyrics']),
    ...mapActions(['showToast', 'likeATrack']),
    handleClick(event) {
      if (event.target == this.mouseDownTarget) {
        this.toggleLyrics();
      }
    },
    handleMouseDown(event) {
      this.mouseDownTarget = event.target;
    },
    playPrevTrack() {
      this.player.playPrevTrack();
    },
    playOrPause() {
      this.player.playOrPause();
    },
    playNextTrack() {
      if (this.player.isPersonalFM) {
        this.player.playNextFMTrack();
      } else {
        this.player.playNextTrack();
      }
    },
    goToNextTracksPage() {
      if (this.player.isPersonalFM) return;
      this.$route.name === 'next'
        ? this.$router.go(-1)
        : this.$router.push({ name: 'next' });
    },
    formatTrackTime(value) {
      return formatTrackTime(value);
    },
    hasList() {
      return hasListSource();
    },
    goToList() {
      goToListSource();
    },
    goToAlbum() {
      if (this.player.currentTrack.al.id === 0) return;
      this.$router.push({ path: '/album/' + this.player.currentTrack.al.id });
    },
    goToArtist(id) {
      this.$router.push({ path: '/artist/' + id });
    },
    moveToFMTrash() {
      this.player.moveToFMTrash();
    },
    switchRepeatMode() {
      this.player.switchRepeatMode();
    },
    switchShuffle() {
      this.player.switchShuffle();
    },
    switchReversed() {
      this.player.switchReversed();
    },
    mute() {
      this.player.mute();
    },
    toggleMoreMenu() {
      this.now = Date.now();
      this.showMoreMenu = !this.showMoreMenu;
      if (this.showMoreMenu) this.$nextTick(() => this.$refs.moreMenu?.focus());
    },
    setSleepTimer(minutes) {
      this.player.setSleepTimer(minutes);
      this.now = Date.now();
      this.showMoreMenu = false;
    },
    toggleDesktopLyricLock() {
      this.$store.commit('updateSettings', {
        key: 'desktopLyricLocked',
        value: !this.settings.desktopLyricLocked,
      });
      this.showMoreMenu = false;
    },
    toggleDesktopLyric() {
      window.require('electron').ipcRenderer.send('toggleDesktopLyric');
      this.showMoreMenu = false;
    },

    setupMediaControls() {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          this.playOrPause();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.playOrPause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.playPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.playNextTrack();
        });
      }
    },

    handleKeydown(event) {
      switch (event.code) {
        case 'MediaPlayPause':
          this.playOrPause();
          break;
        case 'MediaTrackPrevious':
          this.playPrevTrack();
          break;
        case 'MediaTrackNext':
          this.playNextTrack();
          break;
        default:
          break;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.more-menu-wrapper {
  position: relative;
  margin-left: 4px;
}

.more-menu {
  // 外观与 ContextMenu.vue（右键菜单）保持一致
  position: absolute;
  bottom: 52px;
  right: -8px;
  width: 220px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-sizing: border-box;
  padding: 6px;
  z-index: 1000;
  user-select: none;
  -webkit-app-region: no-drag;
  &:focus {
    outline: none;
  }
  hr {
    margin: 4px 10px;
    background: rgba(128, 128, 128, 0.18);
    height: 1px;
    box-shadow: none;
    border: none;
  }
  .group-title {
    padding: 10px 14px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    opacity: 0.68;
    .subtitle {
      margin-left: 6px;
      color: var(--color-primary);
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    padding: 2px 4px;
  }
  .item,
  .chip {
    font-weight: 600;
    font-size: 14px;
    border-radius: 8px;
    cursor: default;
    color: var(--color-text);
    &:hover {
      color: var(--color-primary);
      background: var(--color-primary-bg-for-transparent);
      transition: opacity 125ms ease-out, transform 125ms ease-out;
    }
    &:active {
      opacity: 0.75;
      transform: scale(0.95);
    }
  }
  .item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    &.checked::after {
      content: '✓';
      margin-left: auto;
      color: var(--color-primary);
    }
  }
  .chip {
    padding: 6px 8px;
    &.active {
      color: var(--color-primary);
      background: var(--color-primary-bg-for-transparent);
    }
  }
}

[data-theme='dark'] {
  .more-menu {
    background: rgba(36, 36, 36, 0.78);
    backdrop-filter: blur(16px) contrast(120%) brightness(60%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.08);
    .item:hover,
    .chip:hover {
      color: var(--color-text);
    }
  }
}

@supports (-moz-appearance: none) {
  .more-menu {
    background-color: var(--color-body-bg) !important;
  }
}

.player {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 64px;
  backdrop-filter: saturate(180%) blur(30px);
  // background-color: rgba(255, 255, 255, 0.86);
  background-color: var(--color-navbar-bg);
  z-index: 100;
}

@supports (-moz-appearance: none) {
  .player {
    background-color: var(--color-body-bg);
  }
}

.progress-bar {
  margin-top: -6px;
  margin-bottom: -6px;
  width: 100%;
}

.controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 100%;
  padding: {
    right: 10vw;
    left: 10vw;
  }
}

@media (max-width: 1336px) {
  .controls {
    padding: 0 5vw;
  }
}

.blank {
  flex-grow: 1;
}

.playing {
  display: flex;
}

.playing .container {
  display: flex;
  align-items: center;
  img {
    height: 46px;
    border-radius: 5px;
    box-shadow: 0 6px 8px -2px rgba(0, 0, 0, 0.16);
    cursor: pointer;
    user-select: none;
  }
  .track-info {
    height: 46px;
    margin-left: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    .name {
      font-weight: 600;
      font-size: 16px;
      opacity: 0.88;
      color: var(--color-text);
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
      word-break: break-all;
    }
    .has-list {
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }
    .artist {
      font-size: 12px;
      opacity: 0.58;
      color: var(--color-text);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
      word-break: break-all;
      span.ar {
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.middle-control-buttons {
  display: flex;
}

.middle-control-buttons .container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  .button-icon {
    margin: 0 8px;
  }
  .play {
    height: 42px;
    width: 42px;
    .svg-icon {
      width: 24px;
      height: 24px;
    }
  }
}

.right-control-buttons {
  display: flex;
}

.right-control-buttons .container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  .expand {
    margin-left: 24px;
    .svg-icon {
      height: 24px;
      width: 24px;
    }
  }
  .active .svg-icon {
    color: var(--color-primary);
  }
  .volume-control {
    margin-left: 4px;
    display: flex;
    align-items: center;
    .volume-bar {
      width: 84px;
    }
  }
}

.like-button {
  margin-left: 16px;
}

.button-icon.disabled {
  cursor: default;
  opacity: 0.38;
  &:hover {
    background: none;
  }
  &:active {
    transform: unset;
  }
}
</style>
