import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

/**
 * Main stack for Umbro DynamoDB infrastructure.
 */
export class UmbroStack extends Stack {
	public readonly usersTable: Table
	public readonly sessionsTable: Table
	public readonly serviceTokensTable: Table

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		// Users table
		this.usersTable = new Table(this, 'UmbroUsersTable', {
			tableName: 'umbro-users',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.RETAIN,
			pointInTimeRecoverySpecification: {
				pointInTimeRecoveryEnabled: true
			}
		})

		// Add GSI for email lookups
		this.usersTable.addGlobalSecondaryIndex({
			indexName: 'email-index',
			partitionKey: {
				name: 'email',
				type: AttributeType.STRING
			}
		})

		// Sessions table
		this.sessionsTable = new Table(this, 'UmbroSessionsTable', {
			tableName: 'umbro-sessions',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.RETAIN,
			pointInTimeRecoverySpecification: {
				pointInTimeRecoveryEnabled: true
			}
		})

		// Add GSI for session token lookups
		this.sessionsTable.addGlobalSecondaryIndex({
			indexName: 'session-token-index',
			partitionKey: {
				name: 'session_token',
				type: AttributeType.STRING
			}
		})

		// Add GSI for user sessions
		this.sessionsTable.addGlobalSecondaryIndex({
			indexName: 'user-sessions-index',
			partitionKey: {
				name: 'user_id',
				type: AttributeType.STRING
			}
		})

		// Service tokens table
		this.serviceTokensTable = new Table(this, 'UmbroServiceTokensTable', {
			tableName: 'umbro-service-tokens',
			partitionKey: {
				name: 'user_id',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'token_name',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.RETAIN,
			pointInTimeRecoverySpecification: {
				pointInTimeRecoveryEnabled: true
			}
		})

		// Add GSI for token ID lookups
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'token-id-index',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			}
		})
	}
}