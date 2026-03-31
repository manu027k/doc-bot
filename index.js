require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

// ===== DISCORD SETUP =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log("✅ Bot is online");
});

// ===== GOOGLE AUTH (FROM ENV) =====
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const token = JSON.parse(process.env.GOOGLE_TOKEN);

const { client_id, client_secret } = credentials.installed;

const auth = new google.auth.OAuth2(
  client_id,
  client_secret,
  "urn:ietf:wg:oauth:2.0:oob"
);

auth.setCredentials(token);

const docs = google.docs({ version: "v1", auth });

// ===== CONFIG =====
const DOCUMENT_ID = process.env.DOCUMENT_ID;
const TARGET_CHANNEL_ID = process.env.CHANNEL_ID;

// ===== QUEUE SYSTEM =====
let queue = [];
let isProcessing = false;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  const content = message.content
    .toLowerCase()
    .replace(/\u200B/g, "");

  if (!content.startsWith("#requirements")) return;

  const cleanText = message.content
    .replace(/#requirements?/i, "")
    .replace(/<#[0-9]+>/g, "")
    .replace(/<@!?[0-9]+>/g, "")
    .trim();

  if (!cleanText) return;

  queue.push(cleanText);
  processQueue();
});

async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const text = queue.shift();

  try {
    const doc = await docs.documents.get({ documentId: DOCUMENT_ID });

    const endIndex =
      doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

    await docs.documents.batchUpdate({
      documentId: DOCUMENT_ID,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: endIndex },
              text: "• " + text + "\n",
            },
          },
        ],
      },
    });

    console.log("✅ Added:", text);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  isProcessing = false;
  processQueue();
}

// ===== START =====
client.login(process.env.DISCORD_TOKEN);
