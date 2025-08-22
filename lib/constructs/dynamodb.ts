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
    public readonly accessGrantsTable!: Table
    public readonly applicationsTable!: Table
    public readonly environmentsTable!: Table
    public readonly teamLinksTable!: Table
    public readonly requestsTable!: Table
    public readonly requestCommentsTable!: Table
    public readonly serviceTokensTable: Table
    public readonly teamsTable!: Table
    public readonly teamMembershipsTable!: Table
    public readonly rateLimitTable: Table
    public readonly visitorsTable!: Table
    	public readonly userPermissionsTable: Table
	public readonly auditLogsTable: Table
	public readonly plansTable: Table

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
			tableName: process.env.TABLE_NAME_USERS ?? `umbro-users-${stageKey}`,
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

		// Teams table
		this.teamsTable = new Table(this, 'TeamsTable', {
			tableName: process.env.TABLE_NAME_TEAMS ?? `umbro-teams-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// Team memberships table
		this.teamMembershipsTable = new Table(this, 'TeamMembershipsTable', {
			tableName: process.env.TABLE_NAME_TEAM_MEMBERSHIPS ?? `umbro-team-memberships-${stageKey}`,
			partitionKey: { name: 'teamId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})
		this.teamMembershipsTable.addGlobalSecondaryIndex({
			indexName: 'ByUser',
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Team links table
		this.teamLinksTable = new Table(this, 'TeamLinksTable', {
			tableName: process.env.TABLE_NAME_TEAM_LINKS ?? `umbro-team-links-${stageKey}`,
			partitionKey: { name: 'parentTeamId', type: AttributeType.STRING },
			sortKey: { name: 'childTeamId', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// Applications table
		this.applicationsTable = new Table(this, 'ApplicationsTable', {
			tableName: process.env.TABLE_NAME_APPLICATIONS ?? `umbro-applications-${stageKey}`,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// GSI to query applications by owner (user or team)
		this.applicationsTable.addGlobalSecondaryIndex({
			indexName: 'ApplicationsByOwnerIndex',
			partitionKey: { name: 'ownerId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Environments table
		this.environmentsTable = new Table(this, 'EnvironmentsTable', {
			tableName: process.env.TABLE_NAME_ENVIRONMENTS ?? `umbro-environments-${stageKey}`,
			partitionKey: { name: 'teamId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// Sessions table removed (JWT sessions in app)

        // Service tokens table (custom for Umbro)
		// World-class design: userId#createdAt sort key for chronological ordering
		this.serviceTokensTable = new Table(this, 'ServiceTokensTable', {
			tableName: process.env.TABLE_NAME_SERVICE_TOKENS ?? `umbro-service-tokens-${stageKey}`,
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

		// Requests table
		this.requestsTable = new Table(this, 'RequestsTable', {
			tableName: process.env.TABLE_NAME_REQUESTS ?? `umbro-requests-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})
		this.requestsTable.addGlobalSecondaryIndex({
			indexName: 'RequestsByTypeIndex',
			partitionKey: { name: 'requestType', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})
		this.requestsTable.addGlobalSecondaryIndex({
			indexName: 'RequestsByResourceIndex',
			partitionKey: { name: 'resourceId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})
		this.requestsTable.addGlobalSecondaryIndex({
			indexName: 'RequestsByTargetTeamIndex',
			partitionKey: { name: 'targetTeamId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})
		this.requestsTable.addGlobalSecondaryIndex({
			indexName: 'RequestsByTargetUserIndex',
			partitionKey: { name: 'targetUserId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Request comments table
		this.requestCommentsTable = new Table(this, 'RequestCommentsTable', {
			tableName: process.env.TABLE_NAME_REQUEST_COMMENTS ?? `umbro-request-comments-${stageKey}`,
			partitionKey: { name: 'requestId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})
		this.requestCommentsTable.addGlobalSecondaryIndex({
			indexName: 'CommentsByIdIndex',
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Access grants table
		this.accessGrantsTable = new Table(this, 'AccessGrantsTable', {
			tableName: process.env.TABLE_NAME_ACCESS_GRANTS ?? `umbro-access-grants-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})
		this.accessGrantsTable.addGlobalSecondaryIndex({
			indexName: 'GrantsByResourceIndex',
			partitionKey: { name: 'resourceId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})
		this.accessGrantsTable.addGlobalSecondaryIndex({
			indexName: 'GrantsByTeamIndex',
			partitionKey: { name: 'teamId', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Visitors table
		this.visitorsTable = new Table(this, 'VisitorsTable', {
			tableName: process.env.TABLE_NAME_VISITORS ?? `umbro-visitors-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})
		this.visitorsTable.addGlobalSecondaryIndex({
			indexName: 'VisitorsByIpIndex',
			partitionKey: { name: 'ip', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// Rate limit table (basic fixed window)
		this.rateLimitTable = new Table(this, 'RateLimitTable', {
			tableName: process.env.TABLE_NAME_RATE_LIMIT ?? `umbro-rate-limit-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// User Permissions table - Granular access control
		this.userPermissionsTable = new Table(this, 'UserPermissionsTable', {
			tableName: `umbro-user-permissions-${stageKey}`,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'resourceType#resourceId', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			timeToLiveAttribute: 'expiresAt',
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// GSI for querying permissions by resource
		this.userPermissionsTable.addGlobalSecondaryIndex({
			indexName: 'ByResourceIndex',
			partitionKey: { name: 'resourceType', type: AttributeType.STRING },
			sortKey: { name: 'resourceId', type: AttributeType.STRING }
		})

		// GSI for querying permissions by grantor
		this.userPermissionsTable.addGlobalSecondaryIndex({
			indexName: 'ByGrantorIndex',
			partitionKey: { name: 'grantedBy', type: AttributeType.STRING },
			sortKey: { name: 'grantedAt', type: AttributeType.STRING }
		})

		// GSI for querying permissions by type
		this.userPermissionsTable.addGlobalSecondaryIndex({
			indexName: 'ByPermissionTypeIndex',
			partitionKey: { name: 'permission', type: AttributeType.STRING },
			sortKey: { name: 'grantedAt', type: AttributeType.STRING }
		})

		// GSI for querying permissions by request
		this.userPermissionsTable.addGlobalSecondaryIndex({
			indexName: 'ByRequestIndex',
			partitionKey: { name: 'requestId', type: AttributeType.STRING },
			sortKey: { name: 'grantedAt', type: AttributeType.STRING }
		})

		// Audit Logs table - Comprehensive action tracking
		this.auditLogsTable = new Table(this, 'AuditLogsTable', {
			tableName: `umbro-audit-logs-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'timestamp', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// GSI for querying audit logs by actor
		this.auditLogsTable.addGlobalSecondaryIndex({
			indexName: 'ByActorIndex',
			partitionKey: { name: 'actorId', type: AttributeType.STRING },
			sortKey: { name: 'timestamp', type: AttributeType.STRING }
		})

		// GSI for querying audit logs by resource
		this.auditLogsTable.addGlobalSecondaryIndex({
			indexName: 'ByResourceIndex',
			partitionKey: { name: 'resourceType', type: AttributeType.STRING },
			sortKey: { name: 'resourceId', type: AttributeType.STRING }
		})

		// GSI for querying audit logs by action
		this.auditLogsTable.addGlobalSecondaryIndex({
			indexName: 'ByActionIndex',
			partitionKey: { name: 'action', type: AttributeType.STRING },
			sortKey: { name: 'timestamp', type: AttributeType.STRING }
		})

		// GSI for querying audit logs by request
		this.auditLogsTable.addGlobalSecondaryIndex({
			indexName: 'ByRequestIndex',
			partitionKey: { name: 'requestId', type: AttributeType.STRING },
			sortKey: { name: 'timestamp', type: AttributeType.STRING }
		})

		// GSI for querying audit logs by time range
		this.auditLogsTable.addGlobalSecondaryIndex({
			indexName: 'ByDateIndex',
			partitionKey: { name: 'date', type: AttributeType.STRING }, // YYYY-MM-DD format
			sortKey: { name: 'timestamp', type: AttributeType.STRING }
		})

		// Plans table - Subscription plans and user plan assignments
		this.plansTable = new Table(this, 'PlansTable', {
			tableName: `umbro-plans-${stageKey}`,
			partitionKey: { name: 'id', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy,
			...(needsBackups && {
				pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
			})
		})

		// GSI for querying plans by name
		this.plansTable.addGlobalSecondaryIndex({
			indexName: 'ByNameIndex',
			partitionKey: { name: 'name', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})

		// GSI for querying plans by price
		this.plansTable.addGlobalSecondaryIndex({
			indexName: 'ByPriceIndex',
			partitionKey: { name: 'price', type: AttributeType.STRING },
			sortKey: { name: 'createdAt', type: AttributeType.STRING }
		})
	}
}