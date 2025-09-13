import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CodeArtifactStack } from '../lib/code-artifact-stack';

const app = new cdk.App();
const codeArtifactStackName = 'TestCodeArtifactStack';
const codeArtifactStack = new CodeArtifactStack(app, codeArtifactStackName);

const CODE_ARTIFACT_APP_NAME = 'e-commerce-code-artifact';
const BUCKET_NAME = `${CODE_ARTIFACT_APP_NAME}-bucket`;

test('Code Artifact Resources Created', () => {
  const template = Template.fromStack(codeArtifactStack);

  // Test S3 Bucket
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: BUCKET_NAME,
  });
});
