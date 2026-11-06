// 播客相关的工具函数。注意：这里不要引入 store，Player.js 也会用到本文件，避免循环依赖。

const PROGRESS_KEY = 'podcastProgress';
const MAX_PROGRESS_RECORDS = 500;
export const PODCAST_FINISHED = -1;

/**
 * 把播客节目转换成播放器可以使用的 track 结构
 * @param {Object} program /dj/program 返回的节目
 */
export function programToTrack(program) {
  const id = program.mainSong?.id || program.mainTrackId;
  const radio = program.radio || {};
  const host = radio.name || program.dj?.nickname || '';
  return {
    id,
    name: program.name,
    ar: [{ id: 0, name: host }],
    al: { id: 0, name: radio.name || '', picUrl: program.coverUrl },
    dt: program.duration || program.mainSong?.duration || 0,
    no: program.serialNum,
    fee: 0,
    mark: 0,
    privilege: { id, pl: 320000, st: 0, fee: 0 },
    playable: true,
    podcast: {
      programId: program.id,
      radioId: radio.id,
      createTime: program.createTime,
      listenerCount: program.listenerCount,
    },
  };
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/** 节目播放进度（秒），PODCAST_FINISHED 表示已播完，0 表示未播放 */
export function getPodcastProgress(trackID) {
  return readAll()[trackID] || 0;
}

export function setPodcastProgress(trackID, seconds) {
  const all = readAll();
  delete all[trackID];
  all[trackID] = seconds;
  const keys = Object.keys(all);
  // 只保留最近的记录（对象按插入顺序遍历）
  for (let i = 0; i < keys.length - MAX_PROGRESS_RECORDS; i++) {
    delete all[keys[i]];
  }
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch (e) {
    // localStorage 不可用时忽略
  }
}
