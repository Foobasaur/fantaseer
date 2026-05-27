import { configure } from '$lib/server/ebs';
import { catchy } from '$lib/utilz/polly';

const res = (method: keyof ReturnType<typeof configure>) => () => catchy<any>(configure()[method]);
export const GET = res('get');
export const POST = res('post');
