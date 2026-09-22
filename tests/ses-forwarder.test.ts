import { assert, beforeEach, describe, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  s3: [] as { input: Record<string, string> }[],
  ses: [] as { input: { FromEmailAddress: string; Destination: { ToAddresses: string[] }; Content: { Raw: { Data: Uint8Array } } } }[],
  object: new Uint8Array()
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send(cmd: { input: Record<string, string> }) {
      calls.s3.push(cmd);
      return Promise.resolve({ Body: { transformToByteArray: () => Promise.resolve(calls.object) } });
    }
  },
  GetObjectCommand: class {
    constructor(readonly input: Record<string, string>) {}
  }
}));

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: class {
    send(cmd: (typeof calls.ses)[number]) {
      calls.ses.push(cmd);
      return Promise.resolve({});
    }
  },
  SendEmailCommand: class {
    constructor(readonly input: (typeof calls.ses)[number]['input']) {}
  }
}));

vi.mock('sst', () => ({
  Resource: { MailStore: { name: 'mail-store' }, MailIdentity: { sender: 'foobasaur.com' } }
}));

process.env.MAIL_FORWARD_TO = 'inbox@example.org';
process.env.MAIL_PREFIX = 'inbound/';

const { handler } = await import('../functions/ses-forwarder/index');

type Event = Parameters<typeof handler>[0];

const event = (messageId: string, spam = 'PASS', virus = 'PASS'): Event =>
  ({
    Records: [{ ses: { mail: { messageId }, receipt: { spamVerdict: { status: spam }, virusVerdict: { status: virus } } } }]
  }) as unknown as Event;

const message = (eol: string, headers: string[], body: string) => Buffer.from(headers.join(eol) + eol + eol + body);

const sent = () => {
  assert.lengthOf(calls.ses, 1);
  const input = calls.ses[0]!.input;
  const raw = Buffer.from(input.Content.Raw.Data).toString();
  return { input, raw };
};

const inbound = [
  'Return-Path: <bounce@example.org>',
  'Received: from mx.example.org',
  'DKIM-Signature: v=1; a=rsa-sha256;',
  '\td=example.org; s=sel;',
  'Message-ID: <orig-1@example.org>',
  'From: "Alice Example" <alice@example.org>',
  'To: hello@foobasaur.com',
  'Subject: hi',
  'Content-Type: text/plain; charset=utf-8'
];

describe('ses forwarder handler', () => {
  beforeEach(() => {
    calls.s3.length = 0;
    calls.ses.length = 0;
  });

  it('rewrites the envelope headers and forwards the body untouched', async () => {
    calls.object = message('\r\n', inbound, 'body line 1\r\nbody line 2\r\n');
    await handler(event('msg-1'));

    assert.lengthOf(calls.s3, 1);
    assert.deepEqual(calls.s3[0]!.input, { Bucket: 'mail-store', Key: 'inbound/msg-1' });

    const { input, raw } = sent();
    assert.equal(input.FromEmailAddress, 'forward@foobasaur.com');
    assert.deepEqual(input.Destination.ToAddresses, ['inbox@example.org']);

    const sep = raw.indexOf('\r\n\r\n');
    const headers = raw.slice(0, sep).split('\r\n');
    assert.equal(raw.slice(sep + 4), 'body line 1\r\nbody line 2\r\n');
    assert.include(headers, 'From: "Alice Example" <forward@foobasaur.com>');
    assert.include(headers, 'Reply-To: "Alice Example" <alice@example.org>');
    assert.include(headers, 'X-Original-Message-Id: msg-1');
    assert.include(headers, 'Received: from mx.example.org');
    assert.include(headers, 'To: hello@foobasaur.com');
    assert.include(headers, 'Subject: hi');
    for (const line of headers) {
      assert.notMatch(line, /^(Return-Path|DKIM-Signature|Message-ID):/i);
      assert.notInclude(line, 'd=example.org; s=sel;');
    }
  });

  it('keeps an explicit Reply-To over the original From', async () => {
    calls.object = message('\r\n', [...inbound, 'Reply-To: replies@example.org'], 'x');
    await handler(event('msg-2'));

    const { raw } = sent();
    const headers = raw.split('\r\n\r\n')[0]!.split('\r\n');
    assert.include(headers, 'Reply-To: replies@example.org');
    assert.lengthOf(headers.filter(l => /^Reply-To:/i.test(l)), 1);
  });

  it('handles LF-only messages with LF output', async () => {
    calls.object = message('\n', inbound, 'lf body\n');
    await handler(event('msg-3'));

    const { raw } = sent();
    assert.notInclude(raw, '\r\n');
    assert.include(raw, '\nX-Original-Message-Id: msg-3\n\nlf body\n');
  });

  it('drops a message that failed the spam or virus verdict without reading or sending', async () => {
    calls.object = message('\r\n', inbound, 'spam');
    await handler(event('msg-4', 'FAIL'));
    await handler(event('msg-5', 'PASS', 'FAIL'));

    assert.lengthOf(calls.s3, 0);
    assert.lengthOf(calls.ses, 0);
  });
});
