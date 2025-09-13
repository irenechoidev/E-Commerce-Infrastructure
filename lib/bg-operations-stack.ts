import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from "aws-cdk-lib/aws-sqs";
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

interface BgOperationsStackProps extends StackProps {
    productImageTable: TableV2
}

const APP_NAME = 'e-commerce';
const QUEUE_NAME = `${APP_NAME}-bg-operations-queue`;
const PIPE_NAME = `${APP_NAME}-bg-operations-pipe`;
const PIPE_ROLE_NAME = `${APP_NAME}-bg-operations-pipe-role`;
const MAX_SQS_RETENTION_PERIOD_DAYS = 14;

export class BgOperationsStack extends Stack {
  constructor(
    scope: Construct, 
    id: string, 
    props?: BgOperationsStackProps
  ) {
    super(scope, id, props);

    const queue = new Queue(this, QUEUE_NAME, {
        retentionPeriod: Duration.days(MAX_SQS_RETENTION_PERIOD_DAYS),
        queueName: QUEUE_NAME
    });

    const pipeRole = new Role(this, PIPE_ROLE_NAME, {
      assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
      roleName: PIPE_ROLE_NAME
    });
    props?.productImageTable.grantStreamRead(pipeRole);
    queue.grantSendMessages(pipeRole);

    const ddbStreamArn = props?.productImageTable.tableStreamArn;
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
  }
}
