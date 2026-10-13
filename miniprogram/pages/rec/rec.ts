import type { IAppOption } from '../../app';
import { APP_NAME } from '../../config';
import { collectDish, loadDishBook, loadFavorites, toggleFavorite } from '../../core/collection';
import { addDays } from '../../core/date';
import { addFood } from '../../core/day-ops';
import { composeDish } from '../../core/dish';
import { buildDishCard } from '../../core/poster/cards';
import { RECIPES, recipeById, recipeDraft } from '../../core/recipes';
import { sharePath } from '../../core/share-link';
import { dayBurn } from '../../core/workout';
import { spriteSrc } from '../../services/assets';
import { renderToFile } from '../../services/canvas';
import { newId } from '../../services/ids';
import { navFlags } from '../../services/nav';
import { createShare } from '../../services/share';
import { setTab, toast } from '../../services/ui';
import { buildRecVM, recentRecipeIds, type RecVM } from '../../viewmodels/rec';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let index = 0;
let seq = 0;
let infoOpen: string | null = null;

Page({
  data: { vm: null as RecVM | null, cmd: '', flipped: false, shareImg: '' },

  onShow() {
    setTab(this, 3);
    if (navFlags.resetRec) {
      navFlags.resetRec = false;
      index = 0;
    }
    this.refresh();
  },

  refresh(extra: Record<string, unknown> = {}) {
    const c = ctx();
    const t = c.today();
    const day = c.days.getOrEmpty(t);
    const vm = buildRecVM({
      today: t,
      parts: day.parts,
      burn: dayBurn(day, c.profile.get().bodyweightKg),
      profile: c.profile.get(),
      favorites: loadFavorites(c.storage),
      recentRecipeIds: recentRecipeIds(c.days.range(addDays(t, -2), addDays(t, -1))),
      addedRecipeIds: day.food.map((f) => f.recipeId).filter((x): x is string => !!x),
      collectedIds: Object.keys(loadDishBook(c.storage)),
      index,
      infoOpen,
    });
    this.setData({ vm, ...extra });
  },

  /** WXS 动画把卡片划出去之后调用 */
  onSwipeNext() {
    setTimeout(() => {
      index += 1;
      this.refresh({ cmd: `reset:${++seq}`, flipped: false, shareImg: '' });
    }, 200);
  },

  onNextTap() {
    this.setData({ cmd: `next:${++seq}` });
  },

  onUndo() {
    index -= 1;
    this.refresh({ cmd: `undo:${++seq}`, flipped: false, shareImg: '' });
  },

  onAdd() {
    const vm = this.data.vm;
    if (!vm) return;
    const draft = recipeDraft(recipeById(vm.card.recipeId));
    const c = ctx();
    const now = Date.now();
    c.days.update(c.today(), (d) => addFood(d, { ...draft, id: newId('f', now), at: now }));
    const { isNew, count } = collectDish(c.storage, vm.card.recipeId, now);
    c.syncSoon();
    this.refresh();
    toast(this, `已记入今日饮食 +${draft.kcal} kcal` + (isNew ? ` · 新收录到图鉴（${count}/${RECIPES.length}）` : ''));
  },

  onGoFood() {
    wx.switchTab({ url: '/pages/food/food' });
  },

  onInfo(e: Ev) {
    const k = e.currentTarget.dataset.key as string;
    infoOpen = infoOpen === k ? null : k;
    this.refresh();
  },

  onFlip() {
    const flipped = !this.data.flipped;
    this.setData({ flipped });
    if (flipped && !this.data.shareImg) this.prepareShareImage();
  },

  async prepareShareImage() {
    const vm = this.data.vm;
    if (!vm) return;
    const r = recipeById(vm.card.recipeId);
    try {
      const img = await renderToFile(this, 'share-canvas', (m) =>
        buildDishCard({ appName: APP_NAME, name: vm.card.name, kcal: vm.card.kcal, p: vm.card.p, tint: vm.card.tint, layers: composeDish(r).map((l) => spriteSrc(l.sprite)) }, m),
      );
      this.setData({ shareImg: img });
    } catch (e) {
      console.warn('[rec] share image failed', e);
    }
  },

  onFav() {
    const vm = this.data.vm;
    if (!vm) return;
    const on = toggleFavorite(ctx().storage, vm.card.recipeId);
    toast(this, on ? '已收藏，之后会更常推荐它' : '已取消收藏');
    this.refresh();
  },

  /** 分享按钮用 catchtap 挡住冒泡，避免同时触发翻面 */
  onNoop() {},

  onShareAppMessage() {
    const vm = this.data.vm;
    const c = ctx();
    if (!vm) return { title: '练后吃什么', path: '/pages/rec/rec' };
    const base = {
      title: `练后吃这个：${vm.card.name}，${vm.card.kcal} kcal · 蛋白质 ${vm.card.p}g`,
      path: '/pages/rec/rec',
      imageUrl: this.data.shareImg || undefined,
    };
    if (!c.api) return base;
    return {
      ...base,
      promise: createShare(c.api, 'dish', { recipeId: vm.card.recipeId }).then((id) => (id ? { ...base, path: sharePath(id) } : base)),
    };
  },
});
