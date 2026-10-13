export type PartId = 'leg' | 'chest' | 'arm' | 'shoulder' | 'back' | 'core' | 'cardio';
export type StrengthPart = Exclude<PartId, 'cardio'>;

export interface Part {
  id: PartId;
  name: string;
  color: string;
}

export const PARTS: Part[] = [
  { id: 'leg', name: '腿', color: '#3B6FB6' },
  { id: 'chest', name: '胸', color: '#E07B39' },
  { id: 'arm', name: '手臂', color: '#8A63C7' },
  { id: 'shoulder', name: '肩', color: '#2A9D8F' },
  { id: 'back', name: '背', color: '#B5523B' },
  { id: 'core', name: '腹', color: '#C99A1E' },
  { id: 'cardio', name: '有氧', color: '#D1497A' },
];

export const PART_IDS: PartId[] = PARTS.map((p) => p.id);

export function partById(id: PartId): Part {
  const p = PARTS.find((x) => x.id === id);
  if (!p) throw new Error('unknown part ' + id);
  return p;
}

/** 按目录顺序排序并去重 */
export function sortParts(ids: PartId[]): PartId[] {
  return PART_IDS.filter((id) => ids.includes(id));
}

export type Unit = 'reps' | 'secs';

export interface Exercise {
  id: string;
  part: StrengthPart;
  name: string;
  /** 每组约消耗 kcal（按 70kg 体重） */
  kcalPerSet: number;
  /** 默认重量 kg；null = 自重 */
  defaultW: number | null;
  defaultR: number;
  unit: Unit;
  compound: boolean;
}

function ex(id: string, part: StrengthPart, name: string, kcalPerSet: number, defaultW: number | null, defaultR: number, compound: boolean, unit: Unit = 'reps'): Exercise {
  return { id, part, name, kcalPerSet, defaultW, defaultR, unit, compound };
}

export const EXERCISES: Exercise[] = [
  ex('squat', 'leg', '杠铃深蹲', 12, 60, 8, true),
  ex('leg-press', 'leg', '腿举', 9, 100, 10, true),
  ex('lunge', 'leg', '箭步蹲', 8, 16, 10, true),
  ex('leg-curl', 'leg', '坐姿腿弯举', 6, 30, 12, false),
  ex('bench-press', 'chest', '杠铃卧推', 9, 50, 8, true),
  ex('incline-db-press', 'chest', '上斜哑铃卧推', 8, 18, 10, true),
  ex('db-fly', 'chest', '哑铃飞鸟', 6, 10, 12, false),
  ex('push-up', 'chest', '俯卧撑', 6, null, 15, true),
  ex('barbell-curl', 'arm', '杠铃弯举', 5, 25, 10, false),
  ex('hammer-curl', 'arm', '锤式弯举', 5, 12, 12, false),
  ex('pushdown', 'arm', '绳索下压', 5, 20, 12, false),
  ex('close-grip-bench', 'arm', '窄距卧推', 7, 40, 8, true),
  ex('db-shoulder-press', 'shoulder', '哑铃推举', 7, 16, 10, true),
  ex('lateral-raise', 'shoulder', '侧平举', 5, 7, 15, false),
  ex('face-pull', 'shoulder', '面拉', 5, 20, 15, false),
  ex('arnold-press', 'shoulder', '阿诺德推举', 7, 14, 10, true),
  ex('deadlift', 'back', '硬拉', 12, 80, 5, true),
  ex('pull-up', 'back', '引体向上', 9, null, 8, true),
  ex('barbell-row', 'back', '杠铃划船', 9, 50, 8, true),
  ex('lat-pulldown', 'back', '高位下拉', 7, 45, 10, true),
  ex('hanging-leg-raise', 'core', '悬垂举腿', 6, null, 12, false),
  ex('crunch', 'core', '卷腹', 4, null, 20, false),
  ex('plank', 'core', '平板支撑', 5, null, 60, false, 'secs'),
  ex('russian-twist', 'core', '俄罗斯转体', 5, 5, 20, false),
];

export function exercisesOf(part: StrengthPart): Exercise[] {
  return EXERCISES.filter((e) => e.part === part);
}

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** 组间休息：复合动作 120 秒，孤立动作 90 秒 */
export function restSeconds(e: Exercise): number {
  return e.compound ? 120 : 90;
}

export type CardioTypeId = 'run' | 'bike' | 'ellip' | 'rope' | 'other';

export const CARDIO_TYPES: { id: CardioTypeId; name: string; kcalPerMin: number }[] = [
  { id: 'run', name: '跑步', kcalPerMin: 10 },
  { id: 'bike', name: '骑行', kcalPerMin: 7 },
  { id: 'ellip', name: '椭圆机', kcalPerMin: 8 },
  { id: 'rope', name: '跳绳', kcalPerMin: 11 },
  { id: 'other', name: '其他', kcalPerMin: 6 },
];

export interface TemplateDay {
  label: string;
  parts: PartId[];
}

export interface Template {
  id: string;
  name: string;
  cycle: TemplateDay[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'ppl',
    name: '推 / 拉 / 腿',
    cycle: [
      { label: '推 · 胸肩臂', parts: ['chest', 'shoulder', 'arm'] },
      { label: '拉 · 背臂', parts: ['back', 'arm'] },
      { label: '腿 · 腿腹', parts: ['leg', 'core'] },
      { label: '休息', parts: [] },
    ],
  },
  {
    id: 'upper-lower',
    name: '上下肢分化',
    cycle: [
      { label: '上肢', parts: ['chest', 'shoulder', 'arm', 'back'] },
      { label: '下肢 · 腿腹', parts: ['leg', 'core'] },
      { label: '休息', parts: [] },
    ],
  },
  {
    id: 'fullbody-cardio',
    name: '全身 + 有氧',
    cycle: [
      { label: '全身', parts: ['leg', 'chest', 'back'] },
      { label: '有氧', parts: ['cardio'] },
      { label: '休息', parts: [] },
    ],
  },
];

export function templateById(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error('unknown template ' + id);
  return t;
}

/** 「我的」力量进步曲线可选的四个主项 */
export const PROGRESS_LIFTS = ['bench-press', 'squat', 'deadlift', 'db-shoulder-press'];

export const PERSONA: Record<PartId, string> = {
  leg: '腿部狂魔',
  chest: '胸肌爱好者',
  arm: '手臂炮弹',
  shoulder: '肩宽担当',
  back: '背部雕刻师',
  core: '核心玩家',
  cardio: '有氧达人',
};

export const BALANCED_PERSONA = '均衡发展型';
