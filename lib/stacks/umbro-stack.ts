import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Stage } from '@krauters/structures'

import { DynamoDBConstruct } from '../constructs/dynamodb.js'

export interface UmbroStackProps extends StackProps {
	stage: Stage
}

/**
 * Main stack for Umbro DynamoDB infrastructure.
 */
export class UmbroStack extends Stack {
	public readonly database: DynamoDBConstruct

	constructor(scope: Construct, id: string, props: UmbroStackProps) {
		super(scope, id, props)

		const { stage } = props

		this.database = new DynamoDBConstruct(this, 'Database', {
			stage
		})
	}

	// Convenience getters for backward compatibility
	get usersTable() {
		return this.database.usersTable
	}

	get sessionsTable() {
		return this.database.sessionsTable
	}

	get serviceTokensTable() {
		return this.database.serviceTokensTable
	}
}