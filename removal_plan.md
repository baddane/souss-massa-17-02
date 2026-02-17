# AWS Resources and Terraform Removal Plan

## Overview
Removing all AWS-related infrastructure and files as the project switches to Supabase.

## Files to Remove

### 1. AWS CDK Files
- `aws-cdk-stack.d.ts`
- `aws-cdk-stack.js` 
- `aws-cdk-stack.ts`
- `cdk.json`
- `infra.d.ts`
- `infra.js`
- `infra.ts`

### 2. Lambda Handler Files
- `lambda_handler.d.ts`
- `lambda_handler.js`
- `lambda_handler.ts`
- `backend/lambda_handler.d.ts`
- `backend/lambda_handler.js`
- `backend/lambda_handler.ts`

### 3. Terraform Infrastructure
- `terraform/` directory and all contents:
  - `api_gateway.tf`
  - `cognito.tf`
  - `dynamodb.tf`
  - `lambda.tf`
  - `main.tf`
  - `outputs.tf`
  - `resources.tf`
  - `variables.tf`

### 4. Dependencies to Remove

#### From package.json
**Dependencies to remove:**
- `aws-cdk-lib`
- `constructs`
- `aws-lambda`
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

**DevDependencies to remove:**
- `aws-cdk`
- `aws-cdk`

#### From requirements.txt
**Dependencies to remove:**
- `aws-cli`
- `terraform >= 1.5.0`
- `aws-cdk`
- `@types/aws-lambda`

### 5. Configuration Files
- `metadata.json` (if AWS-related)

### 6. Frontend Code Updates
- Update `services/apiService.ts` to remove AWS-specific API endpoints
- Remove any AWS-related imports or configurations

## Implementation Steps

1. Remove AWS CDK files
2. Remove Lambda handler files
3. Remove entire Terraform directory
4. Update package.json (remove AWS dependencies)
5. Update requirements.txt (remove AWS dependencies)
6. Update frontend services to remove AWS-specific code
7. Clean up any remaining AWS references
8. Verify all AWS-related code is removed