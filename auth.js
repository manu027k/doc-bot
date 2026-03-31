const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/documents"];
const TOKEN_PATH = "token.json";

// Load credentials file (local only)
const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const { client_id, client_secret, redirect_uris } = credentials.installed;

// Use OOB flow
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  "urn:ietf:wg:oauth:2.0:oob"
);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\nOpen this URL in browser:\n");
console.log(authUrl);

// Read code from terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nPaste the code here: ", (code) => {
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error("❌ Error retrieving token:", err);
      return;
    }

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log("\n✅ token.json created successfully");
    rl.close();
  });
});
