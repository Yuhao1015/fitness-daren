import { composeDish, STEAM } from '../../core/dish';
import { RECIPES } from '../../core/recipes';
import { spriteSrc } from '../../services/assets';

Component({
  options: { addGlobalClass: true },
  properties: {
    recipeId: { type: String, value: '' },
    hot: { type: Boolean, value: true },
    width: { type: Number, value: 369 },
  },
  data: { layers: [] as { key: string; src: string }[], steam: [] as { key: string; src: string; cls: string }[], height: 231 },
  observers: {
    'recipeId, hot, width': function (recipeId: string, hot: boolean, width: number) {
      const r = RECIPES.find((x) => x.id === recipeId);
      const layers = r ? composeDish(r).map((l) => ({ key: l.key, src: spriteSrc(l.sprite) })) : [];
      const steam = r && r.hot && hot ? STEAM.map((s, i) => ({ key: s, src: spriteSrc(s), cls: 'steam s' + (i + 1) })) : [];
      this.setData({ layers, steam, height: Math.round((width * 150) / 240) });
    },
  },
});
