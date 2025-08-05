import type { Environment, StackProps } from 'aws-cdk-lib'
import type { Conditions } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { OpenIdConnectProvider, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam'

import { RoleName } from '../structures.js'
import {
	grantAssumeAndPassRolePermissions,
	grantCloudFormationWritePermissions,
	grantDynamoDbWritePermissions,
	grantS3WritePermissions,
	grantSsmParameterStoreReadPermissions,
} from '../utils/permissions.js'

export interface GitHubOpenIDConnectStackProps extends StackProps {
	readonly env: Environment
	readonly maxSessionDuration?: Duration
	readonly repositoryConfig: { filter?: string; owner: string; repo: string }[]
	readonly roleName?: string
}

/**
 * Stack that creates GitHub OIDC provider for secure GitHub Actions deployments.
 */
export class GitHubOpenIDConnectStack extends Stack {
	role!: Role

	constructor(scope: Construct, id: string, props: GitHubOpenIDConnectStackProps) {
		super(scope, id, props)

		const { maxSessionDuration = Duration.hours(6), repositoryConfig, roleName = RoleName.GitHubOpenId } = props
		const githubDomain = 'token.actions.githubusercontent.com'

		const provider = new OpenIdConnectProvider(this, 'githubProvider', {
			clientIds: ['sts.amazonaws.com'],
			url: `https://${githubDomain}`,
		})

		const iamRepoDeployAccess = repositoryConfig.map((r) => `repo:${r.owner}/${r.repo}:${r.filter ?? '*'}`)

		// Grant only requests coming from specific GitHub repositories
		const conditions: Conditions = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			StringLike: {
				[`${githubDomain}:sub`]: iamRepoDeployAccess,
			},
		}

		this.role = new Role(this, `Umbro${roleName}`, {
			assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, conditions),
			description: 'GitHub Actions role for deploying Umbro with CDK.',
			maxSessionDuration,
			roleName,
		})

		// Grant necessary permissions for CDK deployments
		grantAssumeAndPassRolePermissions(this.role)
		grantCloudFormationWritePermissions(this.role)
		grantDynamoDbWritePermissions(this.role)
		grantS3WritePermissions(this.role)
		grantSsmParameterStoreReadPermissions(this.role)

		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY)
	}
}
