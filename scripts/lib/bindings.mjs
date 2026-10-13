const ATTR = /\b(?:capture-)?(?:bind|catch|mut-bind):?[a-zA-Z]+="([^"]+)"/g;

export function handlerNames(wxml) {
  const names = new Set();
  let m;
  while ((m = ATTR.exec(wxml))) {
    const v = m[1].trim();
    if (!v.includes('{{')) names.add(v);
  }
  ATTR.lastIndex = 0;
  return [...names];
}

export function missingHandlers(wxml, ts) {
  return handlerNames(wxml).filter((n) => !new RegExp(`\\b${n}\\s*(\\(|:)`).test(ts));
}
