import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const controlPlaneStackName = 'TestControlPlaneStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, {
    bucket: codeArtifactStack.bucket
});

const CONTROL_PLANE_APP_NAME = 'e-commerce-control-plane';
const LAMBDA_NAME = `${CONTROL_PLANE_APP_NAME}-lambda`;
const LAMBDA_HANDLER = 'ecommerce.ECommerceControlPlaneHandler';
const BUCKET_NAME = `${CONTROL_PLANE_APP_NAME}-bucket`;
const BUCKET_CODE_OBJECT_KEY = 'app.jar';

test('Control Plane Resources Created', () => {
  const template = Template.fromStack(controlPlaneStack);

  // Test Lambda function
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: LAMBDA_NAME,
    Runtime: 'java17',
    Handler: LAMBDA_HANDLER,
    Code: {
      S3Key: BUCKET_CODE_OBJECT_KEY,
    },
  });

  // Test IAM policy attached to the Lambda
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 's3:GetObject',
          Effect: 'Allow',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/${BUCKET_CODE_OBJECT_KEY}`,
        },
      ],
    },
  });
});
