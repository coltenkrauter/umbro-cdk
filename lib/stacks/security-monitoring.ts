import type { StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'

import { RemovalPolicy, Stack } from 'aws-cdk-lib'
import { ReadWriteType, Trail } from 'aws-cdk-lib/aws-cloudtrail'
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Key } from 'aws-cdk-lib/aws-kms'
import { LogGroup, LogGroupClass, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'

import { developerEmails } from '../structures.js'

/**
 * Stack that sets up CloudTrail and basic security monitoring for Umbro.
 */
export class SecurityMonitoringStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const trailName = 'UmbroSecurityMonitoringTrail'
		const alias = `${trailName}KmsKey`
		
		// KMS key for encrypting CloudTrail logs
		const encryptionKey = new Key(this, alias, {
			alias,
			description: 'KMS key for encrypting Umbro CloudTrail logs at rest',
			enableKeyRotation: true,
		})

		// CloudWatch log group for CloudTrail
		const logGroupName = `${trailName}LogGroup`
		const logGroup = new LogGroup(this, logGroupName, {
			encryptionKey,
			logGroupClass: LogGroupClass.STANDARD,
			logGroupName,
			removalPolicy: RemovalPolicy.DESTROY,
			retention: RetentionDays.ONE_MONTH,
		})

		// CloudTrail for logging AWS API calls
		const trail = new Trail(this, trailName, {
			cloudWatchLogGroup: logGroup,
			enableFileValidation: true,
			encryptionKey,
			includeGlobalServiceEvents: true,
			isMultiRegionTrail: true,
			managementEvents: ReadWriteType.WRITE_ONLY,
			sendToCloudWatchLogs: true,
			trailName,
		})
		trail.applyRemovalPolicy(RemovalPolicy.DESTROY)

		// SNS topic for security alerts
		const topicName = `${trailName}AlarmsTopic`
		const alarmTopic = new Topic(this, topicName, {
			displayName: topicName,
			enforceSSL: true,
			topicName,
		})
		
		// Subscribe developer emails to security alerts
		developerEmails.forEach((email) => alarmTopic.addSubscription(new EmailSubscription(email)))
		alarmTopic.applyRemovalPolicy(RemovalPolicy.DESTROY)

		// Grant CloudTrail permissions to use KMS key
		encryptionKey.addToResourcePolicy(
			new PolicyStatement({
				actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
				principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
				resources: ['*'],
			}),
		)

		// Grant CloudWatch Logs permissions to use KMS key
		encryptionKey.addToResourcePolicy(
			new PolicyStatement({
				actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
				principals: [new ServicePrincipal('logs.amazonaws.com')],
				resources: ['*'],
			}),
		)
	}
}
