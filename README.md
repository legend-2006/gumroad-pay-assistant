# Gumroad Pay Assistant

Gumroad Pay Assistant is a Slack agent demo for digital creators. It helps creators check sales, triage payment/customer issues, and take follow-up actions without leaving Slack.

The project uses an MCP server integration. The Slack backend calls local MCP tools to retrieve creator sales summaries and customer/payment issue data before returning Slack Block Kit responses.

## What It Does

- `/gumroad-summary weekly` shows weekly revenue, top product, refunds, and customer issues.
- `/gumroad-issues today` shows payment and customer support issues that need attention.
- Slack buttons generate useful follow-ups such as customer replies, discount suggestions, retry links, and report exports.

## Built With

- JavaScript
- Node.js
- Slack API
- Slack Slash Commands
- Slack Block Kit
- Slack Interactivity
- MCP server integration
- ngrok

## Run Locally

```text
npm start
```

The app runs on:

```text
http://localhost:3000
```

The MCP server can also be run directly:

```text
npm run mcp
```

Expose it with ngrok:

```text
ngrok http 3000
```

## Slack Setup

Create two slash commands in your Slack app:

```text
/gumroad-summary
/gumroad-issues
```

Use this request URL for both commands:

```text
https://YOUR-NGROK-URL/slack/commands
```

Turn on Interactivity and use:

```text
https://YOUR-NGROK-URL/slack/interactions
```

## Demo Commands

```text
/gumroad-summary weekly
/gumroad-issues today
```

## MCP Tools

The local MCP server exposes:

```text
get_creator_sales_summary
get_customer_payment_issues
```

The Slack command backend calls these tools and converts the returned data into Slack Block Kit messages and interactive workflows.
