import { App } from 'aws-cdk-lib'

import { getConfig } from './config.js'
import { GitHubOpenIDConnectStack } from './stacks/github-open-id-connect.js'
import { PasswordPolicyStack } from './stacks/password-policy.js'
import { SecurityMonitoringStack } from './stacks/security-monitoring.js'
import { UmbroStack } from './stacks/umbro-stack.js'
import { UsersStack } from './stacks/users.js'

/**
 * Main CDK app entry point for Umbro infrastructure.
 */
function main() {
	const config = getConfig()
	const app = new App()

	console.log(`Deploying Umbro infrastructure for account [${config.env.account}] and region [${config.env.region}]...`)
	console.log(`Stage: ${process.env.STAGE || 'dev'}`)

	// Deploy all stacks to single account
	new GitHubOpenIDConnectStack(app, 'UmbroGitHubOIDC', {
		env: config.env,
		...config.stackProps,
		repositoryConfig: [
			{ owner: 'coltenkrauter', repo: 'umbro-cdk' },  
		],
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

	new UmbroStack(app, 'UmbroStack', {
		env: config.env,
		...config.stackProps,
	})
}

main()
