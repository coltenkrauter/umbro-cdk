import { App } from 'aws-cdk-lib'

import { getConfig } from './config.js'
import { UmbroStack } from './stacks/umbro-stack.js'
import { VercelOpenIDConnectStack } from './stacks/vercel-open-id-connect.js'
import { grantDynamoDBAccess } from './utils/integration.js'

const config = getConfig()
const app = new App()

const vercelOidcStack = new VercelOpenIDConnectStack(app, 'UmbroVercelOIDC', {
	env: config.env,
	...config.stackProps,
	description: `Vercel OIDC provider and role for ${config.stage} environment`,
	teamSlug: process.env.VERCEL_TEAM_SLUG || 'colten-krauters-projects',
	projectName: process.env.VERCEL_PROJECT_NAME || 'umbro',
	stage: config.stage.toLowerCase(),
})

const umbroStack = new UmbroStack(app, 'UmbroStack', {
	env: config.env,
	...config.stackProps,
	description: `DynamoDB tables for ${config.stage} environment`,
	stage: config.stage,
})

// Grant Vercel OIDC role permissions to DynamoDB tables
grantDynamoDBAccess({
	role: vercelOidcStack.role,
	tables: {
		users: umbroStack.usersTable,
		sessions: umbroStack.sessionsTable,
		serviceTokens: umbroStack.serviceTokensTable,
	},
})


