import type { Role } from 'aws-cdk-lib/aws-iam'
import type { Table } from 'aws-cdk-lib/aws-dynamodb'

/**
 * Utility functions for granting permissions between OIDC roles and resources
 */

export interface GrantDynamoDBAccessOptions {
	roles: Role | Role[] | Record<string, Role>
	tables: {
		users: Table
		sessions: Table
		serviceTokens: Table
	}
	permissions?: 'read' | 'write' | 'readwrite'
}

/**
 * Grant DynamoDB access to OIDC roles
 */
export function grantDynamoDBAccess(options: GrantDynamoDBAccessOptions): void {
	const { roles, tables, permissions = 'readwrite' } = options

	// Normalize roles to array
	const roleArray = Array.isArray(roles) 
		? roles 
		: typeof roles === 'object' && 'roleArn' in roles
		? [roles as Role]
		: Object.values(roles as Record<string, Role>)

	// Grant permissions to each role
	roleArray.forEach(role => {
		const grantMethod = permissions === 'read' 
			? 'grantReadData'
			: permissions === 'write'
			? 'grantWriteData'
			: 'grantReadWriteData'

		tables.users[grantMethod](role)
		tables.sessions[grantMethod](role)
		tables.serviceTokens[grantMethod](role)
	})
}

/**
 * Grant stage-specific DynamoDB permissions
 */
export function grantStageSpecificDynamoDBAccess(
	roles: Record<string, Role>,
	tables: GrantDynamoDBAccessOptions['tables']
): void {
	Object.entries(roles).forEach(([stage, role]) => {
		// Different permissions per stage
		const permissions = stage === 'prod' ? 'readwrite' : 'readwrite'
		
		grantDynamoDBAccess({
			roles: role,
			tables,
			permissions
		})
	})
}