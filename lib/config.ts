import { Environment } from 'aws-cdk-lib'

export interface Config {
	env: Environment
	stackProps: {
		description: string
		tags: Record<string, string>
	}
}

/**
 * Get configuration for the CDK app.
 */
export function getConfig(): Config {
	const account = process.env.CDK_DEFAULT_ACCOUNT
	const region = process.env.CDK_DEFAULT_REGION || 'us-east-1'
	const stage = process.env.STAGE || 'dev'

	if (!account) {
		throw new Error('CDK_DEFAULT_ACCOUNT environment variable is required')
	}

	return {
		env: {
			account,
			region
		},
		stackProps: {
			description: 'Complete Umbro infrastructure (OIDC, users, security, application)',
			tags: {
				Project: 'Umbro',
				Stage: stage,
				ManagedBy: 'CDK'
			}
		}
	}
}
