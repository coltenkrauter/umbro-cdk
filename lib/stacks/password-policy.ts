import type { StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'

import { Stack } from 'aws-cdk-lib'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources'

/**
 * Stack that enforces strong password policies account-wide.
 */
export class PasswordPolicyStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		// Strong password policy parameters
		const passwordPolicyParams = {
			AllowUsersToChangePassword: true,
			ExpirePasswords: true,
			HardExpiry: false, // Allow users to sign-in with old password to initiate reset
			MaxPasswordAge: 90,
			MinimumPasswordLength: 50,
			PasswordReusePrevention: 24,
			RequireLowercaseCharacters: true,
			RequireNumbers: true,
			RequireSymbols: true,
			RequireUppercaseCharacters: true,
		}

		// Enforce password policy using AwsCustomResource
		const functionName = 'UmbroAccountPasswordPolicy'
		const logGroup = new LogGroup(this, 'PasswordPolicyLogGroup', {
			logGroupName: `/aws/lambda/${functionName}`,
			retention: RetentionDays.THREE_MONTHS,
		})

		new AwsCustomResource(this, functionName, {
			functionName,
			logGroup,
			onUpdate: {
				action: 'updateAccountPasswordPolicy',
				parameters: passwordPolicyParams,
				physicalResourceId: PhysicalResourceId.of('UmbroAccountPasswordPolicy'),
				service: 'IAM',
			},
			policy: AwsCustomResourcePolicy.fromSdkCalls({
				resources: AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
