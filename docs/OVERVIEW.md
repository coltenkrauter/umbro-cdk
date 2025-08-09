# Umbro — Infrastructure Overview

**Umbro** is a modern web application with a focus on user management, authentication, and service tokens. The infrastructure is designed to be secure, scalable, and cost-effective using AWS services for backend infrastructure while the application itself is deployed on Vercel.

## Architecture

The Umbro infrastructure leverages the [Venice](https://github.com/coltenkrauter/venice) package for account provisioning and GitHub OIDC configuration. Venice automatically handles:

- **Account Provisioning** - Automated AWS account setup and configuration
- **GitHub OIDC Provider** - Secure GitHub Actions deployments without long-lived credentials
- **Organization-level Security** - IAM users, roles, and security monitoring

This allows the umbro-cdk package to focus on application-specific infrastructure:

### Application Infrastructure (AWS)
- **DynamoDB Tables** - User data and service tokens
- **Vercel OIDC Provider** - Multi-environment deployments from Vercel
- **Application Security** - Password policies and monitoring specific to the application
- **Pay-per-request billing** - Cost-effective scaling
- **Point-in-time recovery** - Data protection

### Application Deployment (Vercel)
- **Frontend Application** - Next.js application deployed on Vercel
- **Serverless Functions** - API routes and backend logic
- **Edge Functions** - Global performance optimization
- **Automatic Scaling** - Vercel handles scaling and performance

## Core Infrastructure Components

### User Management
- **Users Table** - Stores user accounts with secure password hashing
- **Email-based authentication** - GSI for efficient email lookups

### Service Token System
- **Service Tokens Table** - API access tokens for external services
- **Per-user token management** - Composite keys for efficient queries
- **Token expiration handling** - Automatic cleanup of expired tokens

### Security Features
- **MFA Enforcement** - All IAM users require multi-factor authentication
- **Strong Password Policy** - 50+ character passwords with complexity requirements
- **CloudTrail Monitoring** - All API calls logged and monitored
- **Encryption at Rest** - KMS encryption for all sensitive data
- **HTTPS Everywhere** - SSL/TLS for all communications

## Deployment Strategy

Infrastructure deployment follows a simplified approach thanks to Venice:

1. **Account Provisioning** - Handled automatically by Venice (GitHub OIDC, IAM users, security policies)
2. **Application Infrastructure** - Deploy AWS backend resources using umbro-cdk
3. **Application Deployment** - Deploy frontend application on Vercel (separate repository)
4. **GitHub Actions Integration** - Automated deployments using OIDC (configured by Venice)

## Repository Structure

- **[umbro](https://github.com/coltenkrauter/umbro)** - Main application (Next.js, deployed on Vercel)
- **[umbro-cdk](https://github.com/coltenkrauter/umbro-cdk)** - AWS infrastructure (this repository)
- **[venice](https://github.com/coltenkrauter/venice)** - Account provisioning and automation

## Security Best Practices

1. **Principle of Least Privilege** - Minimum required permissions for all resources
2. **No Long-lived Credentials** - OIDC for deployments, MFA for users
3. **Audit Everything** - CloudTrail logging of all API calls
4. **Encrypt Everything** - KMS encryption for data at rest
5. **Monitor Continuously** - Security alerts for suspicious activities

## Cost Optimization

- **Pay-per-request DynamoDB** - Only pay for actual usage
- **Vercel Edge Functions** - Global performance with minimal cost
- **CloudWatch log retention** - Automatic cleanup of old logs
- **Resource tagging** - Track costs by project and environment
- **Minimal always-on resources** - Most services scale to zero when not in use

## What You Need to Deploy

Since Venice handles account-level infrastructure, you only need to ensure:

1. **AWS Account ID** is available in your GitHub repository variables (handled by Venice)
2. **AWS Region** is configured (defaults to us-east-1)
3. **Environment Variables** are set for your deployment stage

The GitHub OIDC provider and account-level security policies are automatically configured by Venice, so you can focus on deploying just the application-specific resources.
