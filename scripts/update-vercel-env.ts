#!/usr/bin/env node

/**
 * Update Vercel environment variables from CloudFormation outputs
 * 
 * This script reads CloudFormation outputs and updates Vercel environment variables
 * for the specified targets (preview, development, production).
 * 
 * Environment variables required:
 * - VERCEL_TOKEN: Vercel API token
 * - VERCEL_PROJECT_ID: Vercel project ID
 * - VERCEL_TEAM_ID: Vercel team ID
 * - TARGETS: Comma-separated list of Vercel environments (e.g., "preview,development")
 * - AWS_ACCOUNT_ID: AWS Account ID
 * - AWS_REGION: AWS Region
 * - AWS_ROLE_ARN: AWS Role ARN for Vercel OIDC
 * - USERS_TABLE_NAME: DynamoDB Users table name
 * - SERVICE_TOKENS_TABLE_NAME: DynamoDB Service Tokens table name
 * 
 * Optional environment variables:
 * - EMAIL_NOTIFICATION_EMAIL: Email address for system notifications (if set, will be synced to Vercel)
 */

import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { createHmac } from 'crypto'
import { Vercel } from '@vercel/sdk'
import { OneTarget } from '@vercel/sdk/models/createprojectenvop.js'

interface EnvironmentVariable {
	key: string
	value: string
	target: string
	type: 'encrypted' | 'plain'
}

interface CloudFormationOutputs {
	AccountId?: string
	Region?: string
	VercelRoleArn?: string
	UsersTableName?: string
	RateLimitTableName?: string
	ServiceTokensTableName?: string
	ApplicationsTableName?: string
	EnvironmentsTableName?: string
	TeamsTableName?: string
	TeamMembershipsTableName?: string
	TeamLinksTableName?: string
	RequestsTableName?: string
	RequestCommentsTableName?: string
	AccessGrantsTableName?: string
	VisitorsTableName?: string
	UserPermissionsTableName?: string
	AuditLogsTableName?: string
	PlansTableName?: string
	// S3 bucket names - migrated to profile naming
	ProfileBucketName?: string // Profile bucket export
	AssetsBucketName?: string
	// Email infrastructure outputs
	EmailTopicArn?: string
	EmailLogGroupName?: string
	EmailRoleArn?: string
}

class VercelEnvironmentUpdater {
	private vercel: Vercel
	private cloudformation: CloudFormationClient
	private projectId: string
	private teamId: string
	private targets: string[]

	/**
	 * Derive a deterministic secret for NextAuth from a per-environment seed.
	 * The output is a 64-character hex string derived via HMAC-SHA256.
	 */
	private deriveNextAuthSecret(seed: string, stage: string): string {
		const hmac = createHmac('sha256', seed)
		hmac.update(`umbro|nextauth|${stage}`)
		return hmac.digest('hex')
	}

	/**
	 * Get seed for environment - uses env var if available, otherwise fallback constants
	 */
	private getSeedForStage(stage: string): string {
		const seedEnvVarName = stage === 'Production' ? 'NEXTAUTH_SEED_PRODUCTION' : 'NEXTAUTH_SEED_ALPHA'
		const envSeed = process.env[seedEnvVarName]
		
		if (envSeed) {
			return envSeed
		}

		// Fallback constants - these should be unique per deployment but consistent per stage
		const fallbackSeeds = {
			Production: 'umbro-prod-seed-2024-deterministic-fallback',
			Alpha: 'umbro-alpha-seed-2024-deterministic-fallback',
		}

		return fallbackSeeds[stage as keyof typeof fallbackSeeds] || fallbackSeeds.Alpha
	}

	constructor() {
		// Validate required environment variables
		const requiredEnvVars = [
			'VERCEL_TOKEN',
			'VERCEL_PROJECT_ID', 
			'VERCEL_TEAM_ID',
			'TARGETS'
		]

		for (const envVar of requiredEnvVars) {
			if (!process.env[envVar]) {
				throw new Error(`Missing required environment variable: ${envVar}`)
			}
		}

		this.vercel = new Vercel({
			bearerToken: process.env.VERCEL_TOKEN!
		})

		this.cloudformation = new CloudFormationClient({
			region: process.env.AWS_REGION || 'us-east-1'
		})

		this.projectId = process.env.VERCEL_PROJECT_ID!
		this.teamId = process.env.VERCEL_TEAM_ID!
		this.targets = process.env.TARGETS!.split(',').map(t => t.trim())

		console.log(`🎯 Targets: [${this.targets.join(', ')}]`)
		console.log(`📦 Project: ${this.projectId}`)
		console.log(`👥 Team: ${this.teamId}`)
	}

