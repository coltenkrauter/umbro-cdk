export enum RoleName {
	GitHubOpenId = 'GitHubDeploy',
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

export const developerEmails = [
	'coltenkrauter@gmail.com'
]
