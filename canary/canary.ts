import { aws_synthetics } from "aws-cdk-lib";

const synthetics = require ("Synthetics");

const canary = async function () {
    await synthetics.executeHttpStep(
        "Verify API returns success",
        process.env.API_ENDPOINT
    );
}

exports.handler = async () => {
    return await canary();
};