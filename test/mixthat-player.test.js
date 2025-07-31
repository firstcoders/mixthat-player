import { html } from 'lit';
import sinon from 'sinon';
import { fixture, expect, waitUntil } from '@open-wc/testing';

import '../mixthat-player.js';

describe('MixthatPlayer', () => {
  let el;
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('passes the a11y audit', async () => {
    el = await fixture(html`<mixthat-player></mixthat-player>`);
    await expect(el).shadowDom.to.be.accessible();
  });

  it('initializes with default controls', async () => {
    el = await fixture(html`<mixthat-player></mixthat-player>`);
    expect(el.controls).to.deep.equal([
      'playpause',
      'loop',
      'progress',
      'duration',
      'time',
      'zoom',
    ]);
  });

  it('accepts custom controls via attribute', async () => {
    el = await fixture(
      html`<mixthat-player controls="playpause progress"></mixthat-player>`,
    );
    expect(el.controls).to.deep.equal(['playpause', 'progress']);
  });

  it('loads and renders track data', async () => {
    const mockTrack = {
      label: 'Test Track',
      track_id: '123',
      files: [
        {
          type: 'STEM',
          file_id: 'stem1',
          label: 'Stem 1',
          index: 1,
          $links: [
            { rel: 'm3u8', href: 'test.m3u8' },
            { rel: 'waveform', href: 'test.json' },
          ],
        },
      ],
    };

    fetchStub.resolves({
      ok: true,
      json: () => Promise.resolve(mockTrack),
    });

    el = await fixture(
      html`<mixthat-player
        src="https://api.example.com/tracks/123"
      ></mixthat-player>`,
    );

    await waitUntil(() => el.track);

    expect(el.track).to.deep.equal(mockTrack);
    const stemPlayer = el.shadowRoot.querySelector('stemplayer-js-stem');
    expect(stemPlayer).to.exist;
    expect(stemPlayer.getAttribute('label')).to.equal('Stem 1');
  });

  it('handles track loading errors', async () => {
    fetchStub.resolves({
      ok: false,
    });

    el = await fixture(
      html`<mixthat-player
        src="https://api.example.com/tracks/123"
      ></mixthat-player>`,
    );

    await waitUntil(() => el.isError);

    expect(el.isError).to.be.true;
    expect(el.isLoading).to.be.false;
  });

  it('extracts auth_token from src URL', async () => {
    el = await fixture(
      html`<mixthat-player
        src="https://api.example.com/tracks/123?auth_token=abc123"
      ></mixthat-player>`,
    );
    expect(el.token).to.equal('abc123');
  });

  it('generates correct webUrl', async () => {
    const mockTrack = {
      track_id: '123',
    };

    fetchStub.resolves({
      ok: true,
      json: () => Promise.resolve(mockTrack),
    });

    el = await fixture(
      html`<mixthat-player
        src="https://api.example.com/tracks/123?auth_token=abc123"
      ></mixthat-player>`,
    );

    await waitUntil(() => el.track);

    expect(el.webUrl).to.equal(
      'https://api.example.com/tracks/123?auth_token=abc123',
    );
  });

  it('determines download capability based on source links', async () => {
    const mockTrack = {
      files: [
        {
          $links: [{ rel: 'source', href: 'test.mp3' }],
        },
      ],
    };

    fetchStub.resolves({
      ok: true,
      json: () => Promise.resolve(mockTrack),
    });

    el = await fixture(
      html`<mixthat-player
        src="https://api.example.com/tracks/123"
      ></mixthat-player>`,
    );

    await waitUntil(() => el.track);

    expect(el.canDownload).to.be.true;
  });
});
