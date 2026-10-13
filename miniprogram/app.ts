import { ASSET_BASE } from './config';
import { createAppContext, type AppContext } from './services/app-context';
import { cloudEnabled, initCloud, wxCloudApi } from './services/cloud';
import { WxStorage } from './services/store';

export interface IAppOption {
  ctx: AppContext;
}

App<IAppOption>({
  ctx: null as unknown as AppContext,
  onLaunch() {
    initCloud();
    if (ASSET_BASE) {
      wx.loadFontFace({
        family: 'Outfit',
        source: `url("${ASSET_BASE}/fonts/Outfit-Variable.woff2")`,
        global: true,
        fail: (e) => console.warn('[font] Outfit load failed, using system font', e),
      });
    }
    this.ctx = createAppContext(new WxStorage(), cloudEnabled() ? wxCloudApi : null);
    this.ctx.syncSoon();
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) this.ctx.syncSoon();
    });
  },
  onShow() {
    if (this.ctx) this.ctx.syncSoon();
  },
});
