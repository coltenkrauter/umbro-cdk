import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { StorageClass } from 'aws-cdk-lib/aws-s3'

/**
 * CDK Constants and Enums for consistent usage across the project
 */

// S3 Storage Classes
export const S3_STORAGE_CLASSES = {
	INFREQUENT_ACCESS: StorageClass.INFREQUENT_ACCESS,
	ONE_ZONE_INFREQUENT_ACCESS: StorageClass.ONE_ZONE_INFREQUENT_ACCESS,
	INTELLIGENT_TIERING: StorageClass.INTELLIGENT_TIERING,
	GLACIER: StorageClass.GLACIER,
	GLACIER_INSTANT_RETRIEVAL: StorageClass.GLACIER_INSTANT_RETRIEVAL,
	DEEP_ARCHIVE: StorageClass.DEEP_ARCHIVE
} as const

// S3 Lifecycle Durations
export const S3_LIFECYCLE_DURATIONS = {
	ONE_MONTH: Duration.days(30),
	THREE_MONTHS: Duration.days(90),
	ONE_YEAR: Duration.days(365),
	SEVEN_YEARS: Duration.days(2555), // Compliance requirement
	IMMEDIATE: Duration.days(0)
} as const

// S3 Lifecycle Rules
export const S3_LIFECYCLE_RULES = {
	PROFILE_CLEANUP: {
		id: 'profile-cleanup',
		enabled: true,
		expiration: S3_LIFECYCLE_DURATIONS.ONE_YEAR,
		transitions: [
			{ 
				storageClass: S3_STORAGE_CLASSES.INTELLIGENT_TIERING, 
				transitionAfter: S3_LIFECYCLE_DURATIONS.ONE_MONTH 
			},
			{ 
				storageClass: S3_STORAGE_CLASSES.GLACIER, 
				transitionAfter: S3_LIFECYCLE_DURATIONS.THREE_MONTHS 
			}
		]
	},
	ASSETS_CLEANUP: {
		id: 'assets-cleanup',
		enabled: true,
		expiration: S3_LIFECYCLE_DURATIONS.SEVEN_YEARS,
		transitions: [
			{ 
				storageClass: S3_STORAGE_CLASSES.INTELLIGENT_TIERING, 
				transitionAfter: S3_LIFECYCLE_DURATIONS.ONE_MONTH 
			},
			{ 
				storageClass: S3_STORAGE_CLASSES.GLACIER, 
				transitionAfter: S3_LIFECYCLE_DURATIONS.THREE_MONTHS 
			},
			{ 
				storageClass: S3_STORAGE_CLASSES.DEEP_ARCHIVE, 
				transitionAfter: S3_LIFECYCLE_DURATIONS.ONE_YEAR 
			}
		]
	}
}

// Removal Policies
export const REMOVAL_POLICIES = {
	PRODUCTION: RemovalPolicy.RETAIN,
	DEVELOPMENT: RemovalPolicy.DESTROY,
	BETA: RemovalPolicy.RETAIN
} as const

// DynamoDB Table Names
export const DYNAMODB_TABLE_NAMES = {
	USERS: 'umbro-users',
	TEAMS: 'umbro-teams',
	TEAM_MEMBERSHIPS: 'umbro-team-memberships',
	TEAM_LINKS: 'umbro-team-links',
	APPLICATIONS: 'umbro-applications',
	ENVIRONMENTS: 'umbro-environments',
	SERVICE_TOKENS: 'umbro-service-tokens',
	REQUESTS: 'umbro-requests',
	REQUEST_COMMENTS: 'umbro-request-comments',
	ACCESS_GRANTS: 'umbro-access-grants',
	VISITORS: 'umbro-visitors',
	RATE_LIMIT: 'umbro-rate-limit',
	USER_PERMISSIONS: 'umbro-user-permissions',
	AUDIT_LOGS: 'umbro-audit-logs'
} as const

// S3 Bucket Names - Following TYPE_NAME_CONTEXT pattern
export const BUCKET_NAMES = {
	PROFILE: 'umbro-profile', // Primary bucket for user profiles
	ASSETS: 'umbro-assets'
} as const

// Backwards compatibility
export const S3_BUCKET_NAMES = BUCKET_NAMES

// Permission Types
export const PERMISSION_TYPES = {
	READ: 'read',
	WRITE: 'write',
	ADMIN: 'admin',
	DELETE: 'delete'
} as const

// Resource Types
export const RESOURCE_TYPES = {
	USER: 'user',
	TEAM: 'team',
	APPLICATION: 'application',
	TOKEN: 'token',
	ENVIRONMENT: 'environment'
} as const

// Audit Actions
export const AUDIT_ACTIONS = {
	CREATE: 'create',
	READ: 'read',
	UPDATE: 'update',
	DELETE: 'delete',
	GRANT: 'grant',
	REVOKE: 'revoke',
	LOGIN: 'login',
	LOGOUT: 'logout',
	REQUEST_CREATED: 'request_created',
	REQUEST_APPROVED: 'request_approved',
	REQUEST_REJECTED: 'request_rejected',
	TEAM_JOINED: 'team_joined',
	TEAM_LEFT: 'team_left',
	APPLICATION_CREATED: 'application_created',
	TOKEN_GENERATED: 'token_generated'
} as const

// Actor Types
export const ACTOR_TYPES = {
	USER: 'user',
	SYSTEM: 'system',
	SERVICE: 'service'
} as const

// CORS Configuration - SECURITY HARDENED
export const CORS_CONFIG = {
	ALLOWED_ORIGINS: [
		'https://umbro.vercel.app',
		'https://*.vercel.app', // Allow Vercel preview deployments
		'http://localhost:3000', // Local development only
		'https://localhost:3000' // HTTPS local development
	],
	ALLOWED_METHODS: [
		'GET', 'PUT', 'POST', 'DELETE'
	],
	ALLOWED_HEADERS: [
		'Content-Type',
		'Authorization',
		'x-amz-date',
		'x-amz-security-token',
		'x-amz-user-agent'
	],
	MAX_AGE: 3000,
	EXPOSED_HEADERS: ['ETag']
}

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
	S3: 'AES256',
	DYNAMODB: 'AWS_MANAGED'
} as const
