import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from "aws-cdk-lib/aws-sqs";
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource }  from "aws-cdk-lib/aws-lambda-event-sources";

interface BgOperationsStackProps extends StackProps {
    productImageTable: TableV2;
    codeBucket: Bucket;
    imageBucket: Bucket;
}

const APP_NAME = 'e-commerce';
const QUEUE_NAME = `${APP_NAME}-bg-operations-queue`;
const DLQ_NAME = `${APP_NAME}-bg-operations-dlq`;
const PIPE_NAME = `${APP_NAME}-bg-operations-pipe`;
const PIPE_ROLE_NAME = `${APP_NAME}-bg-operations-pipe-role`;
const MAX_SQS_RETENTION_PERIOD_DAYS = 14;
const DLQ_RECIEVE_COUNT = 3;
const SQS_BATCH_SIZE = 1;

const BG_OPERATIONS_LAMBDA_NAME = `${APP_NAME}-bg-operations-lambda`;
const BG_OPERATIONS_LAMBDA_HANDLER = 'ecommerce.background.ECommerceBackgroundOperationsHandler';
const BG_OPERATIONS_LAMBDA_TIMEOUT_SECONDS = 30;
const CODE_BUCKET_NAME = `${APP_NAME}-code-artifact-bucket`;
const BG_OPERATIONS_CODE_OBJECT_KEY = 'bg/app.jar';
const IMAGES_BUCKET_NAME = `${APP_NAME}-images-bucket-v1`;

export class BgOperationsStack extends Stack {
  constructor(
    scope: Construct, 
    id: string, 
    props: BgOperationsStackProps
  ) {
    super(scope, id, props);

    const dlq = new Queue(this, DLQ_NAME, {
        retentionPeriod: Duration.days(MAX_SQS_RETENTION_PERIOD_DAYS),
        queueName: DLQ_NAME
    })

    const queue = new Queue(this, QUEUE_NAME, {
        retentionPeriod: Duration.days(MAX_SQS_RETENTION_PERIOD_DAYS),
        queueName: QUEUE_NAME,
        deadLetterQueue: {
            queue: dlq,
            maxReceiveCount: DLQ_RECIEVE_COUNT
        }
    });

    const pipeRole = new Role(this, PIPE_ROLE_NAME, {
      assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
      roleName: PIPE_ROLE_NAME
    });
    props?.productImageTable.grantStreamRead(pipeRole);
    queue.grantSendMessages(pipeRole);

    const ddbStreamArn = props.productImageTable.tableStreamArn;
    if (ddbStreamArn) {
      const isRemovePattern = JSON.stringify({ eventName: ["REMOVE"] });

      new CfnPipe(this, PIPE_NAME, {
        name: PIPE_NAME,
        roleArn: pipeRole.roleArn,
        sourceParameters: {
          dynamoDbStreamParameters: {
            startingPosition: "TRIM_HORIZON"
          },
          filterCriteria: {
            filters: [{ pattern: isRemovePattern }]
          },
        },
        source: ddbStreamArn,
        target: queue.queueArn
      });
    }

    const codeBucket = props.codeBucket;
    const bgOperationsLambda = new Function(this, BG_OPERATIONS_LAMBDA_NAME, {
      functionName: BG_OPERATIONS_LAMBDA_NAME,
      runtime: Runtime.JAVA_17,
      handler: BG_OPERATIONS_LAMBDA_HANDLER,
      code: Code.fromBucket(codeBucket, BG_OPERATIONS_CODE_OBJECT_KEY),
      timeout: Duration.seconds(BG_OPERATIONS_LAMBDA_TIMEOUT_SECONDS)
    });

    bgOperationsLambda.addToRolePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [
        `arn:aws:s3:::${CODE_BUCKET_NAME}/${BG_OPERATIONS_CODE_OBJECT_KEY}`
      ],
    }));

    bgOperationsLambda.addToRolePolicy(new PolicyStatement({
      actions: ['s3:GetObject', 's3:DeleteObject'],
      resources: [
        `arn:aws:s3:::${IMAGES_BUCKET_NAME}/*`
      ],
    }));

    bgOperationsLambda.addEventSource(new SqsEventSource(queue, {
        batchSize: SQS_BATCH_SIZE,       
        enabled: true,
    }));
  }
}
