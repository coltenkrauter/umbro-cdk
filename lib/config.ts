import { Environment } from 'aws-cdk-lib'
import { Stage } from '@krauters/structures'

export interface Config {
	env: Environment
	stage: Stage
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
	const stageInput = process.env.STAGE || 'dev'

	if (!account) {
		throw new Error('CDK_DEFAULT_ACCOUNT environment variable is required')
	}

	// Validate and convert stage using enum
	const stageKey = stageInput as keyof typeof Stage
	const stage = Stage[stageKey]
	
	if (!stage) {
		const validStages = Object.values(Stage).join(', ')
		throw new Error(`Invalid STAGE "${stageInput}". Valid options: ${validStages}`)
	}

	return {
		env: {
			account,
			region
		},
		stage,
		stackProps: {
			description: `Complete Umbro infrastructure for ${stage} environment (OIDC, users, security, application)`,
			tags: {
				Environment: stage,
				ManagedBy: 'CDK',
				Project: 'Umbro'
			}
		}
	}
}
