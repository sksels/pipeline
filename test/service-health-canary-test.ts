
import { ServiceHealthCanary } from "../lib/service-health-canary";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";


test ("ServiceHealthCanary", () => {
  const app   = new App();
  const stack = new Stack(app, "TestStack");

  new ServiceHealthCanary(stack, "TestCanary", {
    apiEndpoint: "api.example.com",
    canaryName: "test-canary",
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