import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { SESEvent } from 'aws-lambda';
import { Resource } from 'sst';

const s3 = new S3Client({});
const ses = new SESv2Client({});
const env = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`missing env: ${k}`);
  return v;
};
const FORWARD_TO = env('MAIL_FORWARD_TO');
const PREFIX = process.env.MAIL_PREFIX ?? '';
const DOMAIN = Resource.MailIdentity.sender;
const FALLBACK_FROM = `forward@${DOMAIN}`;

const DROP = new Set(['return-path', 'sender', 'dkim-signature', 'message-id', 'from', 'reply-to']);

export const handler = async (event: SESEvent): Promise<void> => {
  const rec = event.Records[0]!.ses;
  const { messageId } = rec.mail;
  const from = rec.receipt.recipients.find(r => r.toLowerCase().endsWith(`@${DOMAIN}`)) ?? FALLBACK_FROM;

  const { spamVerdict, virusVerdict } = rec.receipt;
  if (spamVerdict?.status === 'FAIL' || virusVerdict?.status === 'FAIL') {
    console.log(JSON.stringify({ dropped: messageId, spam: spamVerdict?.status, virus: virusVerdict?.status }));
    return;
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: Resource.MailStore.name, Key: `${PREFIX}${messageId}` }));
  const raw = Buffer.from(await obj.Body!.transformToByteArray());

  let sep = raw.indexOf('\r\n\r\n');
  let eol = '\r\n';
  if (sep === -1) {
    sep = raw.indexOf('\n\n');
    eol = '\n';
    if (sep === -1) throw new Error(`no header/body separator in ${messageId}`);
  }
  const body = raw.subarray(sep);
  const lines = raw.subarray(0, sep).toString().split(eol);

  const kept: string[] = [];
  let dropping = false;
  let capture: 'from' | 'reply-to' | null = null;
  let origFrom = '';
  let origReplyTo = '';

  for (const line of lines) {
    if (/^[ \t]/.test(line)) {
      if (capture === 'from') origFrom += ' ' + line.trim();
      else if (capture === 'reply-to') origReplyTo += ' ' + line.trim();
      else if (!dropping) kept.push(line);
      continue;
    }
    dropping = false;
    capture = null;
    const m = line.match(/^([!-9;-~]+):[ \t]*(.*)$/);
    const name = m?.[1]?.toLowerCase();
    if (name && DROP.has(name)) {
      dropping = true;
      if (name === 'from') {
        capture = 'from';
        origFrom = m![2]!;
      }
      if (name === 'reply-to') {
        capture = 'reply-to';
        origReplyTo = m![2]!;
      }
      continue;
    }
    kept.push(line);
  }

  const namePart = origFrom.includes('<') ? origFrom.slice(0, origFrom.indexOf('<')) : origFrom;
  const display =
    namePart.replace(/["\<>]/g, '').trim() || origFrom.replace(/["\<>]/g, '').trim() || 'unknown sender';

  kept.push(`From: "${display.replace('@', ' at ')} via Fantaseer" <${from}>`);
  kept.push(`Reply-To: ${origReplyTo || origFrom || from}`);
  kept.push(`X-Original-Message-Id: ${messageId}`);

  await ses.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [FORWARD_TO] },
      Content: { Raw: { Data: Buffer.concat([Buffer.from(kept.join(eol)), body]) } }
    })
  );
  console.log(JSON.stringify({ forwarded: messageId, to: FORWARD_TO }));
};
