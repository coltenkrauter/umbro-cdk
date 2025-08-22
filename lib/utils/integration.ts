import type { Role } from 'aws-cdk-lib/aws-iam'
import type { Table } from 'aws-cdk-lib/aws-dynamodb'
import type { Bucket } from 'aws-cdk-lib/aws-s3'

/**
 * Utility functions for granting permissions between OIDC roles and resources
 */

export interface GrantDynamoDBAccessOptions {
    role: Role
    tables: Table[]
    permissions?: 'read' | 'write' | 'readwrite'
}

/**
 * Grant DynamoDB access to OIDC role
 */
export function grantDynamoDBAccess(options: GrantDynamoDBAccessOptions): void {
    const { role, tables, permissions = 'readwrite' } = options

    const grantMethod = permissions === 'read'
        ? 'grantReadData'
        : permissions === 'write'
        ? 'grantWriteData'
        : 'grantReadWriteData'

    for (const table of tables) {
        table[grantMethod](role)
    }
}

export interface GrantS3BucketAccessOptions {
    role: Role
    buckets: Bucket[]
    permissions?: 'read' | 'write' | 'readwrite'
}

/**
 * Grant S3 bucket access to OIDC role
 */
export function grantS3BucketAccess(options: GrantS3BucketAccessOptions): void {
    const { role, buckets, permissions = 'readwrite' } = options

    for (const bucket of buckets) {
        if (permissions === 'read' || permissions === 'readwrite') {
            bucket.grantRead(role)
        }
        if (permissions === 'write' || permissions === 'readwrite') {
            bucket.grantWrite(role)
        }
    }
}

