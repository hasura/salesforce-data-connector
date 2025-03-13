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
Created at times for the most recent ticket and user. In a single artefact, show the latest times for each.

Run this in a loop forever and update every 5 seconds.
```

### Quick wins and summaries

Count open tickets by assignee

```
Count open tickets by assignee.
```

On which day of the week are tickets created

```
Create a histogram for count of tickets by created day of the week. Present the results as a table artefact. Use ASCII art to create a graph and present it as a text artefact.
```

Average time to resolution by assignee

```
For tickets opened in the last 4 months which are already closed, identify the average time to resolution grouped by the assignee. Present the results using ascii art in a text artefact.
```

### Deep Analysis

Executive summary for top organization's open tickets

```
Which organization has the most open tickets? Retrieve the 20 most recent open tickets for this org. Combine the titles and descriptions into a text artefact. Summarize the text into a brief executive summary. In particular highlight next actions.
```

Workload balancing

```
For the 100 most recent open tickets, classify each into HIGH (10 points), MEDIUM (5 points), or LOW (2 points) effort; and show this as a table. Find the total effort score per assignee over these tickets. Show the result as a table, and as ascii art in a text artefact.
```

How can I use AI to answer my support tickets

```
Combine titles and descriptions from the most recent 100 tickets into a text artefact. Use the summarize primitive to identify the top 5 categories of tickets. Then, for the most recent 100 tickets, classify each ticket into one of the categories or "other", and classify each ticket based on whether it can be answered by AI or not. Summarize the statistics for categories. For each named category summarize the titles and descriptions for those tickets that can be answered by AI, and present each summary as a text artefact.
```

## How it works

The system maintains an isolated database and sync loop for every user, so that user data and state is isolated.

Your Salesforce data is synced to a user specific database, and is used by PromptQL to run queries.

Only data that your Salesforce user can access is synced to your database instance.
