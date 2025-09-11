import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';

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

interface ControlPlaneStackProps extends StackProps {
  bucket: Bucket
}

export class ControlPlaneStack extends Stack {
  public readonly lambdaFunction;

  constructor(scope: Construct, id: string, props: ControlPlaneStackProps) {
    super(scope, id, props);
    
    const bucket = props.bucket;
    this.lambdaFunction = new Function(this, LAMBDA_NAME, {
      functionName: LAMBDA_NAME,
      runtime: Runtime.JAVA_17,
      handler: LAMBDA_HANDLER,
      code: Code.fromBucket(bucket, BUCKET_CODE_OBJECT_KEY),
      timeout: Duration.seconds(LAMBDA_TIMEOUT_SECONDS)
    });

    this.lambdaFunction.addToRolePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [
        `arn:aws:s3:::${BUCKET_NAME}/${BUCKET_CODE_OBJECT_KEY}`
      ],
    }));

    const userTable = new TableV2(this, USER_TABLE, {
      partitionKey: { name: ID_PARTITION_KEY, type: AttributeType.STRING },
      tableName: USER_TABLE
    });

    const productTable = new TableV2(this, PRODUCT_TABLE, {
      partitionKey: { name: ID_PARTITION_KEY, type: AttributeType.STRING },
      tableName: PRODUCT_TABLE
    });

    const tables = [userTable, productTable];
    tables.forEach(table => {
      table.grantReadWriteData(this.lambdaFunction);
    });
  }
}
