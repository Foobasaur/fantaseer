// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference path="../sst-env.d.ts" />
import type { Server, Twitch } from '@';

declare global {
  interface Window {
    Twitch: { ext: Twitch.Ext.TwitchExtensionHelper };
  }
  namespace App {
    interface Locals {
      user: toothy<Server.Auth.User<Twitch.Viewer | Twitch.Player, Twitch.Ext.JWTPayload, Twitch.oauth2.Validated>>;
      awsRequestId?: string;
    }
    interface Error {
      message: string;
      code?: string;
    }
  }
  // interface Locals {}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
