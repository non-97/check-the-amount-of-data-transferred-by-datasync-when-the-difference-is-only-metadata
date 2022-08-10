import {
  Fn,
  Stack,
  StackProps,
  CfnDynamicReference,
  CfnDynamicReferenceService,
  CfnOutput,
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsmanager,
  aws_directoryservice as directoryservice,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface ManagedMSADStackProps extends StackProps {
  domainName: string;
}

export class ManagedMSADStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly managedMSADSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: ManagedMSADStackProps) {
    super(scope, id, props);

    // EC2 Instance IAM Role
    const ec2InstanceIamRole = new iam.Role(this, "EC2 Instance IAM Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMDirectoryServiceAccess"
        ),
      ],
    });

    // VPC
    this.vpc = new ec2.Vpc(this, "VPC", {
      cidr: "10.0.1.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 26,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 26,
        },
      ],
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3,
        },
      },
    });

    // Secret of Managed Microsoft AD
    this.managedMSADSecret = new secretsmanager.Secret(
      this,
      "Secret of Managed Microsoft AD",
      {
        secretName: `/managedMSAD/${props.domainName}/Admin`,
        generateSecretString: {
          generateStringKey: "password",
          passwordLength: 32,
          excludeCharacters: "\\",
          requireEachIncludedType: true,
          secretStringTemplate: '{"userName": "Admin"}',
        },
      }
    );

    // Managed Microsoft AD
    const managedMSAD = new directoryservice.CfnMicrosoftAD(
      this,
      "Managed Microsoft AD",
      {
        name: props.domainName,
        password: new CfnDynamicReference(
          CfnDynamicReferenceService.SECRETS_MANAGER,
          `${this.managedMSADSecret.secretArn}:SecretString:password`
        ).toString(),
        vpcSettings: {
          subnetIds: this.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          }).subnetIds,
          vpcId: this.vpc.vpcId,
        },
        createAlias: false,
        edition: "Standard",
        enableSso: false,
      }
    );

    // DHCP Options
    const dhcpOptions = new ec2.CfnDHCPOptions(this, "DHCP Options", {
      domainName: managedMSAD.name,
      domainNameServers: managedMSAD.attrDnsIpAddresses,
    });

    new ec2.CfnVPCDHCPOptionsAssociation(this, "VPC DHCP Options Association", {
      dhcpOptionsId: dhcpOptions.ref,
      vpcId: this.vpc.vpcId,
    });

    // EC2 Instance
    const instance = new ec2.Instance(this, "EC2 Instance", {
      instanceType: new ec2.InstanceType("t3.micro"),
      machineImage: ec2.MachineImage.latestWindows(
        ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE
      ),
      vpc: this.vpc,
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      role: ec2InstanceIamRole,
    });

    const cfnInstance = instance.node.defaultChild as ec2.CfnInstance;

    // Change its properties
    cfnInstance.ssmAssociations = [
      {
        documentName: "AWS-JoinDirectoryServiceDomain",
        associationParameters: [
          {
            key: "directoryId",
            value: [managedMSAD.ref],
          },
          {
            key: "directoryName",
            value: [managedMSAD.name],
          },
        ],
      },
    ];

    new CfnOutput(this, "Managed Microsoft AD DNS IP Addresses", {
      value: Fn.join(",", managedMSAD.attrDnsIpAddresses),
      exportName: "ManagedMicrosoftADDNSIPAddresses",
    });

    new CfnOutput(this, "Managed Microsoft AD ID", {
      value: managedMSAD.ref,
      exportName: "ManagedMicrosoftADDNSID",
    });
  }
}
