import type { Group, Role, User } from 'aws-cdk-lib/aws-iam'

import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'

const mfaActions = [
	'sts:GetSessionToken',
	'iam:ChangePassword',
	'iam:CreateVirtualMFADevice',
	'iam:EnableMFADevice',
	'iam:DeactivateMFADevice',
	'iam:DeleteVirtualMFADevice',
	'iam:ListMFADevices',
	'iam:ResyncMFADevice',
	'iam:GetUser',
]

/**
 * Denies all actions if MFA is not present for the specified IAM entity.
 */
export function denyNoMfaPolicy(entity: Group | Role | User): void {
	const denyMfaPolicy = new PolicyStatement({
		conditions: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Bool: { 'aws:MultiFactorAuthPresent': 'false' },
		},
		effect: Effect.DENY,
		notActions: [...mfaActions, 'sts:AssumeRole'],
		resources: ['*'],
	})

	entity.addToPolicy(denyMfaPolicy)
}

/**
 * Grants permissions for a user to enable and manage their own MFA.
 */
export function grantMfaPermissions(user: User): void {
	const resources = [`arn:aws:iam::${user.env.account}:mfa/*`, user.userArn]

	const mfaManagementPolicy = new PolicyStatement({
		actions: mfaActions,
		effect: Effect.ALLOW,
		resources,
	})

	user.addToPolicy(mfaManagementPolicy)
}
