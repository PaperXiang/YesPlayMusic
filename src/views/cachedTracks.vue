<template>
  <div v-show="show" class="cached-tracks">
    <div class="special-playlist">
      <div class="title gradient">{{ $t('cachedTracks.title') }}</div>
      <div class="subtitle">
        {{ $t('cachedTracks.subtitle', { count: tracks.length }) }}
      </div>
      <div class="buttons">
        <ButtonTwoTone
          class="play-button"
          icon-class="play"
          color="grey"
          @click.native="playAll()"
        >
          {{ $t('common.play') }}
        </ButtonTwoTone>
      </div>
    </div>

    <div v-if="!isElectron" class="empty">{{ $t('cachedTracks.webOnly') }}</div>
    <div v-else-if="tracks.length === 0" class="empty">
      {{ $t('cachedTracks.empty') }}
    </div>

    <TrackList
      :tracks="tracks"
      type="playlist"
      dbclick-track-func="cachedTracks"
      :extra-context-menu-item="['removeTrackFromCache']"
    />
  </div>
</template>

<script>
import NProgress from 'nprogress';
import { getCachedTracks } from '@/utils/db';
import { getTrackDetail } from '@/api/track';
import { mapTrackPlayableStatus } from '@/utils/common';

import ButtonTwoTone from '@/components/ButtonTwoTone.vue';
import TrackList from '@/components/TrackList.vue';

export default {
  name: 'CachedTracks',
  components: {
    ButtonTwoTone,
    TrackList,
  },
  data() {
    return {
      show: false,
      tracks: [],
    };
  },
  computed: {
    isElectron() {
      return process.env.IS_ELECTRON;
    },
  },
  created() {
    this.loadTracks();
    this.$parent.$refs.main?.scrollTo(0, 0);
  },
  activated() {
    this.loadTracks();
  },
  methods: {
    async loadTracks() {
      NProgress.start();
      try {
        const cached = await getCachedTracks();
        const songs = cached.filter(t => t.detail);
        const missingIDs = cached.filter(t => !t.detail).map(t => t.id);
        let tracks = mapTrackPlayableStatus(
          songs.map(t => t.detail),
          songs.map(t => t.privileges).filter(Boolean)
        );
        // 没有本地详情的歌曲尝试联网补全（离线时直接跳过）
        for (let i = 0; i < missingIDs.length; i += 500) {
          try {
            const data = await getTrackDetail(
              missingIDs.slice(i, i + 500).join(',')
            );
            tracks = tracks.concat(data?.songs?.filter(Boolean) ?? []);
          } catch (e) {
            break;
          }
        }
        // 已缓存的歌曲一定能播放
        const order = new Map(cached.map((t, i) => [t.id, i]));
        this.tracks = tracks
          .map(t => ({ ...t, playable: true, reason: '' }))
          .sort((a, b) => order.get(a.id) - order.get(b.id));
      } finally {
        NProgress.done();
        this.show = true;
      }
    },
    playAll() {
      if (this.tracks.length === 0) return;
      const trackIDs = this.tracks.map(t => t.id);
      this.$store.state.player.replacePlaylist(trackIDs, '/cached', 'url');
    },
    removeTrack(trackID) {
      this.tracks = this.tracks.filter(t => t.id !== trackID);
    },
  },
};
</script>

<style lang="scss" scoped>
// 与 dailyTracks.vue（每日推荐）的头部保持一致
.special-playlist {
  margin-top: 192px;
  margin-bottom: 128px;
  border-radius: 1.25em;
  text-align: center;

  @keyframes letterSpacing4 {
    from {
      letter-spacing: 0px;
    }
    to {
      letter-spacing: 4px;
    }
  }

  @keyframes letterSpacing1 {
    from {
      letter-spacing: 0px;
    }
    to {
      letter-spacing: 1px;
    }
  }

  .title {
    font-size: 84px;
    line-height: 1.05;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 4px;
    animation-duration: 0.8s;
    animation-name: letterSpacing4;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
  }
  .subtitle {
    font-size: 18px;
    letter-spacing: 1px;
    margin: 28px 0 54px 0;
    animation-duration: 0.8s;
    animation-name: letterSpacing1;
    text-transform: uppercase;
    color: var(--color-text);
  }
  .buttons {
    margin-top: 32px;
    display: flex;
    justify-content: center;
    button {
      margin-right: 16px;
    }
  }
}

.gradient {
  background: linear-gradient(to left, #0072ff, #00c6ff);
}

.empty {
  text-align: center;
  font-size: 14px;
  color: var(--color-text);
  opacity: 0.68;
  margin-top: -64px;
  margin-bottom: 64px;
}
</style>
