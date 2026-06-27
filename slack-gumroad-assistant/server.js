const http = require("http");
const https = require("https");
const querystring = require("querystring");

const PORT = process.env.PORT || 3000;

function salesSummary() {
  return {
    response_type: "in_channel",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Gumroad Pay Assistant",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Weekly creator sales summary*\n" +
            "Revenue: *$420* from *18 sales*\n" +
            "Top product: *Digital Business Starter Kit*\n" +
            "Refunds: *1*\n" +
            "Customer issues waiting: *2*",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Best signal*\nProduct bundle sales are up 22%",
          },
          {
            type: "mrkdwn",
            text: "*Needs attention*\nOne failed payment from a repeat buyer",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "draft_reply",
            text: {
              type: "plain_text",
              text: "Draft customer reply",
              emoji: true,
            },
            value: "draft_reply",
          },
          {
            type: "button",
            action_id: "create_discount",
            text: {
              type: "plain_text",
              text: "Create discount",
              emoji: true,
            },
            value: "create_discount",
          },
          {
            type: "button",
            action_id: "export_report",
            text: {
              type: "plain_text",
              text: "Export report",
              emoji: true,
            },
            value: "export_report",
          },
        ],
      },
    ],
  };
}

function issueSummary() {
  return {
    response_type: "in_channel",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Customer and payment issues",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*2 issues need attention today*\n" +
            "1. *Failed payment* from a repeat buyer on Digital Business Starter Kit\n" +
            "2. *Download access question* from a new customer",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Priority*\nPayment recovery first",
          },
          {
            type: "mrkdwn",
            text: "*Suggested next step*\nSend a checkout retry link",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "send_retry_link",
            text: {
              type: "plain_text",
              text: "Send retry link",
              emoji: true,
            },
            value: "send_retry_link",
          },
          {
            type: "button",
            action_id: "draft_access_reply",
            text: {
              type: "plain_text",
              text: "Draft access reply",
              emoji: true,
            },
            value: "draft_access_reply",
          },
          {
            type: "button",
            action_id: "mark_reviewed",
            text: {
              type: "plain_text",
              text: "Mark reviewed",
              emoji: true,
            },
            value: "mark_reviewed",
          },
        ],
      },
    ],
  };
}

function interactionResponse(actionId) {
  const responses = {
    draft_reply:
      "*Draft customer reply ready:*\nHi Nicole, thanks for reaching out. I checked your payment and it looks like the transaction failed before completion. Please try the checkout link again, or send me the email used at checkout and I will help you manually.",
    create_discount:
      "*Discount suggestion ready:*\nCreate a 15% discount for the Digital Business Starter Kit and run it for 48 hours to recover slower mid-week traffic.",
    export_report:
      "*Weekly report exported:*\nRevenue: $420\nSales: 18\nTop product: Digital Business Starter Kit\nRefunds: 1\nOpen customer issues: 2",
    send_retry_link:
      "*Retry link prepared:*\nSend this customer a fresh checkout link and mention that their previous payment did not complete.",
    draft_access_reply:
      "*Access reply drafted:*\nHi Nicole, thanks for buying the Digital Business Starter Kit. I refreshed your download access. Please try the product link again, and reply here if it still does not open.",
    mark_reviewed:
      "*Issues marked reviewed:*\nToday's two customer issues are now tracked for follow-up.",
  };

  return {
    response_type: "in_channel",
    replace_original: false,
    text: responses[actionId] || "Action received.",
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

function postToSlackResponseUrl(responseUrl, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(responseUrl);
    const request = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        response.resume();
        response.on("end", resolve);
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Gumroad Pay Assistant is running.");
    return;
  }

  if (request.method === "POST" && request.url === "/slack/commands") {
    const body = await readBody(request);
    const payload = querystring.parse(body);
    const text = (payload.text || "").toString().trim().toLowerCase();
    const command = (payload.command || "").toString();

    if (command === "/gumroad-issues") {
      sendJson(response, 200, issueSummary());
      return;
    }

    if (text && text !== "weekly") {
      sendJson(response, 200, {
        response_type: "ephemeral",
        text: "Try `/gumroad-summary weekly` to see your creator sales summary.",
      });
      return;
    }

    sendJson(response, 200, salesSummary());
    return;
  }

  if (request.method === "POST" && request.url === "/slack/interactions") {
    const body = await readBody(request);
    const form = querystring.parse(body);
    const payload = JSON.parse(form.payload || "{}");
    const actionId = payload.actions?.[0]?.value || payload.actions?.[0]?.action_id;

    sendJson(response, 200, { text: "Working on it..." });

    if (payload.response_url) {
      postToSlackResponseUrl(payload.response_url, interactionResponse(actionId)).catch(
        (error) => console.error("Slack response_url failed:", error.message)
      );
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Gumroad Pay Assistant listening on http://localhost:${PORT}`);
});
