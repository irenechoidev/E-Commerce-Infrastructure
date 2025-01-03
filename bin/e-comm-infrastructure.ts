#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { REGION } from '../commons/constants';
import { CodeArtifactStack } from '../lib/code-artifact-stack';
import { DataStorageStack } from '../lib/data-storage-stack';

const app = new cdk.App();

const codeArtifactStackName = 'ECommerceCodeArtifactStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName, {
  env: { region: REGION }
});

const controlPlaneStackName = 'ECommerceControlPlaneStack';
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, {
  env: { region: REGION },
  bucket: codeArtifactStack.bucket
});

const dataStorageStackName = 'ECommerceDataStorageStack';
new DataStorageStack(app, dataStorageStackName, {
  env: { region: REGION },
  controlPlaneLambda: controlPlaneStack.lambdaFunction
});

controlPlaneStack.addDependency(codeArtifactStack);