	/**
	 * Get CloudFormation outputs from both stacks
	 */
	private async getCloudFormationOutputs(): Promise<CloudFormationOutputs> {
		const stage = this.determineStageFromTargets()
		const umbroStackName = `Umbro`
		const vercelStackName = `UmbroVercelOIDC`

		console.log(`📋 Reading CloudFormation outputs for stage: ${stage}`)

		try {
			// Get outputs from both stacks
			const [umbroResponse, vercelResponse] = await Promise.all([
				this.cloudformation.send(new DescribeStacksCommand({ StackName: umbroStackName })),
				this.cloudformation.send(new DescribeStacksCommand({ StackName: vercelStackName }))
			])

			const umbroStack = umbroResponse.Stacks?.[0]
			const vercelStack = vercelResponse.Stacks?.[0]

			if (!umbroStack || !vercelStack) {
				throw new Error('Could not find required CloudFormation stacks')
			}

			// Extract outputs
			const outputs: CloudFormationOutputs = {}

			// Process Umbro stack outputs
			umbroStack.Outputs?.forEach(output => {
				if (output.OutputKey && output.OutputValue) {
					switch (output.OutputKey) {
						case 'AccountId':
							outputs.AccountId = output.OutputValue
							break
						case 'Region':
							outputs.Region = output.OutputValue
							break
						case 'UsersTableName':
							outputs.UsersTableName = output.OutputValue
							break
                    // Sessions table removed: JWT sessions in app
						case 'ServiceTokensTableName':
							outputs.ServiceTokensTableName = output.OutputValue
							break
						case 'RateLimitTableName':
							outputs.RateLimitTableName = output.OutputValue
							break
                        case 'ApplicationsTableName':
                            outputs.ApplicationsTableName = output.OutputValue
                            break
                        case 'EnvironmentsTableName':
                            outputs.EnvironmentsTableName = output.OutputValue
                            break
                        case 'TeamsTableName':
                            outputs.TeamsTableName = output.OutputValue
                            break
                        case 'TeamMembershipsTableName':
                            outputs.TeamMembershipsTableName = output.OutputValue
                            break
							case 'TeamLinksTableName':
								outputs.TeamLinksTableName = output.OutputValue
								break
                        case 'RequestsTableName':
                            outputs.RequestsTableName = output.OutputValue
                            break
                        case 'RequestCommentsTableName':
                            outputs.RequestCommentsTableName = output.OutputValue
                            break
                        case 'AccessGrantsTableName':
                            outputs.AccessGrantsTableName = output.OutputValue
                            break
                        						case 'VisitorsTableName':
							outputs.VisitorsTableName = output.OutputValue
							break
						case 'UserPermissionsTableName':
							outputs.UserPermissionsTableName = output.OutputValue
							break
						case 'AuditLogsTableName':
							outputs.AuditLogsTableName = output.OutputValue
							break
						case 'PlansTableName':
							outputs.PlansTableName = output.OutputValue
							break
						case 'ProfileBucketName':
							outputs.ProfileBucketName = output.OutputValue
							break
						case 'AssetsBucketName':
							outputs.AssetsBucketName = output.OutputValue
							break
						// Email infrastructure outputs
						case 'EmailTopicArn':
							outputs.EmailTopicArn = output.OutputValue
							break
						case 'EmailLogGroupName':
							outputs.EmailLogGroupName = output.OutputValue
							break
						case 'EmailRoleArn':
							outputs.EmailRoleArn = output.OutputValue
							break
					}
				}
			})

			// Process Vercel OIDC stack outputs
			vercelStack.Outputs?.forEach(output => {
				if (output.OutputKey === 'VercelRoleArn' && output.OutputValue) {
					outputs.VercelRoleArn = output.OutputValue
				}
			})

			console.log('✅ CloudFormation outputs retrieved:')
			console.log(`   Account ID: ${outputs.AccountId}`)
			console.log(`   Region: ${outputs.Region}`)
			console.log(`   Role ARN: ${outputs.VercelRoleArn}`)
			console.log(`   Users Table: ${outputs.UsersTableName}`)
			console.log(`   Service Tokens Table: ${outputs.ServiceTokensTableName}`)
			console.log(`   Rate Limit Table: ${outputs.RateLimitTableName}`)
			console.log(`   Email Topic ARN: ${outputs.EmailTopicArn}`)
			console.log(`   Email Log Group: ${outputs.EmailLogGroupName}`)
			console.log(`   Email Role ARN: ${outputs.EmailRoleArn}`)

			return outputs
		} catch (error) {
			console.error('❌ Error reading CloudFormation outputs:', error)
			throw error
		}
	}

