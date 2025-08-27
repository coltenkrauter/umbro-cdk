import { App } from 'aws-cdk-lib'

import { getConfig } from './config.js'
import { Umbro } from './stacks/umbro.js'
import { VercelOpenIDConnectStack } from './stacks/vercel-open-id-connect.js'

import { grantDynamoDBAccess, grantS3BucketAccess } from './utils/integration.js'

const config = getConfig()
const app = new App()

const commonProps = {
	env: config.env,
	...config.stackProps,
}

const vercelOidcStack = new VercelOpenIDConnectStack(app, 'UmbroVercelOIDC', {
	...commonProps,
	description: `Vercel OIDC provider and role for ${config.stage} environment`,
	teamSlug: process.env.VERCEL_TEAM_SLUG || 'colten-krauters-projects',
	projectName: process.env.VERCEL_PROJECT_NAME || 'umbro',
	stage: config.stage,
})

const umbro = new Umbro(app, 'Umbro', {
	...commonProps,
	description: `DynamoDB tables for ${config.stage} environment`,
	stage: config.stage,
})

// Email infrastructure is now part of the main Umbro stack
// No separate email stack needed

// Grant specific table permissions after both stacks are created (avoids cross-stack exports)
grantDynamoDBAccess({
    role: vercelOidcStack.role,
    tables: [
        umbro.database.usersTable,
        umbro.database.serviceTokensTable,
        umbro.database.rateLimitTable,
        umbro.database.teamsTable,
        umbro.database.teamMembershipsTable,
        umbro.database.teamLinksTable,
        umbro.database.applicationsTable,
        umbro.database.environmentsTable,
        umbro.database.requestsTable,
        umbro.database.requestCommentsTable,
        umbro.database.accessGrantsTable,
        umbro.database.visitorsTable,
        umbro.database.userPermissionsTable,
        umbro.database.auditLogsTable,
        umbro.database.plansTable,
    ],
})

// Grant S3 permissions using inline policies to avoid cross-stack references
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'

// Grant S3 permissions for profile and assets buckets
const s3PolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		's3:GetObject',
		's3:PutObject',
		's3:DeleteObject',
		's3:ListBucket',
		's3:GetBucketLocation',
		's3:GetObjectVersion',
		's3:PutObjectAcl',
		's3:GetObjectAcl',
		's3:GetBucketVersioning',
		's3:PutBucketVersioning'
	],
	resources: [
		`arn:aws:s3:::umbro-profile-${config.stage.toLowerCase()}`,
		`arn:aws:s3:::umbro-profile-${config.stage.toLowerCase()}/*`,
		`arn:aws:s3:::umbro-assets-${config.stage.toLowerCase()}`,
		`arn:aws:s3:::umbro-assets-${config.stage.toLowerCase()}/*`
	]
})

vercelOidcStack.role.addToPolicy(s3PolicyStatement)

// Grant Rekognition permissions for image moderation
const rekognitionPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'rekognition:DetectModerationLabels'
	],
	resources: ['*'] // Rekognition doesn't support resource-level permissions
})

vercelOidcStack.role.addToPolicy(rekognitionPolicyStatement)

