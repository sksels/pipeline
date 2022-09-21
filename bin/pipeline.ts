#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { ServiceStack } from '../lib/service-stack';

const app              = new cdk.App();
const pipelineStack    = new PipelineStack(app, 'PipelineStack', {});

const serviceStackTest = new ServiceStack(app, 'ServiceStackTest',{
    stageName: "Test",
})

const serviceStackProd = new ServiceStack(app, 'ServiceStackProd',{
    stageName: "Prod",
});

pipelineStack.addServiceStage(serviceStackTest, "Test");
pipelineStack.addServiceStage(serviceStackProd, "Prod");