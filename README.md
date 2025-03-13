# Salesforce data connector

## Setup services

```bash
cp .env.development .env

# edit .env to set the salesforce environment variables
# (required) SALESFORCE_CLIENT_ID=
# (required) SALESFORCE_CLIENT_SECRET=
# (optional) SALESFORCE_PKCE_REQUIRED=true

ddn supergraph build local

ddn project init

ddn run docker-start
ddn console --local
```

## Deploy and Share

```bash
ddn supergraph build create
ddn console
```

# Salesforce App Console

## Quickstart

- Click on the SaaS tab on the left nav bar
- Wait a moment for the Salesforce integration to pop up
- Click on the Salesforce integration
- Click on the Edit button, add your Salesforce org ID, and hit Save
- Click on the Login button, and provide your Salesforce credentials to log in with Salesforce
- Your data is now being synced
- Head over to the PromptQL tab to act on your data

## Sample questions

Sync Status (Click on Memory Artifacts in the top right.)

```
count rows in all tables
show in artefact
wait 5 seconds
repeat in loop
```

// TODO: more sample questions and plans

## How it works

The system maintains an isolated database and sync loop for every user, so that user data and state is isolated.

Your Salesforce data is synced to a user specific database, and is used by PromptQL to run queries.

Only data that your Salesforce user can access is synced to your database instance.

# Hasura PromptQL app deployment

edit the .env.cloud file

ddn supergraph build create --no-build-connectors

don't merge this branch to master
rebase this branch on top of master
