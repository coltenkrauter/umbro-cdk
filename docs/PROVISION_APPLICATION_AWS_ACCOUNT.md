# Provision Application AWS Account

Application AWS accounts (dev, staging, prod, etc.) hold the actual application infrastructure like DynamoDB tables. In order to setup automated deployments, this one-time setup must be followed.

## Procedure

### Prepare Application AWS Account

1. Create an admin user

	`IAM > Users > Create user`
	Create an admin user called `umbro-admin` with the dreaded `AdministratorAccess` so that we can easily bootstrap this account.

1. Create an access key

	`IAM > Users > umbro-admin > Create access key`
	Create an access key for `CLI` use.

1. Authenticate locally with the `aws cli`

	```bash
	aws configure

	# Validate it worked with: aws sts get-caller-identity
	```

1. Bootstrap the application account

	```bash
	# For dev environment
	STAGE=dev npm run bootstrap

	# For staging environment  
	STAGE=staging npm run bootstrap

	# For production environment
	STAGE=prod npm run bootstrap
	```

1. Deploy the application stacks

	```bash
	# For dev environment
	STAGE=dev npm run deploy-all

	# For staging environment
	STAGE=staging npm run deploy-all

	# For production environment
	STAGE=prod npm run deploy-all
	```

	This will deploy:
	- **UmbroStack** - DynamoDB tables for users, sessions, and service tokens

1. Delete the admin user

	We don't want to keep a user account with admin access hanging around. That is far too dangerous... So DELETE it forever. Going forward, deployments will happen via the GitHub actions role.

## DynamoDB Tables Created

The application deployment creates the following DynamoDB tables:

- **umbro-users** - User accounts with email GSI for authentication
- **umbro-sessions** - User sessions with session token and user ID GSIs  
- **umbro-service-tokens** - API service tokens with composite key (user_id, token_name)

All tables use pay-per-request billing and have point-in-time recovery enabled.
