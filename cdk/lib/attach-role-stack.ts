import * as cdk from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { spotServerStack } from "./spot-server-stack";
// import { readFileSync } from "fs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface attachRoleStackProps extends StackProps {
  serverstack: spotServerStack;
}

export class attachRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: attachRoleStackProps) {
    super(scope, id, props);
    props.serverstack.acmRole.addManagedPolicy(props.serverstack.acmRolePolicy);
  }
}
