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
	readonly stage: string
	readonly issuerMode?: 'team' | 'global'
}

/**
 * Stack that creates Vercel OIDC provider for secure application access for a single stage.
 */
export class VercelOpenIDConnectStack extends Stack {
	public readonly role: Role

	constructor(scope: Construct, id: string, props: VercelOpenIDConnectStackProps) {
		super(scope, id, props)

		const {
			maxSessionDuration = Duration.hours(6),
			teamSlug,
			projectName,
			stage,
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

		const roleName = `VercelApp${stage.charAt(0).toUpperCase()}${stage.slice(1)}`
		
		// Create trust policy conditions for this specific stage
		const conditions: Conditions = {
			StringEquals: {
				[`${vercelOidcUrl.replace('https://', '')}:aud`]: audienceValue,
				[`${vercelOidcUrl.replace('https://', '')}:sub`]: `owner:${teamSlug}:project:${projectName}:environment:${stage}`,
			},
		}

		// Create role for this stage only
		this.role = new Role(this, `Umbro${roleName}`, {
			assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, conditions),
			description: `Vercel application role for ${stage} environment`,
			maxSessionDuration,
			roleName,
		})

		// Grant necessary permissions for application runtime
		grantDynamoDbWritePermissions(this.role)
		grantSsmParameterStoreReadPermissions(this.role)

		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY)
	}

	/**
	 * Get role ARN for the current stage
	 */
	getRoleArn(): string {
		return this.role.roleArn
	}
}