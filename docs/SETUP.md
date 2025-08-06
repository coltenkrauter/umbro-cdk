# Umbro CDK Infrastructure Setup

This guide covers deploying the Umbro application infrastructure. **Note**: Account provisioning and GitHub OIDC configuration are now handled automatically by the [Venice](https://github.com/coltenkrauter/venice) package.

## Prerequisites

1. Install AWS CLI and configure region: `aws configure set region us-east-1`
2. Install Node.js dependencies: `npm install`
3. Ensure your AWS account has been provisioned by Venice (GitHub OIDC should already be configured)

## Deployment

```bash
# For development environment
export STAGE=dev
npm run deploy-all

# For staging environment  
export STAGE=staging
npm run deploy-all

# For production environment
export STAGE=prod
npm run deploy-all
```

## What Gets Deployed

Since Venice handles account provisioning and GitHub OIDC, you only need to deploy the application-specific infrastructure:

- **UmbroVercelOIDC** - Vercel OIDC provider for multi-environment deployments  
- **UmbroPasswordPolicy** - Account password requirements
- **UmbroSecurityMonitoring** - CloudTrail and security alerts
- **UmbroUsers** - IAM users, groups, and roles
- **UmbroStack** - DynamoDB tables (users, sessions, service-tokens)

## Post-Deployment Setup

### Vercel Setup
1. Get role ARNs: `npx tsx scripts/get-vercel-role-arns.ts`
2. Add environment variables to your Vercel project:
   - `AWS_ROLE_ARN` - The ARN for the respective environment
   - `AWS_REGION` - Your AWS region (us-east-1)

## What You Need to Deploy

Since Venice handles the account-level infrastructure, you only need to ensure:

1. **AWS Account ID** is available in your GitHub repository variables (handled by Venice)
2. **AWS Region** is configured (defaults to us-east-1)
3. **Environment Variables** are set for your deployment stage

The GitHub OIDC provider and account-level security policies are automatically configured by Venice, so you can focus on deploying just the application-specific resources.