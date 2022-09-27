
import { ServiceHealthCanary } from "../lib/service-health-canary";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Topic } from "aws-cdk-lib/aws-sns";


test ("ServiceHealthCanary", () => {
  const app   = new App();
  const stack = new Stack(app, "TestStack");

  new ServiceHealthCanary(stack, "TestCanary", {
    apiEndpoint: "api.example.com",
    canaryName: "test-canary",
    alarmTopic: new Topic(stack, "TestAlarmTopic"),
  });

  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();

  /**
  Template.fromStack(stack).hasResourceProperties("AWS::Synthetics::Canary",
        {
            RunConfig: {
                EnvironmentVariables: {
                  API_ENDPOINT: "api.example.com",
                },
            },
        }
    );

  expect(stack).to(
    haveResourceLike("AWS::Synthetics::Canary", {
      RunConfig: {
        EnvironmentVariables: {
          API_ENDPOINT: "api.example.com",
        },
      },
    })
  );**/
});