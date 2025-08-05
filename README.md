# umbro-cdk

This repository contains an AWS CDK package written in TypeScript that manages the DynamoDB infrastructure required to support the Umbro application. It focuses specifically on deploying DynamoDB tables for user management, sessions, and service tokens.

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

## DynamoDB Tables

This CDK app deploys the following DynamoDB tables:

- **umbro-users** - User accounts with email GSI for authentication
- **umbro-sessions** - User sessions with session token and user ID GSIs  
- **umbro-service-tokens** - API service tokens with composite key (user_id, token_name)

All tables use pay-per-request billing and have point-in-time recovery enabled.

## Project Structure

```
lib/
├── app.ts              # Main CDK app entry point
├── config.ts           # Configuration and environment settings
├── stacks/             # CDK stack definitions
│   └── umbro-stack.ts  # DynamoDB infrastructure stack
├── constructs/         # Custom CDK constructs
└── utils/              # Utility functions
```

## Environment Variables

- `CDK_DEFAULT_ACCOUNT` - AWS account ID (required)
- `CDK_DEFAULT_REGION` - AWS region (defaults to us-east-1)

## Development

The project is structured to be simple and extensible. Add new DynamoDB tables or other AWS resources in the `UmbroStack` class as needed.

## License

MIT