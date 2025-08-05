import { type Group, ManagedPolicy, type Role, type User } from 'aws-cdk-lib/aws-iam'

import { actions } from './iam-actions.js'
import { addPolicy } from './iam.js'

// OpenId Deployment
export function grantAssumeAndPassRolePermissions(role: Role): void {
	const resources = [role.roleArn, `arn:aws:iam::${role.env.account}:role/cdk-*`]
	addPolicy(role, ['sts:AssumeRole', 'iam:PassRole'], resources)
}

// CloudFormation
export function grantCloudFormationReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:cloudformation:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.cloudFormation.read, resources)
}

export function grantCloudFormationWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:cloudformation:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.cloudFormation.write, resources)
	grantCloudFormationReadPermissions(entity)
}

// CloudWatch
export function grantCloudWatchLogsPermissions(entity: Group | Role | User) {
	entity.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))
}

export function grantCloudWatchReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:cloudwatch:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.cloudWatch.read, resources)
}

export function grantCloudWatchWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:cloudwatch:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.cloudWatch.write, resources)
	grantCloudWatchReadPermissions(entity)
}

// DynamoDB
export function grantDynamoDbReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:dynamodb:${entity.env.region}:${entity.env.account}:table/*`]
	addPolicy(entity, actions.dynamoDb.read, resources)
}

export function grantDynamoDbWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:dynamodb:${entity.env.region}:${entity.env.account}:table/*`]
	addPolicy(entity, actions.dynamoDb.write, resources)
	grantDynamoDbReadPermissions(entity)
}

// IAM
export function grantIamReadPermissions(entity: Group | Role | User): void {
	const resources = [
		`arn:aws:iam::${entity.env.account}:group/*`,
		`arn:aws:iam::${entity.env.account}:policy/*`,
		`arn:aws:iam::${entity.env.account}:user/*`,
	]

	addPolicy(entity, actions.iam.read, resources)
}

export function grantIamWritePermissions(entity: Group | Role | User): void {
	const resources = [
		`arn:aws:iam::${entity.env.account}:group/*`,
		`arn:aws:iam::${entity.env.account}:policy/*`,
		`arn:aws:iam::${entity.env.account}:user/*`,
	]

	addPolicy(entity, actions.iam.write, resources)
	grantIamReadPermissions(entity)
}

// S3
export function grantS3ReadPermissions(entity: Group | Role | User): void {
	const resources = [
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}`,
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}/*`,
	]
	addPolicy(entity, actions.s3.read, resources)
}

export function grantS3WritePermissions(entity: Group | Role | User): void {
	const resources = [
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}`,
		`arn:aws:s3:::cdk-assets-${entity.env.account}-${entity.env.region}/*`,
	]
	addPolicy(entity, actions.s3.write, resources)
	grantS3ReadPermissions(entity)
}

// Secret Manager
export function grantSecretsManagerReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:secretsmanager:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.secretsManager.read, resources)
}

export function grantSecretsManagerWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:secretsmanager:${entity.env.region}:${entity.env.account}:*`]
	addPolicy(entity, actions.secretsManager.write, resources)
	grantSecretsManagerReadPermissions(entity)
}

// SSM
export function grantSsmParameterStoreReadPermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:ssm:${entity.env.region}:${entity.env.account}:parameter/cdk-bootstrap/*/version`]
	addPolicy(entity, actions.ssm.read, resources)
}

export function grantSsmParameterStoreWritePermissions(entity: Group | Role | User): void {
	const resources = [`arn:aws:ssm:${entity.env.region}:${entity.env.account}:parameter/cdk-bootstrap/*`]
	addPolicy(entity, actions.ssm.write, resources)
	grantSsmParameterStoreReadPermissions(entity)
}
