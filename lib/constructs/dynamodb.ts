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
 * - removed: boolean (soft delete flag; not indexed)
 * - expiresAt?: string (ISO 8601 timestamp for TTL)
 * - metadata?: Record<string, any> (extensible metadata)
 */
export class DynamoDBConstruct extends Construct {
	public readonly usersTable: Table
    public readonly serviceTokensTable: Table
    public readonly rateLimitTable: Table

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
			sortKey: {
				name: 'createdAt',
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
			indexName: 'UsersByEmailIndex',
			partitionKey: {
				name: 'email',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'createdAt',
				type: AttributeType.STRING
			}
		})

        // Sessions table removed (JWT sessions in app)

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
			timeToLiveAttribute: 'expiresAt',
			...(needsBackups && {
				pointInTimeRecoverySpecification: {
					pointInTimeRecoveryEnabled: true
				}
			})
		})

		// GSI for token ID lookups (unique access)
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'ServiceTokensByIdIndex',
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'createdAt',
				type: AttributeType.STRING
			}
		})

		// GSI for finding tokens by user and name (useful for duplicate checking)
		this.serviceTokensTable.addGlobalSecondaryIndex({
			indexName: 'ServiceTokensByUserAndNameIndex',
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'tokenName', type: AttributeType.STRING }
		})

        // Rate limit table (basic fixed window). TTL enabled on 'expiresAt'.
        this.rateLimitTable = new Table(this, 'RateLimitTable', {
            tableName: `umbro-rate-limit-${stageKey}`,
            partitionKey: { name: 'id', type: AttributeType.STRING },
            sortKey: { name: 'createdAt', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy,
            timeToLiveAttribute: 'expiresAt',
        })
	}
}