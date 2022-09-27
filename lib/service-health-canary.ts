import { Duration } from "aws-cdk-lib";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Canary, Test, Code, Runtime } from "@aws-cdk/aws-synthetics-alpha";
import * as fs from "fs";
import * as path from "path";

import { Construct } from "constructs";
import { Statistic, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";


interface ServiceHealthCanaryProps {
    apiEndpoint: string;
    canaryName: string;
    alarmTopic: Topic;
}

export class ServiceHealthCanary extends Construct {
    constructor(scope: Construct, id: string, props:ServiceHealthCanaryProps){
        super(scope, id);

        const canary = new Canary(this, props.canaryName, {
            runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_1,
            canaryName: props.canaryName,
            schedule: Schedule.rate(Duration.minutes(1)),
            environmentVariables: { 
                API_ENDPOINT: props.apiEndpoint,
                DEPLOYMENT_TRIGGER: Date.now().toString(),
            },
            test: Test.custom({
                code: Code.fromInline(
                    fs.readFileSync(
                        path.join(__dirname,"../canary/canary.ts"),
                        "utf8"
                    )
                ),
                handler: "index.handler",
            }),
            timeToLive: Duration.minutes(5),
        });
        const canaryFailedMetric = canary.metricFailed({
            period: Duration.minutes(1),
            statistic: Statistic.SUM,
            label: `${props.canaryName} Failed`
        });

        const canaryFailedAlarm = canaryFailedMetric.createAlarm(this, `${props.canaryName} FailedAlarm`,{
            threshold: 1,
            alarmDescription: `Canary ${props.canaryName} Failed`,
            evaluationPeriods: 1,
            treatMissingData: TreatMissingData.NOT_BREACHING,
            alarmName: `${props.canaryName} FailedAlarm`,
        });

        canaryFailedAlarm.addAlarmAction(new SnsAction(props.alarmTopic));
    }
}