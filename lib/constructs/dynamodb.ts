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
 * 
 * Standard audit fields for all records (application-level, not schema-level):
 * - id: string (UUID v4)
 * - createdAt: string (ISO 8601 timestamp)
 * - modifiedAt: string (ISO 8601 timestamp)
 * - createdBy: string (user ID or system identifier)
 * - modifiedBy: string (user ID or system identifier)
 * - version: number (optimistic locking counter)
 * - removed: string ('true' | 'false' for soft deletes)
 * - expiresAt?: string (ISO 8601 timestamp for TTL)
 * - metadata?: Record<string, any> (extensible metadata)
 */
export class DynamoDBConstruct extends Construct {
	public readonly usersTable: Table
	public readonly sessionsTable: Table
	public readonly serviceTokensTable: Table

	constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
		super(scope, id)

		const { stage } = props
		const stageKey = stage.toLowerCase()

		// Stage-based configuration
		const isProduction = stage === Stage.Production
		const needsBackups = stage === Stage.Beta || stage === Stage.Production
		const removalPolicy = isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY

		// Users table (Auth.js users table)
		// Note: Auth.js schema is constrained, but we can add audit fields as additional attributes
		this.usersTable = new Table(this, 'UsersTable', {
			tableName: `umbro-users-${stageKey}`,
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
		// Note: Auth.js requires sessionToken as PK, but we can add audit fields as attributes
		this.sessionsTable = new Table(this, 'SessionsTable', {
			tableName: `umbro-sessions-${stageKey}`,
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
		// World-class design: userId#createdAt sort key for chronological ordering
		this.serviceTokensTable = new Table(this, 'ServiceTokensTable', {
			tableName: `umbro-service-tokens-${stageKey}`,
			partitionKey: {
				name: 'userId',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'createdAt',
				type: AttributeType.STRING // ISO 8601 timestamp for sorting
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: {
					pointInTimeRecoveryEnabled: true
				}
			})
		})

		// GSI for token ID lookups (unique access)
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'token-id-index',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			}
		})

		// GSI for token name lookups within user scope
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'user-token-name-index',
			partitionKey: {
				name: 'userId',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'tokenName',
				type: AttributeType.STRING
			}
		})

		// GSI for non-removed tokens query pattern
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'active-tokens-index',
			partitionKey: {
				name: 'removed',
				type: AttributeType.STRING // 'false' for active, 'true' for soft deleted
			},
			sortKey: {
				name: 'expiresAt',
				type: AttributeType.STRING // ISO 8601 for expiration sorting
			}
		})
	}
}