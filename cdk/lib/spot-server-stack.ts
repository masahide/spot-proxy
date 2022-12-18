import * as cdk from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { CfnOutput, aws_ec2 as ec2, aws_ssm as ssm } from "aws-cdk-lib";
import { Construct } from "constructs";
import { spotBase } from "./base-stack";
// import { readFileSync } from "fs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface spotServerProps extends StackProps {
  prefix: string;
  volumeSize: number;
  snapshotGen: number;
  postService: string;
  route53domainName: string;
  route53hostZone: string;
  discordChannelID?: string;
  base: spotBase;
}

export class spotServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: spotServerProps) {
    super(scope, id, props);

    const asset = new Asset(this, "Asset", { path: "../files" });
    ////
    const setupCommands = ec2.UserData.forLinux();
    setupCommands.addCommands(
      `aws s3 cp s3://${asset.s3BucketName}/${asset.s3ObjectKey} /tmp/files.zip >> /var/tmp/setup`,
      `unzip -d /var/lib/ /tmp/files.zip >>/var/tmp/setup`,
      `bash /var/lib/scripts/user-data.sh ${props.prefix} ${this.stackName} ${props.volumeSize} ${props.snapshotGen} ${props.postService}`
    );

    const multipartUserData = new ec2.MultipartUserData();
    // Execute the rest of setup
    multipartUserData.addPart(ec2.MultipartBody.fromUserData(setupCommands));

    const launchTemplateName = `${this.stackName}Template`;
    const template = new ec2.LaunchTemplate(this, "template", {
      userData: multipartUserData,
      keyName: props.base.keyPairName,
      machineImage: ec2.MachineImage.fromSsmParameter(
        "/aws/service/ami-amazon-linux-latest/al2022-ami-kernel-default-x86_64"
      ),
      launchTemplateName: launchTemplateName,
      securityGroup: props.base.securityGroup,
      role: props.base.ec2role,
      nitroEnclaveEnabled: true,
    });

    const cfnSpotFleet = new ec2.CfnSpotFleet(this, "soptFleet", {
      spotFleetRequestConfigData: {
        iamFleetRole: props.base.fleetSpotRoleArn,
        allocationStrategy: "lowestPrice",
        terminateInstancesWithExpiration: false,
        targetCapacity: 0,
        type: "maintain",
        targetCapacityUnitType: "units",
        onDemandAllocationStrategy: "lowestPrice",
        launchTemplateConfigs: [
          {
            launchTemplateSpecification: {
              launchTemplateId: template.launchTemplateId || "",
              version: template.latestVersionNumber,
            },
            overrides: [
              {
                subnetId: props.base.subnets.join(","),
                instanceRequirements: {
                  allowedInstanceTypes: [
                    "t3a.micro",
                    "t3.micro",
                    "t3a.small",
                    "t3.small",
                    "m3.medium",
                    "t3a.medium",
                    "t3.medium",
                    "t3a.large",
                    "c5a.large",
                    "c5.large",
                    "c5d.large",
                    "c5n.large",
                    "t3.large",
                    "c6a.large",
                    "c6i.large",
                    "c6id.large",
                  ],
                },
              },
            ],
          },
        ],
      },
    });

    const params = [
      { key: "sfrID", value: cfnSpotFleet.attrId },
      { key: "volumeSize", value: `${props.volumeSize}` },
      { key: "snapshotGen", value: `${props.snapshotGen}` },
      { key: "maintenance", value: `false` },
      { key: "route53domainName", value: props.route53domainName },
      { key: "route53hostZone", value: props.route53hostZone },
    ];

    [{ key: "discordChannelID", value: props.discordChannelID }].map((prop) => {
      if (prop.value != null) {
        params.push({ key: prop.key, value: prop.value });
      }
    });

    params
      .map((kv) => {
        return {
          kv: kv,
          param: new ssm.StringParameter(this, `${kv.key}`, {
            allowedPattern: ".*",
            description: `${kv.key}`,
            parameterName: `/${props.prefix}/${this.stackName}/${kv.key}`,
            stringValue: kv.value,
            tier: ssm.ParameterTier.STANDARD,
          }),
        };
      })
      .map((param) => {
        new CfnOutput(this, `key${param.kv.key}`, {
          value: param.param.stringValue,
        });
      });
  }
}