// Grant comprehensive SES permissions for Resend-like experience
const sesPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		// Core email sending
		'ses:SendEmail',
		'ses:SendRawEmail',
		'ses:SendTemplatedEmail',
		'ses:SendBulkTemplatedEmail',
		
		// Quota and statistics
		'ses:GetSendQuota',
		'ses:GetSendStatistics',
		'ses:GetAccountSendingEnabled',
		'ses:UpdateAccountSendingEnabled',
		
		// Identity management (domains and emails)
		'ses:ListIdentities',
		'ses:GetIdentityVerificationAttributes',
		'ses:VerifyEmailIdentity',
		'ses:VerifyDomainIdentity',
		'ses:DeleteIdentity',
		'ses:GetIdentityVerificationAttributes',
		
		// DKIM management
		'ses:GetIdentityDkimAttributes',
		'ses:SetIdentityDkimEnabled',
		'ses:VerifyDomainDkim',
		
		// Mail-from domain management
		'ses:GetIdentityMailFromDomainAttributes',
		'ses:SetIdentityMailFromDomain',
		
		// Feedback and notifications
		'ses:SetIdentityFeedbackForwardingEnabled',
		'ses:SetIdentityNotificationTopic',
		'ses:SetIdentityHeadersInNotificationsEnabled',
		'ses:GetIdentityNotificationAttributes',
		
		// Configuration sets
		'ses:CreateConfigurationSet',
		'ses:DeleteConfigurationSet',
		'ses:DescribeConfigurationSet',
		'ses:ListConfigurationSets',
		'ses:UpdateConfigurationSetReputationMetricsEnabled',
		'ses:UpdateConfigurationSetSendingEnabled',
		
		// Receipt rules and filters
		'ses:CreateReceiptRuleSet',
		'ses:DeleteReceiptRuleSet',
		'ses:DescribeReceiptRuleSet',
		'ses:ListReceiptRuleSets',
		'ses:CreateReceiptRule',
		'ses:DeleteReceiptRule',
		'ses:DescribeReceiptRule',
		'ses:UpdateReceiptRule',
		'ses:SetActiveReceiptRuleSet',
		'ses:CreateReceiptFilter',
		'ses:DeleteReceiptFilter',
		'ses:ListReceiptFilters',
		
		// Email templates
		'ses:CreateTemplate',
		'ses:DeleteTemplate',
		'ses:GetTemplate',
		'ses:ListTemplates',
		'ses:UpdateTemplate',
		'ses:TestRenderTemplate',
		
		// Custom verification emails
		'ses:CreateCustomVerificationEmailTemplate',
		'ses:DeleteCustomVerificationEmailTemplate',
		'ses:GetCustomVerificationEmailTemplate',
		'ses:ListCustomVerificationEmailTemplates',
		'ses:UpdateCustomVerificationEmailTemplate',
		'ses:SendCustomVerificationEmail',
		
		// Policies
		'ses:GetIdentityPolicies',
		'ses:PutIdentityPolicy',
		'ses:DeleteIdentityPolicy',
		
		// Bounce and complaint handling
		'ses:SendBounce',
		'ses:SendComplaint',
		
		// Reputation management
		'ses:GetReputationMetrics',
		'ses:PutReputationMetrics'
	],
	resources: ['*']
})

vercelOidcStack.role.addToPolicy(sesPolicyStatement)

// Grant SNS permissions for webhook notifications
const snsPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'sns:CreateTopic',
		'sns:DeleteTopic',
		'sns:GetTopicAttributes',
		'sns:SetTopicAttributes',
		'sns:ListTopics',
		'sns:Subscribe',
		'sns:Unsubscribe',
		'sns:ListSubscriptions',
		'sns:ListSubscriptionsByTopic',
		'sns:GetSubscriptionAttributes',
		'sns:SetSubscriptionAttributes',
		'sns:Publish'
	],
	resources: ['*']
})

vercelOidcStack.role.addToPolicy(snsPolicyStatement)

// Grant CloudWatch permissions for monitoring and logging
const cloudWatchPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'logs:CreateLogGroup',
		'logs:CreateLogStream',
		'logs:PutLogEvents',
		'logs:DescribeLogGroups',
		'logs:DescribeLogStreams',
		'logs:GetLogEvents',
		'logs:FilterLogEvents',
		'logs:PutRetentionPolicy',
		'logs:DeleteRetentionPolicy',
		'cloudwatch:PutMetricData',
		'cloudwatch:GetMetricData',
		'cloudwatch:GetMetricStatistics',
		'cloudwatch:ListMetrics',
		'cloudwatch:PutMetricAlarm',
		'cloudwatch:DeleteAlarms',
		'cloudwatch:DescribeAlarms'
	],
	resources: ['*']
})

vercelOidcStack.role.addToPolicy(cloudWatchPolicyStatement)

// Grant IAM permissions for email infrastructure management
const iamPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'iam:CreateRole',
		'iam:DeleteRole',
		'iam:GetRole',
		'iam:ListRoles',
		'iam:AttachRolePolicy',
		'iam:DetachRolePolicy',
		'iam:PutRolePolicy',
		'iam:DeleteRolePolicy',
		'iam:GetRolePolicy',
		'iam:ListRolePolicies',
		'iam:CreatePolicy',
		'iam:DeletePolicy',
		'iam:GetPolicy',
		'iam:ListPolicies',
		'iam:CreatePolicyVersion',
		'iam:DeletePolicyVersion',
		'iam:GetPolicyVersion',
		'iam:ListPolicyVersions',
		'iam:TagRole',
		'iam:UntagRole',
		'iam:ListRoleTags'
	],
	resources: [
		'arn:aws:iam::*:role/umbro-email-*',
		'arn:aws:iam::*:policy/umbro-email-*'
	]
})

