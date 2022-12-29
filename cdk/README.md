## setup enviroment

vim bin/cdk.ts

## edit .env

```bash
cp .env.sample .env
vim .env
```

## setup

```
# load .env
. .env

## When using DISCORD
# set discord token to ssm param
aws ssm put-parameter --name "/${PREFIX}/discordBotToken" --type "SecureString" --value "${DISCORD_TOKEN}"
aws ssm put-parameter --name "/${PREFIX}/discordPubKey" --type "String" --value "${DISCORD_PUBKEY}"

## When using slack
# set slack webhookURL
aws ssm put-parameter --name "/${PREFIX}/slackWebhookURL" --type "SecureString" --value "${SLACK_WEBHOOKURL}"

```

## deploy

```
# Load .env
$ . .env 

# List cdk stack
$ npx aws-cdk list
proxy01Base
proxy01Server

# Deploy Server stack
$ npx aws-cdk deploy proxy01Server



 ✅  proxy01Server

✨  Deployment time: 236.67s

Outputs:
proxy01Server.runAwsCommandsThatNeedToBeExecutedSubsequently = aws iam attach-role-policy --role-name proxy01ServerACMRole --policy-arn arn:aws:iam::000000000000:policy/proxy01ServerAcmPolePolicy

Stack ARN:
arn:aws:cloudformation:ap-northeast-1:000000000000:stack/proxy01Server/c9875b90-872e-11ed-a86d-0a600deffea5

✨  Total time: 241.86s

# Attach ACMRole policy
$ aws iam attach-role-policy --role-name proxy01ServerACMRole --policy-arn arn:aws:iam::000000000000:policy/proxy01ServerAcmPolePolicy
```
