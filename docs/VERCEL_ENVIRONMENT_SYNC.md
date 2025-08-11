# Vercel Environment Variable Synchronization

This document describes the automated synchronization of AWS CloudFormation outputs to Vercel environment variables.

## Overview

The system automatically updates Vercel environment variables with current AWS infrastructure values whenever CDK stacks are deployed. This ensures that your Vercel applications always have the latest AWS resource identifiers and configuration.

## Architecture

```
GitHub Actions → Deploy CDK → Read CF Outputs → Update Vercel Env Vars
```

### Flow

1. **Trigger**: Push to `main` (alpha) or tag push (production)
2. **Deploy**: CDK stacks are deployed to AWS
3. **Extract**: CloudFormation outputs are read
4. **Sync**: Vercel environment variables are updated via API

## Environment Mapping

| Stage | GitHub Event | Vercel Targets |
|-------|-------------|----------------|
| Alpha | Push to `main` | `preview`, `development` |
| Production | Tag push (`*.*.*`) | `production` |

## CloudFormation Outputs

The following outputs are automatically synced:

### UmbroStack Outputs
- `AccountId` → `AWS_ACCOUNT_ID`
- `Region` → `AWS_REGION`
- `UsersTableName` → `TABLE_NAME_USERS`
- `ServiceTokensTableName` → `TABLE_NAME_SERVICE_TOKENS`
- `RateLimitTableName` → `TABLE_NAME_RATE_LIMIT`
- `ApplicationsTableName` → `TABLE_NAME_APPLICATIONS`
- `EnvironmentsTableName` → `TABLE_NAME_ENVIRONMENTS`
- `TeamsTableName` → `TABLE_NAME_TEAMS`
- `TeamMembershipsTableName` → `TABLE_NAME_TEAM_MEMBERSHIPS`
- `RequestsTableName` → `TABLE_NAME_REQUESTS`
- `RequestCommentsTableName` → `TABLE_NAME_REQUEST_COMMENTS`
- `AccessGrantsTableName` → `TABLE_NAME_ACCESS_GRANTS`
- `VisitorsTableName` → `TABLE_NAME_VISITORS`

### UmbroVercelOIDC Outputs
- `VercelRoleArn` → `AWS_ROLE_ARN`

## Prerequisites

### GitHub Secrets

Configure these secrets in your repository settings:

```bash
VERCEL_TOKEN=your_vercel_api_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id
# Seeds used to derive NEXTAUTH_SECRET per environment
NEXTAUTH_SEED_ALPHA=32+_character_random_seed_for_alpha
NEXTAUTH_SEED_PRODUCTION=32+_character_random_seed_for_production
```

### GitHub Variables

Configure these variables per environment (Alpha/Production):

```bash
AWS_ACCOUNT_ID=123456789012
```

### AWS IAM Role

Ensure your GitHub deployment role has CloudFormation read permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks"
      ],
      "Resource": [
        "arn:aws:cloudformation:*:*:stack/UmbroStack/*",
        "arn:aws:cloudformation:*:*:stack/UmbroVercelOIDC/*"
      ]
    }
  ]
}
```

## Manual Usage

You can manually run the environment sync script:

```bash
# Set required environment variables
export VERCEL_TOKEN="your_token"
export VERCEL_PROJECT_ID="your_project_id"
export VERCEL_TEAM_ID="your_team_id"
export TARGETS="preview,development"

# Run the sync
npm run update-vercel-env
```

## Security Considerations

- **Least Privilege**: The script only reads CloudFormation outputs
- **No Secrets Logged**: Sensitive values are never logged to console
- **Idempotent**: Uses upsert to safely update existing variables
- **Fail Fast**: Script exits immediately on any error

## Verification

After deployment, verify the sync worked:

1. **Vercel Dashboard**: Check project settings → Environment Variables
2. **API Health Check**: Hit `/api/health` endpoint to test DynamoDB connectivity
3. **Logs**: Review GitHub Actions logs for any errors

## Troubleshooting

### Common Issues

**Missing CloudFormation Outputs**
```
Error: Could not find required CloudFormation stacks
```
- Ensure stacks are deployed before running sync
- Check stack names match expected values

**Wrong Vercel Targets**
```
Environment variables not showing in expected environments
```
- Verify `TARGETS` mapping in workflow
- Check Vercel project settings

**IAM Permission Issues**
```
Access denied reading CloudFormation
```
- Verify GitHub role has `cloudformation:DescribeStacks` permission
- Check stack ARN patterns in IAM policy

**Stale Outputs**
```
Environment variables have old values
```
- Ensure sync runs after CDK deployment
- Check CloudFormation stack update status

### Debug Mode

Enable verbose logging by setting:

```bash
export DEBUG=true
```

## Adding New Environment Variables

To add new environment variables:

1. **Add CDK Output**: Update stack to export new value
2. **Update Script**: Add mapping in `createEnvironmentVariables()`
3. **Test**: Deploy and verify sync works

Example:

```typescript
// In your CDK stack
new CfnOutput(this, 'NewTableName', {
  value: this.newTable.tableName,
  description: 'New table name',
  exportName: `UmbroStack-${stage}-NewTableName`
})
```

```typescript
// In update-vercel-env.ts
if (outputs.NewTableName) {
  envVars.push({
    key: 'NEW_TABLE_NAME',
    value: outputs.NewTableName,
    target: this.targets,
    type: 'plain'
  })
}
```

## NextAuth secret management

- The sync script derives `NEXTAUTH_SECRET` (and sets `AUTH_SECRET` for compatibility) from per-environment seeds using HMAC-SHA256
- Inputs: `NEXTAUTH_SEED_ALPHA` for `preview,development` targets and `NEXTAUTH_SEED_PRODUCTION` for `production`
- Derivation: `hex(hmac_sha256(seed, 'umbro|nextauth|<Stage>'))`
- Keep seeds safe in GitHub Secrets; do not log or commit them
- Rotating a seed invalidates existing sessions

### Manual run example

```bash
export VERCEL_TOKEN="..."
export VERCEL_PROJECT_ID="..."
export VERCEL_TEAM_ID="..."
export TARGETS="preview,development"
export NEXTAUTH_SEED_ALPHA="your_alpha_seed"

npm run update-vercel-env
```

## Multi-Environment Support

The system supports multiple environments with different configurations:

- **Alpha**: Development and preview environments
- **Production**: Production environment only
- **Custom**: Extend by modifying target mappings

Each environment can have different:
- AWS accounts
- Vercel targets
- Environment variable values
