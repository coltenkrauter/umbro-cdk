import { RemovalPolicy } from 'aws-cdk-lib'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'
import { Stage } from '@krauters/structures'

export interface DynamoDBConstructProps {
	stage: Stage
}

/**
 * DynamoDB tables construct for Umbro authentication system.
 * Handles Auth.js DynamoDB adapter requirements with stage-based configurations.
 */
export class DynamoDBConstruct extends Construct {
	public readonly usersTable: Table
	public readonly sessionsTable: Table
	public readonly serviceTokensTable: Table

	constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
		super(scope, id)

		const { stage } = props

		// Stage-based configuration
		const isProduction = stage === Stage.Production
		const needsBackups = stage === Stage.Beta || stage === Stage.Production
		const removalPolicy = isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY

		// Users table (Auth.js users table)
		this.usersTable = new Table(this, 'UsersTable', {
			tableName: `umbro-users-${stage.toLowerCase()}`,
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: {
					pointInTimeRecoveryEnabled: true
				}
			})
		})

		// GSI for email lookups (Auth.js requirement)
		this.usersTable.addGlobalSecondaryIndex({
			indexName: 'email-index',
			partitionKey: {
				name: 'email',
				type: AttributeType.STRING
			}
		})

		// Sessions table (Auth.js sessions table)
		this.sessionsTable = new Table(this, 'SessionsTable', {
			tableName: `umbro-sessions-${stage.toLowerCase()}`,
			partitionKey: {
				name: 'sessionToken',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: {
					pointInTimeRecoveryEnabled: true
				}
			})
		})

		// GSI for user sessions lookup
		this.sessionsTable.addGlobalSecondaryIndex({
			indexName: 'user-sessions-index',
			partitionKey: {
				name: 'userId',
				type: AttributeType.STRING
			}
		})

		// Service tokens table (custom for Umbro)
		this.serviceTokensTable = new Table(this, 'ServiceTokensTable', {
			tableName: `umbro-service-tokens-${stage.toLowerCase()}`,
			partitionKey: {
				name: 'userId',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'tokenName',
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: {
					pointInTimeRecoveryEnabled: true
				}
			})
		})

		// GSI for token ID lookups
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'token-id-index',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			}
		})
	}
}