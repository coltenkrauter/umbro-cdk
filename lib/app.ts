import { App } from 'aws-cdk-lib'

import { getConfig } from './config.js'
import { UmbroStack } from './stacks/umbro-stack.js'
import { VercelOpenIDConnectStack } from './stacks/vercel-open-id-connect.js'
import { grantDynamoDBAccess } from './utils/integration.js'

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

const umbroStack = new UmbroStack(app, 'UmbroStack', {
	...commonProps,
	description: `DynamoDB tables for ${config.stage} environment`,
	stage: config.stage,
})

// Ensure consumer (Vercel OIDC) updates before producer (UmbroStack) when references change
umbroStack.addDependency(vercelOidcStack)

// Grant Vercel OIDC role permissions to DynamoDB tables
grantDynamoDBAccess({
	role: vercelOidcStack.role,
	tables: {
		users: umbroStack.usersTable,
		serviceTokens: umbroStack.serviceTokensTable,
	},
})


