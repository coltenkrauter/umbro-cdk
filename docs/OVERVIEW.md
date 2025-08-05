# Umbro — Infrastructure Overview

**Umbro** is a modern web application with a focus on user management, authentication, and service tokens. The infrastructure is designed to be secure, scalable, and cost-effective using AWS services.

## Architecture

The Umbro infrastructure is split between two types of AWS accounts:

### Root Account
Contains organization-level resources:
- **GitHub OIDC Provider** - Secure GitHub Actions deployments without long-lived credentials
- **IAM Users & Roles** - Developer access with MFA enforcement
- **Security Monitoring** - CloudTrail logging and security alerts
- **Password Policy** - Account-wide strong password requirements

### Application Accounts
Contains application-specific resources:
- **DynamoDB Tables** - User data, sessions, and service tokens
- **Pay-per-request billing** - Cost-effective scaling
- **Point-in-time recovery** - Data protection

## Core Infrastructure Components

### User Management
- **Users Table** - Stores user accounts with secure password hashing
- **Sessions Table** - Manages user sessions with configurable expiration
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

Infrastructure deployment follows a staged approach:

1. **Root Account Setup** - One-time deployment of organization resources
2. **Application Account Setup** - Per-environment deployment of application resources
3. **GitHub Actions Integration** - Automated deployments using OIDC

## Security Best Practices

1. **Principle of Least Privilege** - Minimum required permissions for all resources
2. **No Long-lived Credentials** - OIDC for deployments, MFA for users
3. **Audit Everything** - CloudTrail logging of all API calls
4. **Encrypt Everything** - KMS encryption for data at rest
5. **Monitor Continuously** - Security alerts for suspicious activities

## Cost Optimization

- **Pay-per-request DynamoDB** - Only pay for actual usage
- **CloudWatch log retention** - Automatic cleanup of old logs
- **Resource tagging** - Track costs by project and environment
- **Minimal always-on resources** - Most services scale to zero when not in use
