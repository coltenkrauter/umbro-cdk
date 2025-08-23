import { RemovalPolicy } from 'aws-cdk-lib'
import { Bucket, BucketEncryption, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { Stage } from '@krauters/structures'
import { 
	S3_BUCKET_NAMES, 
	S3_LIFECYCLE_RULES, 
	REMOVAL_POLICIES, 
	CORS_CONFIG, 
	ENCRYPTION_CONFIG 
} from '../constants.js'

export interface S3ConstructProps {
	stage: Stage
}

export class S3Construct extends Construct {
	public readonly profileBucket: Bucket
	public readonly assetsBucket: Bucket
	// Backward compatibility - will be removed in next version
	public readonly avatarBucket: Bucket

	constructor(scope: Construct, id: string, props: S3ConstructProps) {
		super(scope, id)

		const { stage } = props
		const stageKey = stage.toLowerCase()

		// Stage-based configuration
		const isProduction = stage === Stage.Production
		const removalPolicy = isProduction ? REMOVAL_POLICIES.PRODUCTION : REMOVAL_POLICIES.DEVELOPMENT

		// Profile bucket for user profile content (avatars, bio images, cover photos) - SECURITY HARDENED
		this.profileBucket = new Bucket(this, 'ProfileBucket', {
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
			lifecycleRules: [S3_LIFECYCLE_RULES.PROFILE_CLEANUP],
			versioned: isProduction,
			publicReadAccess: false,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true
			},
			enforceSSL: true, // Force HTTPS/TLS for all requests
			transferAcceleration: false, // Disable transfer acceleration for security
			objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED // Enforce bucket owner control
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
			lifecycleRules: [S3_LIFECYCLE_RULES.ASSETS_CLEANUP],
			versioned: isProduction,
			publicReadAccess: false,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true
			},
			enforceSSL: true, // Force HTTPS/TLS for all requests
			transferAcceleration: false, // Disable transfer acceleration for security
			objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED // Enforce bucket owner control
		})

		// Backward compatibility - alias for profileBucket
		this.avatarBucket = this.profileBucket
	}
}