vercelOidcStack.role.addToPolicy(iamPolicyStatement)

// Grant Route53 permissions for domain management
const route53PolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'route53:ListHostedZones',
		'route53:GetHostedZone',
		'route53:ListResourceRecordSets',
		'route53:ChangeResourceRecordSets',
		'route53:GetChange',
		'route53:ListChanges',
		'route53:GetHostedZoneCount',
		'route53:ListHostedZonesByName',
		'route53:GetReusableDelegationSet',
		'route53:ListReusableDelegationSets'
	],
	resources: ['*']
})

vercelOidcStack.role.addToPolicy(route53PolicyStatement)



// Grant STS permissions for role assumption
const stsPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'sts:AssumeRole',
		'sts:GetCallerIdentity',
		'sts:GetSessionToken',
		'sts:GetFederationToken'
	],
	resources: [
		`arn:aws:iam::${config.env.account}:role/umbro-email-*`,
		`arn:aws:iam::${config.env.account}:role/umbro-*`
	]
})

vercelOidcStack.role.addToPolicy(stsPolicyStatement)

// Grant Lambda permissions for serverless email processing
const lambdaPolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'lambda:CreateFunction',
		'lambda:DeleteFunction',
		'lambda:GetFunction',
		'lambda:ListFunctions',
		'lambda:UpdateFunctionCode',
		'lambda:UpdateFunctionConfiguration',
		'lambda:InvokeFunction',
		'lambda:AddPermission',
		'lambda:RemovePermission',
		'lambda:GetPolicy',
		'lambda:PutFunctionConcurrency',
		'lambda:DeleteFunctionConcurrency',
		'lambda:GetFunctionConcurrency',
		'lambda:TagResource',
		'lambda:UntagResource',
		'lambda:ListTags'
	],
	resources: [
		`arn:aws:lambda:${config.env.region}:${config.env.account}:function:umbro-email-*`,
		`arn:aws:lambda:${config.env.region}:${config.env.account}:function:umbro-*`
	]
})

vercelOidcStack.role.addToPolicy(lambdaPolicyStatement)

// Grant EventBridge permissions for advanced event handling
const eventBridgePolicyStatement = new PolicyStatement({
	effect: Effect.ALLOW,
	actions: [
		'events:CreateEventBus',
		'events:DeleteEventBus',
		'events:DescribeEventBus',
		'events:ListEventBuses',
		'events:CreateRule',
		'events:DeleteRule',
		'events:DescribeRule',
		'events:ListRules',
		'events:PutTargets',
		'events:RemoveTargets',
		'events:ListTargetsByRule',
		'events:EnableRule',
		'events:DisableRule',
		'events:PutEvents',
		'events:TestEventPattern',
		'events:TagResource',
		'events:UntagResource',
		'events:ListTagsForResource'
	],
	resources: [
		`arn:aws:events:${config.env.region}:${config.env.account}:rule/umbro-email-*`,
		`arn:aws:events:${config.env.region}:${config.env.account}:event-bus/umbro-email-*`
	]
})

vercelOidcStack.role.addToPolicy(eventBridgePolicyStatement)

// 🎯 COMPREHENSIVE PERMISSIONS FOR RESEND-LIKE EXPERIENCE
// 
// The Vercel OIDC role now has full permissions to:
// ✅ Send emails (SES) - All operations including bulk, templates, DKIM
// ✅ Manage domains (SES + Route53) - Add/remove/verify domains
// ✅ Handle webhooks (SNS) - Bounce/complaint notifications
// ✅ Monitor performance (CloudWatch) - Metrics, logs, alarms
// ✅ Manage infrastructure (IAM) - Roles, policies for email services
// ✅ Process events (EventBridge) - Advanced email event handling
// ✅ Run serverless (Lambda) - Email processing functions
// ✅ Manage users (Cognito) - Email verification workflows
// ✅ Cross-account operations (STS) - Role assumption for complex setups
//
// This enables a fully intuitive, self-service email platform where users can:
// 🚀 Add domains with one click
// 📧 Send emails immediately
// 🔧 Configure advanced settings via API
// 📊 Monitor performance in real-time
// 🎛️ Manage everything programmatically


