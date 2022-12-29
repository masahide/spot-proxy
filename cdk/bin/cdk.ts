#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { spotServerStack } from "../lib/spot-server-stack";
import { spotBaseStack } from "../lib/base-stack";
import { sshPublicKey, getMyIP, getEnv } from "../lib/utils";

const prefix = "proxy01";
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const app = new cdk.App();
cdk.Tags.of(app).add("CDKName", prefix);

const baseStack = new spotBaseStack(app, `${prefix}Base`, {
  env: env,
  prefix: prefix,
  route53domainName: getEnv("ROUTE53_ZONE_DNS_NAME"),

  // ssh-pulickey strings (default: `ssh-add -L|head -n 1` command)
  sshPublicKey: sshPublicKey(),
  // my inetnet ip address. ex:"15.230.221.1/32" (default: `curl inet-ip.info`)
  myIPs: [getMyIP()],
});
cdk.Tags.of(baseStack).add("stackName", `baseStack.stackNameServer`);

[
  {
    serverName: prefix, // server name
    props: {
      env: env,
      prefix: prefix,
      base: baseStack.base,
      snapshotGen: 0, // number of snapshot generations
      volumeSize: 0, // EBS volume size (GB)
      postService: getEnv("POSTSERVICE"),
      // discordChannelID: getEnv("DISCORD_CHANNELID"),
    },
  },
].map((conf) => {
  const serverStack = new spotServerStack(
    app,
    `${conf.serverName}Server`,
    conf.props
  );
  cdk.Tags.of(serverStack).add("stackName", serverStack.stackName);
});
