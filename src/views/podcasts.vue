<template>
  <div class="podcasts">
    <h1>{{ $t('podcast.title') }}</h1>

    <div class="search-box">
      <svg-icon icon-class="search" />
      <input
        v-model.trim="keywords"
        :placeholder="$t('podcast.searchPlaceholder')"
        @keydown.enter="doSearch"
      />
      <button v-if="searchResult !== null" class="clear" @click="clearSearch">
        <svg-icon icon-class="x" />
      </button>
    </div>

    <template v-if="searchResult !== null">
      <div class="section-title">{{
        $t('podcast.searchResult', { keywords: searchedKeywords })
      }}</div>
      <div v-if="searchResult.length === 0" class="tip">{{
        $t('podcast.noResult')
      }}</div>
      <CoverRow
        :items="searchResult"
        type="podcast"
        sub-text="podcast"
        :column-number="5"
      />
    </template>

    <template v-else>
      <template v-if="isLoggedIn">
        <div class="section-title">{{ $t('podcast.mySubscriptions') }}</div>
        <div v-if="subscribed.length === 0" class="tip">{{
          loading ? $t('podcast.loading') : $t('podcast.noSubscribed')
        }}</div>
        <CoverRow
          :items="subscribed"
          type="podcast"
          sub-text="podcast"
          :column-number="5"
        />
      </template>

      <div v-if="recommend.length" class="section-title">{{
        $t('podcast.recommend')
      }}</div>
      <CoverRow
        :items="recommend"
        type="podcast"
        sub-text="podcast"
        :column-number="5"
      />

      <div v-if="hot.length" class="section-title">{{ $t('podcast.hot') }}</div>
      <CoverRow
        :items="hot"
        type="podcast"
        sub-text="podcast"
        :column-number="5"
      />
    </template>
  </div>
</template>

<script>
import NProgress from 'nprogress';
import CoverRow from '@/components/CoverRow.vue';
import { isAccountLoggedIn } from '@/utils/auth';
import {
  hotPodcasts,
  recommendPodcasts,
  searchPodcasts,
  subscribedPodcasts,
} from '@/api/podcast';

export default {
  name: 'Podcasts',
  components: { CoverRow },
  data() {
    return {
      loading: true,
      subscribed: [],
      recommend: [],
      hot: [],
      keywords: '',
      searchedKeywords: '',
      searchResult: null,
    };
  },
  computed: {
    isLoggedIn() {
      return isAccountLoggedIn();
    },
  },
  created() {
    this.load();
  },
  activated() {
    // 从详情页订阅/取消订阅后返回时刷新订阅列表
    this.loadSubscribed();
  },
  methods: {
    load() {
      NProgress.start();
      const tasks = [
        this.loadSubscribed(),
        recommendPodcasts()
          .then(data => (this.recommend = (data.djRadios ?? []).slice(0, 10)))
          .catch(() => {}),
        hotPodcasts({ limit: 30 })
          .then(data => (this.hot = data.djRadios ?? []))
          .catch(() => {}),
      ];
      Promise.all(tasks).finally(() => {
        this.loading = false;
        NProgress.done();
      });
    },
    loadSubscribed() {
      if (!this.isLoggedIn) return Promise.resolve();
      return subscribedPodcasts()
        .then(data => (this.subscribed = data.djRadios ?? []))
        .catch(() => {});
    },
    doSearch() {
      if (!this.keywords) return;
      const keywords = this.keywords;
      NProgress.start();
      searchPodcasts(keywords)
        .then(data => {
          this.searchedKeywords = keywords;
          this.searchResult = data.result?.djRadios ?? [];
        })
        .finally(() => NProgress.done());
    },
    clearSearch() {
      this.keywords = '';
      this.searchResult = null;
    },
  },
};
</script>

<style lang="scss" scoped>
// 标题与 explore.vue 一致，分区标题与 home.vue 一致
h1 {
  color: var(--color-text);
  font-size: 56px;
}

.podcasts {
  color: var(--color-text);
}

// 搜索框与 Navbar 的搜索框一致
.search-box {
  display: flex;
  align-items: center;
  height: 32px;
  width: 260px;
  padding: 0 8px;
  border-radius: 8px;
  background: var(--color-secondary-bg-for-transparent);
  .svg-icon {
    height: 15px;
    width: 15px;
    color: var(--color-text);
    opacity: 0.28;
    margin: 0 4px;
    flex-shrink: 0;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    border: none;
    outline: none;
    background: transparent;
    font-weight: 600;
    margin-top: -1px;
    color: var(--color-text);
  }
  &:focus-within {
    background: var(--color-primary-bg-for-transparent);
    input,
    .svg-icon {
      opacity: 1;
      color: var(--color-primary);
    }
  }
  .clear {
    display: flex;
    padding: 2px;
    background: transparent;
    border-radius: 4px;
    .svg-icon {
      margin: 0;
    }
  }
}

.section-title {
  color: var(--color-text);
  font-size: 28px;
  font-weight: 700;
  margin-top: 54px;
  margin-bottom: 20px;
}

.tip {
  font-size: 14px;
  opacity: 0.68;
  margin-bottom: 20px;
}
</style>
