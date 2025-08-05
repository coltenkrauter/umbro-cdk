import type { PrincipalBase } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

import { RemovalPolicy, Stack, Tags } from 'aws-cdk-lib'
import { AccountPrincipal, Group, ManagedPolicy, Role, User } from 'aws-cdk-lib/aws-iam'

import { denyNoMfaPolicy, grantMfaPermissions } from '../utils/security.js'
import { createPasswordSecret } from './secrets.js'

/**
 * Creates an IAM Group with specified managed policies and enforces MFA.
 */
export function createGroup(scope: Construct, groupName: string, managedPolicies?: string[]): Group {
	const group = new Group(scope, `${groupName}Group`, { groupName })
	group.applyRemovalPolicy(RemovalPolicy.DESTROY)

	managedPolicies?.forEach((policyName) => {
		group.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(policyName))
	})
	denyNoMfaPolicy(group)

	return group
}

/**
 * Creates a secure IAM role with MFA enforcement.
 */
export function createSecureRole(scope: Construct, roleName: string, assumedBy?: PrincipalBase): Role {
	const accountId = Stack.of(scope).account
	const role = new Role(scope, `${roleName}Role`, {
		assumedBy: assumedBy ?? new AccountPrincipal(accountId),
		description: `Secure role that can be assumed by users in account ${accountId}`,
		roleName,
	})
	role.applyRemovalPolicy(RemovalPolicy.DESTROY)

	return role
}

/**
 * Creates a secure IAM User with console access and MFA enforcement.
 */
export function createSecureUser(scope: Construct, userName: string, email: string, groups?: Group[]): User {
	const passwordSecret = createPasswordSecret(scope, `${userName}-InitialPassword`)

	const user = new User(scope, `${userName}User`, {
		password: passwordSecret.secretValue,
		passwordResetRequired: true,
		userName,
	})
	user.applyRemovalPolicy(RemovalPolicy.DESTROY)

	Tags.of(user).add('email', email)

	groups?.forEach((group) => {
		group.addUser(user)
	})

	grantMfaPermissions(user)
	denyNoMfaPolicy(user)

	return user
}
