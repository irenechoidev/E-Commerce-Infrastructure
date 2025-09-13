import { Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

const CODE_ARTIFACT_APP_NAME = 'e-commerce-code-artifact';
const BUCKET_NAME = `${CODE_ARTIFACT_APP_NAME}-bucket`;

export class CodeArtifactStack extends Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.bucket = new Bucket(this, BUCKET_NAME, {
      bucketName: BUCKET_NAME
    });
  }
}
