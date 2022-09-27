#!/usr/bin/env node
import { App, Environment } from 'aws-cdk-lib';
import 'source-map-support/register';
import { PipelineStack } from '../lib/pipeline-stack';
import { ServiceStack } from '../lib/service-stack';

const usEast1Env: Environment = {
    account: "774291489247",
    region: "us-east-1",
}

const euWest1Env: Environment = {
    account: "774291489247",
    region: "eu-west-1"
}

const app                    = new App();
const pipelineStack          = new PipelineStack(app, 'PipelineStack', {env:usEast1Env});
const serviceStackTest       = new ServiceStack (app, 'ServiceStackTest',{stageName: "Test",env:usEast1Env});
const serviceStackProd       = new ServiceStack (app, 'ServiceStackProd',{stageName: "Prod",env:usEast1Env});
const serviceStackProdBackup = new ServiceStack (app, 'ServiceStackProdBackup',{stageName: "Prod",env:euWest1Env});

pipelineStack.addServiceStage(serviceStackTest, "Test");
pipelineStack.addServiceStage(serviceStackProd, "Prod");
pipelineStack.addServiceStage(serviceStackProdBackup, "ProdBackup");

//pipelineStack.addServiceIntegrationTestToStage(
//    testStage, serviceStackTest.serviceEndpointOutput.importValue);