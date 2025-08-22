import { Environment } from 'aws-cdk-lib'
import { Stage } from '@krauters/structures'

export interface Config {
	env: Environment
	stage: Stage
	stackProps: {
		description: string
		tags: Record<string, string>
		terminationProtection: boolean
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
	let stage: Stage
	
	// Handle common aliases
	switch (stageInput.toLowerCase()) {
		case 'dev':
		case 'development':
			stage = Stage.Development
			break
		case 'alpha':
			stage = Stage.Alpha
			break
		case 'beta':
			stage = Stage.Beta
			break
		case 'prod':
		case 'production':
			stage = Stage.Production
			break
		case 'gamma':
			stage = Stage.Gamma
			break
		case 'pipeline':
			stage = Stage.Pipeline
			break
		case 'root':
			stage = Stage.Root
			break
		default:
			// Try direct enum lookup
			const stageKey = stageInput as keyof typeof Stage
			const directStage = Stage[stageKey]
			if (directStage) {
				stage = directStage
			} else {
				const validStages = Object.values(Stage).join(', ')
				throw new Error(`Invalid STAGE "${stageInput}". Valid options: ${validStages}`)
			}
	}

	return {
		env: {
			account,
			region
		},
		stage,
		stackProps: {
			description: `Umbro infrastructure for ${stage} environment`,
			tags: {
				Environment: stage,
				ManagedBy: 'CDK',
				Project: 'Umbro'
			},
			terminationProtection: stage === Stage.Production
		}
	}
}
