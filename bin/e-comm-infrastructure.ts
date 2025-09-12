#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { REGION } from '../commons/constants';
import { CodeArtifactStack } from '../lib/code-artifact-stack';
import { ApiStack } from '../lib/api-stack';
import { BgOperationsStack } from '../lib/bg-operations-stack';

const app = new cdk.App();

const codeArtifactStackName = 'ECommerceCodeArtifactStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName, {
  env: { region: REGION }
});

const controlPlaneStackName = 'ECommerceControlPlaneStack';
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, {
  env: { region: REGION },
  codeBucket: codeArtifactStack.bucket
});

const apiStackName = 'ECommerceApiStack';
const apiStack = new ApiStack(app, apiStackName, {
  env: { region: REGION },
  controlPlaneLambda: controlPlaneStack.lambdaFunction
});

const bgOperationsStackName = 'ECommerceBgOperationsStack';
const bgOperationsStack = new BgOperationsStack(app, bgOperationsStackName, {
    env: { region: REGION },
    productImageTable: controlPlaneStack.productImageTable
});

bgOperationsStack.addDependency(controlPlaneStack);
apiStack.addDependency(controlPlaneStack);
controlPlaneStack.addDependency(codeArtifactStack);
