import { describe, expect, it } from 'vitest';
import { handlerNames, missingHandlers } from '../../scripts/lib/bindings.mjs';

describe('binding check', () => {
  const wxml = `<view bindtap="onA" data-x="1"></view><input bind:blur="onB" bindconfirm="onB"/>
    <view catchtap="onC"></view><view bindtouchmove="{{swipe.move}}"></view>
    <button open-type="chooseAvatar" bindchooseavatar="onAvatar"></button>`;
  it('collects plain handler names and skips wxs bindings', () => {
    expect(handlerNames(wxml).sort()).toEqual(['onA', 'onAvatar', 'onB', 'onC']);
  });
  it('reports handlers missing from the page script', () => {
    const ts = `Page({ onA() {}, onB(e) {}, onAvatar: function () {} })`;
    expect(missingHandlers(wxml, ts)).toEqual(['onC']);
  });
});
