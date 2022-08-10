import {
  Fn,
  Stack,
  StackProps,
  CfnDynamicReference,
  CfnDynamicReferenceService,
  RemovalPolicy,
  aws_ec2 as ec2,
  aws_fsx as fsx,
  aws_secretsmanager as secretsmanager,
  aws_s3 as s3,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface FSxStackProps extends StackProps {
  domainName: string;
  organizationalUnitDistinguishedName: string;
  vpc: ec2.IVpc;
  managedMSADSecret: secretsmanager.ISecret;
}

export class FSxStack extends Stack {
  constructor(scope: Construct, id: string, props: FSxStackProps) {
    super(scope, id, props);

    const fileSystemAdministratorsGroup = "FSxAdminGroup";

    // Security Group used by FSx for ONTAP file system
    const fileSystemSecurityGroup = new ec2.SecurityGroup(
      this,
      "Security Group of FSx for ONTAP file system",
      {
        vpc: props.vpc,
      }
    );

    // Ref : https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/limit-access-security-groups.html
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.icmpPing(),
      "Pinging the instance"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(22),
      "SSH access to the IP address of the cluster management LIF or a node management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "ONTAP REST API access to the IP address of the cluster management LIF or an SVM management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(445),
      "Microsoft SMB/CIFS over TCP with NetBIOS framing"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(749),
      "Kerberos"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3260),
      "iSCSI access through the iSCSI data LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(10000),
      "Network data management protocol (NDMP) and NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(11104),
      "Management of NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(11105),
      "SnapMirror data transfer using intercluster LIFs"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(137),
      "NetBIOS name resolution for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.udp(4049),
      "NFS quota protocol"
    );

    // Secret of FSx for ONTAP file system
    const fileSystemSecret = new secretsmanager.Secret(
      this,
      "Secret of FSx for ONTAP file system",
      {
        secretName: "/fsx-for-ontap/file-system",
        generateSecretString: {
          generateStringKey: "password",
          passwordLength: 32,
          excludeCharacters: "\\",
          requireEachIncludedType: true,
          secretStringTemplate: '{"userName": "fsxadmin"}',
        },
      }
    );

    // FSx for ONTAP file system
    const fsxForOntapFileSystem = new fsx.CfnFileSystem(
      this,
      "FSx for ONTAP file system",
      {
        fileSystemType: "ONTAP",
        subnetIds: [
          props.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          }).subnetIds[0],
        ],
        ontapConfiguration: {
          deploymentType: "SINGLE_AZ_1",
          automaticBackupRetentionDays: 7,
          dailyAutomaticBackupStartTime: "16:00",
          diskIopsConfiguration: {
            mode: "AUTOMATIC",
          },
          fsxAdminPassword: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${fileSystemSecret.secretArn}:SecretString:password`
          ).toString(),
          throughputCapacity: 128,
          weeklyMaintenanceStartTime: "6:17:00",
        },
        securityGroupIds: [fileSystemSecurityGroup.securityGroupId],
        storageCapacity: 1024,
        storageType: "SSD",
        tags: [
          {
            key: "Name",
            value: "fsx-for-ontap-file-system",
          },
        ],
      }
    );

    // FSx for ONTAP SVM
    const svmName = "fsx-for-ontap-svm";
    const svm = new fsx.CfnStorageVirtualMachine(this, "SVM", {
      fileSystemId: fsxForOntapFileSystem.ref,
      name: svmName,
      activeDirectoryConfiguration: {
        netBiosName: "SVM",
        selfManagedActiveDirectoryConfiguration: {
          dnsIps: Fn.split(
            ",",
            Fn.importValue("ManagedMicrosoftADDNSIPAddresses")
          ),
          domainName: props.domainName,
          fileSystemAdministratorsGroup,
          organizationalUnitDistinguishedName:
            props.organizationalUnitDistinguishedName,
          userName: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${props.managedMSADSecret.secretArn}:SecretString:userName`
          ).toString(),
          password: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${props.managedMSADSecret.secretArn}:SecretString:password`
          ).toString(),
        },
      },
      rootVolumeSecurityStyle: "NTFS",
      tags: [
        {
          key: "Name",
          value: svmName,
        },
      ],
    });

    // FSX for ONTAP volume
    new fsx.CfnVolume(this, "SMB Volume", {
      name: `fsx_for_ontap_volume_smb`,
      ontapConfiguration: {
        junctionPath: "/smb",
        sizeInMegabytes: "20480",
        storageEfficiencyEnabled: "true",
        storageVirtualMachineId: svm.ref,
        securityStyle: "NTFS",
        tieringPolicy: {
          coolingPeriod: 31,
          name: "AUTO",
        },
      },
      tags: [
        {
          key: "Name",
          value: `fsx_for_ontap_volume_smb`,
        },
      ],
      volumeType: "ONTAP",
    });

    // FSx for Windows File Server
    new fsx.CfnFileSystem(this, "FSx for Windows File Server", {
      fileSystemType: "WINDOWS",
      subnetIds: [
        props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnetIds[0],
      ],
      windowsConfiguration: {
        activeDirectoryId: Fn.importValue("ManagedMicrosoftADDNSID"),
        deploymentType: "SINGLE_AZ_2",
        automaticBackupRetentionDays: 7,
        dailyAutomaticBackupStartTime: "16:00",
        throughputCapacity: 128,
        weeklyMaintenanceStartTime: "6:17:00",
      },
      securityGroupIds: [fileSystemSecurityGroup.securityGroupId],
      storageCapacity: 32,
      storageType: "SSD",
      tags: [
        {
          key: "Name",
          value: "fsx-for-windows-file-server",
        },
      ],
    });

    // S3 Bucket
    new s3.Bucket(this, "DataSync Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
