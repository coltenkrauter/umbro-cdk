import type { Environment, StackProps } from 'aws-cdk-lib'
import type { Conditions } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { OpenIdConnectProvider, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam'
import { Stage } from '@krauters/structures'

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
	readonly stage: Stage
	readonly issuerMode?: 'team' | 'global'
}

function mapStageToVercelEnvironment(stage: Stage): string[] {
	switch (stage) {
		case Stage.Alpha:
			return ['development', 'preview']
		case Stage.Production:
			return ['production']
		default:
			return [stage.toLowerCase()]
	}
}

function createSubjectClaim(teamSlug: string, projectName: string, environment: string): string {
	return ['owner', teamSlug, 'project', projectName, 'environment', environment].join(':')
}

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

		const isTeamMode = issuerMode === 'team'
		const vercelOidcUrl = isTeamMode 
			? `https://oidc.vercel.com/${teamSlug}`
			: 'https://oidc.vercel.com'
		
		const audienceValue = `https://vercel.com/${teamSlug}`

		const provider = new OpenIdConnectProvider(this, 'vercelProvider', {
			clientIds: [audienceValue],
			url: vercelOidcUrl,
		})

		const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1)
		const roleName = `VercelApp${stageCapitalized}`
		
		const vercelEnvironments = mapStageToVercelEnvironment(stage)
		console.log(`🔧 [OIDC] Stage '${stage}' mapped to Vercel environments: [${vercelEnvironments.join(', ')}]`)
		
		const oidcUrlWithoutProtocol = vercelOidcUrl.replace('https://', '')
		const conditions: Conditions = {
			StringEquals: {
				[`${oidcUrlWithoutProtocol}:aud`]: audienceValue,
			},
		}

		const subKey = `${oidcUrlWithoutProtocol}:sub`
		const subjectClaims = vercelEnvironments.map(env => createSubjectClaim(teamSlug, projectName, env))
		
		const stringEquals = conditions.StringEquals as Record<string, string | string[]>
		stringEquals[subKey] = subjectClaims.length === 1 ? subjectClaims[0] : subjectClaims

		const roleDescription = `Vercel application role for ${stage} environment (allows: ${vercelEnvironments.join(', ')})`

		this.role = new Role(this, `Umbro${roleName}`, {
			assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, conditions),
			description: roleDescription,
			maxSessionDuration,
			roleName,
		})

		grantDynamoDbWritePermissions(this.role)
		grantSsmParameterStoreReadPermissions(this.role)

		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY)

		// CloudFormation output for Vercel role ARN
		new CfnOutput(this, 'VercelRoleArn', {
			value: this.role.roleArn,
			description: 'Vercel OIDC Role ARN',
			exportName: `VercelOIDC-${stage}-RoleArn`
		})
	}

	getRoleArn(): string {
		return this.role.roleArn
	}
}