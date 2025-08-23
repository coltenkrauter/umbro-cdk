# umbro-cdk

This repository contains an AWS CDK package written in TypeScript that manages the AWS infrastructure required to support the Umbro application. **This package only handles AWS infrastructure via CDK - the actual application is deployed on Vercel for ease and cost reduction.**

## What This Package Does

This package provides:
- **AWS Infrastructure as Code** - DynamoDB tables, IAM roles, security policies
- **Vercel OIDC Integration** - Secure deployments from Vercel to AWS
- **Backend Services** - Database, authentication, and API infrastructure

## What This Package Does NOT Do

This package does NOT contain:
- **Frontend Application Code** - That's in the main [umbro](https://github.com/coltenkrauter/umbro) repository
- **Vercel Deployment** - The app is deployed on Vercel, this just provides AWS backend
- **Application Logic** - Business logic is in the main application repository

## Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Local Development

For local development with DynamoDB and S3, see [DEVELOPER.md](docs/DEVELOPER.md) for complete setup instructions.

## Account Provisioning & GitHub OIDC

**Important**: Account provisioning and GitHub OIDC configuration are now handled automatically by the [Venice](https://github.com/coltenkrauter/venice) package. Venice is a CDK automation repository that uses GitHub Actions to configure accounts and set up GitHub OIDC providers automatically.

This means you no longer need to manually set up AWS accounts or configure GitHub OIDC - Venice handles all of that infrastructure automatically.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure AWS Credentials**
   ```bash
   aws configure
   # Set region to us-east-1 and provide your access keys
   ```

3. **Deploy Infrastructure**
   ```bash
   # Development environment
   export STAGE=dev
   npm run deploy-all

   # Staging environment  
   export STAGE=staging
   npm run deploy-all

   # Production environment
   export STAGE=prod
   npm run deploy-all
   ```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed deployment guide.

## What You Need to Deploy

Since Venice handles account provisioning and GitHub OIDC, you only need to deploy the application-specific infrastructure:

- **UmbroVercelOIDC** - Vercel OIDC provider for multi-environment deployments  
- **UmbroPasswordPolicy** - Account password requirements
- **UmbroSecurityMonitoring** - CloudTrail and security alerts
- **UmbroUsers** - IAM users, groups, and roles
- **UmbroStack** - DynamoDB tables (users, service-tokens)

## Available Scripts

### Infrastructure
- `npm run build` - Compile TypeScript
- `npm run synth` - Synthesize CloudFormation templates
- `npm run diff` - Show differences between deployed stack and current code
- `npm run deploy` - Deploy single stack
- `npm run deploy-all` - Deploy all stacks
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (currently just linting)

### Local Development
- `npm run dev:dynamo:start` - Start local DynamoDB
- `npm run dev:dynamo:bootstrap` - Setup DynamoDB tables
- `npm run dev:s3:start` - Start local S3 (MinIO)
- `npm run dev:s3:bootstrap` - Setup S3 buckets

*Note: Local development scripts are in the main [umbro](https://github.com/coltenkrauter/umbro) repository*

## Infrastructure Components

### OIDC Providers
- **Vercel OIDC** - Multi-environment deployments (alpha, beta, prod) from Vercel

### DynamoDB Tables
- **umbro-users** - User accounts with email GSI for authentication
- **umbro-service-tokens** - API service tokens with composite key (user_id, token_name)

All tables use pay-per-request billing and have point-in-time recovery enabled.

### Security & Monitoring
- Password policies and user management
- Security monitoring and alerting

## Project Structure

```
lib/
├── app.ts                          # Main CDK app entry point
├── config.ts                       # Configuration and environment settings
├── structures.ts                   # Shared enums and interfaces
├── stacks/                         # CDK stack definitions
│   ├── vercel-open-id-connect.ts   # Vercel OIDC provider
│   ├── umbro-stack.ts              # DynamoDB infrastructure
│   ├── users.ts                    # User management
│   ├── password-policy.ts          # AWS password policies
│   └── security-monitoring.ts      # Security alerts and monitoring
├── constructs/                     # Custom CDK constructs
│   ├── iam.ts                      # IAM-related constructs
│   └── secrets.ts                  # Secrets management
└── utils/                          # Utility functions
    ├── permissions.ts              # Permission granting utilities
    ├── iam.ts                      # IAM utilities
    └── security.ts                 # Security utilities
```

## Configuration

The project includes a `cdk.json` file with:
- **Telemetry disabled** - No usage data sent to AWS
- **Notices disabled** - No promotional messages
- **Stack export compatibility** - For cross-stack references

## Environment Variables

### Required
- `CDK_DEFAULT_ACCOUNT` - AWS account ID (required)

### Optional
- `CDK_DEFAULT_REGION` - AWS region (defaults to us-east-1)
- `STAGE` - Deployment stage (defaults to 'dev')
- `VERCEL_TEAM_SLUG` - Your Vercel team slug (defaults to 'your-team-slug')
- `VERCEL_PROJECT_NAME` - Your Vercel project name (defaults to 'umbro')

## Vercel OIDC Configuration

The Vercel OIDC stack creates separate IAM roles for each environment (alpha, beta, prod). After deployment, you'll need to:

1. **Set Environment Variables in Vercel**: Add the following environment variables to your Vercel project for each environment:
   - `AWS_ROLE_ARN` - The ARN of the IAM role for the respective environment
   - `AWS_REGION` - Your AWS region

2. **Configure Vercel Project Settings**: Ensure your Vercel project name matches the `VERCEL_PROJECT_NAME` environment variable.

3. **Role ARNs**: The created roles will have names like:
   - `VercelDeployAlpha` - For alpha environment
   - `VercelDeployBeta` - For beta environment  
   - `VercelDeployProd` - For production environment

Example usage in Vercel functions:
```typescript
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
  }),
})
```

### Helper Scripts

After deploying the Vercel OIDC stack, you can use the included helper script to retrieve the role ARNs:

```bash
npx tsx scripts/get-vercel-role-arns.ts
```

This script will output the role ARNs for each environment, making it easy to configure your Vercel project's environment variables.

## Development

The project is structured to be simple and extensible. Add new DynamoDB tables or other AWS resources in the `UmbroStack` class as needed.

## Related Repositories

- **[umbro](https://github.com/coltenkrauter/umbro)** - Main application (deployed on Vercel)
- **[venice](https://github.com/coltenkrauter/venice)** - Account provisioning and GitHub OIDC automation

## License

MIT