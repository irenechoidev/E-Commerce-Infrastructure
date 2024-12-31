import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataStorageStack } from '../lib/data-storage-stack';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const controlPlaneStackName = 'TestControlPlaneStack';
const dataStorageStackName = 'TestDataStorageStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, { bucket: codeArtifactStack.bucket });
const dataStorageStack = new DataStorageStack(app, dataStorageStackName, {
  controlPlaneLambda: controlPlaneStack.lambdaFunction
});

const APP_NAME = 'e-commerce';
const USER_TABLE = `${APP_NAME}-user-table-v1`;
const USER_TABLE_PARTITION_KEY = 'id';

test('Data Storage Resources Created', () => {
  const template = Template.fromStack(dataStorageStack);

  template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
    TableName: USER_TABLE,
    KeySchema: [
      {
        AttributeName: USER_TABLE_PARTITION_KEY,
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: USER_TABLE_PARTITION_KEY,
        AttributeType: 'S'
      }
    ]
  });
});