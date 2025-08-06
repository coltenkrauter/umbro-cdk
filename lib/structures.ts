import { Stage } from '@krauters/structures'

/**
 * Generate a role name based on the stage and type
 */
export function generateRoleName(stage: Stage, type: 'vercel' | 'github' | 'user'): string {
	const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1)
	
	switch (type) {
		case 'vercel':
			return `VercelDeploy${stageCapitalized}`
		case 'github':
			return 'GitHubDeploy'
		case 'user':
			return `UserRole${stageCapitalized}`
		default:
			throw new Error(`Unknown role type: ${type}`)
	}
}

export interface Config {
	env: {
		account: string
		region: string
	}
	stackProps: {
		description: string
		tags: Record<string, string>
	}
}

export const developerEmails: string[] = []
