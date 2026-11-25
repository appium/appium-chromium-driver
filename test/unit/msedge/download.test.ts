import assert from 'node:assert/strict';
import {afterEach, it} from 'node:test';

import sinon from 'sinon';

import {fetchDriverArchive} from '../../../lib/msedge/download.js';
import {Version} from '../../../lib/msedge/version.js';

afterEach(() => sinon.restore());

it('allows transfers longer than four minutes and aborts after four minutes without progress', async () => {
  const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
  let body!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        body = controller;
      },
    }),
  );
  sinon.stub(globalThis, 'fetch').callsFake(async (_url, options) => {
    const signal = options!.signal!;
    signal.addEventListener('abort', () => body.error(signal.reason), {once: true});
    return response;
  });

  const archive = fetchDriverArchive(Version.from('147.0.3179.98'));
  for (let i = 0; i < 3; i++) {
    const next = archive.next();
    await clock.tickAsync(120_000);
    const chunk = Uint8Array.of(i);
    body.enqueue(chunk);
    assert.deepEqual(await next, {done: false, value: chunk});
  }

  const stalled = assert.rejects(archive.next(), /download timed out/);
  await clock.tickAsync(240_000);
  await stalled;
});

it('cancels the response body when the installer stops reading', async () => {
  const cancel = sinon.spy();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.of(1));
    },
    cancel,
  });
  sinon.stub(globalThis, 'fetch').resolves(new Response(body));
  const archive = fetchDriverArchive(Version.from('147.0.3179.98'));
  await archive.next();
  await archive.return(undefined);
  sinon.assert.calledOnce(cancel);
});
