// ============================================
// types/twitch.d.ts - Updated Twitch Extension Types
// ============================================
export namespace Twitch {
  namespace PubSub {
    /**
     * PubSub message targets for Extension messaging.
     *
     * - "broadcast"         → All viewers on a channel
     * - "whisper-<userId>"  → Specific viewer (opaque or real user ID)
     * - "global"            → All channels where extension is installed
     */
    type Target = 'broadcast' | `whisper-${string}` | 'global';
  }

  namespace oauth2 {
    type Validated = {
      client_id: string;
      login: string;
      user_id: string;
      scopes: string[];
      expires_in: number;
    };
    type Token = {
      access_token: string;
      refresh_token: string;
      id_token: string;
      token_type: string;
      expires_in: number;
      nonce: string;
      scope: string | string[];
    };
    type UserInfo = {
      // default claims
      aud: string;
      azp: string;
      exp: number;
      iat: number;
      iss: string;
      sub: string;
      // guaranteed by your id_token claims
      email: string;
      email_verified: boolean;
      preferred_username: string;
      // guaranteed by your userinfo claims
      picture: string;
    };
  }
  namespace Helix {
    interface IResponse<T> {
      data: T[];
      pagination?: { cursor: string };
    }
    type User = {
      id: string;
      login: string;
      display_name: string;
      email?: string;
      profile_image_url: string;
    };
    type Chatter = {
      user_id: string;
      user_login: string;
      user_name: string;
    };
  }
  namespace Ext {
    type Roles = 'broadcaster' | 'moderator' | 'viewer' | 'external';

    interface Auth {
      channelId: string;
      clientId: string;
      token: string; // JWT for EBS authentication
      helixToken: string; // JWT for Twitch API requests
      userId?: string;
    }

    interface Context {
      arePlayerControlsVisible?: boolean;
      bitrate?: number;
      bufferSize?: number;
      displayResolution?: string;
      game?: string;
      hlsLatencyBroadcaster?: number;
      hostingInfo?: { hostedChannelId: string; hostingChannelId: string };
      isFullScreen?: boolean;
      isMuted?: boolean;
      isPaused?: boolean;
      isTheatreMode?: boolean;
      language?: string;
      mode?: 'viewer' | 'dashboard' | 'config';
      playbackMode?: 'video' | 'audio' | 'remote' | 'chat-only';
      theme?: 'light' | 'dark';
      videoResolution?: string;
      volume?: number;
    }

    interface Actions {
      followChannel: (channelName: string) => void;
      minimize: () => void;
      onFollow: (callback: (didFollow: boolean, channelName: string) => void) => void;
      requestIdShare: () => void;
    }

    interface ConfigurationSegment {
      version: string;
      content: string;
    }

    interface Configuration {
      broadcaster?: ConfigurationSegment;
      developer?: ConfigurationSegment;
      global?: ConfigurationSegment;
      onChanged: (callback: () => void) => void;
      set: (segment: 'broadcaster' | 'developer' | 'global', version: string, content: string) => void;
    }

    interface Features {
      isBitsEnabled: boolean;
      isChatEnabled: boolean;
      isSubscriptionStatusAvailable: boolean;
      onChanged: (callback: (changed: string[]) => void) => void;
    }

    interface Viewer {
      helixToken: string;
      id: string | null;
      isLinked: boolean;
      opaqueId: string;
      role: Roles;
      sessionToken: string;
      subscriptionStatus: '1000' | '2000' | '3000' | null;
      onChanged: (callback: () => void) => void;
    }

    interface Product {
      sku: string;
      displayName: string;
      cost: { amount: string; type: 'bits' };
      inDevelopment?: boolean;
    }

    interface TransactionObject {
      displayName: string;
      initiator: 'current_user' | 'other';
      product: Product;
      domainId: string;
      transactionId: string;
      transactionReceipt: string;
      userId: string;
    }

    interface Bits {
      getProducts: () => Promise<Product[]>;
      onTransactionCancelled: (callback: () => void) => void;
      onTransactionComplete: (callback: (transaction: TransactionObject) => void) => void;
      setUseLoopback: (useLoopback: boolean) => void;
      showBitsBalance: () => void;
      useBits: (sku: string) => void;
    }

    interface TwitchExtensionHelper {
      version: string;
      environment: string;

      // Core callbacks
      onAuthorized: (callback: (auth: Auth) => void) => void;
      onContext: (callback: (context: Context, changed?: string[]) => void) => void;
      onError: (callback: (error: any) => void) => void;
      onHighlightChanged: (callback: (highlighted: boolean) => void) => void;
      onPositionChanged: (callback: (position: { x: number; y: number }) => void) => void;
      onVisibilityChanged: (callback: (isVisible: boolean, context?: Context) => void) => void;

      // Extension Messaging (NOT deprecated - this is Extension-specific, not legacy PubSub)
      send: (target: string, contentType: string, message: object | string) => void;
      listen: (target: string, callback: (target: string, contentType: string, message: string) => void) => void;
      unlisten: (target: string, callback: Function) => void;

      // Sub-namespaces
      actions: Actions;
      configuration: Configuration;
      features: Features;
      bits: Bits;
      viewer: Viewer;
    }

    interface HelixUser {
      broadcaster_type: string;
      created_at: string;
      description: string;
      display_name: string;
      id: string;
      login: string;
      offline_image_url: string;
      profile_image_url: string;
      type: string;
      view_count: number;
    }

    /**
     * {
     *   "exp": 1484242525,
     *   "opaque_user_id": "UG12X345T6J78",
     *   "channel_id": "test_channel",
     *   "role": "broadcaster",
     *   "is_unlinked": "false",
     *   "pubsub_perms": {
     *     "listen": [ "broadcast", "whisper-UG12X345T6J78" ],
     *     "send": ["broadcast","whisper-*"]
     *   }
     * }
     */
    interface JWTPayload {
      exp: number;
      user_id?: string;
      opaque_user_id: string;
      channel_id: string;
      role: Roles;
      is_unlinked: boolean;
      pubsub_perms: {
        listen: string[];
        send: string[];
      };
    }
  }

  type Viewer = Twitch.HelixUser;
  type Player = { validated: oauth2.Validated; user: oauth2.UserInfo };
}
