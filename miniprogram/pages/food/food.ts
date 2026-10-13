import type { IAppOption } from '../../app';
import { addDays } from '../../core/date';
import { addFood, removeFood } from '../../core/day-ops';
import { calcMeat, frequentFoods, portionDraft, type PortionMult } from '../../core/food';
import type { FoodDraft } from '../../core/types';
import { dayBurn } from '../../core/workout';
import { newId } from '../../services/ids';
import { setTab, toast } from '../../services/ui';
import { DEFAULT_FOOD_UI, buildFoodVM, quickList, type FoodUI, type FoodVM } from '../../viewmodels/food';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let ui: FoodUI = { ...DEFAULT_FOOD_UI };
/** 刚记入的一条，toast 里点「撤回」时删掉它 */
let lastAdded = '';

function recentDesc() {
  const c = ctx();
  const t = c.today();
  return c.days.range(addDays(t, -13), t).reverse();
}

Page({
  data: { vm: null as FoodVM | null },

  onShow() {
    setTab(this, 2);
    this.refresh();
  },

  refresh() {
    const c = ctx();
    const t = c.today();
    const day = c.days.getOrEmpty(t);
    this.setData({ vm: buildFoodVM({ today: t, day, recentDesc: recentDesc(), burn: dayBurn(day, c.profile.get().bodyweightKg), profile: c.profile.get(), ui }) });
  },

  set(patch: Partial<FoodUI>) {
    ui = { ...ui, ...patch };
    this.refresh();
  },

  add(draft: FoodDraft) {
    const c = ctx();
    const now = Date.now();
    const id = newId('f', now);
    c.days.update(c.today(), (d) => addFood(d, { ...draft, id, at: now }));
    c.syncSoon();
    lastAdded = id;
    this.refresh();
    toast(this, `已记入 +${draft.kcal} kcal`, '撤回');
  },

  onUndoAdd() {
    if (!lastAdded) return;
    const c = ctx();
    const id = lastAdded;
    lastAdded = '';
    c.days.update(c.today(), (d) => removeFood(d, id));
    c.syncSoon();
    this.refresh();
    toast(this, '已撤回');
  },

  onInfo(e: Ev) {
    const k = e.currentTarget.dataset.key as string;
    this.set({ infoOpen: ui.infoOpen === k ? null : k });
  },
  onMeat(e: Ev) { this.set({ meat: e.currentTarget.dataset.id }); },
  onMethod(e: Ev) { this.set({ method: e.currentTarget.dataset.id }); },
  onPreset(e: Ev) { this.set({ grams: Number(e.currentTarget.dataset.id) }); },
  onGramsDec() { this.set({ grams: Math.max(25, ui.grams - 25) }); },
  onGramsInc() { this.set({ grams: Math.min(1000, ui.grams + 25) }); },
  onAddMeat() { this.add(calcMeat(ui.meat, ui.method, ui.grams)); },
  onQuickTab(e: Ev) {
    const tab = e.currentTarget.dataset.id as FoodUI['quickTab'];
    this.set({ quickTab: tab, quickId: quickList(tab)[0], quickMult: 1 });
  },
  onQuickItem(e: Ev) { this.set({ quickId: e.currentTarget.dataset.id }); },
  onQuickMult(e: Ev) { this.set({ quickMult: Number(e.currentTarget.dataset.id) as PortionMult }); },
  onAddQuick() { this.add(portionDraft(ui.quickId, ui.quickMult)); },
  onAddFrequent(e: Ev) {
    const d = frequentFoods(recentDesc(), 5)[Number(e.currentTarget.dataset.idx)];
    if (d) this.add(d);
  },
  onRemove(e: Ev) {
    const c = ctx();
    c.days.update(c.today(), (d) => removeFood(d, e.currentTarget.dataset.id as string));
    c.syncSoon();
    this.refresh();
  },
});
