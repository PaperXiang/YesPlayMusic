<template>
  <div v-show="show" class="podcast-page">
    <div class="podcast-info">
      <Cover
        :id="radio.id || 0"
        :image-url="(radio.picUrl || '') | resizeImage(1024)"
        :always-show-shadow="true"
        :click-cover-to-play="true"
        :fixed-size="288"
        type="podcast"
        :cover-hover="false"
        :play-button-size="18"
        @click.right.native.prevent
      />
      <div class="info">
        <div class="title">{{ radio.name }}</div>
        <div class="artist">
          <span v-if="radio.dj">{{ radio.dj.nickname }}</span>
          <span v-if="radio.category"> · {{ radio.category }}</span>
        </div>
        <div class="date-and-count">
          {{ $t('podcast.programCount', { count: radio.programCount || 0 }) }}
          · {{ $t('podcast.subCount', { count: formatCount(radio.subCount) }) }}
        </div>
        <div class="description" :title="radio.desc">{{ radio.desc }}</div>
        <div class="buttons">
          <ButtonTwoTone icon-class="play" @click.native="playAll">
            {{ $t('common.play') }}
          </ButtonTwoTone>
          <ButtonTwoTone
            v-if="isLoggedIn"
            :icon-class="radio.subed ? 'heart-solid' : 'heart'"
            :icon-button="true"
            :horizontal-padding="0"
            :color="radio.subed ? 'blue' : 'grey'"
            :text-color="radio.subed ? '#335eea' : ''"
            :background-color="radio.subed ? 'var(--color-secondary-bg)' : ''"
            :title="
              radio.subed ? $t('podcast.unsubscribe') : $t('podcast.subscribe')
            "
            @click.native="toggleSubscribe"
          />
        </div>
      </div>
    </div>

    <div class="programs-header">
      <div class="section-title">{{ $t('podcast.programs') }}</div>
      <div class="sort" @click="toggleOrder">
        {{ asc ? $t('podcast.oldestFirst') : $t('podcast.newestFirst') }}
      </div>
    </div>

    <div class="programs">
      <div
        v-for="program in programs"
        :key="program.id"
        class="program"
        :class="{ playing: isCurrent(program) }"
        @dblclick="play(program)"
      >
        <img
          class="program-cover"
          :src="program.coverUrl | resizeImage(224)"
          loading="lazy"
          @click="play(program)"
        />
        <div class="program-main">
          <div class="program-name" :title="program.name">{{
            program.name
          }}</div>
          <div class="program-meta">
            <span>#{{ program.serialNum }}</span>
            <span>{{ formatDate(program.createTime) }}</span>
            <span>{{ formatDuration(program.duration) }}</span>
            <span v-if="program.listenerCount">
              <svg-icon icon-class="play" />{{
                formatCount(program.listenerCount)
              }}</span
            >
            <span
              v-if="progressText(program)"
              class="progress"
              :class="{ finished: isFinished(program) }"
              >{{ progressText(program) }}</span
            >
          </div>
        </div>
        <button class="play-button" @click="play(program)">
          <svg-icon :icon-class="isPlaying(program) ? 'pause' : 'play'" />
        </button>
      </div>
    </div>

    <div v-if="hasMore" class="load-more">
      <ButtonTwoTone color="grey" @click.native="loadMore">
        {{ loadingMore ? $t('podcast.loading') : $t('podcast.loadMore') }}
      </ButtonTwoTone>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import NProgress from 'nprogress';
import dayjs from 'dayjs';
import Cover from '@/components/Cover.vue';
import ButtonTwoTone from '@/components/ButtonTwoTone.vue';
import { isAccountLoggedIn } from '@/utils/auth';
import {
  podcastDetail,
  podcastPrograms,
  subscribePodcast,
} from '@/api/podcast';
import {
  PODCAST_FINISHED,
  getPodcastProgress,
  programToTrack,
} from '@/utils/podcast';

const PAGE_SIZE = 50;

