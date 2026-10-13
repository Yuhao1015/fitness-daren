import type { FontKind, Measure, Op, PosterSpec, Weight } from '../core/poster/types';

const SCALE = 3;

type Ctx = WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D;
type Node = WechatMiniprogram.Canvas;

function fontOf(size: number, weight: Weight, font: FontKind): string {
  const family = font === 'num' ? '"Outfit", -apple-system, "PingFang SC", sans-serif' : '-apple-system, "PingFang SC", "HarmonyOS Sans SC", sans-serif';
  return `${weight} ${size}px ${family}`;
}

function canvasNode(page: WechatMiniprogram.Page.TrivialInstance, id: string): Promise<Node> {
  return new Promise((resolve, reject) => {
    page.createSelectorQuery().select('#' + id).fields({ node: true, size: true }).exec((res) => {
      const node = res && res[0] && res[0].node;
      if (node) resolve(node as Node);
      else reject(new Error('canvas not found: ' + id));
    });
  });
}

/** 网络 / 云存储图片先落本地，包内路径直接用 */
async function localPath(src: string): Promise<string> {
  if (src.startsWith('cloud://')) return (await wx.cloud.downloadFile({ fileID: src })).tempFilePath;
  if (/^https?:\/\//.test(src)) return (await wx.getImageInfo({ src })).path;
  return src;
}

function loadImage(canvas: Node, src: string): Promise<WechatMiniprogram.Image | null> {
  return localPath(src)
    .then(
      (path) =>
        new Promise<WechatMiniprogram.Image | null>((resolve) => {
          const img = canvas.createImage();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = path;
        }),
    )
    .catch(() => null);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function draw(ctx: Ctx, op: Op, imgs: Map<string, WechatMiniprogram.Image | null>): void {
  switch (op.k) {
    case 'rect':
      roundRect(ctx, op.x, op.y, op.w, op.h, op.r);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.sw;
        ctx.stroke();
      }
      break;
    case 'line':
      ctx.beginPath();
      ctx.setLineDash(op.dash);
      ctx.strokeStyle = op.color;
      ctx.lineWidth = op.width;
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2);
      ctx.fillStyle = op.fill;
      ctx.fill();
      if (op.ring) {
        ctx.strokeStyle = op.ring;
        ctx.lineWidth = op.ringWidth;
        ctx.stroke();
      }
      break;
    case 'text':
      ctx.font = fontOf(op.size, op.weight, op.font);
      ctx.fillStyle = op.color;
      ctx.textAlign = op.align;
      ctx.textBaseline = 'top';
      ctx.fillText(op.text, op.x, op.y);
      break;
    case 'image': {
      const img = imgs.get(op.src);
      if (!img) break;
      if (op.r > 0) {
        ctx.save();
        roundRect(ctx, op.x, op.y, op.w, op.h, op.r);
        ctx.clip();
        ctx.drawImage(img, op.x, op.y, op.w, op.h);
        ctx.restore();
      } else {
        ctx.drawImage(img, op.x, op.y, op.w, op.h);
      }
      break;
    }
    case 'rotate':
      ctx.save();
      ctx.translate(op.cx, op.cy);
      ctx.rotate((op.deg * Math.PI) / 180);
      ctx.translate(-op.cx, -op.cy);
      break;
    case 'restore':
      ctx.restore();
      break;
  }
}

/** 排版 → 绘制 → 导出 PNG 临时文件。页面里必须有 <canvas type="2d" id="{{canvasId}}"> */
export async function renderToFile(
  page: WechatMiniprogram.Page.TrivialInstance,
  canvasId: string,
  build: (measure: Measure) => PosterSpec,
): Promise<string> {
  const canvas = await canvasNode(page, canvasId);
  const probe = canvas.getContext('2d') as Ctx;
  const measure: Measure = (text, size, weight, font) => {
    probe.font = fontOf(size, weight, font);
    return probe.measureText(text).width;
  };
  const spec = build(measure);
  canvas.width = Math.round(spec.width * SCALE);
  canvas.height = Math.round(spec.height * SCALE);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(SCALE, SCALE);
  const imgs = new Map<string, WechatMiniprogram.Image | null>();
  await Promise.all(spec.images.map(async (src) => imgs.set(src, await loadImage(canvas, src))));
  for (const op of spec.ops) draw(ctx, op, imgs);
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({ canvas, fileType: 'png', success: (r) => resolve(r.tempFilePath), fail: reject });
  });
}
