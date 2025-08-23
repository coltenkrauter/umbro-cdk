#!/usr/bin/env node

/**
 * Staged deployment script to handle bucket rename without cross-stack reference issues
 * 
 * This script deploys the stacks in the correct order:
 * 1. Deploy UmbroVercelOIDC without S3 permissions
 * 2. Deploy Umbro with new bucket names
 * 3. Re-enable S3 permissions and deploy both together
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const STAGE = process.env.STAGE || 'Alpha'
const CDK_APP = 'npm run node -- ./lib/app.ts'

function runCommand(command: string, description: string) {
	console.log(`\n🚀 ${description}`)
	console.log(`Command: ${command}`)
	
	try {
		execSync(command, { stdio: 'inherit', cwd: process.cwd() })
		console.log(`✅ ${description} completed successfully`)
		return true
	} catch (error) {
		console.error(`❌ ${description} failed:`, error)
		return false
	}
}

function updateAppFile(enableS3Permissions: boolean) {
	const appPath = join(process.cwd(), 'lib', 'app.ts')
	let content = readFileSync(appPath, 'utf8')
	
	if (enableS3Permissions) {
		// Re-enable S3 permissions
		content = content.replace(
			/\/\/ Temporarily commented out to avoid cross-stack reference issues during bucket rename\n\/\/ grantS3BucketAccess\(\{[\s\S]*?\}\),\n/,
			`grantS3BucketAccess({
	role: vercelOidcStack.role,
	buckets: [
		umbro.storage.profileBucket,
		umbro.storage.assetsBucket,
	],
})`
		)
		console.log('✅ Re-enabled S3 permissions in app.ts')
	} else {
		// Disable S3 permissions
		content = content.replace(
			/grantS3BucketAccess\(\{[\s\S]*?\}\),\n/,
			`// Temporarily commented out to avoid cross-stack reference issues during bucket rename
// grantS3BucketAccess({
// 	role: vercelOidcStack.role,
// 	buckets: [
// 		umbro.storage.profileBucket,
// 		umbro.storage.assetsBucket,
// 	],
// })
`
		)
		console.log('✅ Disabled S3 permissions in app.ts')
	}
	
	writeFileSync(appPath, content)
}

async function main() {
	console.log('🔄 Starting staged deployment for bucket rename...')
	console.log(`📋 Stage: ${STAGE}`)
	
	// Step 1: Deploy UmbroVercelOIDC without S3 permissions
	console.log('\n📋 Step 1: Deploying UmbroVercelOIDC without S3 permissions...')
	updateAppFile(false)
	
	if (!runCommand(`npm run cdk -- --app '${CDK_APP}' deploy UmbroVercelOIDC --require-approval never`, 'Deploy UmbroVercelOIDC')) {
		console.error('❌ Failed to deploy UmbroVercelOIDC')
		process.exit(1)
	}
	
	// Step 2: Deploy Umbro with new bucket names
	console.log('\n📋 Step 2: Deploying Umbro with new bucket names...')
	
	if (!runCommand(`npm run cdk -- --app '${CDK_APP}' deploy Umbro --require-approval never`, 'Deploy Umbro')) {
		console.error('❌ Failed to deploy Umbro')
		process.exit(1)
	}
	
	// Step 3: Re-enable S3 permissions and deploy both together
	console.log('\n📋 Step 3: Re-enabling S3 permissions and deploying both stacks...')
	updateAppFile(true)
	
	if (!runCommand(`npm run cdk -- --app '${CDK_APP}' deploy --require-approval never --all`, 'Deploy both stacks with S3 permissions')) {
		console.error('❌ Failed to deploy both stacks')
		process.exit(1)
	}
	
	console.log('\n🎉 Staged deployment completed successfully!')
	console.log('✅ New bucket names are deployed')
	console.log('✅ S3 permissions are restored')
	console.log('✅ Vercel OIDC role has access to new buckets')
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error)
}
