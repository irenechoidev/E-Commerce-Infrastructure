import { Stack, Duration, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EndpointType, RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';

const API_NAME = 'e-commerce-api';
const API_LABEL = "api";
const VERSION_LABEL = "v1";
const USER_RESOURCE_LABEL = "user";
const PRODUCT_RESOURCE_LABEL = "product";
const PRODUCT_IMAGE_RESOURCE_LABEL = "image";
const GET_LABEL = "GET";
const POST_LABEL = "POST";

const INTEGRATION_TIMEOUT_SECONDS = 29;
const QUERY_STRING_PREFIX = 'method.request.querystring';
const USER_ID_PARAM = `${QUERY_STRING_PREFIX}.userId`;
const PRODUCT_ID_PARAM = `${QUERY_STRING_PREFIX}.productId`;

interface ApiStackProps extends StackProps {
    controlPlaneLambda: Function
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const apiGateway = new RestApi(this, API_NAME, {
      restApiName: API_NAME,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
    });

    const lambdaIntegration = new LambdaIntegration(props.controlPlaneLambda, { 
        timeout: Duration.seconds(INTEGRATION_TIMEOUT_SECONDS) 
    });

    const baseResource = apiGateway.root.addResource(API_LABEL).addResource(VERSION_LABEL);
    const userResource = baseResource.addResource(USER_RESOURCE_LABEL);
    const productResource = baseResource.addResource(PRODUCT_RESOURCE_LABEL);
    const productImageResource = productResource.addResource(PRODUCT_IMAGE_RESOURCE_LABEL);

    userResource.addMethod(GET_LABEL, lambdaIntegration, {
        requestParameters: {
            [USER_ID_PARAM] : true
        }
    });

    productResource.addMethod(GET_LABEL, lambdaIntegration, {
        requestParameters: {
            [PRODUCT_ID_PARAM] : true
        }
    });

    productImageResource.addMethod(POST_LABEL, lambdaIntegration);
  }
}
