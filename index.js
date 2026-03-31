const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();

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

// ===== GOOGLE AUTH =====
const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const token = JSON.parse(fs.readFileSync("token.json"));

const { client_id, client_secret } = credentials.installed;

const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    "urn:ietf:wg:oauth:2.0:oob"
);

auth.setCredentials(token);

const docs = google.docs({ version: "v1", auth });

// ===== YOUR GOOGLE DOC ID =====
const DOCUMENT_ID = process.env.DOCUMENT_ID;

// ===== DISCORD MESSAGE LISTENER =====
const TARGET_CHANNEL_ID = "1488446769187524700";

let queue = [];
let isProcessing = false;

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== TARGET_CHANNEL_ID) return;

    // ✅ Only #requirement messages
    if (!message.content.toLowerCase().startsWith("#requirements")) return;

    // ✅ Clean message
    const content = message.content
        .toLowerCase()
        .replace(/\u200B/g, ""); // remove hidden characters

    // ✅ check requirement tag
    if (!content.startsWith("#requirements")) return;

    // ✅ clean text properly
    const cleanText = message.content
        .replace(/#requirements?/i, "")   // remove tag (singular + plural)
        .replace(/<#[0-9]+>/g, "")       // remove channel mentions
        .replace(/<@!?[0-9]+>/g, "")     // remove user mentions
        .trim();

    if (!cleanText) return;

    // ✅ Push to queue (ensures order)
    queue.push(cleanText);

    processQueue();
});

async function processQueue() {
    if (isProcessing || queue.length === 0) return;

    isProcessing = true;

    const text = queue.shift();

    try {
        // ✅ Get document end index
        const doc = await docs.documents.get({ documentId: DOCUMENT_ID });
        const endIndex =
            doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

        // ✅ Append at bottom (correct order)
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

    // ✅ Process next message immediately
    processQueue();
}

// ===== START BOT =====

client.login(process.env.DISCORD_TOKEN);