const readline = require("readline");

const tools = [
  {
    name: "get_creator_sales_summary",
    description: "Returns a weekly sales summary for a digital creator.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", description: "The reporting period." },
      },
    },
  },
  {
    name: "get_customer_payment_issues",
    description: "Returns customer and payment issues that need attention.",
    inputSchema: {
      type: "object",
      properties: {
        day: { type: "string", description: "The day to review." },
      },
    },
  },
];

function salesSummary() {
  return {
    revenue: "$420",
    sales: 18,
    topProduct: "Digital Business Starter Kit",
    refunds: 1,
    customerIssues: 2,
    bestSignal: "Product bundle sales are up 22%",
    needsAttention: "One failed payment from a repeat buyer",
  };
}

function customerIssues() {
  return {
    count: 2,
    issues: [
      "Failed payment from a repeat buyer on Digital Business Starter Kit",
      "Download access question from a new customer",
    ],
    priority: "Payment recovery first",
    suggestedNextStep: "Send a checkout retry link",
  };
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function respondError(id, code, message) {
  process.stdout.write(
    `${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`
  );
}

function handleMessage(message) {
  if (message.method === "initialize") {
    respond(message.id, {
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: "gumroad-pay-assistant-mcp",
        version: "1.0.0",
      },
      capabilities: {
        tools: {},
      },
    });
    return;
  }

  if (message.method === "tools/list") {
    respond(message.id, { tools });
    return;
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;

    if (name === "get_creator_sales_summary") {
      respond(message.id, {
        content: [{ type: "text", text: JSON.stringify(salesSummary()) }],
      });
      return;
    }

    if (name === "get_customer_payment_issues") {
      respond(message.id, {
        content: [{ type: "text", text: JSON.stringify(customerIssues()) }],
      });
      return;
    }

    respondError(message.id, -32602, `Unknown tool: ${name}`);
    return;
  }

  respondError(message.id, -32601, `Unknown method: ${message.method}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    handleMessage(JSON.parse(line));
  } catch (error) {
    respondError(null, -32700, error.message);
  }
});
