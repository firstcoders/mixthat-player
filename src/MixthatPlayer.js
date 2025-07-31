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
      button {
        background: transparent;
        color: var(--sws-stemsplayer-color, #fff);
        border: none;
        opacity: 0.8;
      }
      .w3 {
        width: 4rem;
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

    const response = await fetch(`${url.origin}${url.pathname}?v=1`, {
      headers: { ...(token ? { Authorization: token } : {}) },
    });

    if (!response.ok) throw new Error('Failed loading track');
    return response.json();
  }

  render() {
    return this.track
      ? html`<stemplayer-js regions>
          <stemplayer-js-controls
            slot="footer"
            label="${this.track.label}"
            controls="${this.controls.join(' ')}"
            @controls:download="${this.handleDownloadClick}"
          >
            <button slot="end" @click=${this.handleToggleStems} class="w3">
              <span class="badge">${this.collapsed ? 'Stems' : 'Mix'}</span>
            </button>
          </stemplayer-js-controls>
          ${this.collapsed
            ? html`${this.track.files
                .filter(file => file.type === 'MIX')
                .map(
                  file =>
                    html`<stemplayer-js-stem
                      .id=${file.file_id}
                      label="${file.label}"
                      src="${file.$links.find(l => l.rel === 'm3u8').href}"
                      waveform="${file.$links.find(l => l.rel === 'waveform')
                        .href}"
                    >
                    </stemplayer-js-stem>`,
                )}`
            : html`${this.track.files
                .filter(file => file.type === 'STEM')
                .sort((a, b) => (a.index < b.index ? -1 : 1))
                .map(
                  file =>
                    html`<stemplayer-js-stem
                      .id=${file.file_id}
                      label="${file.label}"
                      src="${file.$links.find(l => l.rel === 'm3u8').href}"
                      waveform="${file.$links.find(l => l.rel === 'waveform')
                        .href}"
                    >
                    </stemplayer-js-stem>`,
                )}`}
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

  get player() {
    return this.shadowRoot.querySelector('stemplayer-js');
  }

  get token() {
    if (!this.src) return undefined;

    return new URL(this.src).searchParams.get('auth_token');
  }

  get webUrl() {
    if (!this.src) return undefined;

    const url = new URL(this.src);

    const parts = [
      this.token ? `auth_token=${this.token}` : undefined,
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

  // eslint-disable-next-line class-methods-use-this
  handleDownloadClick() {
    console.warn(
      'Download functionality is not implemented yet. Please use the MixThat! web interface.',
    );
    // const { state } = this.player;
    // console.log(state);
    // const encodedState = btoa(
    //   JSON.stringify({
    //     ...state,
    //     stems: state.stems.map(stem => ({
    //       ...stem,
    //       src: undefined,
    //       waveform: undefined,
    //     })),
    //   }),
    // );
    // const url = new URL(this.webUrl);
    // url.searchParams.set('download', true);
    // url.searchParams.set('state', encodedState);
    // window.open(url.toString(), '_blank');
  }

  handleToggleStems() {
    this.collapsed = !this.collapsed;
  }
}
