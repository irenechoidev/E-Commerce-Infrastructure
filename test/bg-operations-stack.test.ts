import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
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
    productImageTable: controlPlaneStack.productImageTable,
    codeBucket: codeArtifactStack.bucket,
    imageBucket: controlPlaneStack.imageBucket
});

const APP_NAME = 'e-commerce';
const QUEUE_NAME = `${APP_NAME}-bg-operations-queue`;
const DLQ_NAME = `${APP_NAME}-bg-operations-dlq`;
const PIPE_NAME = `${APP_NAME}-bg-operations-pipe`;
const PIPE_ROLE_NAME = `${APP_NAME}-bg-operations-pipe-role`;
const MAX_SQS_RETENTION_PERIOD_DAYS = 14;
const SQS_BATCH_SIZE = 1;
const DLQ_RECIEVE_COUNT = 3;

const BG_OPERATIONS_LAMBDA_NAME = `${APP_NAME}-bg-operations-lambda`;
const BG_OPERATIONS_LAMBDA_HANDLER = 'ecommerce.background.ECommerceBackgroundOperationsHandler';
const BG_OPERATIONS_LAMBDA_TIMEOUT_SECONDS = 30;
const BG_OPERATIONS_CODE_OBJECT_KEY = 'bg/app.jar';

test('Bg Operations Resources Created', () => {
  const template = Template.fromStack(bgOperationsStack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    QueueName: DLQ_NAME,
    MessageRetentionPeriod: MAX_SQS_RETENTION_PERIOD_DAYS * 24 * 3600
  });

  template.hasResourceProperties('AWS::SQS::Queue', {
    QueueName: QUEUE_NAME,
    MessageRetentionPeriod: MAX_SQS_RETENTION_PERIOD_DAYS * 24 * 3600,
    RedrivePolicy: {
       maxReceiveCount: DLQ_RECIEVE_COUNT
    }
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

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: BG_OPERATIONS_LAMBDA_NAME,
    Runtime: 'java17',
    Handler: BG_OPERATIONS_LAMBDA_HANDLER,
    Code: {
      S3Key: BG_OPERATIONS_CODE_OBJECT_KEY,
    },
    Timeout: BG_OPERATIONS_LAMBDA_TIMEOUT_SECONDS
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

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action:  ['s3:GetObject', 's3:DeleteObject'],
          Effect: 'Allow',
        }),
      ]),
    },
  }); 

  template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
    BatchSize: SQS_BATCH_SIZE,
    Enabled: true
  });
});
