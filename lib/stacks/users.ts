import type { StackProps } from 'aws-cdk-lib'
import type { Role } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

import { Stack } from 'aws-cdk-lib'

import { developerEmails } from '../structures.js'
import { createGroup, createSecureRole, createSecureUser } from '../constructs/iam.js'
import { grantAssumeRole } from '../utils/iam.js'
import {
	grantCloudFormationReadPermissions,
	grantDynamoDbReadPermissions,
	grantIamReadPermissions,
	grantSecretsManagerReadPermissions,
} from '../utils/permissions.js'

/**
 * Stack that creates IAM users, groups, and roles for Umbro project access.
 */
export class UsersStack extends Stack {
	adminRole!: Role
	developersRole!: Role

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		// Create admin group and role
		const adminGroup = createGroup(this, 'UmbroAdministrators')
		this.adminRole = createSecureRole(this, 'UmbroAdministrators')
		grantAssumeRole(adminGroup, this.adminRole.roleArn)
		grantCloudFormationReadPermissions(this.adminRole)
		grantDynamoDbReadPermissions(this.adminRole)
		grantIamReadPermissions(this.adminRole)
		grantSecretsManagerReadPermissions(this.adminRole)

		// Create developers group and role
		const developersGroup = createGroup(this, 'UmbroDevelopers')
		this.developersRole = createSecureRole(this, 'UmbroDevelopers')
		grantAssumeRole(developersGroup, this.developersRole.roleArn)
		grantCloudFormationReadPermissions(this.developersRole)
		grantDynamoDbReadPermissions(this.developersRole)
		grantIamReadPermissions(this.developersRole)
		grantSecretsManagerReadPermissions(this.developersRole)

		// Create users for each developer email
		for (const email of developerEmails) {
			createSecureUser(this, `${email.split('@')[0]}-umbro`, email, [
				adminGroup,
				developersGroup,
			])
		}
	}
}
