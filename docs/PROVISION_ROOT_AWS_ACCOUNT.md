# Provision Root AWS Account

The root AWS account is used for organization-level resources like GitHub OIDC, user management, security monitoring, and password policies. This is a one-time setup to enable automated deployments.

## Procedure

### Prepare Root AWS Account

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

1. Bootstrap the root account

	```bash
	STAGE=Root npm run bootstrap
	```

1. Deploy the root stacks

	```bash
	STAGE=Root npm run deploy-all
	```

	This will deploy:
	- **UmbroGitHubOIDC** - GitHub Actions OIDC provider for secure deployments
	- **UmbroPasswordPolicy** - Account-wide strong password policy
	- **UmbroSecurityMonitoring** - CloudTrail and security alerts
	- **UmbroUsers** - IAM users, groups, and roles

1. Delete the admin user

	We don't want to keep a user account with admin access hanging around. That is far too dangerous... So DELETE it forever. Going forward, deployments will happen via the GitHub actions role.

## GitHub Repository Setup

After deploying the root account, you need to configure the GitHub repository variables:

1. Go to your GitHub repository settings
1. Navigate to **Secrets and variables > Actions**
1. Add the following repository variables:
   - `AWS_ACCOUNT_ID`: Your root AWS account ID

The GitHub Actions workflows will now be able to deploy using the OIDC role instead of long-lived access keys.
