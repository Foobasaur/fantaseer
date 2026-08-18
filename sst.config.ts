/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      home: 'aws',
      name: 'fantaseer-kit',
      protect: ['prod', 'beta'].includes(input?.stage),
      removal: ['prod', 'beta'].includes(input?.stage) ? 'retain' : 'remove'
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc('MyVpc', { bastion: true, nat: { ec2: { instance: 't4g.nano' } } });
    const db = new sst.aws.Postgres('MyPostgres', {
      vpc,
      proxy: true,
      dev: { host: 'localhost', port: 5433, username: 'root', password: 'mysecretpassword', database: 'local' }
    });

    // Serverless SvelteKit
    new sst.aws.SvelteKit('MyWeb', {
      vpc,
      warm: 1,
      link: [db],
      // Domain enters via the CDN transform, NOT the component's `domain` prop: the component prop also
      // arms CF_BLOCK_CLOUDFRONT_URL_INJECTION in the viewer-request function, 403ing the legacy
      // *.cloudfront.net URL that the RELEASED Twitch bundle still calls. The Cdn runs the full domain
      // lifecycle (ACM cert, DNS validation, alias records) either way, and routeSite routing is
      // host-agnostic, so both hostnames serve. Move this to a plain `domain:` prop once the reviewed
      // bundle pointing at the domain ships on Twitch.
      transform: {
        cdn: cdnArgs => {
          if ($app.stage === 'beta') cdnArgs.domain = 'beta.fantaseer.foobasaur.com';
        },
        server: args => {
          args.memory = '4096 MB';
          args.timeout = '30 seconds';
        }
      },
      environment: {
        TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID!,
        TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET!,
        TWITCH_EXTENSION_SECRET: process.env.TWITCH_EXTENSION_SECRET!,
        TWITCH_EXTENSION_OWNER_ID: process.env.TWITCH_EXTENSION_OWNER_ID!,
        TWITCH_EXTENSION_CLIENT_ID: process.env.TWITCH_EXTENSION_CLIENT_ID!
      }
    });
  }
});
