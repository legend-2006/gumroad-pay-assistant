# Gumroad Pay Assistant

Gumroad Pay Assistant is a Slack agent demo for digital creators. It helps creators check sales, triage payment/customer issues, and take follow-up actions without leaving Slack.

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
- ngrok

## Run Locally

```text
npm start
```

The app runs on:

```text
http://localhost:3000
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
