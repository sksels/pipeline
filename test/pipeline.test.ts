import * as Pipeline from "../lib/pipeline-stack";
import { App } from "aws-cdk-lib";
import { Match, Template,} from "aws-cdk-lib/assertions";
import { CfnDisk } from "aws-cdk-lib/aws-lightsail";
import { ServiceStack } from "../lib/service-stack";
import { PipelineStack } from "../lib/pipeline-stack";


test ('Pipeline Stack', ()=> {
    const app = new App();
    // when
    const stack = new Pipeline.PipelineStack(app, "myTestStack");
    // then
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});

test("Adding service stage", () => {
    // GIVEN
    const app = new App();
    const serviceStack = new ServiceStack(app, "ServiceStack");
    const pipelineStack = new PipelineStack(app, "PipelineStack");
  
    // WHEN
    pipelineStack.addServiceStage(serviceStack, "Test");
  
    // THEN

    Template.fromStack(pipelineStack).hasResourceProperties("AWS::CodePipeline::Pipeline",
        {
            stages: Match.arrayWith([
                Match.objectLike({
                    Name: "Test",
                })
            ])
        }
    )
});