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

// Grant S3 permissions for profile and asset buckets
grantS3BucketAccess({
	role: vercelOidcStack.role,
	buckets: [
		umbro.storage.profileBucket, // Profile bucket (using existing avatar bucket name)
		umbro.storage.assetsBucket,
	],
})


