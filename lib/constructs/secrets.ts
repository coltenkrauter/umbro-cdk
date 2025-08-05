import type { Construct } from 'constructs'

import { RemovalPolicy } from 'aws-cdk-lib'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'

/**
 * Creates an AWS Secrets Manager secret for passwords.
 */
export function createPasswordSecret(scope: Construct, secretName: string): Secret {
	const secret = new Secret(scope, `${secretName}Secret`, {
		generateSecretString: {
			excludePunctuation: false,
			includeSpace: false,
			passwordLength: 100,
			requireEachIncludedType: true,
		},
		secretName,
	})
	secret.applyRemovalPolicy(RemovalPolicy.DESTROY)

	return secret
}
