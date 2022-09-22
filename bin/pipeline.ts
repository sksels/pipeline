#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import 'source-map-support/register';
import { PipelineStack } from '../lib/pipeline-stack';
import { ServiceStack } from '../lib/service-stack';

const app              = new App();
const pipelineStack    = new PipelineStack(app, 'PipelineStack', {});
const serviceStackTest = new ServiceStack (app, 'ServiceStackTest',{stageName: "Test",})
const serviceStackProd = new ServiceStack (app, 'ServiceStackProd',{stageName: "Prod",});
const testStage        = pipelineStack.addServiceStage(serviceStackTest, "Test");

//pipelineStack.addServiceStage(serviceStackTest, "Test");
pipelineStack.addServiceStage(serviceStackProd, "Prod");
pipelineStack.addServiceIntegrationTestToStage(
    testStage, serviceStackTest.serviceEndpointOutput.importValue);