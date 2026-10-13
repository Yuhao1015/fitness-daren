// 极简微信小程序运行时（浏览器预览用）。
// 目标不是复刻微信，而是让「真实的 wxml / wxss / ts / wxs」在浏览器里原样跑起来，方便对照原型验收。
// 覆盖：Page / Component / App、setData、observers、生命周期、wx:if|elif|else|for、事件冒泡与 catch、
// data-* / dataset、自定义组件属性与 triggerEvent、WXS（含 change:xxx）、路由栈与自定义 tabBar、wx.* 的本地桩。
import morphdom from 'morphdom';

const S = {
  assets: null,
  reg: { page: new Map(), comp: new Map() },
  pending: null,
  app: null,
  stack: [],
  tabbar: null,
  viewport: null,
  parsed: new Map(),
  wxsCache: new Map(),
  device: { width: 390, height: 844, statusBar: 47, safeBottom: 34 },
  privacyCb: null,
};
window.__S = S;

/* ------------------------------------------------------------------ 工具 */
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const rpxToCalc = (s) => String(s).replace(/(-?\d*\.?\d+)rpx/g, (_, n) => `calc(${n} * var(--rpx))`);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v && typeof v === 'object';
function deepEqual(a, b) {
  if (a === b) return true;
  if (!isObj(a) || !isObj(b)) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}
