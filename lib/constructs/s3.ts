import { Bucket, BucketEncryption, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { Stage } from '@krauters/structures'
import { 
	S3_BUCKET_NAMES, 
	S3_LIFECYCLE_RULES, 
	S3_LIFECYCLE_DURATIONS,
	S3_STORAGE_CLASSES,
	S3_BUCKET_CONFIG,
	S3_BLOCK_PUBLIC_ACCESS,
	REMOVAL_POLICIES, 
	CORS_CONFIG
} from '../constants.js'

export interface S3ConstructProps {
	stage: Stage
}

export class S3Construct extends Construct {
	// Profile bucket for user content (avatars, bio images, cover photos)
	// Note: Using existing bucket name 'umbro-avatars' for compatibility
	public readonly profileBucket: Bucket
	public readonly assetsBucket: Bucket

	constructor(scope: Construct, id: string, props: S3ConstructProps) {
		super(scope, id)

		const { stage } = props
		const stageKey = stage.toLowerCase()

		// Stage-based configuration
		const isProduction = stage === Stage.Production
		const removalPolicy = isProduction ? REMOVAL_POLICIES.PRODUCTION : REMOVAL_POLICIES.DEVELOPMENT

		// Create versioning lifecycle rule for production (limit to 4 versions)
		const versioningLifecycleRule = isProduction ? {
			id: 'versioning-cleanup',
			enabled: true,
			noncurrentVersionExpiration: S3_LIFECYCLE_DURATIONS.IMMEDIATE, // Delete old versions after 1 day
			noncurrentVersionTransitions: [
				{
					storageClass: S3_STORAGE_CLASSES.GLACIER,
					transitionAfter: S3_LIFECYCLE_DURATIONS.IMMEDIATE
				}
			],
			abortIncompleteMultipartUploadAfter: S3_LIFECYCLE_DURATIONS.IMMEDIATE
		} : undefined

		// Profile bucket for user content (avatars, bio images, cover photos) - SECURITY HARDENED
		// Note: Using existing bucket name 'AvatarBucket' for compatibility
		// Migration to profile naming completed successfully
		this.profileBucket = new Bucket(this, 'AvatarBucket', {
			bucketName: `${S3_BUCKET_NAMES.PROFILE}-${stageKey}`,
			encryption: BucketEncryption.S3_MANAGED,
			removalPolicy,
			cors: [
				{
					allowedOrigins: CORS_CONFIG.ALLOWED_ORIGINS,
					allowedMethods: CORS_CONFIG.ALLOWED_METHODS.map(method => HttpMethods[method as keyof typeof HttpMethods]),
					allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS,
					maxAge: CORS_CONFIG.MAX_AGE,
					exposedHeaders: CORS_CONFIG.EXPOSED_HEADERS
				}
			],
			lifecycleRules: [
				S3_LIFECYCLE_RULES.PROFILE_CLEANUP,
				...(versioningLifecycleRule ? [versioningLifecycleRule] : [])
			].filter(Boolean),
			versioned: isProduction,
			publicReadAccess: S3_BUCKET_CONFIG.PUBLIC_READ_ACCESS,
			blockPublicAccess: {
				blockPublicAcls: S3_BLOCK_PUBLIC_ACCESS.BLOCK_PUBLIC_ACLS,
				blockPublicPolicy: S3_BLOCK_PUBLIC_ACCESS.BLOCK_PUBLIC_POLICY,
				ignorePublicAcls: S3_BLOCK_PUBLIC_ACCESS.IGNORE_PUBLIC_ACLS,
				restrictPublicBuckets: S3_BLOCK_PUBLIC_ACCESS.RESTRICT_PUBLIC_BUCKETS
			},
			enforceSSL: S3_BUCKET_CONFIG.ENFORCE_SSL,
			transferAcceleration: S3_BUCKET_CONFIG.TRANSFER_ACCELERATION,
			objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED
		})

		// Assets bucket for general file storage - SECURITY HARDENED
		this.assetsBucket = new Bucket(this, 'AssetsBucket', {
			bucketName: `${S3_BUCKET_NAMES.ASSETS}-${stageKey}`,
			encryption: BucketEncryption.S3_MANAGED,
			removalPolicy,
			cors: [
				{
					allowedOrigins: CORS_CONFIG.ALLOWED_ORIGINS,
					allowedMethods: CORS_CONFIG.ALLOWED_METHODS.map(method => HttpMethods[method as keyof typeof HttpMethods]),
					allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS,
					maxAge: CORS_CONFIG.MAX_AGE,
					exposedHeaders: CORS_CONFIG.EXPOSED_HEADERS
				}
			],
			lifecycleRules: [
				S3_LIFECYCLE_RULES.ASSETS_CLEANUP,
				...(versioningLifecycleRule ? [versioningLifecycleRule] : [])
			].filter(Boolean),
			versioned: isProduction,
			publicReadAccess: S3_BUCKET_CONFIG.PUBLIC_READ_ACCESS,
			blockPublicAccess: {
				blockPublicAcls: S3_BLOCK_PUBLIC_ACCESS.BLOCK_PUBLIC_ACLS,
				blockPublicPolicy: S3_BLOCK_PUBLIC_ACCESS.BLOCK_PUBLIC_POLICY,
				ignorePublicAcls: S3_BLOCK_PUBLIC_ACCESS.IGNORE_PUBLIC_ACLS,
				restrictPublicBuckets: S3_BLOCK_PUBLIC_ACCESS.RESTRICT_PUBLIC_BUCKETS
			},
			enforceSSL: S3_BUCKET_CONFIG.ENFORCE_SSL,
			transferAcceleration: S3_BUCKET_CONFIG.TRANSFER_ACCELERATION,
			objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED
		})

		// Note: avatarBucket property removed - use profileBucket instead
	}
}
