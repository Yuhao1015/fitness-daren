import type { IAppOption } from '../../../app';
import { dishBookVM, loadDishBook } from '../../../core/collection';
import { RECIPES } from '../../../core/recipes';

const ctx = () => getApp<IAppOption>().ctx;

Page({
  data: { vm: null as ReturnType<typeof dishBookVM> | null },
  onShow() {
    const c = ctx();
    this.setData({ vm: dishBookVM(loadDishBook(c.storage), RECIPES, c.today()) });
  },
  onBack() {
    wx.navigateBack();
  },
});
