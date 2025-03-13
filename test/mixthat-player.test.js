import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import '../mixthat-player.js';

describe('MixthatPlayer', () => {
  it('passes the a11y audit', async () => {
    const el = await fixture(html`<mixthat-player></mixthat-player>`);

    await expect(el).shadowDom.to.be.accessible();
  });
});
