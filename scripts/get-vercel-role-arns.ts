#!/usr/bin/env node

/**
 * Script to retrieve Vercel OIDC role ARNs from deployed CloudFormation stack
 * 
 * Usage: npx tsx scripts/get-vercel-role-arns.ts
 * 
 * This script helps you get the role ARNs to configure in your Vercel project
 * environment variables.
 */

import { CloudFormationClient, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation'

async function getVercelRoleArns() {
	const client = new CloudFormationClient({})
	const stackName = 'UmbroVercelOIDC'

	try {
		console.log(`Fetching Vercel OIDC role ARNs from stack: ${stackName}`)
		console.log('='.repeat(60))

		const command = new DescribeStackResourcesCommand({
			StackName: stackName,
		})

		const response = await client.send(command)
		const resources = response.StackResources || []

		// Filter for IAM roles that match our naming pattern
		const vercelRoles = resources.filter(resource => 
			resource.ResourceType === 'AWS::IAM::Role' &&
			resource.LogicalResourceId?.includes('VercelDeploy')
		)

		if (vercelRoles.length === 0) {
			console.log('❌ No Vercel OIDC roles found in the stack.')
			console.log('Make sure the stack has been deployed successfully.')
			return
		}

		console.log('📋 Vercel OIDC Role ARNs:')
		console.log('')

		const stages = ['alpha', 'beta', 'prod']
		
		for (const stage of stages) {
			const role = vercelRoles.find(r => 
				r.LogicalResourceId?.toLowerCase().includes(stage.toLowerCase())
			)
			
			if (role) {
				console.log(`🔑 ${stage.toUpperCase()} Environment:`)
				console.log(`   Role Name: ${role.PhysicalResourceId}`)
				console.log(`   Role ARN:  arn:aws:iam::${await getAccountId()}:role/${role.PhysicalResourceId}`)
				console.log('')
			}
		}

		console.log('💡 Next Steps:')
		console.log('1. Copy the role ARN for each environment')
		console.log('2. In your Vercel project settings, add environment variables:')
		console.log('   - Set AWS_ROLE_ARN to the appropriate role ARN for each environment')
		console.log('   - Set AWS_REGION to your AWS region')
		console.log('3. Deploy your Vercel project to test the OIDC integration')

	} catch (error) {
		console.error('❌ Error fetching role ARNs:', error)
		console.log('')
		console.log('Make sure:')
		console.log('- AWS credentials are configured')
		console.log('- The UmbroVercelOIDC stack has been deployed')
		console.log('- You have permission to describe CloudFormation stacks')
	}
}

async function getAccountId(): Promise<string> {
	try {
		const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts')
		const stsClient = new STSClient({})
		const identity = await stsClient.send(new GetCallerIdentityCommand({}))
		return identity.Account || 'UNKNOWN'
	} catch {
		return 'UNKNOWN'
	}
}

// Run the script
getVercelRoleArns().catch(console.error)