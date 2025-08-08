import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib'
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

		// CloudFormation outputs for Vercel environment variables
		new CfnOutput(this, 'AccountId', {
			value: this.account,
			description: 'AWS Account ID',
			exportName: `UmbroStack-${stage}-AccountId`
		})

		new CfnOutput(this, 'Region', {
			value: this.region,
			description: 'AWS Region',
			exportName: `UmbroStack-${stage}-Region`
		})

		new CfnOutput(this, 'UsersTableName', {
			value: this.database.usersTable.tableName,
			description: 'DynamoDB Users Table Name',
			exportName: `UmbroStack-${stage}-UsersTableName`
		})

		new CfnOutput(this, 'SessionsTableName', {
			value: this.database.sessionsTable.tableName,
			description: 'DynamoDB Sessions Table Name',
			exportName: `UmbroStack-${stage}-SessionsTableName`
		})

		new CfnOutput(this, 'ServiceTokensTableName', {
			value: this.database.serviceTokensTable.tableName,
			description: 'DynamoDB Service Tokens Table Name',
			exportName: `UmbroStack-${stage}-ServiceTokensTableName`
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