function parseUrl(url) {
  const [p, q = ''] = url.split('?');
  const query = {};
  q.split('&').filter(Boolean).forEach((kv) => {
    const [k, v = ''] = kv.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  return { route: p.replace(/^\//, ''), query };
}
function setPath(obj, path, val) {
  const segs = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (!isObj(cur[segs[i]])) cur[segs[i]] = /^\d+$/.test(segs[i + 1]) ? [] : {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = val;
}
function getPath(obj, path) {
  const segs = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const s of segs) {
    if (cur == null) return undefined;
    cur = cur[s];
  }
  return cur;
}

/* ------------------------------------------------------------------ WXML 解析 */
const exprCache = new Map();
function compileExpr(code) {
  let fn = exprCache.get(code);
  if (!fn) {
    try {
      fn = new Function('__s', 'with(__s){return (' + code + '\n)}');
    } catch (e) {
      console.error('[wxml] bad expression', code, e);
      fn = () => undefined;
    }
    exprCache.set(code, fn);
  }
  return fn;
}
const SCOPE_TRAP = {
  has: (t, k) => typeof k === 'string' && (k in t || !(k in globalThis)),
  get: (t, k) => (k === Symbol.unscopables ? undefined : t[k]),
};
function evalFn(fn, scope) {
  try {
    return fn(new Proxy(scope, SCOPE_TRAP));
  } catch (e) {
    if (!(e instanceof TypeError)) console.warn('[wxml] eval error', e);
    return undefined;
  }
}
function parseParts(str) {
  if (str === true) return [{ lit: true }];
  const parts = [];
  let i = 0;
  while (i < str.length) {
    const s = str.indexOf('{{', i);
    if (s < 0) { parts.push({ t: str.slice(i) }); break; }
    if (s > i) parts.push({ t: str.slice(i, s) });
    const e = str.indexOf('}}', s + 2);
    if (e < 0) { parts.push({ t: str.slice(s) }); break; }
    parts.push({ e: compileExpr(str.slice(s + 2, e)) });
    i = e + 2;
  }
  if (!parts.length) parts.push({ t: '' });
  return parts;
}
function evalParts(parts, scope) {
  if (parts.length === 1) {
    const p = parts[0];
    if (p.lit) return true;
    if (p.e) return evalFn(p.e, scope);
    return p.t;
  }
  let out = '';
  for (const p of parts) {
    if (p.t !== undefined) out += p.t;
    else if (p.e) { const v = evalFn(p.e, scope); out += v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v; }
  }
  return out;
}
const VOID = new Set(['input', 'image', 'br', 'hr']);
function parseWxml(src) {
  const root = { tag: '#root', children: [] };
  const stack = [root];
  let i = 0;
  const n = src.length;
  const top = () => stack[stack.length - 1];
  while (i < n) {
    if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); i = e < 0 ? n : e + 3; continue; }
    if (src[i] === '<' && /[A-Za-z]/.test(src[i + 1] || '')) {
      let j = i + 1;
      const m = /^[A-Za-z][\w:.-]*/.exec(src.slice(j));
      const tag = m[0];
      j += tag.length;
      const attrs = [];
      let selfClose = false;
      for (;;) {
        while (j < n && /\s/.test(src[j])) j++;
        if (src.startsWith('/>', j)) { selfClose = true; j += 2; break; }
        if (src[j] === '>') { j++; break; }
        if (j >= n) break;
        const nm = /^[^\s=>/]+/.exec(src.slice(j));
        if (!nm) { j++; continue; }
        const name = nm[0];
        j += name.length;
        while (j < n && /\s/.test(src[j])) j++;
        let value = true;
        if (src[j] === '=') {
          j++;
          while (j < n && /\s/.test(src[j])) j++;
          const q = src[j];
          if (q === '"' || q === "'") {
            const e = src.indexOf(q, j + 1);
            value = src.slice(j + 1, e);
            j = e + 1;
          } else {
            const um = /^[^\s>]+/.exec(src.slice(j));
            value = um ? um[0] : '';
            j += value.length;
          }
        }
        attrs.push([name, value]);
      }
      const node = { type: 'el', tag, attrs: [], dir: {}, children: [] };
      for (const [name, value] of attrs) {
        if (name === 'wx:if') node.dir.if = parseParts(value);
        else if (name === 'wx:elif') node.dir.elif = parseParts(value);
        else if (name === 'wx:else') node.dir.else = true;
        else if (name === 'wx:for') node.dir.for = parseParts(value);
        else if (name === 'wx:for-item') node.dir.forItem = String(value);
        else if (name === 'wx:for-index') node.dir.forIndex = String(value);
        else if (name === 'wx:key') { /* 预览用位置对比，不使用 key */ }
        else node.attrs.push({ name, parts: parseParts(value), raw: value });
      }
      top().children.push(node);
      if (!selfClose && !VOID.has(tag)) stack.push(node);
      i = j;
      continue;
    }
    if (src.startsWith('</', i)) {
      const e = src.indexOf('>', i);
      const name = src.slice(i + 2, e).trim();
      for (let k = stack.length - 1; k > 0; k--) if (stack[k].tag === name) { stack.length = k; break; }
      i = e + 1;
      continue;
    }
    let j = i;
    while (j < n) {
      if (src.startsWith('{{', j)) { const e = src.indexOf('}}', j + 2); j = e < 0 ? n : e + 2; continue; }
      if (src[j] === '<' && /[A-Za-z/!]/.test(src[j + 1] || '')) break;
      j++;
    }
    const text = src.slice(i, j);
    top().children.push({ type: 'text', parts: parseParts(text), raw: text });
    i = j;
  }
  return root.children;
}
function dirname(p) { const k = p.lastIndexOf('/'); return k < 0 ? '' : p.slice(0, k); }
function joinPath(base, rel) {
  const out = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
}
function getTpl(key) {
  let t = S.parsed.get(key);
  if (t) return t;
  const raw = S.assets.templates[key] || {};
  const nodes = raw.wxml ? parseWxml(raw.wxml) : [];
  const wxs = [];
  (function collect(list) {
    for (const nd of list) {
      if (nd.type !== 'el') continue;
      if (nd.tag === 'wxs') {
        const a = Object.fromEntries(nd.attrs.map((x) => [x.name, x.raw]));
        wxs.push({ module: a.module, src: joinPath(dirname(key), a.src || '') });
      }
      collect(nd.children);
    }
  })(nodes);
  const comps = {};
  const using = { ...(S.assets.app.usingComponents || {}), ...((raw.json && raw.json.usingComponents) || {}) };
  for (const [name, p] of Object.entries(using)) comps[name] = p.startsWith('/') ? p.slice(1) : joinPath(dirname(key), p);
  t = { key, nodes, wxs, comps };
  S.parsed.set(key, t);
  return t;
}
function loadWxs(path) {
  if (S.wxsCache.has(path)) return S.wxsCache.get(path);
  const code = S.assets.wxs[path];
  const m = { exports: {} };
  if (code === undefined) console.error('[wxs] missing module', path);
  else new Function('module', 'exports', 'getRegExp', 'getDate', 'console', code)(m, m.exports, (p, f) => new RegExp(p, f), (...a) => new Date(...a), console);
  S.wxsCache.set(path, m.exports);
  return m.exports;
}

/* ------------------------------------------------------------------ 渲染 */
const TAG = { view: 'div', text: 'span', 'scroll-view': 'div', image: 'img', input: 'input', textarea: 'textarea', button: 'button', block: 'div', canvas: 'canvas' };
const RESERVED = /^(class|style|id|hidden|data-.*|bind.*|catch.*|capture-.*|mut-bind.*|change:.*|wx:.*)$/;
const META = ['__dataset', '__bind', '__props', '__owner', '__hover', '__attrVals', '__wxsObs', '__compPath', '__openType'];

function renderNodes(nodes, scope, ctx, parent) {
  let chain = null;
  for (const n of nodes) {
    if (n.type === 'text') {
      const v = evalParts(n.parts, scope);
      const str = v == null ? '' : String(v);
      if (!str.trim()) continue;
      parent.appendChild(document.createTextNode(str));
      chain = null;
      continue;
    }
    if (n.tag === 'wxs') continue;
    const d = n.dir;
    let show = true;
    if (d.for && d.if) {
      // 同一元素上 wx:for 优先于 wx:if：每个元素各自判断条件
      let list = evalParts(d.for, scope);
      if (typeof list === 'number') list = Array.from({ length: list }, (_, i) => i);
      else if (list && !Array.isArray(list) && typeof list === 'object') list = Object.keys(list).map((k) => list[k]);
      (list || []).forEach((item, index) => {
        const s2 = Object.create(scope);
        s2[d.forItem || 'item'] = item;
        s2[d.forIndex || 'index'] = index;
        if (evalParts(d.if, s2)) emit(n, s2, ctx, parent);
      });
      chain = null;
      continue;
    }
    if (d.if) { const v = evalParts(d.if, scope); chain = { taken: !!v }; show = !!v; }
    else if (d.elif) { if (chain && !chain.taken) { const v = evalParts(d.elif, scope); chain.taken = !!v; show = !!v; } else show = false; }
    else if (d.else) { show = !!chain && !chain.taken; if (chain) chain.taken = true; }
    else chain = null;
    if (!show) continue;
    if (d.for) {
      let list = evalParts(d.for, scope);
      if (typeof list === 'number') list = Array.from({ length: list }, (_, i) => i);
      else if (typeof list === 'string') list = Array.from(list);
      else if (list && !Array.isArray(list) && typeof list === 'object') list = Object.keys(list).map((k) => list[k]);
      (list || []).forEach((item, index) => {
        const s2 = Object.create(scope);
        s2[d.forItem || 'item'] = item;
        s2[d.forIndex || 'index'] = index;
        emit(n, s2, ctx, parent);
      });
    } else emit(n, scope, ctx, parent);
  }
}
function emit(n, scope, ctx, parent) {
  if (n.tag === 'block') { renderNodes(n.children, scope, ctx, parent); return; }
  parent.appendChild(makeEl(n, scope, ctx));
}
function makeEl(n, scope, ctx) {
  const compPath = ctx.tpl.comps[n.tag];
  const el = document.createElement(compPath ? n.tag : TAG[n.tag] || 'div');
  el.__owner = ctx.inst;
  el.__dataset = {};
  el.__bind = {};
  el.__attrVals = {};
  let cls = '';
  if (!compPath) el.className = 'wx-' + n.tag;
  if (compPath) { el.__compPath = compPath; el.__props = {}; }
  for (const a of n.attrs) {
    const name = a.name;
    if (/^(capture-)?(bind|catch|mut-bind)/.test(name)) {
      const m = /^(?:capture-)?(bind|catch|mut-bind):?(.+)$/.exec(name);
      const v = evalParts(a.parts, scope);
      el.__bind[m[2]] = typeof v === 'function' ? { fn: v, catch: m[1] === 'catch' } : { name: String(v), catch: m[1] === 'catch' };
      continue;
    }
    if (name.startsWith('change:')) {
      const v = evalParts(a.parts, scope);
      (el.__wxsObs ||= {})[name.slice(7)] = v;
      continue;
    }
    const val = evalParts(a.parts, scope);
    if (name.startsWith('data-')) { el.__dataset[camel(name.slice(5))] = val; continue; }
    if (name === 'class') { cls += ' ' + (val == null ? '' : val); continue; }
    if (name === 'style') { el.setAttribute('style', rpxToCalc(val == null ? '' : val)); continue; }
    if (name === 'id') { el.id = String(val); continue; }
    if (name === 'hidden') { if (val && val !== 'false') el.setAttribute('hidden', ''); continue; }
    if (name === 'hover-class') { el.__hover = val; continue; }
    el.__attrVals[name] = val;
    if (compPath) { if (!RESERVED.test(name)) el.__props[camel(name)] = val; continue; }
    applyNative(el, n.tag, name, val);
  }
  if (cls.trim()) el.classList.add(...cls.trim().split(/\s+/));
  if (!compPath && n.children.length) renderNodes(n.children, scope, ctx, el);
  return el;
}
function applyNative(el, tag, name, val) {
  if (name === 'aria-role') { el.setAttribute('role', val); return; }
  if (tag === 'image') {
    if (name === 'src') el.setAttribute('src', val || '');
    else if (name === 'mode') {
      el.style.objectFit = { scaleToFill: 'fill', aspectFit: 'contain', aspectFill: 'cover', widthFix: 'fill' }[val] || 'fill';
      if (val === 'widthFix') el.style.height = 'auto';
    }
    return;
  }
  if (tag === 'input' || tag === 'textarea') {
    if (name === 'type') {
      if (val === 'digit') { el.type = 'text'; el.setAttribute('inputmode', 'decimal'); }
      else if (val === 'number' || val === 'idcard') { el.type = 'text'; el.setAttribute('inputmode', 'numeric'); }
      else if (val === 'password') el.type = 'password';
      else el.type = 'text';
    } else if (name === 'value') { el.setAttribute('value', val == null ? '' : val); el.value = val == null ? '' : val; }
    else if (name === 'placeholder') el.setAttribute('placeholder', val || '');
    else if (name === 'maxlength') el.setAttribute('maxlength', val);
    else if (name === 'disabled' && val) el.setAttribute('disabled', '');
    return;
  }
  if (tag === 'button' && name === 'open-type') { el.__openType = val; return; }
  if (tag === 'scroll-view') {
    if (name === 'scroll-y' && val !== false && val !== 'false') el.classList.add('wx-sv-y');
    if (name === 'scroll-x' && val !== false && val !== 'false') el.classList.add('wx-sv-x');
    return;
  }
  if (name.startsWith('aria-')) { if (val != null && val !== '') el.setAttribute(name, String(val)); }
}

function copyMeta(from, to) { for (const k of META) from[k] = to[k]; }
function syncHostAttrs(from, to) {
  for (const a of Array.from(from.attributes)) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of Array.from(to.attributes)) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
}
function runObs(el, key, nv, ov) {
  const fn = el.__wxsObs[key];
  if (typeof fn === 'function') { try { fn(nv, ov, ownerOf(el)); } catch (e) { console.error('[wxs] change:' + key, e); } }
}
const MORPH = {
  onBeforeElUpdated(from, to) {
    if (to.tagName === 'CANVAS') {
      // canvas 的 width/height 是脚本设置的属性，不能被模板覆盖，否则画布会被清空
      copyMeta(from, to);
      for (const a of ['style', 'class', 'id']) {
        const v = to.getAttribute(a);
        if (v === null) from.removeAttribute(a);
        else if (from.getAttribute(a) !== v) from.setAttribute(a, v);
      }
      return false;
    }
    if (to.__compPath) {
      copyMeta(from, to);
      syncHostAttrs(from, to);
      if (from.__inst) updateProps(from.__inst, to.__props);
      return false;
    }
    const changedObs = [];
    if (to.__wxsObs) {
      for (const key of Object.keys(to.__wxsObs)) {
        const ov = from.__attrVals && from.__attrVals[key];
        const nv = to.__attrVals[key];
        if (ov !== nv) changedObs.push([key, nv, ov]);
      }
    }
    copyMeta(from, to);
    for (const [key, nv, ov] of changedObs) runObs(from, key, nv, ov);
    return true;
  },
  onElUpdated(el) {
    if (el.__wxsStyle) for (const [k, v] of Object.entries(el.__wxsStyle)) el.style.setProperty(kebab(k), String(v));
  },
  onNodeAdded(node) {
    if (node.nodeType === 1 && node.__wxsObs) for (const key of Object.keys(node.__wxsObs)) runObs(node, key, node.__attrVals[key], undefined);
    return node;
  },
  onNodeDiscarded(node) { destroyTree(node); },
};
function render(inst) {
  const tpl = getTpl(inst.$key);
  const scope = Object.create(inst.data);
  for (const w of tpl.wxs) scope[w.module] = loadWxs(w.src);
  const wrap = document.createElement('div');
  renderNodes(tpl.nodes, scope, { inst, tpl }, wrap);
  morphdom(inst.$el, wrap, { childrenOnly: true, ...MORPH });
  mountComponents(inst.$el);
}

/* ------------------------------------------------------------------ 实例 */
function makeInst(kind, cfg, key, el) {
  const inst = { $kind: kind, $cfg: cfg, $key: key, $el: el, $mounted: false, $depth: 0 };
  if (kind === 'page') for (const k of Object.keys(cfg)) { if (typeof cfg[k] === 'function') inst[k] = cfg[k]; }
  else Object.assign(inst, cfg.methods || {});
  inst.data = clone(cfg.data) || {};
  inst.properties = inst.data;
  inst.setData = (obj, cb) => setData(inst, obj, cb);
  inst.selectComponent = (sel) => { const c = inst.$el.querySelector(sel); return c && c.__inst ? c.__inst : null; };
  inst.selectAllComponents = (sel) => Array.from(inst.$el.querySelectorAll(sel)).map((c) => c.__inst).filter(Boolean);
  inst.getTabBar = () => S.tabbar;
  inst.createSelectorQuery = () => selectorQuery(inst.$el);
  inst.triggerEvent = (name, detail) => {
    const host = inst.$el;
    const b = host.__bind && host.__bind[name];
    if (!b) return;
    const t = { id: host.id, dataset: host.__dataset || {} };
    callBinding(b, { type: name, timeStamp: Date.now(), target: t, currentTarget: t, detail: detail === undefined ? {} : detail }, host);
  };
  return inst;
}
function setData(inst, obj, cb) {
  const changed = new Set();
  for (const [k, v] of Object.entries(obj)) {
    setPath(inst.data, k, v);
    changed.add(k.split(/[.[]/)[0]);
  }
  afterChange(inst, changed);
  if (cb) cb();
}
function afterChange(inst, changed) {
  if (!inst.$mounted) return;
  inst.$depth++;
  try { runObservers(inst, changed); } finally { inst.$depth--; }
  if (inst.$depth === 0) render(inst);
}
function runObservers(inst, changed) {
  const obs = inst.$cfg.observers;
  if (!obs) return;
  for (const [spec, fn] of Object.entries(obs)) {
    const fields = spec.split(',').map((s) => s.trim());
    if (fields.includes('**') || changed.has('**') || fields.some((f) => changed.has(f.split(/[.[]/)[0]))) fn.apply(inst, fields.map((f) => getPath(inst.data, f)));
  }
}
function propDef(def) {
  if (typeof def === 'function') return { type: def };
  return def || {};
}
function propDefault(def) {
  if ('value' in def) return def.value;
  switch (def.type) {
    case String: return '';
    case Number: return 0;
    case Boolean: return false;
    case Array: return [];
    default: return null;
  }
}
function coerce(v, def) {
  if (v === undefined) return propDefault(def);
  if (def.type === Number && typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  if (def.type === Boolean && typeof v === 'string') return v === '' || v === 'true';
  return v;
}
function updateProps(inst, props) {
  const changed = new Set();
  for (const [name, raw] of Object.entries(inst.$cfg.properties || {})) {
    const def = propDef(raw);
    const nv = coerce(props[name], def);
    if (!deepEqual(inst.data[name], nv)) { inst.data[name] = nv; changed.add(name); }
  }
  if (changed.size) afterChange(inst, changed);
}
function mountComponents(root) {
  for (const el of Array.from(root.querySelectorAll('*'))) if (el.__compPath && !el.__inst) mountComponent(el);
}
function mountComponent(el) {
  const path = el.__compPath;
  const cfg = S.reg.comp.get(path);
  if (!cfg) { console.error('[comp] not registered', path); return; }
  const inst = makeInst('comp', cfg, path, el);
  el.__inst = inst;
  for (const [name, raw] of Object.entries(cfg.properties || {})) inst.data[name] = coerce(el.__props && el.__props[name], propDef(raw));
  const life = (n) => { const f = (cfg.lifetimes && cfg.lifetimes[n]) || cfg[n]; if (f) f.call(inst); };
  life('created');
  life('attached');
  inst.$mounted = true;
  inst.$depth++;
  try { runObservers(inst, new Set(['**'])); } finally { inst.$depth--; }
  render(inst);
  life('ready');
}
function destroyTree(node) {
  if (node.nodeType !== 1) return;
  const all = [node, ...node.querySelectorAll('*')];
  for (const el of all) {
    const inst = el.__inst;
    if (inst && !inst.$destroyed) {
      inst.$destroyed = true;
      const f = (inst.$cfg.lifetimes && inst.$cfg.lifetimes.detached) || inst.$cfg.detached;
      if (f) f.call(inst);
    }
  }
}

/* ------------------------------------------------------------------ 事件 */
function elProxy(el) {
  if (!el) return null;
  return {
    setStyle(obj) {
      el.__wxsStyle = { ...(el.__wxsStyle || {}), ...obj };
      for (const [k, v] of Object.entries(obj)) el.style.setProperty(kebab(k), String(v));
    },
    addClass: (c) => el.classList.add(c),
    removeClass: (c) => el.classList.remove(c),
    hasClass: (c) => el.classList.contains(c),
    getDataset: () => el.__dataset || {},
    getState: () => (el.__wxsState ||= {}),
  };
}
function ownerOf(el) {
  const inst = el.__owner;
  const root = inst.$el;
  return {
    ...elProxy(root),
    selectComponent: (sel) => elProxy(root.querySelector(sel)),
    selectAllComponents: (sel) => Array.from(root.querySelectorAll(sel)).map(elProxy),
    callMethod: (name, arg) => { if (inst[name]) inst[name](arg); else console.error('[wxs] callMethod missing', name); },
    requestAnimationFrame: (fn) => requestAnimationFrame(fn),
  };
}
function callBinding(b, ev, el) {
  if (b.fn) return b.fn(ev, ownerOf(el)) === false;
  const owner = el.__owner;
  const h = owner && owner[b.name];
  if (typeof h === 'function') h.call(owner, ev);
  else console.error('[event] handler not found:', b.name, 'on', owner && owner.$key);
  return false;
}
function touchList(x, y) {
  return [{ identifier: 0, clientX: x, clientY: y, pageX: x, pageY: y, x, y }];
}
function dispatch(type, domEvent, extra = {}) {
  const t = domEvent.target;
  const ev = {
    type,
    timeStamp: Math.round(domEvent.timeStamp),
    target: { id: t.id || '', dataset: t.__dataset || {} },
    currentTarget: null,
    detail: {},
    touches: [],
    changedTouches: [],
    ...extra,
  };
  let el = t;
  const stop = document.getElementById('phone');
  while (el && el !== stop.parentElement) {
    const b = el.__bind && el.__bind[type];
    if (b) {
      ev.currentTarget = { id: el.id || '', dataset: el.__dataset || {} };
      const prevent = callBinding(b, ev, el);
      if (prevent && domEvent.cancelable) domEvent.preventDefault();
      if (b.catch) break;
    }
    el = el.parentElement;
  }
}
function installEvents(root) {
  let lastTouch = -1e9;
  let down = null;
  let longTimer = null;
  let longFired = false;
  const fromTouch = () => performance.now() - lastTouch < 800;
  const clearLong = () => { clearTimeout(longTimer); longTimer = null; };
  const hoverOn = (t) => {
    for (let el = t; el && el !== root; el = el.parentElement) {
      if (el.__hover && el.__hover !== 'none') { el.classList.add(el.__hover); down.hoverEl = el; return; }
    }
  };
  const hoverOff = () => { if (down && down.hoverEl) down.hoverEl.classList.remove(down.hoverEl.__hover); };
  const start = (e, x, y) => {
    down = { x, y, t: e.target, moved: false };
    longFired = false;
    hoverOn(e.target);
    dispatch('touchstart', e, { touches: touchList(x, y), changedTouches: touchList(x, y) });
    clearLong();
    longTimer = setTimeout(() => {
      if (down && !down.moved) { longFired = true; dispatch('longpress', { target: down.t, timeStamp: performance.now(), preventDefault() {} }, {}); }
    }, 500);
  };
  const move = (e, x, y) => {
    if (!down) return;
    if (Math.abs(x - down.x) + Math.abs(y - down.y) > 8) { down.moved = true; clearLong(); hoverOff(); }
    dispatch('touchmove', { target: down.t, timeStamp: e.timeStamp, cancelable: e.cancelable, preventDefault: () => e.cancelable && e.preventDefault() }, { touches: touchList(x, y), changedTouches: touchList(x, y) });
  };
  const end = (e, x, y, type) => {
    if (!down) return;
    clearLong();
    hoverOff();
    dispatch(type, { target: down.t, timeStamp: e.timeStamp, preventDefault() {} }, { touches: [], changedTouches: touchList(x, y) });
    down = null;
  };
  root.addEventListener('mousedown', (e) => { if (!fromTouch()) start(e, e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => { if (!fromTouch()) move(e, e.clientX, e.clientY); });
  window.addEventListener('mouseup', (e) => { if (!fromTouch()) end(e, e.clientX, e.clientY, 'touchend'); });
  root.addEventListener('touchstart', (e) => { lastTouch = performance.now(); const p = e.touches[0]; start(e, p.clientX, p.clientY); }, { passive: true });
  root.addEventListener('touchmove', (e) => { lastTouch = performance.now(); const p = e.touches[0]; move(e, p.clientX, p.clientY); }, { passive: false });
  root.addEventListener('touchend', (e) => { lastTouch = performance.now(); const p = e.changedTouches[0]; end(e, p.clientX, p.clientY, 'touchend'); });
  root.addEventListener('touchcancel', (e) => { lastTouch = performance.now(); const p = e.changedTouches[0]; end(e, p.clientX, p.clientY, 'touchcancel'); });
  root.addEventListener('click', (e) => {
    if (longFired) { longFired = false; return; }
    const b = e.target.closest && e.target.closest('button');
    if (b && b.__openType === 'chooseAvatar') dispatch('chooseavatar', e, { detail: { avatarUrl: '/assets/dish/bowl.back.png' } });
    if (b && b.__openType === 'agreePrivacyAuthorization') dispatch('agreeprivacyauthorization', e);
    dispatch('tap', e, { detail: { x: e.clientX, y: e.clientY } });
  });
  root.addEventListener('input', (e) => dispatch('input', e, { detail: { value: e.target.value, cursor: e.target.selectionStart } }));
  root.addEventListener('change', (e) => dispatch('change', e, { detail: { value: e.target.value } }));
  root.addEventListener('focusin', (e) => dispatch('focus', e, { detail: { value: e.target.value } }));
  root.addEventListener('focusout', (e) => dispatch('blur', e, { detail: { value: e.target.value } }));
  root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') dispatch('confirm', e, { detail: { value: e.target.value } }); });
}

/* ------------------------------------------------------------------ 页面栈 / 路由 */
const TAB_ROUTES = () => S.assets.app.tabBar.list.map((t) => t.pagePath);
const isTab = (route) => TAB_ROUTES().includes(route);

function pageStyle(route) {
  let tag = document.getElementById('wx-page-style');
  if (!tag) { tag = document.createElement('style'); tag.id = 'wx-page-style'; document.head.appendChild(tag); }
  tag.textContent = (S.assets.templates[route] && S.assets.templates[route].css) || '';
}
function createPage(route, query) {
  const cfg = S.reg.page.get(route);
  if (!cfg) throw new Error('page not registered: ' + route);
  const el = document.createElement('div');
  el.className = 'wx-page';
  el.dataset.route = route;
  S.viewport.appendChild(el);
  const inst = makeInst('page', cfg, route, el);
  inst.route = route;
  inst.options = query;
  el.__inst = inst;
  const entry = { route, inst };
  S.stack.push(entry);
  if (cfg.onLoad) cfg.onLoad.call(inst, query);
  inst.$mounted = true;
  render(inst);
  return entry;
}
function showTop() {
  const top = S.stack[S.stack.length - 1];
  S.stack.forEach((e) => { e.inst.$el.hidden = e !== top; });
  pageStyle(top.route);
  const tabVisible = isTab(top.route);
  S.tabbarEl.hidden = !tabVisible;
  S.viewport.classList.toggle('has-tabbar', tabVisible);
  if (location.hash !== '#/' + top.route) history.replaceState(null, '', '#/' + top.route);
  const f = top.inst.onShow;
  if (f) f.call(top.inst);
  if (!top.ready) { top.ready = true; if (top.inst.onReady) top.inst.onReady(); }
  const sel = document.getElementById('route-select');
  if (sel) sel.value = top.route;
}
function destroyPage(entry) {
  if (entry.inst.onUnload) entry.inst.onUnload();
  destroyTree(entry.inst.$el);
  entry.inst.$el.remove();
}
function hideTop() {
  const top = S.stack[S.stack.length - 1];
  if (top && top.inst.onHide) top.inst.onHide();
}
const done = (o, res = {}) => { if (o && o.success) o.success(res); if (o && o.complete) o.complete(res); };
const nav = {
  navigateTo(o) { const { route, query } = parseUrl(o.url); hideTop(); createPage(route, query); showTop(); done(o); },
  redirectTo(o) { const { route, query } = parseUrl(o.url); const cur = S.stack.pop(); if (cur) destroyPage(cur); createPage(route, query); showTop(); done(o); },
  navigateBack(o = {}) {
    const delta = Math.min(o.delta || 1, S.stack.length - 1);
    if (delta < 1) return done(o);
    hideTop();
    for (let i = 0; i < delta; i++) destroyPage(S.stack.pop());
    showTop();
    done(o);
  },
  switchTab(o) {
    const { route } = parseUrl(o.url);
    hideTop();
    const keep = S.stack.filter((e) => isTab(e.route));
    S.stack.filter((e) => !keep.includes(e)).forEach(destroyPage);
    S.stack = keep;
    const existing = S.stack.find((e) => e.route === route);
    if (existing) { S.stack = S.stack.filter((e) => e !== existing); S.stack.push(existing); } else createPage(route, {});
    showTop();
    done(o);
  },
  reLaunch(o) { const { route, query } = parseUrl(o.url); hideTop(); S.stack.splice(0).forEach(destroyPage); createPage(route, query); showTop(); done(o); },
};

/* ------------------------------------------------------------------ wx.* 桩 */
const PREFIX = 'jsd:';

// canvas 2d 节点：小程序的 canvas.createImage() 在浏览器里就是 new Image()
HTMLCanvasElement.prototype.createImage = function createImage() { return new Image(); };

function selectorQuery(root) {
  const jobs = [];
  const q = {
    in: () => q,
    select(sel) {
      const job = { sel, fields: null, rect: false };
      jobs.push(job);
      const api = {
        fields(f) { job.fields = f; return q; },
        boundingClientRect() { job.rect = true; return q; },
      };
      return api;
    },
    exec(cb) {
      // 与真机一致：查询在本轮渲染完成之后才执行（onLoad 里发起的查询也能找到节点）
      setTimeout(() => run(cb), 0);
    },
  };
  function run(cb) {
    const res = jobs.map((j) => {
      const el = root.querySelector(j.sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const out = { id: el.id, dataset: el.__dataset || {}, left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
      if (j.fields && j.fields.node) out.node = el;
      return out;
    });
    if (cb) cb(res);
  }
  return q;
}
const downloadBlobUrl = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); };
const wxImpl = {
  ...nav,
  createSelectorQuery: () => selectorQuery(document.getElementById('viewport')),
  canvasToTempFilePath(o) {
    o.canvas.toBlob((blob) => {
      if (!blob) { if (o.fail) o.fail({ errMsg: 'canvasToTempFilePath:fail' }); return; }
      done(o, { tempFilePath: URL.createObjectURL(blob) });
    }, o.fileType === 'jpg' ? 'image/jpeg' : 'image/png');
  },
  saveImageToPhotosAlbum(o) { downloadBlobUrl(o.filePath, '健身达人-海报.png'); done(o); },
  showShareImageMenu(o) { downloadBlobUrl(o.path, '健身达人-分享图.png'); console.debug('[wx] 预览：真机会弹出「发送给朋友」菜单，这里改为下载图片'); done(o); },
  getImageInfo(o) { done(o, { path: o.src }); },
  getSetting(o) { done(o, { authSetting: {} }); },
  openSetting(o) { done(o); },
  getStorageSync(k) { const v = localStorage.getItem(PREFIX + k); return v === null ? '' : JSON.parse(v); },
  setStorageSync(k, v) { localStorage.setItem(PREFIX + k, JSON.stringify(v)); },
  removeStorageSync(k) { localStorage.removeItem(PREFIX + k); },
  clearStorageSync() { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); },
  getWindowInfo: () => ({ windowWidth: S.device.width, windowHeight: S.device.height, screenWidth: S.device.width, screenHeight: S.device.height, statusBarHeight: S.device.statusBar, pixelRatio: 3, safeArea: { top: S.device.statusBar, bottom: S.device.height - S.device.safeBottom, left: 0, right: S.device.width, width: S.device.width, height: S.device.height - S.device.statusBar - S.device.safeBottom } }),
  getSystemInfoSync() { return { ...wxImpl.getWindowInfo(), platform: 'devtools', brand: 'preview', system: 'iOS 17', SDKVersion: '3.8.0' }; },
  getMenuButtonBoundingClientRect: () => ({ width: 87, height: 32, top: S.device.statusBar + 4, bottom: S.device.statusBar + 36, left: S.device.width - 87 - 7, right: S.device.width - 7 }),
  vibrateShort(o) { document.getElementById('phone').animate([{ transform: 'translateX(-1.5px)' }, { transform: 'translateX(1.5px)' }, { transform: 'none' }], 90); done(o); },
  vibrateLong(o) { document.getElementById('phone').animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 300); done(o); },
  setKeepScreenOn(o) { console.debug('[wx] keep screen on', o && o.keepScreenOn); done(o); },
  onNetworkStatusChange() {},
  loadFontFace(o) { done(o); },
  getFileSystemManager: () => ({}),
  onNeedPrivacyAuthorization(cb) { S.privacyCb = cb; },
  openPrivacyContract(o) { alert('预览：这里会打开《隐私保护指引》'); done(o); },
  showModal(o) { const ok = confirm((o.title ? o.title + '\n' : '') + (o.content || '')); done({ success: o.success, complete: o.complete }, { confirm: ok, cancel: !ok }); },
  showToast(o) { console.debug('[wx] toast', o && o.title); done(o); },
  hideToast() {},
  showLoading() {},
  hideLoading() {},
  setNavigationBarTitle(o) { done(o); },
  setClipboardData(o) { if (navigator.clipboard) navigator.clipboard.writeText(o.data); done(o); },
  nextTick: (fn) => setTimeout(fn, 0),
  canIUse: () => true,
};
// 云端：转发到预览服务里的「本地云」（真实云函数路由 + 内存假库）。面板里的开关关掉时 wx.cloud 不存在 => 纯本地模式
const cloudApi = {
  init() {},
  async callFunction({ data }) {
    const r = await fetch('/__cloud/call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    return { result: await r.json() };
  },
  async downloadFile() { throw new Error('preview: no cloud storage'); },
  async uploadFile() { throw new Error('preview: no cloud storage'); },
};
/** 预览服务里带不带「本地云」（tools/preview/mock-cloud.mjs）：没有时（比如只开源前端的公开副本）一律纯本地模式、隐藏云端按钮 */
const MOCK_CLOUD = !!window.__MOCK_CLOUD;
const cloudOn = () => MOCK_CLOUD && localStorage.getItem('jsd-preview:cloud') !== 'off';
Object.defineProperty(wxImpl, 'cloud', { get: () => (cloudOn() ? cloudApi : undefined), enumerable: true });
wxImpl.requestSubscribeMessage = (o) => done(o, Object.fromEntries((o.tmplIds || []).map((id) => [id, 'accept'])));
window.wx = new Proxy(wxImpl, {
  get(t, k) {
    if (k in t) return t[k];
    if (typeof k !== 'string') return undefined;
    return (o) => { console.warn('[wx] 预览未实现:', k); if (o && o.fail) o.fail({ errMsg: k + ':fail not implemented in preview' }); if (o && o.complete) o.complete({}); };
  },
});
window.App = (cfg) => { S.app = cfg; };
window.getApp = () => S.app;
window.Page = (cfg) => { S.pending = cfg; };
window.Component = (cfg) => { S.pending = cfg; };
window.Behavior = (cfg) => cfg;
window.getCurrentPages = () => S.stack.map((e) => e.inst);

/* ------------------------------------------------------------------ 启动 */
async function loadAll() {
  for (const [key, loader] of Object.entries(window.__MODS)) {
    S.pending = null;
    await loader();
    if (!S.pending) { console.warn('[boot] module registered nothing:', key); continue; }
    const kind = /^(components|custom-tab-bar)\//.test(key) ? 'comp' : 'page';
    S.reg[kind].set(key, S.pending);
  }
  S.pending = null;
}
/** 手机直连模式：在真机浏览器里打开预览时，去掉手机外框与面板，小程序占满整个屏幕（由 index.html 的内联脚本打上 pv-device 标记） */
const onDevice = () => document.documentElement.classList.contains('pv-device');
function applyDevice(w) {
  const phone = document.getElementById('phone');
  const cap = document.getElementById('capsule');
  if (onDevice()) {
    S.device = { width: window.innerWidth, height: window.innerHeight, statusBar: 12, safeBottom: 0 };
    phone.style.setProperty('--rpx', S.device.width / 750 + 'px');
    phone.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    cap.style.top = S.device.statusBar + 4 + 'px';
    window.addEventListener('orientationchange', () => setTimeout(() => location.reload(), 200));
    return;
  }
  S.device.width = w;
  phone.style.width = w + 'px';
  phone.style.setProperty('--rpx', w / 750 + 'px');
  phone.style.setProperty('--safe-bottom', S.device.safeBottom + 'px');
  cap.style.top = S.device.statusBar + 4 + 'px';
}
/** 地址里带 ?seed=demo|done|fresh|social 时先写入数据再去掉参数重新加载（手机上没有面板按钮，用这个载入演示数据） */
async function applySeedParam() {
  const q = new URLSearchParams(location.search);
  const kind = q.get('seed');
  if (!kind) return false;
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (kind === 'fresh') window.__seed.fresh();
  else if (kind === 'done') window.__seed.demoDone();
  else window.__seed.demo();
  if (kind === 'social' && MOCK_CLOUD) {
    localStorage.setItem('jsd-preview:cloud', 'on');
    await fetch('/__cloud/seed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ today: ymd(new Date()) }) });
  }
  q.delete('seed');
  const rest = q.toString();
  location.replace(location.pathname + (rest ? '?' + rest : '') + '#/pages/today/today');
  return true;
}
export async function boot() {
  if (await applySeedParam()) return;
  S.assets = await (await fetch('assets.json')).json();
  const style = document.createElement('style');
  const compCss = Object.entries(S.assets.templates)
    .filter(([k, t]) => /^(components|custom-tab-bar)\//.test(k) && t.css)
    .map(([, t]) => t.css);
  style.textContent = [S.assets.appCss, ...compCss].join('\n');
  document.head.appendChild(style);
  const w = Number(localStorage.getItem('jsd-preview:width')) || 390;
  applyDevice(w);
  S.viewport = document.getElementById('viewport');
  S.tabbarEl = document.createElement('div');
  S.tabbarEl.className = 'wx-tabbar-host';
  S.viewport.appendChild(S.tabbarEl);
  installEvents(document.getElementById('phone'));
  await loadAll();

  if (S.app.onLaunch) S.app.onLaunch.call(S.app, {});
  if (S.app.onShow) S.app.onShow.call(S.app, {});

  const tb = document.createElement('custom-tab-bar');
  tb.__compPath = 'custom-tab-bar/index';
  tb.__props = {};
  tb.__owner = { $el: tb, $key: 'root' };
  S.tabbarEl.appendChild(tb);
  mountComponents(S.tabbarEl);
  S.tabbar = tb.__inst;

  const hash = location.hash.replace(/^#\//, '');
  const first = hash && S.reg.page.has(hash.split('?')[0]) ? hash : S.assets.app.pages[0];
  const { route, query } = parseUrl(first);
  createPage(route, query);
  showTop();
  wireToolbar(w);
  document.body.classList.add('ready');
}
function wireToolbar(w) {
  const $ = (id) => document.getElementById(id);
  const reload = () => location.reload();
  $('btn-demo').onclick = () => { window.__seed.demo(); location.hash = '#/pages/today/today'; reload(); };
  $('btn-demo-done').onclick = () => { window.__seed.demoDone(); location.hash = '#/pages/today/today'; reload(); };
  const cloudBtn = $('btn-cloud');
  const seedBtn = $('btn-seed-social');
  if (MOCK_CLOUD) {
    const paintCloud = () => { cloudBtn.textContent = '云端：' + (cloudOn() ? '开（本地模拟）' : '关（纯本地）'); };
    paintCloud();
    cloudBtn.onclick = () => { localStorage.setItem('jsd-preview:cloud', cloudOn() ? 'off' : 'on'); reload(); };
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    seedBtn.onclick = async () => {
      localStorage.setItem('jsd-preview:cloud', 'on');
      await fetch('/__cloud/seed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ today: ymd(new Date()) }) });
      reload();
    };
  } else {
    cloudBtn.hidden = true;
    seedBtn.hidden = true;
  }
  $('btn-fresh').onclick = () => { window.__seed.fresh(); location.hash = '#/pages/today/today'; reload(); };
  $('btn-privacy').onclick = () => { if (S.privacyCb) S.privacyCb((r) => console.debug('[privacy]', r), { referrer: 'preview' }); else alert('当前页面没有注册隐私授权监听'); };
  $('btn-back').onclick = () => nav.navigateBack({});
  const sel = $('route-select');
  const routes = [...S.assets.app.pages, ...(S.assets.app.subPackages || []).flatMap((p) => p.pages.map((x) => p.root + '/' + x))];
  sel.innerHTML = routes.map((r) => `<option value="${r}">${r}</option>`).join('');
  const cur = S.stack[S.stack.length - 1];
  if (cur) sel.value = cur.route;
  sel.onchange = () => {
    const r = sel.value;
    if (isTab(r)) nav.switchTab({ url: '/' + r });
    else nav.reLaunch({ url: '/' + r });
  };
  const wsel = $('width-select');
  wsel.value = String(w);
  wsel.onchange = () => { localStorage.setItem('jsd-preview:width', wsel.value); reload(); };
}
