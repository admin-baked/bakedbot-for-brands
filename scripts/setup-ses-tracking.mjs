#!/usr/bin/env node
/**
 * Setup SES Open/Click Tracking
 *
 * Creates the SES Configuration Set + SNS topic + webhook subscription
 * needed for email open/click/bounce tracking.
 *
 * Usage:
 *   node scripts/setup-ses-tracking.mjs              # Create everything
 *   node scripts/setup-ses-tracking.mjs --status      # Check current setup
 *   node scripts/setup-ses-tracking.mjs --dry-run     # Show what would be created
 *
 * Requires env vars: AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY
 *
 * What it creates:
 *   1. SES Configuration Set: "bakedbot-tracking"
 *   2. SNS Topic: "bakedbot-ses-events"
 *   3. SNS HTTP subscription: https://bakedbot.ai/api/webhooks/ses
 *   4. SES Event Destination on the Configuration Set → SNS topic
 *      Events: Send, Delivery, Bounce, Complaint, Open, Click
 */

import {
    SESClient,
    CreateConfigurationSetCommand,
    CreateConfigurationSetEventDestinationCommand,
    DescribeConfigurationSetCommand,
} from '@aws-sdk/client-ses';

import {
    SNSClient,
    CreateTopicCommand,
    SubscribeCommand,
    ListSubscriptionsByTopicCommand,
} from '@aws-sdk/client-sns';

const REGION = process.env.AWS_SES_REGION || 'us-east-1';
const CONFIG_SET_NAME = 'bakedbot-tracking';
const SNS_TOPIC_NAME = 'bakedbot-ses-events';
const WEBHOOK_URL = 'https://bakedbot.ai/api/webhooks/ses';
const EVENT_TYPES = ['send', 'delivery', 'bounce', 'complaint', 'open', 'click'];

const dryRun = process.argv.includes('--dry-run');
const statusOnly = process.argv.includes('--status');

function getSesClient() {
    return new SESClient({
        region: REGION,
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
    });
}

function getSnsClient() {
    return new SNSClient({
        region: REGION,
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
    });
}

async function checkStatus() {
    const ses = getSesClient();
    console.log('\n=== SES Tracking Status ===\n');

    try {
        const result = await ses.send(new DescribeConfigurationSetCommand({
            ConfigurationSetName: CONFIG_SET_NAME,
            ConfigurationSetAttributeNames: ['eventDestinations'],
        }));
        console.log(`  Configuration Set: ${CONFIG_SET_NAME} ✅ exists`);
        const destinations = result.EventDestinations || [];
        if (destinations.length === 0) {
            console.log('  Event Destinations: none configured ❌');
        } else {
            for (const dest of destinations) {
                console.log(`  Event Destination: ${dest.Name}`);
                console.log(`    Events: ${dest.MatchingEventTypes?.join(', ')}`);
                if (dest.SNSDestination) {
                    console.log(`    SNS Topic: ${dest.SNSDestination.TopicARN}`);
                }
            }
        }
    } catch (err) {
        if (err.name === 'ConfigurationSetDoesNotExistException' || err.name === 'ConfigurationSetDoesNotExist') {
            console.log(`  Configuration Set: ${CONFIG_SET_NAME} ❌ does not exist`);
        } else {
            console.log(`  Error checking: ${err.message}`);
        }
    }
    console.log('');
}

