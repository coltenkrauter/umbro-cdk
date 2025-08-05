import type { Group, Role, User } from 'aws-cdk-lib/aws-iam'

import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'

/**
 * Adds a policy to the specified IAM entity.
 */
export function addPolicy(
	entity: Group | Role | User,
	actions: string[],
	resources: string[],
	effect: Effect = Effect.ALLOW,
): void {
	const policy = new PolicyStatement({
		actions,
		effect,
		resources,
	})
	entity.addToPolicy(policy)
}

/**
 * Allows a specified IAM entity to assume a given IAM role.
 */
export function grantAssumeRole(
	entity: Group | Role | User,
	roleArn: string,
	actions: string[] = ['sts:AssumeRole'],
): void {
	const assumeRolePolicy = new PolicyStatement({
		actions,
		effect: Effect.ALLOW,
		resources: [roleArn],
	})

	entity.addToPolicy(assumeRolePolicy)
}
