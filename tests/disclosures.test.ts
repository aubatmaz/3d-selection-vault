import { test } from 'node:test';
import assert from 'node:assert/strict';
// DOM interaction tests run the actual React component, not a copied toggle reducer.
// @ts-expect-error jsdom is test-only; no application type dependency required.
import { JSDOM } from 'jsdom';
import React from 'react';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
])
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
  });
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
const { render, cleanup } = await import('@testing-library/react');
const { default: userEvent } = await import('@testing-library/user-event');
const { DetailDisclosure } =
  await import('../components/detail-disclosure.tsx');
const view = (scopeKey = 'a') =>
  React.createElement(
    DetailDisclosure,
    {
      title: 'How it works',
      scopeKey,
    },
    'Mechanism',
  );
void test('real disclosure survives six alternating clicks and rapid consecutive activation', async () => {
  const r = render(view()),
    user = userEvent.setup();
  const button = r.getByRole('button', { name: 'How it works' });
  for (let i = 0; i < 6; i++) {
    await user.click(button);
    assert.equal(button.getAttribute('aria-expanded'), String(i % 2 === 0));
  }
  await user.dblClick(button);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(
    document.getElementById(button.getAttribute('aria-controls')!)?.hidden,
    true,
  );
  cleanup();
});
void test('Enter and Space activate the focused disclosure', async () => {
  const r = render(view()),
    user = userEvent.setup(),
    button = r.getByRole('button', { name: 'How it works' });
  await user.tab();
  assert.equal(document.activeElement, button);
  await user.keyboard('{Enter}');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  await user.keyboard(' ');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  cleanup();
});
void test('switching technique identity and closing/reopening clear stale disclosure state', async () => {
  const r = render(view()),
    user = userEvent.setup();
  await user.click(r.getByRole('button'));
  r.rerender(view('b'));
  assert.equal(r.getByRole('button').getAttribute('aria-expanded'), 'false');
  await user.click(r.getByRole('button'));
  r.unmount();
  const reopened = render(view('b'));
  assert.equal(
    reopened.getByRole('button').getAttribute('aria-expanded'),
    'false',
  );
  cleanup();
});