async function setup() {
    if (!process.env.AWS_SES_ACCESS_KEY_ID || !process.env.AWS_SES_SECRET_ACCESS_KEY) {
        console.error('Missing AWS_SES_ACCESS_KEY_ID or AWS_SES_SECRET_ACCESS_KEY');
        process.exit(1);
    }

    const ses = getSesClient();
    const sns = getSnsClient();

    console.log('\n=== SES Tracking Setup ===\n');

    // Step 1: Create Configuration Set
    console.log(`1. Configuration Set: ${CONFIG_SET_NAME}`);
    if (dryRun) {
        console.log('   [DRY RUN] Would create configuration set');
    } else {
        try {
            await ses.send(new CreateConfigurationSetCommand({
                ConfigurationSet: { Name: CONFIG_SET_NAME },
            }));
            console.log('   ✅ Created');
        } catch (err) {
            if (err.name === 'ConfigurationSetAlreadyExistsException' || err.name === 'ConfigurationSetAlreadyExists') {
                console.log('   ✅ Already exists');
            } else {
                console.error(`   ❌ Failed: ${err.message}`);
                process.exit(1);
            }
        }
    }

    // Step 2: Create SNS Topic
    console.log(`2. SNS Topic: ${SNS_TOPIC_NAME}`);
    let topicArn;
    if (dryRun) {
        console.log('   [DRY RUN] Would create SNS topic');
        topicArn = `arn:aws:sns:${REGION}:ACCOUNT_ID:${SNS_TOPIC_NAME}`;
    } else {
        try {
            const result = await sns.send(new CreateTopicCommand({ Name: SNS_TOPIC_NAME }));
            topicArn = result.TopicArn;
            console.log(`   ✅ Topic ARN: ${topicArn}`);
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
            console.log('   Note: The IAM user may need sns:CreateTopic permission.');
            console.log('   You can create the topic manually in the AWS Console and re-run.');
            process.exit(1);
        }
    }

    // Step 3: Subscribe webhook to SNS topic
    console.log(`3. SNS Subscription: ${WEBHOOK_URL}`);
    if (dryRun) {
        console.log('   [DRY RUN] Would subscribe webhook to topic');
    } else {
        try {
            // Check if already subscribed
            const subs = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
            const existing = subs.Subscriptions?.find(s => s.Endpoint === WEBHOOK_URL);
            if (existing) {
                console.log(`   ✅ Already subscribed (${existing.SubscriptionArn})`);
            } else {
                await sns.send(new SubscribeCommand({
                    TopicArn: topicArn,
                    Protocol: 'https',
                    Endpoint: WEBHOOK_URL,
                }));
                console.log('   ✅ Subscribed (pending confirmation — SNS will POST to the webhook)');
            }
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }

    // Step 4: Create Event Destination
    console.log(`4. Event Destination: ses-to-sns`);
    console.log(`   Events: ${EVENT_TYPES.join(', ')}`);
    if (dryRun) {
        console.log('   [DRY RUN] Would create event destination');
    } else {
        try {
            await ses.send(new CreateConfigurationSetEventDestinationCommand({
                ConfigurationSetName: CONFIG_SET_NAME,
                EventDestination: {
                    Name: 'ses-to-sns',
                    Enabled: true,
                    MatchingEventTypes: EVENT_TYPES,
                    SNSDestination: { TopicARN: topicArn },
                },
            }));
            console.log('   ✅ Created');
        } catch (err) {
            if (err.name === 'EventDestinationAlreadyExistsException' || err.name === 'EventDestinationAlreadyExists') {
                console.log('   ✅ Already exists');
            } else {
                console.error(`   ❌ Failed: ${err.message}`);
                console.log(`   Note: SES may need permission to publish to SNS topic.`);
                console.log(`   Add this policy to the SNS topic: Allow ses.amazonaws.com to sns:Publish`);
            }
        }
    }

    console.log('\n=== Setup Complete ===');
    console.log(`\nNext steps:`);
    console.log(`  1. Add SES_CONFIGURATION_SET=${CONFIG_SET_NAME} to apphosting.yaml (RUNTIME)`);
    console.log(`  2. SNS will send a SubscriptionConfirmation to ${WEBHOOK_URL}`);
    console.log(`     The webhook auto-confirms it (see /api/webhooks/ses route)`);
    console.log(`  3. Send a test email and check the webhook logs for Open/Click events`);
    console.log('');
}

if (statusOnly) {
    checkStatus();
} else {
    setup();
}
