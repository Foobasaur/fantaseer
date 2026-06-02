// ============================================
// PubSub Server — EBS-side publish helper
// ============================================
// Signs JWTs with the extension shared secret and calls
// POST https://api.twitch.tv/helix/extensions/pubsub
//
// Usage:
//   const pub = new PubSubServer({
//     clientId: 'your_extension_client_id',
//     secret: 'base64_encoded_shared_secret',
//     ownerId: 'extension_owner_twitch_user_id',
//   });
//
//   // Broadcast to all viewers on a channel
//   await pub.broadcast('12345678', { type: 'update', score: 42 });
//
//   // Whisper to a specific viewer
//   await pub.whisper('12345678', 'U98765', { type: 'reward', item: 'crown' });
//
//   // Global broadcast (all channels)
//   await pub.global({ type: 'announcement', text: 'Maintenance in 5m' });
// ============================================

import { env } from '$env/dynamic/private';
import type { DB, Twitch } from '@';
import { error } from '@sveltejs/kit';
import { createHmac } from 'node:crypto';

const TWITCH_PUBSUB_URL = 'https://api.twitch.tv/helix/extensions/pubsub';
const DEFAULT_TOKEN_TTL_SECONDS = 60;
const MAX_MESSAGE_BYTES = 5120; // 5 KB limit

// ──────────────────────────────────────────────
// JWT signing (zero-dependency, Node.js only)
// ──────────────────────────────────────────────
export const base64url = (input: string | Buffer) => {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
};
// ──────────────────────────────────────────────
// PubSubServer class
// ──────────────────────────────────────────────

interface JwtPayload {
  exp: number;
  user_id: string;
  role: 'external';
  channel_id?: string;
  pubsub_perms: {
    send: string[];
  };
}
interface SendRequest {
  target: string[];
  broadcaster_id: string;
  is_global_broadcast: boolean;
  message: string;
}
interface Config {
  /** Extension client ID */
  clientId: string;
  /** Extension shared secret (base64-encoded) */
  secret: string;
  /** Twitch user ID of the extension owner */
  ownerId: string;
}

export class PubSubServer {
  private constructor(
    private config: Config = {
      clientId: env.TWITCH_EXTENSION_CLIENT_ID,
      secret: env.TWITCH_EXTENSION_SECRET,
      ownerId: env.TWITCH_EXTENSION_OWNER_ID
    }
  ) {}

  /**
   * Create a signed JWT for the given channel and targets.
   */
  private createToken = (channelId?: string, targets: string[] = ['*']) => {
    const payload: JwtPayload = {
      exp: Math.floor(Date.now() / 1000) + DEFAULT_TOKEN_TTL_SECONDS,
      user_id: this.config.ownerId,
      role: 'external',
      pubsub_perms: { send: targets },
      ...(channelId && { channel_id: channelId })
    };

    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify(payload));
    const unsigned = `${header}.${body}`;

    const secret = Buffer.from(this.config.secret, 'base64');
    const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');

    return `${unsigned}.${signature}`;
  };

  /**
   * Send a PubSub message via the Twitch API.
   */
  private send = async (targret: Twitch.PubSub.Target, broadcasterId: string, msg: unknown, global = false) => {
    const body: SendRequest = {
      target: global ? ['global'] : [targret],
      broadcaster_id: broadcasterId,
      is_global_broadcast: global,
      message: typeof msg === 'string' ? msg : JSON.stringify(msg)
    };

    // Validate message size
    const byteLength = new TextEncoder().encode(body.message).length;
    if (byteLength > MAX_MESSAGE_BYTES) error(400, `Message exceeds ${MAX_MESSAGE_BYTES} bytes limit (${byteLength} bytes)`);

    const token = this.createToken(body.is_global_broadcast ? undefined : body.broadcaster_id, body.target);

    // const body: PubSub.SendRequest = { target: targets, broadcaster_id, is_global_broadcast, message };
    const res = await fetch(TWITCH_PUBSUB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': this.config.clientId,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      error(res.status, `Twitch PubSub error: ${text}`);
    }

    return res; // 204 on success — no body to parse
  };

  /**
   * Broadcast a message to all viewers on a channel.
   *
   * @param req Request object containing channelId and message payload
   * @returns Fetch Response from Twitch API
   *
   * @example
   * ```ts
   * await pub.broadcast({ channelId, message: { event: 'test:u', payload: { poo: 'doo' } } });
   * ```
   */
  broadcast = async <T extends DB.Tablekey | (unknown & {}) = any>(
    channelId: string,
    message: T extends DB.Tablekey ? DB.FeedEntry<T> : T
  ) => this.send('broadcast', channelId, message);

  /**
   * Whisper a message to a specific viewer on a channel.
   *
   * @param broadcasterId  Channel's Twitch user ID
   * @param userId         Target viewer's user ID (opaque or real)
   * @param message        Payload — will be JSON.stringify'd
   */
  whisper = async (broadcasterId: string, userId: string, message: unknown) =>
    this.send(`whisper-${userId}`, broadcasterId, message);

  /**
   * Send a global message to all channels where the extension is installed.
   *
   * @param message  Payload — will be JSON.stringify'd
   */
  global = async (message: unknown) => this.send('global', 'all', message, true);

  /**
   * Generic publish with full options control.
   */
  publish = async (opts: {
    /** Channel to publish to (broadcaster's Twitch user ID) */
    broadcasterId: string;
    /** Target audience */
    target: Twitch.PubSub.Target;
    /** Message payload — will be JSON.stringify'd */
    message: unknown;
  }) => this.send(opts.target, opts.broadcasterId, opts.message);

  /**
   * Expose JWT creation for external use (e.g., testing, custom flows).
   */
  createJwt = (channelId?: string, targets?: string[]) => this.createToken(channelId, targets);

  // Singleton instance for convenience
  private static instance?: PubSubServer;
  static get I() {
    return (PubSubServer.instance ??= new PubSubServer());
  }
}
