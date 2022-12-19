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

## build & deploy

```
. .env; npx aws-cdk deploy proxy01
```
