export type IngredientCat = 'protein' | 'dairy' | 'carb' | 'veg' | 'fruit' | 'fat' | 'herb';

export interface Ingredient {
  id: string;
  name: string;
  cat: IngredientCat;
  /** 每 100g */
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** 一份的说法与克数；label 以「一」开头（「少许」除外） */
  portion: { label: string; g: number };
}

function ing(id: string, name: string, cat: IngredientCat, kcal: number, p: number, c: number, f: number, label: string, g: number): Ingredient {
  return { id, name, cat, kcal, p, c, f, portion: { label, g } };
}

export const INGREDIENTS: Ingredient[] = [
  ing('chicken-breast', '鸡胸肉', 'protein', 118, 24, 0, 1.9, '一掌', 100),
  ing('chicken-thigh', '鸡腿肉', 'protein', 146, 19, 0, 7.5, '一掌', 100),
  ing('beef-lean', '瘦牛肉', 'protein', 125, 21, 0, 4.5, '一掌', 100),
  ing('pork-loin', '猪里脊', 'protein', 155, 20, 0, 8.3, '一掌', 100),
  ing('salmon', '三文鱼', 'protein', 208, 20, 0, 13.4, '一掌', 100),
  ing('shrimp', '虾仁', 'protein', 87, 18, 1.5, 0.8, '一掌', 100),
  ing('egg', '鸡蛋', 'protein', 144, 13.3, 2.8, 8.8, '一个', 50),
  ing('greek-yogurt', '希腊酸奶', 'dairy', 97, 9, 3.9, 5, '一杯', 200),
  ing('rice-cooked', '米饭', 'carb', 116, 2.6, 25.9, 0.3, '一碗', 150),
  ing('brown-rice-cooked', '糙米饭', 'carb', 123, 2.7, 25.6, 1, '一碗', 150),
  ing('quinoa-dry', '藜麦', 'carb', 368, 14.1, 64.2, 6.1, '一份', 60),
  ing('ww-pasta-dry', '全麦意面', 'carb', 352, 13, 72, 2.5, '一份', 80),
  ing('oats-dry', '燕麦片', 'carb', 379, 13.2, 67.7, 6.5, '一份', 40),
  ing('sweet-potato', '红薯', 'carb', 86, 1.6, 20.1, 0.1, '一个', 200),
  ing('corn-kernels', '玉米粒', 'carb', 86, 3.3, 19, 1.4, '一份', 100),
  ing('ww-bread', '全麦面包', 'carb', 247, 13, 41.3, 3.4, '一片', 35),
  ing('broccoli', '西兰花', 'veg', 34, 2.8, 6.6, 0.4, '一捧', 100),
  ing('spinach', '菠菜', 'veg', 23, 2.9, 3.6, 0.4, '一捧', 100),
  ing('asparagus', '芦笋', 'veg', 20, 2.2, 3.9, 0.1, '一捧', 80),
  ing('cherry-tomato', '小番茄', 'veg', 18, 0.9, 3.9, 0.2, '一捧', 100),
  ing('cucumber', '黄瓜', 'veg', 15, 0.7, 3.6, 0.1, '一根', 100),
  ing('banana', '香蕉', 'fruit', 89, 1.1, 22.8, 0.3, '一根', 100),
  ing('blueberry', '蓝莓', 'fruit', 57, 0.7, 14.5, 0.3, '一捧', 50),
  ing('lemon', '柠檬', 'fruit', 29, 1.1, 9.3, 0.3, '一片', 10),
  ing('olive-oil', '橄榄油', 'fat', 884, 0, 0, 100, '一勺', 10),
  ing('basil', '罗勒', 'herb', 23, 3.2, 2.7, 0.6, '少许', 2),
];

export function ingredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}
