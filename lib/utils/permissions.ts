import { Effect, PolicyStatement, type Group, type Role, type User } from 'aws-cdk-lib/aws-iam'

/**
 * Helper function to add a policy to an IAM entity
 */
function addPolicy(
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

// Action definitions (only the ones we need)
const actions = {
	cloudFormation: {
		read: [
			'cloudformation:DescribeStackEvents',
			'cloudformation:DescribeStackResources',
			'cloudformation:DescribeStacks',
			'cloudformation:GetTemplate',
			'cloudformation:ListStacks',
			'cloudformation:ListStackResources',
		],
		write: [
			'cloudformation:CreateStack',
			'cloudformation:DeleteStack',
			'cloudformation:ExecuteChangeSet',
			'cloudformation:UpdateStack',
			'cloudformation:ValidateTemplate',
		],
	},
	dynamoDb: {
		read: [
			'dynamodb:BatchGetItem',
			'dynamodb:DescribeTable',
			'dynamodb:GetItem',
			'dynamodb:Query',
			'dynamodb:Scan',
		],
		write: [
			'dynamodb:BatchWriteItem',
			'dynamodb:DeleteItem',
			'dynamodb:PutItem',
			'dynamodb:UpdateItem',
		],
	},
	s3: {
		read: [
			's3:GetObject',
			's3:ListBucket',
		],
		write: [
			's3:DeleteObject',
			's3:PutObject',
		],
	},
	ssm: {
		read: [
			'ssm:DescribeParameters',
			'ssm:GetParameter',
			'ssm:GetParameters',
			'ssm:GetParametersByPath',
		],
	},
}

// Functions used by vercel-open-id-connect.ts
export function grantAssumeAndPassRolePermissions(role: Role): void {
	const resources = [role.roleArn, `arn:aws:iam::${role.env.account}:role/cdk-*`]
	addPolicy(role, ['sts:AssumeRole', 'iam:PassRole'], resources)
}

export function grantCloudFormationWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:cloudformation:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.cloudFormation.write, resources)
	addPolicy(entity, actions.cloudFormation.read, resources)
}

export function grantDynamoDbWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:dynamodb:${entity.env.region}:${entity.env.account}:table/*`]
	addPolicy(entity, actions.dynamoDb.write, resources)
	addPolicy(entity, actions.dynamoDb.read, resources)
}

export function grantS3WritePermissions(entity: Group | Role | User): void {
	const resources = [
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}`,
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}/*`,
	]
	addPolicy(entity, actions.s3.write, resources)
	addPolicy(entity, actions.s3.read, resources)
}

export function grantSsmParameterStoreReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:ssm:${entity.env.region}:${entity.env.account}:parameter/cdk-bootstrap/*/version`]
	addPolicy(entity, actions.ssm.read, resources)
}