/** 应用名，出现在海报与分享卡上 */
export const APP_NAME = '健身达人';

/** 云开发环境 ID。空串 = 未配置，应用以纯本地模式运行（不同步、不能分享归因） */
export const CLOUD_ENV = '';

/** 云存储/CDN 上插画 PNG 与字体的 https 前缀（末尾不带 /）。空串 = 未配置 */
export const ASSET_BASE = '';

/** 订阅消息模板 ID（必须与云函数环境变量 TPL_TRAIN / TPL_NUDGE 一致）。空串 = 未配置，对应入口自动隐藏或提示 */
export const SUBSCRIBE_TEMPLATES = {
  trainReminder: '',
  challengeReminder: '',
  nudge: '',
};

/** 分阶段上线的功能开关：全部打开 */
export const FEATURES = {
  poster: true,
  share: true,
  social: true,
  badges: true,
};
