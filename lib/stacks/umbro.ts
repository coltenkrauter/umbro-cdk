import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Stage } from '@krauters/structures'

import { DynamoDBConstruct } from '../constructs/dynamodb.js'
import { S3Construct } from '../constructs/s3.js'

export interface UmbroProps extends StackProps {
	stage: Stage
}

/**
 * Main stack for Umbro DynamoDB infrastructure.
 */
export class Umbro extends Stack {
	public readonly database: DynamoDBConstruct
	public readonly storage: S3Construct

	constructor(scope: Construct, id: string, props: UmbroProps) {
		super(scope, id, props)

		const { stage } = props

		this.database = new DynamoDBConstruct(this, 'Database', {
			stage
		})

		this.storage = new S3Construct(this, 'Storage', {
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

		new CfnOutput(this, 'ServiceTokensTableName', {
			value: this.database.serviceTokensTable.tableName,
			description: 'DynamoDB Service Tokens Table Name',
			exportName: `UmbroStack-${stage}-ServiceTokensTableName`
		})

        new CfnOutput(this, 'RateLimitTableName', {
            value: this.database.rateLimitTable.tableName,
            description: 'DynamoDB Rate Limit Table Name',
            exportName: `UmbroStack-${stage}-RateLimitTableName`
        })

		// Additional application tables
		new CfnOutput(this, 'ApplicationsTableName', {
			value: this.database.applicationsTable.tableName,
			description: 'DynamoDB Applications Table Name',
			exportName: `UmbroStack-${stage}-ApplicationsTableName`
		})

		new CfnOutput(this, 'EnvironmentsTableName', {
			value: this.database.environmentsTable.tableName,
			description: 'DynamoDB Environments Table Name',
			exportName: `UmbroStack-${stage}-EnvironmentsTableName`
		})

		new CfnOutput(this, 'TeamsTableName', {
			value: this.database.teamsTable.tableName,
			description: 'DynamoDB Teams Table Name',
			exportName: `UmbroStack-${stage}-TeamsTableName`
		})

		new CfnOutput(this, 'TeamMembershipsTableName', {
			value: this.database.teamMembershipsTable.tableName,
			description: 'DynamoDB Team Memberships Table Name',
			exportName: `UmbroStack-${stage}-TeamMembershipsTableName`
		})

		new CfnOutput(this, 'TeamLinksTableName', {
			value: this.database.teamLinksTable.tableName,
			description: 'DynamoDB Team Links Table Name',
			exportName: `UmbroStack-${stage}-TeamLinksTableName`
		})

		new CfnOutput(this, 'RequestsTableName', {
			value: this.database.requestsTable.tableName,
			description: 'DynamoDB Requests Table Name',
			exportName: `UmbroStack-${stage}-RequestsTableName`
		})

		new CfnOutput(this, 'RequestCommentsTableName', {
			value: this.database.requestCommentsTable.tableName,
			description: 'DynamoDB Request Comments Table Name',
			exportName: `UmbroStack-${stage}-RequestCommentsTableName`
		})

		new CfnOutput(this, 'AccessGrantsTableName', {
			value: this.database.accessGrantsTable.tableName,
			description: 'DynamoDB Access Grants Table Name',
			exportName: `UmbroStack-${stage}-AccessGrantsTableName`
		})

		new CfnOutput(this, 'VisitorsTableName', {
			value: this.database.visitorsTable.tableName,
			description: 'DynamoDB Visitors Table Name',
			exportName: `UmbroStack-${stage}-VisitorsTableName`
		})

		// New permission and audit tables
		new CfnOutput(this, 'UserPermissionsTableName', {
			value: this.database.userPermissionsTable.tableName,
			description: 'DynamoDB User Permissions Table Name',
			exportName: `UmbroStack-${stage}-UserPermissionsTableName`
		})

		new CfnOutput(this, 'AuditLogsTableName', {
			value: this.database.auditLogsTable.tableName,
			description: 'DynamoDB Audit Logs Table Name',
			exportName: `UmbroStack-${stage}-AuditLogsTableName`
		})

		// Plans table
		new CfnOutput(this, 'PlansTableName', {
			value: this.database.plansTable.tableName,
			description: 'DynamoDB Plans Table Name',
			exportName: `UmbroStack-${stage}-PlansTableName`
		})

		// S3 bucket outputs
		// Note: ProfileBucketName temporarily removed to avoid deployment conflicts
		// TODO: Add ProfileBucketName export in future version after gradual migration
		
		// Primary bucket export
		new CfnOutput(this, 'AvatarBucketName', {
			value: this.storage.avatarBucket.bucketName,
			description: 'S3 Avatar Bucket Name',
			exportName: `UmbroStack-${stage}-AvatarBucketName`
		})

		new CfnOutput(this, 'AssetsBucketName', {
			value: this.storage.assetsBucket.bucketName,
			description: 'S3 Assets Bucket Name',
			exportName: `UmbroStack-${stage}-AssetsBucketName`
		})
	}

	// Convenience getters for backward compatibility
	get usersTable() {
		return this.database.usersTable
	}

	get serviceTokensTable() {
		return this.database.serviceTokensTable
	}

	get rateLimitTable() {
		return this.database.rateLimitTable
	}
}