export default {
  name: 'Podcast',
  components: { Cover, ButtonTwoTone },
  data() {
    return {
      show: false,
      radio: {},
      programs: [],
      hasMore: false,
      loadingMore: false,
      asc: false,
      // 用于在播放进度变化后刷新"剩余时间"
      progressVersion: 0,
      progressTicker: null,
    };
  },
  computed: {
    ...mapState(['player']),
    isLoggedIn() {
      return isAccountLoggedIn();
    },
  },
  watch: {
    '$route.params.id'(id) {
      if (id && this.$route.name === 'podcast') this.load();
    },
  },
  created() {
    this.load();
    this.progressTicker = setInterval(() => this.progressVersion++, 5000);
  },
  beforeDestroy() {
    clearInterval(this.progressTicker);
  },
  methods: {
    ...mapActions(['showToast']),
    load() {
      const rid = Number(this.$route.params.id);
      this.show = false;
      this.programs = [];
      NProgress.start();
      Promise.all([
        podcastDetail(rid).then(data => (this.radio = data.data || {})),
        this.fetchPrograms(rid, 0),
      ])
        .catch(() => this.showToast(this.$t('podcast.loadFailed')))
        .finally(() => {
          NProgress.done();
          this.show = true;
        });
    },
    fetchPrograms(rid, offset) {
      return podcastPrograms({
        rid,
        offset,
        limit: PAGE_SIZE,
        asc: this.asc,
      }).then(data => {
        this.programs = this.programs.concat(data.programs ?? []);
        this.hasMore = !!data.more;
      });
    },
    loadMore() {
      if (this.loadingMore) return;
      this.loadingMore = true;
      this.fetchPrograms(this.radio.id, this.programs.length).finally(() => {
        this.loadingMore = false;
      });
    },
    toggleOrder() {
      this.asc = !this.asc;
      this.programs = [];
      this.fetchPrograms(this.radio.id, 0);
    },
    playAll() {
      this.player.playPodcastPrograms(this.programs, this.radio.id);
    },
    play(program) {
      if (this.isPlaying(program) || this.isCurrent(program)) {
        this.player.playOrPause();
        return;
      }
      const trackID = programToTrack(program).id;
      this.player.playPodcastPrograms(this.programs, this.radio.id, trackID);
    },
    isCurrent(program) {
      return this.player.currentTrack?.podcast?.programId === program.id;
    },
    isPlaying(program) {
      return this.isCurrent(program) && this.player.playing;
    },
    toggleSubscribe() {
      const subscribe = !this.radio.subed;
      subscribePodcast(this.radio.id, subscribe).then(data => {
        if (data.code === 200) {
          this.radio.subed = subscribe;
          this.showToast(
            subscribe
              ? this.$t('podcast.subscribed')
              : this.$t('podcast.unsubscribed')
          );
        }
      });
    },
    trackProgress(program) {
      // 依赖 progressVersion，让模板定期重新计算
      return this.progressVersion >= 0
        ? getPodcastProgress(programToTrack(program).id)
        : 0;
    },
    isFinished(program) {
      return this.trackProgress(program) === PODCAST_FINISHED;
    },
    progressText(program) {
      const progress = this.trackProgress(program);
      if (progress === PODCAST_FINISHED) return this.$t('podcast.finished');
      if (progress <= 0) return '';
      const left = Math.max(0, (program.duration || 0) / 1000 - progress);
      return this.$t('podcast.minutesLeft', {
        n: Math.max(1, Math.round(left / 60)),
      });
    },
    formatDate(time) {
      return time ? dayjs(time).format('YYYY-MM-DD') : '';
    },
    formatDuration(ms) {
      const total = Math.round((ms || 0) / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0)
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(
          2,
          '0'
        )}`;
      return `${m}:${String(s).padStart(2, '0')}`;
    },
    formatCount(count) {
      if (!count) return '0';
      const locale = this.$i18n.locale || '';
      if (locale.startsWith('zh')) {
        if (count >= 1e8)
          return (count / 1e8).toFixed(1) + (locale === 'zh-TW' ? '億' : '亿');
        if (count >= 1e4)
          return (count / 1e4).toFixed(1) + (locale === 'zh-TW' ? '萬' : '万');
        return String(count);
      }
      if (count >= 1e6) return (count / 1e6).toFixed(1) + 'M';
      if (count >= 1e3) return (count / 1e3).toFixed(1) + 'K';
      return String(count);
    },
  },
};
</script>

<style lang="scss" scoped>
// 头部与 album.vue / playlist.vue 保持一致
.podcast-page {
  margin-top: 32px;
  color: var(--color-text);
}

.podcast-info {
  display: flex;
  width: 78vw;
  margin-bottom: 72px;
  .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    margin-left: 56px;
    color: var(--color-text);
    .title {
      font-size: 56px;
      font-weight: 700;
    }
    .artist {
      font-size: 18px;
      opacity: 0.88;
      margin-top: 24px;
    }
    .date-and-count {
      font-size: 14px;
      opacity: 0.68;
      margin-top: 2px;
    }
    .description {
      font-size: 14px;
      opacity: 0.68;
      margin-top: 24px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      white-space: pre-line;
    }
    .buttons {
      margin-top: 32px;
      display: flex;
      button {
        margin-right: 16px;
      }
    }
  }
}

// 标题行与首页 / 歌手页的分区标题一致
.programs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  .section-title {
    font-size: 28px;
    font-weight: 700;
  }
  .sort {
    font-size: 16px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 8px;
    opacity: 0.68;
    cursor: pointer;
    transition: 0.2s;
    &:hover {
      opacity: 1;
      background-color: var(--color-secondary-bg);
    }
  }
}

// 节目行与 TrackListItem 保持一致
.program {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 12px;
  user-select: none;
  &:hover {
    background: var(--color-secondary-bg);
    .play-button {
      opacity: 1;
    }
  }
  &.playing {
    background: var(--color-primary-bg);
    color: var(--color-primary);
    .program-name,
    .play-button {
      color: var(--color-primary);
    }
    .program-meta {
      color: var(--color-primary);
      opacity: 0.78;
    }
    .play-button {
      opacity: 1;
    }
  }
}

.program-cover {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  margin-right: 20px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.program-main {
  flex: 1;
  min-width: 0;
  .program-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
    padding-right: 16px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    word-break: break-all;
  }
  .program-meta {
    margin-top: 2px;
    font-size: 13px;
    opacity: 0.68;
    color: var(--color-text);
    display: flex;
    flex-wrap: wrap;
    gap: 0 12px;
    .svg-icon {
      width: 10px;
      height: 10px;
      margin-right: 3px;
    }
    .progress {
      font-weight: 600;
      color: var(--color-primary);
      &.finished {
        color: var(--color-text);
      }
    }
  }
}

// 与 TrackListItem 悬停时的播放按钮一致
.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: 0 8px;
  background: transparent;
  border-radius: 25%;
  color: var(--color-text);
  opacity: 0;
  transition: transform 0.2s;
  .svg-icon {
    width: 16px;
    height: 16px;
  }
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(0.96);
  }
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
</style>
