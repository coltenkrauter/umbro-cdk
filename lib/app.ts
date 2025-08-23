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


