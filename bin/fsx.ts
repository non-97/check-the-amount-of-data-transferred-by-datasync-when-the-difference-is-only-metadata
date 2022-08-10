#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ManagedMSADStack } from "../lib/managed-msad-stack";
import { FSxStack } from "../lib/fsx-stack";

const app = new cdk.App();

const domainName = "corp.non-97.net";
const organizationalUnitDistinguishedName =
  "OU=FSxForONTAP,OU=corp,DC=corp,DC=non-97,DC=net";

const managedMSADStack = new ManagedMSADStack(app, "ManagedMSADStack", {
  domainName,
});

new FSxStack(app, "FSxStack", {
  domainName,
  organizationalUnitDistinguishedName,
  vpc: managedMSADStack.vpc,
  managedMSADSecret: managedMSADStack.managedMSADSecret,
});
