export enum RoleName {
	GitHubOpenId = 'GitHubDeploy',
	VercelDeployAlpha = 'VercelDeployAlpha',
	VercelDeployBeta = 'VercelDeployBeta',
	VercelDeployProd = 'VercelDeployProd',
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
