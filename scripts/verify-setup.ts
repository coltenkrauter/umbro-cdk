#!/usr/bin/env node

/**
 * Verify Vercel environment variable setup
 * 
 * This script checks that all required environment variables are properly
 * set in Vercel and that AWS connectivity works.
 */

import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { Vercel } from '@vercel/sdk'

interface VerificationResult {
	check: string
	status: 'pass' | 'fail' | 'warn'
	message: string
}

class SetupVerifier {
	private vercel: Vercel
	private cloudformation: CloudFormationClient
	private projectId: string
	private teamId: string
	private results: VerificationResult[] = []

	constructor() {
		const requiredEnvVars = ['VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID']

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
	}

	private addResult(check: string, status: 'pass' | 'fail' | 'warn', message: string) {
		this.results.push({ check, status, message })
	}

	/**
	 * Check if CloudFormation stacks exist and have outputs
	 */
	private async verifyCloudFormationStacks(): Promise<void> {
		try {
			const [umbroResponse, vercelResponse] = await Promise.all([
				this.cloudformation.send(new DescribeStacksCommand({ StackName: 'UmbroStack' })),
				this.cloudformation.send(new DescribeStacksCommand({ StackName: 'UmbroVercelOIDC' }))
			])

			const umbroStack = umbroResponse.Stacks?.[0]
			const vercelStack = vercelResponse.Stacks?.[0]

			if (umbroStack) {
				this.addResult('UmbroStack', 'pass', `Found stack with ${umbroStack.Outputs?.length || 0} outputs`)
			} else {
				this.addResult('UmbroStack', 'fail', 'Stack not found')
			}

			if (vercelStack) {
				this.addResult('UmbroVercelOIDC', 'pass', `Found stack with ${vercelStack.Outputs?.length || 0} outputs`)
			} else {
				this.addResult('UmbroVercelOIDC', 'fail', 'Stack not found')
			}

			// Check specific outputs
			const expectedOutputs = ['AccountId', 'Region', 'UsersTableName', 'SessionsTableName', 'ServiceTokensTableName']
			const actualOutputs = umbroStack?.Outputs?.map(o => o.OutputKey) || []

			for (const expectedOutput of expectedOutputs) {
				if (actualOutputs.includes(expectedOutput)) {
					this.addResult(`Output: ${expectedOutput}`, 'pass', 'Present in CloudFormation')
				} else {
					this.addResult(`Output: ${expectedOutput}`, 'fail', 'Missing from CloudFormation')
				}
			}

			// Check Vercel role ARN output
			const vercelOutputs = vercelStack?.Outputs?.map(o => o.OutputKey) || []
			if (vercelOutputs.includes('VercelRoleArn')) {
				this.addResult('Output: VercelRoleArn', 'pass', 'Present in CloudFormation')
			} else {
				this.addResult('Output: VercelRoleArn', 'fail', 'Missing from CloudFormation')
			}

		} catch (error) {
			this.addResult('CloudFormation Access', 'fail', `Error: ${error}`)
		}
	}

	/**
	 * Check Vercel project access and environment variables
	 */
	private async verifyVercelSetup(): Promise<void> {
		try {
			// Test project access
			const project = await this.vercel.projects.get({
				idOrName: this.projectId,
				teamId: this.teamId
			})

			this.addResult('Vercel Project Access', 'pass', `Project: ${project.name}`)

			// Get environment variables
			const envVars = await this.vercel.projects.getEnvironmentVariables({
				projectIdOrName: this.projectId,
				teamId: this.teamId
			})

			const expectedEnvVars = [
				'AWS_ACCOUNT_ID',
				'AWS_REGION', 
				'AWS_ROLE_ARN',
				'USERS_TABLE_NAME',
				'SESSIONS_TABLE_NAME',
				'SERVICE_TOKENS_TABLE_NAME'
			]

			const actualEnvVars = envVars.envs?.map(env => env.key) || []

			for (const expectedEnvVar of expectedEnvVars) {
				if (actualEnvVars.includes(expectedEnvVar)) {
					this.addResult(`Vercel Env: ${expectedEnvVar}`, 'pass', 'Present in Vercel')
				} else {
					this.addResult(`Vercel Env: ${expectedEnvVar}`, 'warn', 'Missing from Vercel (will be set on next deploy)')
				}
			}

		} catch (error) {
			this.addResult('Vercel Access', 'fail', `Error: ${error}`)
		}
	}

	/**
	 * Print verification results
	 */
	private printResults(): void {
		console.log('\n🔍 Setup Verification Results\n')

		const statusIcons = {
			pass: '✅',
			fail: '❌', 
			warn: '⚠️'
		}

		for (const result of this.results) {
			const icon = statusIcons[result.status]
			console.log(`${icon} ${result.check}: ${result.message}`)
		}

		const failCount = this.results.filter(r => r.status === 'fail').length
		const warnCount = this.results.filter(r => r.status === 'warn').length
		const passCount = this.results.filter(r => r.status === 'pass').length

		console.log('\n📊 Summary:')
		console.log(`   ✅ Passed: ${passCount}`)
		console.log(`   ⚠️  Warnings: ${warnCount}`)
		console.log(`   ❌ Failed: ${failCount}`)

		if (failCount > 0) {
			console.log('\n🚨 Critical issues found. Please fix before proceeding.')
			process.exit(1)
		} else if (warnCount > 0) {
			console.log('\n⚠️  Some warnings found. These may be resolved after deployment.')
		} else {
			console.log('\n🎉 All checks passed! Setup looks good.')
		}
	}

	/**
	 * Run all verification checks
	 */
	async run(): Promise<void> {
		console.log('🔍 Verifying Vercel environment variable setup...')

		await Promise.all([
			this.verifyCloudFormationStacks(),
			this.verifyVercelSetup()
		])

		this.printResults()
	}
}

// Run the verifier
if (import.meta.url === `file://${process.argv[1]}`) {
	const verifier = new SetupVerifier()
	verifier.run().catch(error => {
		console.error('❌ Verification failed:', error)
		process.exit(1)
	})
}
