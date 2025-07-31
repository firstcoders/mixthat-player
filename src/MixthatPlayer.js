import { html, css, LitElement } from 'lit';

export class MixthatPlayer extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
      }
      a.backlink {
        position: absolute;
        right: 0;
        bottom: 0;
        color: var(--sws-stemsplayer-stem-color, --sws-stemsplayer-color);
        font-size: 0.8rem;
        opacity: 0.5;
        text-align: center;
      }
      .alignRight {
        text-align: right;
      }
      .zTop {
        z-index: 999999;
      }
    `,
  ];

  static properties = {
    src: { type: String },
    track: { type: Object },
    isLoading: { type: Boolean },
    isError: { type: Boolean },
    controls: {
      type: String,
      converter: {
        fromAttribute: value => {
          if (value === '') {
            return [
              'playpause',
              'loop',
              'progress',
              'duration',
              'time',
              'zoom',
            ];
          }
          return value.split(' ');
        },
      },
    },
    collapsed: { type: Boolean },
  };

  constructor() {
    super();

    this.controls = [
      'playpause',
      'loop',
      'progress',
      'duration',
      'time',
      'zoom',
    ];
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
    // const { track_id } = this;
    try {
      this.isLoading = true;
      this.track = await this.getTrack();

      if (this.canDownload) this.controls.push('download');
      else this.controls.push('download:disabled');

      // this.record('PLAY_MIX', {
      //   origin,
      //   track_id,
      // });
    } catch (err) {
      this.isError = true;
      // this.record('PLAY_MIX_FAIL', {
      //   origin: window.location.hostname,
      //   track_id,
      // });
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async getTrack() {
    const url = new URL(this._src);
    const { token } = this;

    const response = await fetch(`${url.origin}${url.pathname}`, {
      headers: { ...(token ? { Authorization: token } : {}) },
    });
    if (!response.ok) throw new Error('Failed loading track');
    return response.json();
  }

  render() {
    return this.track
      ? html`<stemplayer-js regions>
          <stemplayer-js-controls
            slot="header"
            label="${this.track.label}"
            controls="${this.controls.join(' ')}"
          >
          </stemplayer-js-controls>
          ${this.track.files
            .filter(file => file.type === 'STEM')
            .sort((a, b) => (a.index < b.index ? -1 : 1))
            .map(
              file =>
                html`<stemplayer-js-stem
                  .id=${file.file_id}
                  label="${file.label}"
                  src="${file.$links.find(l => l.rel === 'm3u8').href}"
                  waveform="${file.$links.find(l => l.rel === 'waveform').href}"
                  style="${this.collapsed ? 'display:none' : ''}"
                >
                </stemplayer-js-stem>`,
            )}
          ${this.webUrl
            ? html`<a
                slot="footer"
                class="backlink w2 zTop"
                target="blank"
                href="${this.webUrl}"
                >MixThat!</a
              >`
            : ''}
        </stemplayer-js>`
      : '';
  }

  // async createMix(format) {
  //   if (!this.track) throw new Error('Track not loaded: cannot download');

  //   const { state } = this.player;

  //   try {
  //     this._isCreatingMix = true;

  //     const response = await fetch(this.track.downloadMixUrl, {
  //       method: 'POST',
  //       headers: {
  //         Accept: 'application/json',
  //         'Content-Type': 'application/json',
  //         ...(this.authToken
  //           ? { Authorization: `Bearer ${this.authToken}` }
  //           : {}),
  //       },
  //       body: JSON.stringify({
  //         format,
  //         stems: state.stems.map(({ id, volume }) => ({
  //           id,
  //           volume,
  //         })),
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to Create Mix');
  //     }
  //     const { _url } = await response.json();
  //     const { url } = await this.poll(_url);

  //     this.dispatchEvent(new CustomEvent('mix:ready', { detail: { url } }));
  //   } finally {
  //     this._isCreatingMix = false;
  //   }
  // }

  /**
   * Poll the status endpoint until the job is ready
   * @param {src} src
   * @returns {Object} Object containing a url to the generated file
   */
  // async poll(src) {
  //   const response = await fetch(src);

  //   // check if the job succeeded
  //   if (!response.ok) throw new Error('Failed to create mix');

  //   const { job, _url } = await response.json();

  //   if (job.status === 'STATUS_QUEUED' || job.status === 'STATUS_PROCESSING') {
  //     // wait for a bit
  //     await new Promise(done => {
  //       setTimeout(() => done(), 2500);
  //     });

  //     return this.poll(src);
  //   }

  //   if (job.status === 'STATUS_SUCCESS') return { url: _url };

  //   throw Error('Failed to create mix');
  // }

  get player() {
    return this.shadowRoot.querySelector('stemplayer-js');
  }

  get token() {
    if (!this.src) return undefined;

    return new URL(this.src).searchParams.get('token');
  }

  // record(event, data) {
  //   if (!this.noAnalytics) {
  //     setTimeout(() => {
  //       fetch(`${new URL(this.src).origin}/activity`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({ event, timestamp: Date.now(), data }),
  //       });
  //     }, 1000);
  //   }
  // }

  get webUrl() {
    if (!this.src) return undefined;

    const url = new URL(this.src);

    const parts = [
      this.token ? `token=${this.token}` : undefined,
      this.track.is_public ? 'is_public=1' : undefined,
    ].filter(e => !!e);

    return `${url.origin}/tracks/${this.track.track_id}${parts.length ? `?${parts.join('&')}` : ''}`;
  }

  get canDownload() {
    if (!this.track) return false;

    // if the track is public, we can note download it since we require a track token
    if (this.track.is_public) return false;

    // if there are no files without a source link, we can download it
    const fileWithoutSource = this.track.files.find(f => {
      const hasSource = f.$links.find(l => l.rel === 'source');
      return !hasSource;
    });

    return !fileWithoutSource;
  }
}
