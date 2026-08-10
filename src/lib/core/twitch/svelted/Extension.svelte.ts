// ============================================
// Extension.ts - Twitch Extension Wrapper (Frontend)
// ============================================
import { Emitter } from '$lib/utilz/Emitter';
import type { Twitch as TT } from '../types';
import { PubSubClient } from '../PubSubClient';

let instance = $state<Twitch>();
export class Twitch extends Emitter {
  helixer?: TT.Ext.HelixUser;
  auth?: TT.Ext.Auth;
  ctx?: TT.Ext.Context;
  pubsub: PubSubClient;

  private constructor() {
    super();
    // Set up authorization handler
    this.ext.onAuthorized(auth => {
      this.auth = auth;
      this.emit('authorized', auth);
    });

    // Set up context handler
    this.ext.onContext((context, changed) => {
      this.ctx = context;
      this.emit('context', context, changed);
    });

    // Set up error handler
    this.ext.onError(error => {
      this.emit('error', error);
    });

    // Set up visibility handler
    this.ext.onVisibilityChanged((isVisible, context) => {
      this.emit('visibility', isVisible, context);
    });

    // Set up highlight handler (for video overlay and component extensions)
    this.ext.onHighlightChanged(highlighted => {
      this.emit('highlight', highlighted);
    });

    // Set up position handler (for video component extensions)
    this.ext.onPositionChanged(position => {
      this.emit('position', position);
    });

    // Set up configuration change handler
    this.ext.configuration.onChanged(() => {
      this.emit('configurationChanged', this.ext.configuration);
    });

    // Set up viewer change handler
    this.ext.viewer.onChanged(() => {
      this.emit('viewerChanged', this.ext.viewer);
    });

    // Set up features change handler
    this.ext.features.onChanged(changed => {
      this.emit('featuresChanged', changed);
    });

    this.pubsub = new PubSubClient({
      ext: this.ext,
      onError: err => this.emit('pubsubError', err),
      onMessage: msg => this.emit('pubsubMessage', msg)
    });
  }

  get ext(): TT.Ext.TwitchExtensionHelper {
    return window.Twitch.ext;
  }

  get viewer() {
    return this.ext.viewer;
  }

  get features() {
    return this.ext.features;
  }

  get actions() {
    return this.ext.actions;
  }

  get bits() {
    return this.ext.bits;
  }

  get configuration() {
    return this.ext.configuration;
  }

  // API Request Helper using the helixToken
  async helix<T = unknown>(endpoint: string, fetcher = fetch, options: RequestInit = {}) {
    if (!this.auth?.helixToken) throw new Error('Helix token not available');

    const response = await fetcher(`https://api.twitch.tv/helix${endpoint}`, {
      ...options,
      headers: {
        'Client-Id': this.auth.clientId,
        Authorization: `Extension ${this.auth.helixToken}`,
        ...options.headers
      }
    });

    return (await response.json()) as T;
  }

  async Viewer() {
    return (this.helixer ||= await this.helix<{ data: Array<typeof Twitch.I.helixer> }>('/users?id=' + this.viewer.id)?.then(
      res => res.data[0]
    ));
  }

  static get I() {
    // window.Twitch && window.Twitch.ext &&
    return (instance ??= new Twitch());
  }
}
