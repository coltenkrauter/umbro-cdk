/**
 * Example usage of the Vercel OIDC stack
 * 
 * This shows how to use the VercelOpenIDConnectStack and access the created role ARNs
 */

import { App } from 'aws-cdk-lib'
import { VercelOpenIDConnectStack } from '../lib/stacks/vercel-open-id-connect.js'

// Example of how to use the Vercel OIDC stack
const app = new App()

const vercelOidcStack = new VercelOpenIDConnectStack(app, 'ExampleVercelOIDC', {
	env: {
		account: '123456789012',
		region: 'us-east-1',
	},
	teamSlug: 'my-team',
	projectName: 'my-project',
	stages: ['alpha', 'beta', 'prod'],
	// Optional: use global issuer mode instead of team mode
	// issuerMode: 'global',
})

// Access role ARNs after stack creation
console.log('Alpha role ARN:', vercelOidcStack.getRoleArn('alpha'))
console.log('Beta role ARN:', vercelOidcStack.getRoleArn('beta'))
console.log('Prod role ARN:', vercelOidcStack.getRoleArn('prod'))

// Get all role ARNs as an object
const allRoleArns = vercelOidcStack.getAllRoleArns()
console.log('All role ARNs:', allRoleArns)

// Example of custom stages
const customStagesStack = new VercelOpenIDConnectStack(app, 'CustomStagesOIDC', {
	env: {
		account: '123456789012',
		region: 'us-east-1',
	},
	teamSlug: 'my-team',
	projectName: 'my-project',
	stages: ['dev', 'staging', 'production'],
})