const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const querystring = require("querystring");

const PORT = process.env.PORT || 3000;

function callMcpTool(name, args = {}) {
  return mcpClient.callTool(name, args);
}

function createMcpClient() {
  const child = spawn(process.execPath, ["mcp-server.js"], {
    cwd: __dirname,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  let buffer = "";
  let nextId = 1;

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const request = pending.get(message.id);
      if (!request) continue;

      clearTimeout(request.timeout);
      pending.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error.message));
        continue;
      }

      request.resolve(message.result);
    }
  });

  child.stderr.on("data", (chunk) => {
    console.error("MCP server:", chunk.toString());
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}`));
      }, 1500);

      pending.set(id, { resolve, reject, timeout });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  const initialized = send("initialize", {});

  return {
    async callTool(name, args = {}) {
      await initialized;
      const result = await send("tools/call", { name, arguments: args });
      return JSON.parse(result.content[0].text);
    },
  };
}

const mcpClient = createMcpClient();

function salesSummary(data) {
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
            `Revenue: *${data.revenue}* from *${data.sales} sales*\n` +
            `Top product: *${data.topProduct}*\n` +
            `Refunds: *${data.refunds}*\n` +
            `Customer issues waiting: *${data.customerIssues}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Best signal*\n${data.bestSignal}`,
          },
          {
            type: "mrkdwn",
            text: `*Needs attention*\n${data.needsAttention}`,
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

function issueSummary(data) {
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
            `*${data.count} issues need attention today*\n` +
            `1. *${data.issues[0]}*\n` +
            `2. *${data.issues[1]}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Priority*\n${data.priority}`,
          },
          {
            type: "mrkdwn",
            text: `*Suggested next step*\n${data.suggestedNextStep}`,
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

    if (payload.response_url) {
      sendJson(response, 200, {
        response_type: "ephemeral",
        text: "Checking creator data through the MCP server...",
      });

      const toolName =
        command === "/gumroad-issues"
          ? "get_customer_payment_issues"
          : "get_creator_sales_summary";
      const args =
        command === "/gumroad-issues"
          ? { day: text || "today" }
          : { period: text || "weekly" };

      callMcpTool(toolName, args)
        .then((data) => {
          const message =
            command === "/gumroad-issues" ? issueSummary(data) : salesSummary(data);
          return postToSlackResponseUrl(payload.response_url, message);
        })
        .catch((error) =>
          postToSlackResponseUrl(payload.response_url, {
            response_type: "ephemeral",
            text: `I could not load the MCP data: ${error.message}`,
          })
        );
      return;
    }

    if (command === "/gumroad-issues") {
      const data = await callMcpTool("get_customer_payment_issues", { day: text || "today" });
      sendJson(response, 200, issueSummary(data));
      return;
    }

    if (text && text !== "weekly") {
      sendJson(response, 200, {
        response_type: "ephemeral",
        text: "Try `/gumroad-summary weekly` to see your creator sales summary.",
      });
      return;
    }

    const data = await callMcpTool("get_creator_sales_summary", { period: text || "weekly" });
    sendJson(response, 200, salesSummary(data));
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
