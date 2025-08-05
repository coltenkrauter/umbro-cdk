# umbro-cdk

This repository contains an AWS CDK package written in TypeScript that manages the complete AWS infrastructure required to support the Umbro application. It includes DynamoDB tables, OIDC providers for secure deployments, user management, and security monitoring.

## Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Bootstrap CDK (first time only)**
   ```bash
   npm run bootstrap
   ```

3. **Deploy Infrastructure**
   ```bash
   npm run deploy
   ```

## Available Scripts

- `npm run build` - Compile TypeScript
- `npm run synth` - Synthesize CloudFormation templates
- `npm run diff` - Show differences between deployed stack and current code
- `npm run deploy` - Deploy the stack
- `npm run deploy-all` - Deploy all stacks
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (currently just linting)

## Infrastructure Components

### OIDC Providers
- **GitHub OIDC** - Secure CI/CD deployments from GitHub Actions
- **Vercel OIDC** - Multi-environment deployments (alpha, beta, prod) from Vercel

### DynamoDB Tables
- **umbro-users** - User accounts with email GSI for authentication
- **umbro-sessions** - User sessions with session token and user ID GSIs  
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
│   ├── github-open-id-connect.ts   # GitHub OIDC provider
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

## License

MIT