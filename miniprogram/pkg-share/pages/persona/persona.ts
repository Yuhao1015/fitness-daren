import type { IAppOption } from '../../../app';
import { APP_NAME } from '../../../config';
import type { PartId } from '../../../core/catalog';
import { QUIZ, computePersona, quizPersona, type PersonaResult, type Rhythm, type TimeSlot } from '../../../core/persona16';
import { buildPersonaCard } from '../../../core/poster/extra';
import { sharePath } from '../../../core/share-link';
import { renderToFile } from '../../../services/canvas';
import { createShare } from '../../../services/share';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let answers: Record<string, string> = {};

Page({
  data: {
    mode: 'mine' as 'mine' | 'quiz',
    step: 0,
    quiz: QUIZ,
    result: null as PersonaResult | null,
    cardSrc: '',
  },

  onLoad(q: Record<string, string | undefined>) {
    answers = {};
    if (q.quiz === '1') {
      this.setData({ mode: 'quiz', step: 0, result: null });
      return;
    }
    const c = ctx();
    const result = computePersona(c.days.all(), c.days.doneDayKeys(), c.today());
    this.setData({ mode: 'mine', result });
    if (result.unlocked) this.renderCard(result);
  },

  async renderCard(r: PersonaResult) {
    const src = await renderToFile(this, 'persona-canvas', (m) => buildPersonaCard({ appName: APP_NAME, name: r.name, desc: r.desc, color: r.color, predicted: r.predicted }, m)).catch(() => '');
    this.setData({ cardSrc: src });
  },

  onAnswer(e: Ev) {
    const { qid, value } = e.currentTarget.dataset as { qid: string; value: string };
    answers[qid] = value;
    const next = this.data.step + 1;
    if (next < QUIZ.length) {
      this.setData({ step: next });
      return;
    }
    const result = quizPersona({ time: answers.time as TimeSlot, rhythm: answers.rhythm as Rhythm, part: answers.part as PartId });
    this.setData({ result, step: next });
    this.renderCard(result);
  },

  onStart() {
    wx.switchTab({ url: '/pages/today/today' });
  },

  onShareAppMessage() {
    const r = this.data.result;
    const c = ctx();
    if (!r || !r.unlocked) return { title: '测测你是哪种健身人格', path: '/pkg-share/pages/persona/persona?quiz=1' };
    const base = { title: `我是「${r.name}」，测测你是哪种健身人格`, path: '/pkg-share/pages/persona/persona?quiz=1', imageUrl: this.data.cardSrc || undefined };
    return {
      ...base,
      promise: createShare(c.api, 'persona', { name: r.name, desc: r.desc, color: r.color, predicted: r.predicted }).then((id) => (id ? { ...base, path: sharePath(id) } : base)),
    };
  },
});
