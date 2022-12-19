import * as cdk from "aws-cdk-lib";
import {
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ec2 as ec2,
  aws_route53 as route53,
  Tags,
  StackProps,
} from "aws-cdk-lib";
import { Service } from "aws-cdk-lib/aws-servicediscovery";
import { Construct } from "constructs";

// import { readFileSync } from "fs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface spotBaseprops extends StackProps {
  myIPs: string[];
  sshPublicKey: string;
  prefix: string;
  route53domainName: string;
}

export interface spotBase {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  ec2Policy: iam.ManagedPolicy;
  fleetSpotRoleArn: string;
  keyPairName: string;
  subnets: string[];
  route53hostZone: route53.IHostedZone;
}

export class spotBaseStack extends cdk.Stack {
  public readonly base: spotBase;
  public readonly apiURL: string;

  constructor(scope: Construct, id: string, props: spotBaseprops) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "vpc", {
      //cidr: "10.1.0.0/21",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      maxAzs: 99,
    });

    // SecurityGroup
    const securityGroup = new ec2.SecurityGroup(this, "SG", {
      vpc,
      description: "Allow ssh access to ec2 instances",
      allowAllOutbound: true, // Can be set to false
    });
    props.myIPs.map((ip) => {
      securityGroup.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(22), "ssh");
      securityGroup.addIngressRule(
        ec2.Peer.ipv4(ip),
        ec2.Port.allIcmp(),
        "icmp"
      );
      securityGroup.addIngressRule(
        ec2.Peer.ipv4(ip),
        ec2.Port.tcp(443),
        "https"
      );
    });
    Tags.of(securityGroup).add("Name", `${this.stackName}SG`);

    // IAM policy
    const ec2Policy = new iam.ManagedPolicy(this, "EC2Policy", {
      description: "",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "kms:Decrypt",
            "route53:ChangeResourceRecordSets",
            "ssm:GetParametersByPath",
            "ssm:GetParameters",
            "ssm:GetParameter",
          ],
          resources: [
            "arn:aws:kms:*:*:key/CMK",
            `arn:aws:ssm:*:*:parameter/${props.prefix}/*`,
            "arn:aws:route53:::hostedzone/*",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ec2:DescribeVolumes",
            "ec2:DescribeSnapshots",
            "ec2:DeleteSnapshot",
            "ec2:CreateSnapshot",
            "ec2:DetachVolume",
            "ec2:AttachVolume",
            "ec2:DeleteVolume",
            "ec2:CreateVolume",
            "ec2:CreateTags",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:DisassociateAddress", "ec2:AssociateAddress"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:ModifySpotFleetRequest"],
          resources: [
            "arn:aws:ec2:*:*:launch-template/*",
            "arn:aws:ec2:*:*:spot-fleet-request/*",
            "arn:aws:ec2:*:*:subnet/*",
          ],
        }),
      ],
    });
    // FleetSpot IAM Role
    const fleetSpotRole = new iam.Role(this, "spotfleetRole", {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEC2SpotFleetTaggingRole"
        ),
      ],
      assumedBy: new iam.ServicePrincipal("spotfleet.amazonaws.com"),
      path: "/",
    });
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZoneID", {
      domainName: props.route53domainName,
    });

    // SSH key pair
    const keyPair = new ec2.CfnKeyPair(this, "MyCfnKeyPair", {
      keyName: `${this.stackName}KeyPair`,
      publicKeyMaterial: props.sshPublicKey,
    });

    this.base = {
      vpc: vpc,
      securityGroup: securityGroup,
      ec2Policy: ec2Policy,
      fleetSpotRoleArn: fleetSpotRole.roleArn,
      keyPairName: keyPair.keyName,
      route53hostZone: hostedZone,
      subnets: vpc.publicSubnets.map((d): string => {
        return d.subnetId;
      }),
    };
  }
}
