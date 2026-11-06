import request from '@/utils/request';

/**
 * 热门播客（电台）
 * @param {{limit?: number, offset?: number}} params
 */
export function hotPodcasts(params = {}) {
  return request({
    url: '/dj/hot',
    method: 'get',
    params: { limit: 30, offset: 0, ...params },
  });
}

/**
 * 推荐播客
 */
export function recommendPodcasts() {
  return request({
    url: '/dj/recommend',
    method: 'get',
  });
}

/**
 * 我订阅的播客（需要登录）
 * @param {{limit?: number, offset?: number}} params
 */
export function subscribedPodcasts(params = {}) {
  return request({
    url: '/dj/sublist',
    method: 'get',
    params: {
      limit: 100,
      offset: 0,
      ...params,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 播客详情
 * @param {number} rid 播客 id
 */
export function podcastDetail(rid) {
  return request({
    url: '/dj/detail',
    method: 'get',
    params: { rid, timestamp: new Date().getTime() },
  });
}

/**
 * 播客节目列表
 * @param {{rid: number, limit?: number, offset?: number, asc?: boolean}} params
 */
export function podcastPrograms(params) {
  return request({
    url: '/dj/program',
    method: 'get',
    params: { limit: 50, offset: 0, asc: false, ...params },
  });
}

/**
 * 订阅 / 取消订阅播客
 * @param {number} rid 播客 id
 * @param {boolean} subscribe true 订阅，false 取消
 */
export function subscribePodcast(rid, subscribe) {
  return request({
    url: '/dj/sub',
    method: 'post',
    params: {
      rid,
      t: subscribe ? 1 : 0,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 搜索播客
 * @param {string} keywords
 */
export function searchPodcasts(keywords) {
  return request({
    url: '/search',
    method: 'get',
    params: { keywords, type: 1009, limit: 30 },
  });
}
