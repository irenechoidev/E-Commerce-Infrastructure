import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);

const CONTROL_PLANE_APP_NAME = 'e-commerce-control-plane';
const BUCKET_NAME = `${CONTROL_PLANE_APP_NAME}-bucket`;

test('Code Artifact Resources Created', () => {
  const template = Template.fromStack(codeArtifactStack);

  // Test S3 Bucket
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: BUCKET_NAME,
  });
});
