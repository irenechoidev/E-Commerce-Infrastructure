import { Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Function } from 'aws-cdk-lib/aws-lambda';

const APP_NAME = 'e-commerce';
const USER_TABLE = `${APP_NAME}-user-table-v1`;
const USER_TABLE_PARTITION_KEY = 'id';

interface DataStorageStackProps extends StackProps {
    controlPlaneLambda: Function
}

export class DataStorageStack extends Stack {
  constructor(scope: Construct, id: string, props: DataStorageStackProps) {
    super(scope, id, props);
    const userTable = new TableV2(this, USER_TABLE, {
        partitionKey: { name: USER_TABLE_PARTITION_KEY, type: AttributeType.STRING },
        tableName: USER_TABLE
    });

    userTable.grantReadWriteData(props.controlPlaneLambda);
  }
}
