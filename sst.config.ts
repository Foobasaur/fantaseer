/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: 'fantaseer-kit',
      home: 'aws',
      removal: ['prod', 'beta'].includes(input?.stage) ? 'retain' : 'remove',
      protect: ['prod', 'beta'].includes(input?.stage)
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc('MyVpc', { bastion: true, nat: { ec2: { instance: 't4g.medium' } } });
    const db = new sst.aws.Postgres('MyPostgres', {
      vpc,
      proxy: true,
      dev: { host: 'localhost', port: 5433, username: 'root', password: 'mysecretpassword', database: 'local' }
    });

    // Serverless SvelteKit
    new sst.aws.SvelteKit('MyWeb', {
      vpc,
      link: [db],
      warm: 1,
      // invalidation: { paths: 'all', wait: true }, // block until /* purge completes
      transform: {
        server: args => {
          args.timeout = '30 seconds';
          args.memory = '4096 MB';
        }
      },
      environment: {
        TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID!,
        TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET!,
        TWITCH_EXTENSION_CLIENT_ID: process.env.TWITCH_EXTENSION_CLIENT_ID!,
        TWITCH_EXTENSION_SECRET: process.env.TWITCH_EXTENSION_SECRET!,
        TWITCH_EXTENSION_OWNER_ID: process.env.TWITCH_EXTENSION_OWNER_ID!
      }
    });
  }
});
