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

  // ssh-pulickey strings (default: `ssh-add -L|head -n 1` command)
  sshPublicKey: sshPublicKey(),
  // my inetnet ip address. ex:"15.230.221.1/32" (default: `curl inet-ip.info`)
  myIPs: [getMyIP()],
});
cdk.Tags.of(baseStack).add("stackName", baseStack.stackName);

[
  {
    serverName: prefix, // server name
    props: {
      env: env,
      prefix: prefix,
      base: baseStack.base,
      snapshotGen: 0, // number of snapshot generations
      volumeSize: 0, // EBS volume size (GB)
      route53domainName: getEnv("ROUTE53_ZONE_DNS_NAME"),
      route53hostZone: getEnv("ROUTE53_ZONEID"),
      postService: getEnv("POSTSERVICE"),
      // discordChannelID: getEnv("DISCORD_CHANNELID"),
    },
  },
].map((conf) => {
  const stack = new spotServerStack(app, conf.serverName, conf.props);
  cdk.Tags.of(stack).add("stackName", stack.stackName);
});
