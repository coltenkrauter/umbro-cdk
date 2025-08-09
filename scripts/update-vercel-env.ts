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
    SessionsTableName?: string
	ServiceTokensTableName?: string
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
		const umbroStackName = `UmbroStack`
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
            // Sessions table removed
			console.log(`   Service Tokens Table: ${outputs.ServiceTokensTableName}`)

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

		// Add DynamoDB table names
		if (outputs.UsersTableName) {
			envVars.push({
				key: 'USERS_TABLE_NAME',
				value: outputs.UsersTableName,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

        // Sessions table removed

		if (outputs.ServiceTokensTableName) {
			envVars.push({
				key: 'SERVICE_TOKENS_TABLE_NAME',
				value: outputs.ServiceTokensTableName,
				target: this.targets.join(','),
				type: 'plain'
			})
		}

		// Add NextAuth secret derived from per-environment seed
		const seedEnvVarName = stage === 'Production' ? 'NEXTAUTH_SEED_PRODUCTION' : 'NEXTAUTH_SEED_ALPHA'
		const seed = process.env[seedEnvVarName]
		if (!seed) {
			console.warn(`⚠️  ${seedEnvVarName} not set. Skipping NEXTAUTH_SECRET for targets [${this.targets.join(', ')}].`)
		} else {
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
		}

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
