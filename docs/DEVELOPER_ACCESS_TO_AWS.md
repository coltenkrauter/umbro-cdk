# Developer Access To AWS

## Overview

Developers that want to access Umbro AWS accounts must first have their email listed in [../lib/structures.ts](../lib/structures.ts) and then that code change must be committed and deployed to the target AWS account. Once the deployment has completed, an IAM user account will exist in the AWS account with minimal permissions. In order to gain permissions, the developer must assume a role with more permissions.

## Procedure

1. Add your email to `developerEmails` in [../lib/structures.ts](../lib/structures.ts).
1. Commit the change and get it deployed to the target AWS account. (e.g. open PR and merge to `main` branch)
1. Reach out to another developer with access to the AWS account so they can access [AWS Secrets Manager > Secrets](https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets?region=us-east-1) and then provide you with the temporary password. The secrets name will be `username-umbro-InitialPassword`.
1. Go to [AWS](https://aws.amazon.com/) and go to the `Sign in` page.
1. Sign in with your new account which will require:
    1. **Account ID** (The target AWS account)
    1. **IAM username** (Should be the first part of your email + '-umbro', ex: john-umbro)
    1. **Password** (First sign in password is stored in the target `AWS Secrets Manager`)
1. The first time you sign in, you will be prompted to reset your password. [(Password Requirements)](../lib/stacks/password-policy.ts)
1. Once signed in, you will have access to almost nothing until you setup MFA. To setup MFA, go directly to this URL (replace the "username" with your username):
    ```
    https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1#/users/details/username?section=security_credentials
    ```
1. Setup MFA
1. Now that you have MFA on your account, you can switch to a different role by clicking the top right menu and pressing `Switch role`.
    1. You will be prompted to enter the **Account ID** and **Role name**.
    
You should now have access to predefined roles:
- **UmbroAdministrators** - Full access to Umbro resources
- **UmbroDevelopers** - Read access to Umbro resources

## Add more permissions?

Permissions (Groups, roles, and policies) are managed in this package ([here](../lib/utils/permissions.ts)). To add a role or adjust permissions, cut a PR with your desired changes. Once approved, merge and get it deployed to the desired AWS account.
