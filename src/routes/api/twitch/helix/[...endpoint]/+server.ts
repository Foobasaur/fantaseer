import { helix } from '$lib/server/twitch/api';
import { catchy } from '$lib/utilz/polly';

export const GET = () => catchy(() => helix());
export const POST = () => catchy(() => helix({ method: 'POST' }));
