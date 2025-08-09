import type { Role } from 'aws-cdk-lib/aws-iam'
import type { Table } from 'aws-cdk-lib/aws-dynamodb'

/**
 * Utility functions for granting permissions between OIDC roles and resources
 */

export interface GrantDynamoDBAccessOptions {
	role: Role
	tables: {
		users: Table
		serviceTokens: Table
		rateLimit: Table
	}
	permissions?: 'read' | 'write' | 'readwrite'
}

/**
 * Grant DynamoDB access to OIDC role
 */
export function grantDynamoDBAccess(options: GrantDynamoDBAccessOptions): void {
	const { role, tables, permissions = 'readwrite' } = options

	const grantMethod = permissions === 'read' 
		? 'grantReadData'
		: permissions === 'write'
		? 'grantWriteData'
		: 'grantReadWriteData'

    	tables.users[grantMethod](role)
	tables.serviceTokens[grantMethod](role)
	tables.rateLimit[grantMethod](role)
}

