import {CfnOutput, Duration, lambda_layer_awscli, Stack, StackProps } from "aws-cdk-lib";
import { Alias, CfnParametersCode, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Construct } from "constructs";
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";
import { Statistic, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { ServiceHealthCanary } from "./service-health-canary";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

interface ServiceStackProps extends StackProps {
  stageName: string;
}

export class ServiceStack extends Stack {
  public readonly serviceCode:CfnParametersCode;
  public readonly serviceEndpointOutput: CfnOutput;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    this.serviceCode = Code.fromCfnParameters();

    const lambda = new Function(this, "ServiceLambda", {
      runtime: Runtime.NODEJS_14_X,
      handler: "src/lambda.handler",
      code: this.serviceCode,
      functionName: `ServiceLambda${props.stageName}`,
      description: `Generated on ${new Date().toISOString()}`,
    });

   // const lambfn = new lambda.function();

    const alias =  new Alias(this, "ServiceLambdaAlias", {
      version: lambda.currentVersion,
      aliasName: `ServiceLambdaAlias${props.stageName}`,
    });

    const httpApi = new HttpApi(this, "ServiceAPI", {
      defaultIntegration: new HttpLambdaIntegration("LambdaIntegration", alias),
      apiName: `MyService${props.stageName}`
    });

    this.serviceEndpointOutput = new CfnOutput(this, "ApiEndpointOutput", {
      exportName: `ServiceEndpoint${props.stageName}`,
      value: httpApi.apiEndpoint,
      description: "API Endpoint",
    });

    //Deploy lambda for production
    if (props.stageName === 'Prod') {
      new LambdaDeploymentGroup(this, "DeploymentGroup",{
        alias: alias,
        deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        autoRollback: {
          deploymentInAlarm: true
        },
        alarms: [
          httpApi
            .metricServerError()
            .with({
              period: Duration.minutes(1),
              statistic: Statistic.SUM,
            })
            .createAlarm(this, "ServiceErrorAlarm", {
              threshold: 1,
              alarmDescription: "Service is experiencing errors",
              alarmName: `ServiceErrorAlarm${props.stageName}`,
              evaluationPeriods: 1,
              treatMissingData: TreatMissingData.NOT_BREACHING
            }),
        ],
      });

      const alarmTopic = new Topic(this, "ServiceAlarmTopic", {
        topicName: "ServiceAlarmTopic",
      });

      alarmTopic.addSubscription(new EmailSubscription('sksels.subbiah@gmail.com'));

      new ServiceHealthCanary(this, "ServiceCanary", {
        apiEndpoint: httpApi.apiEndpoint,
        canaryName: "service-canary",
        alarmTopic: alarmTopic,
      });
    }
  }
}