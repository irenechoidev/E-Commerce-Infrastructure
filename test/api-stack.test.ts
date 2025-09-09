import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../lib/api-stack';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const controlPlaneStackName = 'TestControlPlaneStack';
const apiStackName = 'TestApiStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, { bucket: codeArtifactStack.bucket });
const apiStack = new ApiStack(app, apiStackName, {
    controlPlaneLambda: controlPlaneStack.lambdaFunction
});

const API_NAME = 'e-commerce-api';

test('Api Resources Created', () => {
  const template = Template.fromStack(apiStack);

  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: API_NAME,
    EndpointConfiguration: {
        Types: [
            "REGIONAL"
        ]
    }
  });
});
