/* Real mouse input on the packaged desktop, using a private workspace and profile. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { _electron } = require('playwright');
const { createRun } = require('../scripts/lib/test-artifacts.cjs');
const { desktopExecutable } = require('../scripts/launch-desktop.cjs');
const { runtimeFiles } = require('../scripts/package-desktop.cjs');

const root = path.resolve(__dirname, '..');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
async function freePort() {
  const server = http.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function main() {
  const job = createRun({ parent: path.join(root, 'verification.noindex/desktop-verification'), prefix: 'orbit-drag-' });
  let app, passed = false;
  const errors = [];
  try {
    const work = job.workspace('workspace', root, {
      directories: ['src', 'styles', 'vendor', 'assets'],
      files: ['index.html', 'manifest.webmanifest']
    });
    for (const name of runtimeFiles) job.copy(path.join(root, 'scripts', name), path.join('workspace/scripts', name));
    const executablePath = desktopExecutable(root, { executable: process.argv[2] });
    const env = {
      ...process.env,
      FURNISH_DESKTOP_ROOT: work,
      FURNISH_DESKTOP_PROFILE: job.discard('profile'),
      FURNISH_PORT: String(await freePort()),
      FURNISH_MCP_DISABLE: '1'
    };
    delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath, env, timeout: 60000 });
    const page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => typeof repositoryBooting !== 'undefined' && !repositoryBooting);
    await page.addInitScript(() => localStorage.setItem('furnish-observation-v1', 'smooth'));
    await page.reload();
    await page.waitForFunction(() => !repositoryBooting);
    await page.locator('[data-view="3d"]').click();
    await page.waitForFunction(() => is3D() && !switching, null, { timeout: 120000 });
    await page.waitForFunction(() => document.querySelector('#progressive-controls')?.dataset.state === 'smooth');
    const camera = () => page.evaluate(() => View3D.automationCamera());
    const canvas = page.locator('#view3d canvas').filter({ visible: true }).first();
    const { x, y, width, height } = await canvas.boundingBox();
    const start = { x: Math.round(x + width * .55), y: Math.round(y + height * .45) };
    assert(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS', start));

    async function drag(checkMotion, pan = false, release) {
      await page.mouse.move(start.x, start.y);
      if (pan) await page.keyboard.down('Space');
      await page.mouse.down();
      assert.equal(await page.evaluate(() => View3D.interacting()), true);
      await page.evaluate(() => {
        window.dragStart = new Promise(resolve => document.addEventListener('pointermove', () => {
          resolve(View3D.automationCamera());
        }, { capture: true, once: true }));
        window.dragEnd = new Promise(resolve => document.addEventListener('pointermove', event => {
          window.dragPointerId = event.pointerId;
          resolve(View3D.automationCamera());
        }, { once: true }));
      });
      await page.mouse.move(start.x + 74, start.y + 27);
      const [before, moved] = await page.evaluate(() => Promise.all([window.dragStart, window.dragEnd]));
      checkMotion(before, moved);
      if (release) await release(moved);
      await page.mouse.up();
      if (pan) await page.keyboard.up('Space');
      assert.equal(await page.evaluate(() => View3D.interacting()), false);
      return moved;
    }

    async function staysAt(expected, wait) {
      await page.waitForTimeout(wait);
      const actual = await camera();
      assert(distance(actual.position, expected.position) < .01, 'camera must stop at the last pointer position');
      assert(distance(actual.target, expected.target) < .01, 'orbit center must stop at the last pointer position');
    }
    const rotates = (before, moved) => {
      assert(distance(before.position, moved.position) > 10, 'left drag rotates while held');
      assert(distance(before.target, moved.target) < .01, 'rotation keeps the current orbit center');
    };
    const pans = (before, moved) => {
      assert(distance(before.position, moved.position) > 10, 'space drag pans while held');
      assert(distance(before.target, moved.target) > 10, 'pan translates the orbit center');
    };

    const released = await drag(rotates);
    await page.mouse.move(start.x + 102, start.y + 38);
    await staysAt(released, 300);
    await staysAt(await drag(pans, true), 300);
    const resetOrbit = () => page.evaluate(() => View3D.automationCamera({ preset: 'whole' }));
    const cdp = await page.context().newCDPSession(page);
    await resetOrbit();
    await drag(rotates, false, async moved => {
      // Chromium sees the mouse move with no button held, but received no pointerup.
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x + 102, y: start.y + 38, buttons: 0 });
      await staysAt(moved, 100);
      assert.equal(await page.evaluate(() => View3D.interacting()), false);
    });
    await resetOrbit();
    await drag(rotates, false, async moved => {
      assert(await canvas.evaluate(element => {
        if (!element.hasPointerCapture(window.dragPointerId)) return false;
        element.releasePointerCapture(window.dragPointerId);
        return true;
      }));
      await page.mouse.move(start.x + 102, start.y + 38);
      await staysAt(moved, 100);
      assert.equal(await page.evaluate(() => View3D.interacting()), false);
    });
    await resetOrbit();
    await drag(rotates, false, async moved => {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.mouse.move(start.x + 102, start.y + 38);
      await staysAt(moved, 100);
      assert.equal(await page.evaluate(() => View3D.interacting()), false);
    });
    for (const [preset, check, pan] of [['#vTop', rotates, false], ['#vIso', pans, true]]) {
      await page.locator('.rail-tool-menu summary').click();
      const before = await camera();
      await page.locator(preset).click();
      await page.waitForFunction(p => View3D.automationCamera().then(({ position }) =>
        Math.hypot(position.x - p.x, position.y - p.y, position.z - p.z) > 25), before.position, { polling: 'raf' });
      assert.equal(await page.evaluate(() => View3D.progressiveState()), null, 'preset animation must still be running');
      await staysAt(await drag(check, pan), 1000);
    }
    await page.screenshot({ path: path.join(job.dir, 'after-drag.png') });
    assert.deepEqual(errors, []);
    passed = true;
    console.log('Packaged desktop: orbit stops on release, missing release, capture loss, and blur. Preset interruption and space pan pass.');
  } finally {
    try {
      if (app) await app.close();
    } finally {
      job.finish(passed);
      console.log('Artifacts: ' + job.dir);
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
