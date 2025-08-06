import { App } from 'aws-cdk-lib'

import { getConfig } from './config.js'
import { PasswordPolicyStack } from './stacks/password-policy.js'
import { SecurityMonitoringStack } from './stacks/security-monitoring.js'
import { UmbroStack } from './stacks/umbro-stack.js'
import { UsersStack } from './stacks/users.js'
import { VercelOpenIDConnectStack } from './stacks/vercel-open-id-connect.js'
import { grantDynamoDBAccess } from './utils/integration.js'

/**
 * Main CDK app entry point for Umbro infrastructure.
 */
function main() {
	const config = getConfig()
	const app = new App()

	console.log(`Deploying Umbro infrastructure for account [${config.env.account}] and region [${config.env.region}]...`)
	console.log(`Stage: ${process.env.STAGE || 'dev'}`)

	const vercelOidcStack = new VercelOpenIDConnectStack(app, 'UmbroVercelOIDC', {
		env: config.env,
		...config.stackProps,
		teamSlug: process.env.VERCEL_TEAM_SLUG || 'colten-krauters-projects',
		projectName: process.env.VERCEL_PROJECT_NAME || 'umbro',
		stage: config.stage.toLowerCase(),
	})

	new PasswordPolicyStack(app, 'UmbroPasswordPolicy', {
		env: config.env,
		...config.stackProps,
	})

	new SecurityMonitoringStack(app, 'UmbroSecurityMonitoring', {
		env: config.env,
		...config.stackProps,
	})

	new UsersStack(app, 'UmbroUsers', {
		env: config.env,
		...config.stackProps,
	})

	const umbroStack = new UmbroStack(app, 'UmbroStack', {
		env: config.env,
		...config.stackProps,
		stage: config.stage,
	})

	// Grant Vercel OIDC role permissions to DynamoDB tables for current stage only
	grantDynamoDBAccess({
		role: vercelOidcStack.role,
		tables: {
			users: umbroStack.usersTable,
			sessions: umbroStack.sessionsTable,
			serviceTokens: umbroStack.serviceTokensTable,
		},
	})
}

main()
