import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const controlPlaneStackName = 'TestControlPlaneStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, {
    bucket: codeArtifactStack.bucket
});

const APP_NAME = 'e-commerce';
const CONTROL_PLANE_APP_NAME = `${APP_NAME}-control-plane`;
const USER_TABLE = `${APP_NAME}-user-table-v1`;
const ID_PARTITION_KEY = 'id';
const PRODUCT_TABLE = `${APP_NAME}-product-table-v1`;
const LAMBDA_NAME = `${CONTROL_PLANE_APP_NAME}-lambda`;
const LAMBDA_HANDLER = 'ecommerce.ECommerceControlPlaneHandler';
const LAMBDA_TIMEOUT_SECONDS = 30;
const BUCKET_NAME = `${CONTROL_PLANE_APP_NAME}-bucket`;
const BUCKET_CODE_OBJECT_KEY = 'app.jar';

test('Control Plane Resources Created', () => {
  const template = Template.fromStack(controlPlaneStack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: LAMBDA_NAME,
    Runtime: 'java17',
    Handler: LAMBDA_HANDLER,
    Code: {
      S3Key: BUCKET_CODE_OBJECT_KEY,
    },
    Timeout: LAMBDA_TIMEOUT_SECONDS
  });

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: 's3:GetObject',
          Effect: 'Allow',
        }),
      ]),
    },
  });  
});

test('Control Plane Tables Created', () => {
  const template = Template.fromStack(controlPlaneStack);

  template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
    TableName: USER_TABLE,
    KeySchema: [
      {
        AttributeName: ID_PARTITION_KEY,
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: ID_PARTITION_KEY,
        AttributeType: 'S'
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
    TableName: PRODUCT_TABLE,
    KeySchema: [
      {
        AttributeName: ID_PARTITION_KEY,
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: ID_PARTITION_KEY,
        AttributeType: 'S'
      }
    ]
  });
});
