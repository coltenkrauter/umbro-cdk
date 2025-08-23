# Developer Setup Guide

This guide covers setting up your local development environment for the Umbro application, including local DynamoDB and S3 services.

## Prerequisites

- **Node.js** (v18 or later)
- **Java Runtime** (JRE/JDK 17+) - Required for local DynamoDB
- **Docker** - Required for local S3 (MinIO)
- **npm** or **yarn** package manager

## Quick Start

The easiest way to get started is using the provided npm scripts:

```bash
# Start local DynamoDB
npm run dev:dynamo:start

# In another terminal, bootstrap DynamoDB tables
npm run dev:dynamo:bootstrap

# Start local S3 (MinIO)
npm run dev:s3:start

# In another terminal, bootstrap S3 buckets
npm run dev:s3:bootstrap
```

## Local Services

### DynamoDB Local

Local DynamoDB runs on port `8001` by default and provides a fully functional DynamoDB environment for development.

**Features:**
- Runs on port 8001 (configurable via `DDB_PORT` env var)
- Downloads and manages DynamoDB Local automatically
- Creates all required tables with proper schemas
- Seeds with sample data for development

**Scripts:**
- `dev:dynamo:start` - Start local DynamoDB server
- `dev:dynamo:bootstrap` - Create tables and seed data
- `dev:dynamo:check` - Verify DynamoDB connection

**Environment Variables:**
```bash
export DDB_PORT=8001
export DYNAMODB_ENDPOINT=http://localhost:8001
export AWS_REGION=us-east-1
```

### S3 Local (MinIO)

Local S3 runs on port `9000` with a web console on port `9001`, providing S3-compatible storage for development.

**Features:**
- S3-compatible API on port 9000
- Web console on port 9001
- Automatic Docker/Colima management
- Creates required buckets with sample files

**Scripts:**
- `dev:s3:start` - Start MinIO server
- `dev:s3:bootstrap` - Create buckets and upload sample files
- `dev:s3:stop` - Stop MinIO server
- `dev:s3:stop-colima` - Stop Colima (macOS)

**Environment Variables:**
```bash
export MINIO_PORT=9000
export MINIO_CONSOLE_PORT=9001
export MINIO_ENDPOINT=http://localhost:9000
export AWS_REGION=us-east-1
```

**Default Credentials:**
- Access Key: `minioadmin`
- Secret Key: `minioadmin`

## Manual Setup

### DynamoDB Local

1. **Download DynamoDB Local:**
   ```bash
   mkdir -p .local/dynamodb
   cd .local/dynamodb
   curl -O https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz
   tar -xzf dynamodb_local_latest.tar.gz
   ```

2. **Start DynamoDB:**
   ```bash
   java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -port 8001
   ```

3. **Bootstrap Tables:**
   ```bash
   tsx scripts/bootstrap-dynamodb.ts
   ```

### MinIO (S3 Local)

1. **Start MinIO with Docker:**
   ```bash
   docker run -d \
     --name minio \
     -p 9000:9000 \
     -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     -v minio_data:/data \
     minio/minio server /data --console-address ":9001"
   ```

2. **Bootstrap Buckets:**
   ```bash
   tsx scripts/bootstrap-s3.ts
   ```

## Environment Configuration

Create a `.env.local` file in your project root:

```bash
# DynamoDB Local
DDB_PORT=8001
DYNAMODB_ENDPOINT=http://localhost:8001
TABLE_NAME_USERS=umbro-users-dev
TABLE_NAME_SERVICE_TOKENS=umbro-service-tokens-dev
TABLE_NAME_APPLICATIONS=umbro-applications-dev
TABLE_NAME_TEAMS=umbro-teams-dev
TABLE_NAME_REQUESTS=umbro-requests-dev

# MinIO Local
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ENDPOINT=http://localhost:9000
BUCKET_NAME_PROFILE=umbro-profile-dev
BUCKET_NAME_DOCUMENTS=umbro-documents-dev
BUCKET_NAME_UPLOADS=umbro-uploads-dev

# AWS Configuration
AWS_REGION=us-east-1
```

## Troubleshooting

### DynamoDB Issues

**Java not found:**
```bash
# macOS
brew install openjdk@17

# Ubuntu/Debian
sudo apt install openjdk-17-jre

# Windows
# Download from https://adoptium.net/
```

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8001

# Kill the process or change port
export DDB_PORT=8002
```

### MinIO Issues

**Docker not running:**
```bash
# macOS with Colima
colima start

# Docker Desktop
# Start Docker Desktop application
```

**Port conflicts:**
```bash
# Check ports
lsof -i :9000
lsof -i :9001

# Change ports
export MINIO_PORT=9002
export MINIO_CONSOLE_PORT=9003
```

**Permission denied:**
```bash
# Ensure Docker has proper permissions
sudo usermod -aG docker $USER
# Log out and back in
```

## Development Workflow

1. **Start services:**
   ```bash
   # Terminal 1: Start DynamoDB
   npm run dev:dynamo:start
   
   # Terminal 2: Start MinIO
   npm run dev:s3:start
   ```

2. **Bootstrap data:**
   ```bash
   # Terminal 3: Setup DynamoDB
   npm run dev:dynamo:bootstrap
   
   # Terminal 4: Setup S3
   npm run dev:s3:bootstrap
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Stop services when done:**
   ```bash
   npm run dev:s3:stop
   # DynamoDB will stop when you Ctrl+C the start process
   ```

## Data Persistence

- **DynamoDB:** Data is stored in memory by default. Restarting will clear all data.
- **MinIO:** Data persists in Docker volumes. Use `docker volume ls` to see volumes.

## Production vs Development

- **Development:** Uses local services with `-dev` suffix for table/bucket names
- **Production:** Uses AWS services with production naming
- **Environment switching:** Controlled via environment variables and deployment scripts

## Useful Commands

```bash
# Check DynamoDB status
npm run dev:dynamo:check

# List S3 buckets
aws --endpoint-url http://localhost:9000 s3 ls

# Access MinIO console
open http://localhost:9001

# View DynamoDB tables
aws dynamodb list-tables --endpoint-url http://localhost:8001
```

## Next Steps

Once your local environment is running:

1. **Run the application:** `npm run dev`
2. **Test authentication:** Register/login with the app
3. **Test file uploads:** Upload files to test S3 functionality
4. **Test database operations:** Create/read/update/delete data

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).
