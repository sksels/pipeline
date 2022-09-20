import * as Pipeline from "../lib/pipeline-stack";
import { App } from "aws-cdk-lib";
import { Match, Template,} from "aws-cdk-lib/assertions";
import { CfnDisk } from "aws-cdk-lib/aws-lightsail";


test ('Pipeline Stack', ()=> {
    const app = new App();
    // when
    const stack = new Pipeline.PipelineStack(app, "myTestStack");
    // then
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});
