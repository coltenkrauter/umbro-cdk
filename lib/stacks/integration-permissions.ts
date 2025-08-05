import type { StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import type { Role } from 'aws-cdk-lib/aws-iam'
import type { Table } from 'aws-cdk-lib/aws-dynamodb'

import { Stack } from 'aws-cdk-lib'

export interface IntegrationPermissionsStackProps extends StackProps {
	readonly vercelRoles: Record<string, Role>
	readonly githubRole?: Role
	readonly tables: {
		users: Table
		sessions: Table
		serviceTokens: Table
	}
}

/**
 * Stack that handles permissions between OIDC roles and application resources.
 * This avoids cross-stack dependencies by taking roles and resources as props.
 */
export class IntegrationPermissionsStack extends Stack {
	constructor(scope: Construct, id: string, props: IntegrationPermissionsStackProps) {
		super(scope, id, props)

		const { vercelRoles, githubRole, tables } = props

		// Grant Vercel roles access to DynamoDB tables
		Object.entries(vercelRoles).forEach(([stage, role]) => {
			tables.users.grantReadWriteData(role)
			tables.sessions.grantReadWriteData(role)
			tables.serviceTokens.grantReadWriteData(role)

			// You could grant different permissions per stage
			// For example, prod might get different permissions than alpha
			if (stage === 'prod') {
				// Production-specific permissions
			}
		})

		// Grant GitHub role access (if provided)
		if (githubRole) {
			tables.users.grantReadWriteData(githubRole)
			tables.sessions.grantReadWriteData(githubRole)
			tables.serviceTokens.grantReadWriteData(githubRole)
		}
	}
}