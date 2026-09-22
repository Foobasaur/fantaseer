/// <reference path="../.sst/platform/config.d.ts" />

const DOMAIN = 'foobasaur.com';
const PREFIX = 'inbound/';

export function setupEmailForwarding() {
  const account = aws.getCallerIdentityOutput({});
  const region = aws.getRegionOutput({}).region;

  const email = new sst.aws.Email('MailIdentity', {
    sender: DOMAIN,
    mailFrom: { domain: `mail.${DOMAIN}` }
  });

  sst.aws.dns().createRecord(
    'Mail',
    { type: 'MX', name: DOMAIN, value: $interpolate`inbound-smtp.${region}.amazonaws.com`, priority: 10 },
    {}
  );

  const bucket = new sst.aws.Bucket('MailStore', {
    policy: [
      {
        principals: [{ type: 'service', identifiers: ['ses.amazonaws.com'] }],
        actions: ['s3:PutObject'],
        paths: [`${PREFIX}*`],
        conditions: [{ test: 'StringEquals', variable: 'aws:SourceAccount', values: [account.accountId] }]
      }
    ],
    lifecycle: [{ id: 'expire', prefix: PREFIX, expiresIn: '30 days' }]
  });

  const fn = new sst.aws.Function('MailForwarder', {
    handler: 'functions/ses-forwarder/index.handler',
    link: [bucket, email],
    timeout: '30 seconds',
    memory: '256 MB',
    environment: { MAIL_FORWARD_TO: process.env.MAIL_FORWARD_TO!, MAIL_PREFIX: PREFIX }
  });

  const invokePerm = new aws.lambda.Permission('MailFwdInvoke', {
    action: 'lambda:InvokeFunction',
    function: fn.name,
    principal: 'ses.amazonaws.com',
    sourceAccount: account.accountId
  });

  const ruleSet = new aws.ses.ReceiptRuleSet('MailRuleSet', { ruleSetName: 'forwarding' });

  new aws.ses.ActiveReceiptRuleSet('MailRuleSetActive', { ruleSetName: ruleSet.ruleSetName });

  new aws.ses.ReceiptRule(
    'MailForwardAll',
    {
      ruleSetName: ruleSet.ruleSetName,
      recipients: [DOMAIN],
      enabled: true,
      scanEnabled: true,
      s3Actions: [{ bucketName: bucket.name, objectKeyPrefix: PREFIX, position: 1 }],
      lambdaActions: [{ functionArn: fn.arn, invocationType: 'Event', position: 2 }]
    },
    { dependsOn: [bucket, invokePerm, email] }
  );

  return { bucket: bucket.name, fn: fn.arn };
}
