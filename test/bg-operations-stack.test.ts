import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ControlPlaneStack } from '../lib/control-plane-stack';
import { CodeArtifactStack } from '../lib/code-artifact-stack';
import { BgOperationsStack } from '../lib/bg-operations-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const controlPlaneStackName = 'TestControlPlaneStack';
const bgOperationsStackName = 'TestBgOperationsStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);
const controlPlaneStack = new ControlPlaneStack(app, controlPlaneStackName, { 
  codeBucket: codeArtifactStack.bucket 
});
const bgOperationsStack = new BgOperationsStack(app, bgOperationsStackName, {
    productImageTable: controlPlaneStack.productImageTable
});

const APP_NAME = 'e-commerce';
const QUEUE_NAME = `${APP_NAME}-bg-operations-queue`;
const PIPE_NAME = `${APP_NAME}-bg-operations-pipe`;
const PIPE_ROLE_NAME = `${APP_NAME}-bg-operations-pipe-role`;
const MAX_SQS_RETENTION_PERIOD_DAYS = 14;

test('Bg Operations Resources Created', () => {
  const template = Template.fromStack(bgOperationsStack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    QueueName: QUEUE_NAME,
    MessageRetentionPeriod: MAX_SQS_RETENTION_PERIOD_DAYS * 24 * 3600
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: PIPE_ROLE_NAME,
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "pipes.amazonaws.com"
          }
        }
      ]
    }
  });

  const isRemovePattern = JSON.stringify({ eventName: ["REMOVE"] });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Name: PIPE_NAME,
    SourceParameters: {
      DynamoDBStreamParameters: {
        StartingPosition: "TRIM_HORIZON"
      },
      FilterCriteria: {
        Filters: [
            {
              Pattern: isRemovePattern
            }
        ]
      }
    }
  });
});
