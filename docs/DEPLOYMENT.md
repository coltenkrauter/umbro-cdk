# Deployment Guide

This guide explains what you need to deploy new stacks now that account provisioning and GitHub OIDC are handled by the [Venice](https://github.com/coltenkrauter/venice) package.

**Note**: This package only handles AWS infrastructure. The actual application is deployed on Vercel from the main [umbro](https://github.com/coltenkrauter/umbro) repository.

## What Venice Handles

Venice automatically configures:
- **AWS Account Provisioning** - Account setup and configuration
- **GitHub OIDC Provider** - Secure GitHub Actions deployments
- **Account-level Security** - IAM users, roles, and security policies
- **GitHub Repository Variables** - AWS account ID and region are automatically added

## What This Package Deploys (AWS Infrastructure)

The umbro-cdk package deploys AWS backend infrastructure:

- **UmbroVercelOIDC** - Vercel OIDC provider for multi-environment deployments
- **UmbroPasswordPolicy** - Account password requirements  
- **UmbroSecurityMonitoring** - CloudTrail and security alerts
- **UmbroUsers** - IAM users, groups, and roles
- **UmbroStack** - DynamoDB tables (users, sessions, service-tokens)

## What You Need to Deploy

Since Venice handles the account-level infrastructure, you only need to ensure:

### 1. Environment Variables
Set these in your GitHub repository (handled by Venice):
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `AWS_REGION` - Your AWS region (defaults to us-east-1)

### 2. Deployment Environment
Set the deployment stage:
```bash
export STAGE=dev    # or staging, prod
```

### 3. Deploy Application Infrastructure
```bash
npm run deploy-all
```

## Application Deployment

The actual application is deployed separately:

1. **AWS Infrastructure** - Deploy using this package (`npm run deploy-all`)
2. **Vercel Application** - Deploy from the main [umbro](https://github.com/coltenkrauter/umbro) repository
3. **Connect Vercel to AWS** - Configure environment variables in Vercel project

## GitHub Actions Deployment

Since Venice configures GitHub OIDC, you can deploy AWS infrastructure directly from GitHub Actions:

```yaml
name: Deploy AWS Infrastructure
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run deploy-all
        env:
          STAGE: ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
```

## Adding New Resources

To add new AWS resources:

1. **Add to existing stack** - Modify the appropriate stack in `lib/stacks/`
2. **Create new stack** - Add a new stack file and import it in `lib/app.ts`
3. **Update permissions** - Grant necessary permissions in `lib/utils/`

## Vercel Integration

After deploying AWS infrastructure, configure Vercel to connect to AWS:

1. **Get Role ARNs**: `npx tsx scripts/get-vercel-role-arns.ts`
2. **Add to Vercel**: Set environment variables in your Vercel project:
   - `AWS_ROLE_ARN` - The ARN for the respective environment
   - `AWS_REGION` - Your AWS region

## Troubleshooting

### Missing AWS Account ID
If you get errors about missing AWS account ID, ensure Venice has been run to provision your account and configure GitHub repository variables.

### Missing GitHub OIDC
If GitHub Actions deployments fail, ensure Venice has configured the GitHub OIDC provider for your repository.

### Permission Errors
If you get permission errors, ensure Venice has set up the necessary IAM roles and policies for your account.

### Vercel Connection Issues
If Vercel can't connect to AWS, ensure:
1. AWS infrastructure is deployed
2. Vercel environment variables are set correctly
3. Role ARNs are valid and have proper permissions 