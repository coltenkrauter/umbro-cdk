import { Construct } from 'constructs'
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'

import { 
	EmailIdentity, 
	ReceiptRuleSet,
	ReceiptRule,
	TlsPolicy,
	ReceiptFilter,
	ReceiptFilterPolicy
} from 'aws-cdk-lib/aws-ses'
import { 
	HostedZone, 
	ARecord, 
	RecordTarget, 
	MxRecord, 
	TxtRecord 
} from 'aws-cdk-lib/aws-route53'
import { 
	PolicyStatement, 
	Effect, 
	ServicePrincipal,
	ManagedPolicy,
	Role,
	ServicePrincipal as ServicePrincipalType
} from 'aws-cdk-lib/aws-iam'
import { 
	LogGroup, 
	RetentionDays 
} from 'aws-cdk-lib/aws-logs'
import { 
	Topic, 
	Subscription, 
	SubscriptionProtocol 
} from 'aws-cdk-lib/aws-sns'


import { Stage } from '@krauters/structures'

export interface EmailConstructProps {
	stage: Stage
	notificationEmail?: string
}

export interface EmailDomain {
	domain: string
	identity: EmailIdentity
	verificationToken: string
}

export class EmailConstruct extends Construct {
	public readonly emailTopic: Topic
	public readonly emailLogGroup: LogGroup
	public readonly emailRole: Role
	public readonly domains: EmailDomain[] = []
	public readonly receiptRuleSet: ReceiptRuleSet

	constructor(scope: Construct, id: string, props: EmailConstructProps) {
		super(scope, id)

		const { stage, notificationEmail } = props

		// Create CloudWatch log group for email logs
		this.emailLogGroup = new LogGroup(this, 'EmailLogGroup', {
			logGroupName: `/umbro/email/${stage}`,
			retention: RetentionDays.ONE_MONTH,
			removalPolicy: RemovalPolicy.DESTROY
		})

		// Create SNS topic for email notifications
		this.emailTopic = new Topic(this, 'EmailTopic', {
			topicName: `umbro-email-${stage}`,
			displayName: `Umbro Email Notifications - ${stage}`
		})

		// Create IAM role for email operations
		this.emailRole = new Role(this, 'EmailRole', {
			assumedBy: new ServicePrincipal('ses.amazonaws.com'),
			roleName: `umbro-email-role-${stage}`,
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess')
			]
		})

		// Create receipt rule set for handling incoming emails
		this.receiptRuleSet = new ReceiptRuleSet(this, 'ReceiptRuleSet', {
			receiptRuleSetName: `umbro-email-rules-${stage}`
		})



		// Add notification email subscription if provided
		if (notificationEmail) {
			new Subscription(this, 'EmailNotificationSubscription', {
				topic: this.emailTopic,
				protocol: SubscriptionProtocol.EMAIL,
				endpoint: notificationEmail
			})
		}





		// Create receipt filter for spam protection
		new ReceiptFilter(this, 'SpamFilter', {
			receiptFilterName: `spam-filter-${stage}`,
			policy: ReceiptFilterPolicy.BLOCK
		})

		// 🎯 MULTI-TENANT SETUP:
		// - Shared infrastructure deployed via CDK
		// - Tenant-specific resources created via API
		// - IAM policies ensure tenant isolation
		// - CloudWatch logs filtered by tenant tags
		// - Each developer gets their own isolated email environment
	}
}
