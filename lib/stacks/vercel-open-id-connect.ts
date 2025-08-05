import type { Environment, StackProps } from 'aws-cdk-lib'
import type { Conditions } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { OpenIdConnectProvider, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam'

import {
	grantAssumeAndPassRolePermissions,
	grantCloudFormationWritePermissions,
	grantDynamoDbWritePermissions,
	grantS3WritePermissions,
	grantSsmParameterStoreReadPermissions,
} from '../utils/permissions.js'

export interface VercelOpenIDConnectStackProps extends StackProps {
	readonly env: Environment
	readonly maxSessionDuration?: Duration
	readonly teamSlug: string
	readonly projectName: string
	readonly stages?: string[]
	readonly issuerMode?: 'team' | 'global'
}

/**
 * Stack that creates Vercel OIDC provider for secure deployments across multiple environments.
 */
export class VercelOpenIDConnectStack extends Stack {
	roles!: Record<string, Role>

	constructor(scope: Construct, id: string, props: VercelOpenIDConnectStackProps) {
		super(scope, id, props)

		const {
			maxSessionDuration = Duration.hours(6),
			teamSlug,
			projectName,
			stages = ['alpha', 'beta', 'prod'],
			issuerMode = 'team',
		} = props

		// Create OIDC provider
		const vercelOidcUrl = issuerMode === 'team' 
			? `https://oidc.vercel.com/${teamSlug}`
			: 'https://oidc.vercel.com'
		
		const audienceValue = `https://vercel.com/${teamSlug}`

		const provider = new OpenIdConnectProvider(this, 'vercelProvider', {
			clientIds: [audienceValue],
			url: vercelOidcUrl,
		})

		// Initialize roles record
		this.roles = {}

		// Create a role for each stage
		for (const stage of stages) {
			const roleName = `VercelDeploy${stage.charAt(0).toUpperCase()}${stage.slice(1)}`
			
			// Create trust policy conditions for this specific stage
			const conditions: Conditions = {
				StringEquals: {
					[`${vercelOidcUrl.replace('https://', '')}:aud`]: audienceValue,
					[`${vercelOidcUrl.replace('https://', '')}:sub`]: `owner:${teamSlug}:project:${projectName}:environment:${stage}`,
				},
			}

			// Create role for this stage
			const role = new Role(this, `Umbro${roleName}`, {
				assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, conditions),
				description: `Vercel deployment role for ${stage} environment`,
				maxSessionDuration,
				roleName,
			})

			// Grant necessary permissions for deployments
			grantAssumeAndPassRolePermissions(role)
			grantCloudFormationWritePermissions(role)
			grantDynamoDbWritePermissions(role)
			grantS3WritePermissions(role)
			grantSsmParameterStoreReadPermissions(role)

			role.applyRemovalPolicy(RemovalPolicy.DESTROY)

			// Store the role in our record
			this.roles[stage] = role
		}
	}

	/**
	 * Get role ARN for a specific stage
	 */
	getRoleArn(stage: string): string {
		const role = this.roles[stage]
		if (!role) {
			throw new Error(`Role for stage '${stage}' not found`)
		}
		return role.roleArn
	}

	/**
	 * Get all role ARNs as a record
	 */
	getAllRoleArns(): Record<string, string> {
		const arns: Record<string, string> = {}
		for (const [stage, role] of Object.entries(this.roles)) {
			arns[stage] = role.roleArn
		}
		return arns
	}
}