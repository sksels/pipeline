import {Construct} from 'constructs';
import { Artifact, IStage, Pipeline, } from "aws-cdk-lib/aws-codepipeline";
import { CloudFormationCreateUpdateStackAction, CodeBuildAction,CodeBuildActionType,GitHubSourceAction,} from "aws-cdk-lib/aws-codepipeline-actions";
import { SecretValue, Stack, StackProps, } from "aws-cdk-lib";
import { BuildEnvironmentVariableType, BuildSpec,LinuxBuildImage,PipelineProject,} from "aws-cdk-lib/aws-codebuild";
import { ServiceStack } from './service-stack';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { RuleScope } from 'aws-cdk-lib/aws-config';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';


export class PipelineStack extends Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;

  constructor(scope:Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.pipelineNotificationsTopic = new Topic(
      this, "PipelineNotificationsTopic", 
      {
        topicName: "PipelineNotifications",
      }
    );

    this.pipelineNotificationsTopic.addSubscription(
        new EmailSubscription("sksels.subbiah@gmail.com")
    );

    this.pipeline = new Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,
    });

    const cdkSourceOutput = new Artifact("CDKSourceOutput");
    this.serviceSourceOutput = new Artifact("ServiceSourceOutput");

    this.pipeline.addStage({
      stageName: "Source",
      actions: [
        new GitHubSourceAction({
          owner: "sksels",
          repo: "pipeline",
          branch: "main",
          actionName: "Pipeline_Source",
          oauthToken: SecretValue.secretsManager("github-token"),
          output: cdkSourceOutput,
        }),
        new GitHubSourceAction({
          owner: "sksels",
          repo: "server",
          branch: "main",
          actionName: "Service_Source",
          oauthToken: SecretValue.secretsManager("github-token"),
          output: this.serviceSourceOutput,
        }),
      ],
    });

    this.cdkBuildOutput = new Artifact("CdkBuildOutput");
    this.serviceBuildOutput = new Artifact("ServiceBuildOutput");

    this.pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodeBuildAction({
          actionName: "CDK_Build",
          input: cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),
        new CodeBuildAction({
          actionName: "Service_Build",
          input: this.serviceSourceOutput,
          outputs: [this.serviceBuildOutput],
          project: new PipelineProject(this, "ServiceBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/service-build-specs.yml"
            ),
          }),
        }),
      ],
    });

    this.pipeline.addStage({
      stageName: "Pipeline_Update",
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "Pipeline_Update",
          stackName: "PipelineStack",
          templatePath: this.cdkBuildOutput.atPath("PipelineStack.template.json"),
          adminPermissions: true,
          }),
      ],
    });
  }

  public addServiceStage(serviceStack: ServiceStack, stageName: string):
   IStage {
    return this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          account: serviceStack.account,
          region: serviceStack.region,
          actionName: "Service_Update",
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(
            `${serviceStack.stackName}.template.json`
          ),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(
              this.serviceBuildOutput.s3Location
            ),
          },
          extraInputs: [this.serviceBuildOutput],
        }),
      ],
    });
  }
  
  public addServiceIntegrationTestToStage(
    stage: IStage,
    serviceEndpoint: string
  ) {
    const integTestAction = new CodeBuildAction({
        actionName: "Integration_Tests",
        input: this.serviceSourceOutput,
        project: new PipelineProject(this, "ServiceIntegrationTestsProject", {
          environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
          },
          buildSpec: BuildSpec.fromSourceFilename(
            "build-specs/integ-test-build-spec.yml"
          ),
        }),
        environmentVariables: {
          SERVICE_ENDPOINT: {
            value: serviceEndpoint,
            type: BuildEnvironmentVariableType.PLAINTEXT,
          },
        },
        type: CodeBuildActionType.TEST,
        runOrder: 2,
      });
      stage.addAction(integTestAction);
      integTestAction.onStateChange(
        "IntegTestFailed",
          new SnsTopic(this.pipelineNotificationsTopic,{
          message: RuleTargetInput.fromText(
            `Integ Test Failed: Details: ${EventField.fromPath(
            "$.detail.execution-result.external-execution-url"
            )}`
          ),
        }),
        {
          ruleName: "IntegTestFailed",
          eventPattern:{
            detail: {
              state: ["Failed"]
            },
          },  
          description: "Integration Test has failed",
        }
      );
  }
}