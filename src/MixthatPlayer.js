import { html, css, LitElement } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export class MixthatPlayer extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    a.backlink {
      position: absolute;
      right: 0;
      bottom: 0;
      color: var(--sws-stemsplayer-stem-color, --sws-stemsplayer-color);
    }
  `;

  static properties = {
    src: { type: String },
    track: { type: Object },
    isLoading: { type: Boolean },
    isError: { type: Boolean },
    maxHeight: { attribute: 'max-height' },
    controls: { type: Boolean },
  };

  connectedCallback() {
    super.connectedCallback();
  }

  set src(src) {
    this.track = undefined;
    this._src = src;
    this.load();
  }

  get src() {
    return this._src;
  }

  async load() {
    const { trackuuid } = this;
    try {
      this.isLoading = true;
      this.track = await this.getTrack();
      this.record('PLAY_MIX', {
        origin,
        trackuuid,
      });
    } catch (err) {
      this.isError = true;
      this.record('PLAY_MIX_FAIL', {
        origin: window.location.hostname,
        trackuuid,
      });
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async getTrack() {
    const response = await fetch(this._src);
    if (!response.ok) throw new Error('Failed loading track');
    return response.json();
  }

  get canPlayOgg() {
    if (!this._canPlayOgg) {
      this._canPlayOgg = document
        .createElement('audio')
        .canPlayType('audio/ogg');
    }

    return this._canPlayOgg;
  }

  render() {
    return html`
      ${this.track
        ? html`<stemplayer-js max-height=${ifDefined(this.maxHeight)}>
            ${this.controls
              ? html`<stemplayer-js-controls
                  slot="header"
                  label="${this.track.songTitle || 'No title'}"
                ></stemplayer-js-controls>`
              : ''}
            ${this.track.stems.map(
              stem =>
                html`<stemplayer-js-stem
                  .id=${stem.uploaduuid}
                  label="${stem.label}"
                  src="${this.canPlayOgg ? stem['hls:ogg'] : stem['hls:mp3']}"
                  waveform="${stem.waveform}"
                >
                </stemplayer-js-stem>`,
            )}
            <a
              slot="footer"
              class="backlink"
              target="blank"
              href="${this.track.webUrl}${this.authToken
                ? `?authToken=${this.authToken}`
                : ''}"
              >MixThat</a
            >
          </stemplayer-js>`
        : ''}
    `;
  }

  async createMix(format) {
    if (!this.track) throw new Error('Track not loaded: cannot download');

    const { state } = this.player;

    const response = await fetch(this.track.downloadMixUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {}),
      },
      body: JSON.stringify({
        format,
        stems: state.stems.map(({ id, volume }) => ({
          id,
          volume,
        })),
      }),
    });

    if (response.ok) {
      const { _url } = await response.json();
      return this.poll(_url);
    }

    throw new Error('Failed to Create Mix');
  }

  /**
   * Poll the status endpoint until the job is ready
   * @param {src} src
   * @returns {Object} Object containing a url to the generated file
   */
  async poll(src) {
    const response = await fetch(src);

    // check if the job succeeded
    if (!response.ok) throw new Error('Failed to create mix');

    const { job, _url } = await response.json();

    if (job.status === 'STATUS_QUEUED' || job.status === 'STATUS_PROCESSING') {
      // wait for a bit
      await new Promise(done => {
        setTimeout(() => done(), 2500);
      });

      return this.poll(src);
    }

    if (job.status === 'STATUS_SUCCESS') return { url: _url };

    throw Error('Failed to create mix');
  }

  get player() {
    return this.shadowRoot.querySelector('stemplayer-js');
  }

  get authToken() {
    if (this.src) {
      return new URL(this.src).searchParams.get('authToken');
    }

    return undefined;
  }

  record(event, data) {
    setTimeout(() => {
      fetch(`${new URL(this.src).origin}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, timestamp: Date.now(), data }),
      });
    }, 1000);
  }

  get trackuuid() {
    return new URL(this.src).pathname
      .replace(/\/?tracks\//, '')
      .replace(/\/stream\/?/, '');
  }
}
