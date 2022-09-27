import * as Pipeline from "../lib/pipeline-stack";
import { App, Environment } from "aws-cdk-lib";
import { Match, Template,} from "aws-cdk-lib/assertions";
import { CfnDisk } from "aws-cdk-lib/aws-lightsail";
import { ServiceStack } from "../lib/service-stack";
import { PipelineStack } from "../lib/pipeline-stack";


const testEnv: Environment={
    account: "774291489247",
    region: "us-east-1"
}


test ('Pipeline Stack', ()=> {
    const app = new App();
    // when
    const stack = new Pipeline.PipelineStack(app, "myTestStack",{
        env: testEnv
    });
    // then
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});

/**
test("Adding service stage", () => {
    // GIVEN
    const app = new App();
    const serviceStack = new ServiceStack(app, "ServiceStack", {stageName: "Test", env:testEnv});
    const pipelineStack = new PipelineStack(app, "PipelineStack",{env: testEnv});
  
    // WHEN                                                                                                         
    pipelineStack.addServiceStage(serviceStack, "Test");
  
    // THEN
    /**
    Template.fromStack(pipelineStack).hasResourceProperties("AWS::CodePipeline::Pipeline",
        {
            stages: Match.arrayWith([
                Match.objectLike({
                    Name: "Test",
                }),
            ]),
        }
    );
    
});**/