	/**
	 * Determine stage from targets for CloudFormation stack naming
	 */
	private determineStageFromTargets(): string {
		if (this.targets.includes('production')) {
			return 'Production'
		}
		return 'Alpha'
	}

	/**
	 * Create environment variables from CloudFormation outputs
	 */
	private createEnvironmentVariables(outputs: CloudFormationOutputs): EnvironmentVariable[] {
		const envVars: EnvironmentVariable[] = []

		// Determine stage from targets (Alpha or Production)
		const stage = this.determineStageFromTargets()

				// Add AWS configuration
		if (outputs.AccountId) {
			envVars.push({
				key: 'AWS_ACCOUNT_ID',
				value: outputs.AccountId,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

		if (outputs.Region) {
			envVars.push({
				key: 'AWS_REGION',
				value: outputs.Region,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

		if (outputs.VercelRoleArn) {
			envVars.push({
				key: 'AWS_ROLE_ARN',
				value: outputs.VercelRoleArn,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

		// Add DynamoDB table names with consistent naming
		        if (outputs.UsersTableName) {
            envVars.push({
                key: 'TABLE_NAME_USERS',
                value: outputs.UsersTableName,
                target: this.targets.join(','),
                type: 'encrypted' // User data table should be encrypted
            })
        }

		if (outputs.ServiceTokensTableName) {
			envVars.push({
				key: 'TABLE_NAME_SERVICE_TOKENS',
				value: outputs.ServiceTokensTableName,
				target: this.targets.join(','),
				type: 'encrypted' // Service tokens table should be encrypted
			})
		}

		if (outputs.RateLimitTableName) {
			envVars.push({
				key: 'TABLE_NAME_RATE_LIMIT',
				value: outputs.RateLimitTableName,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

        if (outputs.ApplicationsTableName) {
            envVars.push({
                key: 'TABLE_NAME_APPLICATIONS',
                value: outputs.ApplicationsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        if (outputs.EnvironmentsTableName) {
            envVars.push({
                key: 'TABLE_NAME_ENVIRONMENTS',
                value: outputs.EnvironmentsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        if (outputs.TeamsTableName) {
            envVars.push({
                key: 'TABLE_NAME_TEAMS',
                value: outputs.TeamsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        if (outputs.TeamMembershipsTableName) {
            envVars.push({
                key: 'TABLE_NAME_TEAM_MEMBERSHIPS',
                value: outputs.TeamMembershipsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

			if (outputs.TeamLinksTableName) {
				envVars.push({
					key: 'TABLE_NAME_TEAM_LINKS',
					value: outputs.TeamLinksTableName,
					target: this.targets.join(','),
					type: 'plain'
				})
			}

        if (outputs.RequestsTableName) {
            envVars.push({
                key: 'TABLE_NAME_REQUESTS',
                value: outputs.RequestsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        if (outputs.RequestCommentsTableName) {
            envVars.push({
                key: 'TABLE_NAME_REQUEST_COMMENTS',
                value: outputs.RequestCommentsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        if (outputs.AccessGrantsTableName) {
            envVars.push({
                key: 'TABLE_NAME_ACCESS_GRANTS',
                value: outputs.AccessGrantsTableName,
                target: this.targets.join(','),
                type: 'encrypted' // Access grants table should be encrypted for security
            })
        }

        if (outputs.VisitorsTableName) {
            envVars.push({
                key: 'TABLE_NAME_VISITORS',
                value: outputs.VisitorsTableName,
                target: this.targets.join(','),
                type: 'plain'
            })
        }

        // New permission and audit tables - following TYPE_NAME_CONTEXT pattern
        if (outputs.UserPermissionsTableName) {
            envVars.push({
                key: 'TABLE_NAME_USER_PERMISSIONS',
                value: outputs.UserPermissionsTableName,
                target: this.targets.join(','),
                type: 'encrypted' // Table names should be encrypted for security
            })
        }

        if (outputs.AuditLogsTableName) {
            envVars.push({
                key: 'TABLE_NAME_AUDIT_LOGS',
                value: outputs.AuditLogsTableName,
                target: this.targets.join(','),
                type: 'encrypted' // Table names should be encrypted for security
            })
        }

        if (outputs.PlansTableName) {
            envVars.push({
                key: 'TABLE_NAME_PLANS',
                value: outputs.PlansTableName,
                target: this.targets.join(','),
                type: 'encrypted' // Table names should be encrypted for security
            })
        }

        		// S3 bucket names - following TYPE_NAME_CONTEXT pattern
		// Profile bucket (migrated from avatar naming)
		if (outputs.ProfileBucketName) {
			envVars.push({
				key: 'BUCKET_NAME_PROFILE',
				value: outputs.ProfileBucketName,
				target: this.targets.join(','),
				type: 'encrypted' // S3 bucket names should be encrypted for security
			})
		}

        if (outputs.AssetsBucketName) {
            envVars.push({
                key: 'BUCKET_NAME_ASSETS',
                value: outputs.AssetsBucketName,
                target: this.targets.join(','),
                type: 'encrypted' // S3 bucket names should be encrypted for security
            })
        }

        // Email infrastructure environment variables
        // These enable the email system to work with the deployed AWS infrastructure
        if (outputs.EmailTopicArn) {
            envVars.push({
                key: 'EMAIL_SNS_TOPIC_ARN',
                value: outputs.EmailTopicArn,
                target: this.targets.join(','),
                type: 'encrypted' // SNS topic ARN should be encrypted for security
            })
        }

        if (outputs.EmailLogGroupName) {
            envVars.push({
                key: 'EMAIL_CLOUDWATCH_LOG_GROUP',
                value: outputs.EmailLogGroupName,
                target: this.targets.join(','),
                type: 'encrypted' // Log group name should be encrypted for security
            })
        }

        if (outputs.EmailRoleArn) {
            envVars.push({
                key: 'EMAIL_IAM_ROLE_ARN',
                value: outputs.EmailRoleArn,
                target: this.targets.join(','),
                type: 'encrypted' // IAM role ARN should be encrypted for security
            })
        }

        // Optional notification email (if set in CDK)
        const notificationEmail = process.env.EMAIL_NOTIFICATION_EMAIL
        if (notificationEmail) {
            envVars.push({
                key: 'EMAIL_NOTIFICATION_EMAIL',
                value: notificationEmail,
                target: this.targets.join(','),
                type: 'encrypted' // Email addresses should be encrypted for privacy
            })
        }

		// Add NextAuth secret derived from per-environment seed
		const seed = this.getSeedForStage(stage)
		const nextAuthSecret = this.deriveNextAuthSecret(seed, stage)
		
		// Set both NEXTAUTH_SECRET and AUTH_SECRET for compatibility
		envVars.push({
			key: 'NEXTAUTH_SECRET',
			value: nextAuthSecret,
			target: this.targets.join(','),
			type: 'encrypted'
		})
		envVars.push({
			key: 'AUTH_SECRET',
			value: nextAuthSecret,
			target: this.targets.join(','),
			type: 'encrypted'
		})

		return envVars
	}

	/**
	 * Update Vercel environment variables
	 */
	private async updateVercelEnvironmentVariables(envVars: EnvironmentVariable[]): Promise<void> {
		console.log(`🔄 Updating ${envVars.length} environment variables...`)

		for (const envVar of envVars) {
			try {
				console.log(`   Setting ${envVar.key} for [${envVar.target}]`)

				await this.vercel.projects.createProjectEnv({
					idOrName: this.projectId,
					teamId: this.teamId,
					upsert: 'true',
					requestBody: {
						key: envVar.key,
						value: envVar.value,
						target: envVar.target.split(',') as OneTarget[],
						type: envVar.type
					}
				})

				console.log(`   ✅ ${envVar.key} updated successfully`)
			} catch (error) {
				console.error(`   ❌ Failed to update ${envVar.key}:`, error)
				throw error
			}
		}
	}

	/**
	 * Main execution method
	 */
	async run(): Promise<void> {
		try {
			console.log('🚀 Starting Vercel environment variable update...')

			// Get CloudFormation outputs
			const outputs = await this.getCloudFormationOutputs()

			// Create environment variables
			const envVars = this.createEnvironmentVariables(outputs)

			if (envVars.length === 0) {
				console.log('⚠️  No environment variables to update')
				return
			}

			// Update Vercel environment variables
			await this.updateVercelEnvironmentVariables(envVars)

			console.log('✅ All environment variables updated successfully!')
		} catch (error) {
			console.error('❌ Failed to update Vercel environment variables:', error)
			process.exit(1)
		}
	}
}

// Run the updater
if (import.meta.url === `file://${process.argv[1]}`) {
	const updater = new VercelEnvironmentUpdater()
	updater.run()
}
