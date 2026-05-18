import "dotenv/config";
import { signUnsubscribeToken } from "../src/lib/newsletter/unsubscribe-token";

const email = process.argv[2];
const baseUrl = process.argv[3] ?? "http://localhost:3000";

if (!email) {
  console.error("Usage: npx tsx scripts/test-unsubscribe-url.ts <email> [baseUrl]");
  process.exit(1);
}

const normalised = email.trim().toLowerCase();
const token = signUnsubscribeToken(normalised);
const url = `${baseUrl}/unsubscribe?email=${encodeURIComponent(normalised)}&token=${token}`;

console.log(url);
