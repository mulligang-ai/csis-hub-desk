#!/usr/bin/env node
/**
 * One-time setup for CSIS Hub Desk.
 *
 *   npm run setup
 *
 * Creates (or reuses) a Supabase project, runs the database SQL, turns off
 * the "confirm email" requirement and writes .env.local. Everything runs on
 * this machine; the access token you paste is used for this run only and is
 * never saved.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { exec } from "node:child_process";

const API = process.env.SUPABASE_API_URL ?? "https://api.supabase.com/v1";
const ENV_FILE = ".env.local";
const SQL_FILE = "supabase/migrations/0001_csis.sql";
const TOKEN_PAGE = "https://supabase.com/dashboard/account/tokens";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q, fallback = "") => (await rl.question(q)).trim() || fallback;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (s = "") => console.log(s);
const fail = (s) => {
  console.error(`\n✖ ${s}\n`);
  process.exit(1);
};

let token = "";
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text || res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return data;
}

const openInBrowser = (url) =>
  exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"} "${url}"`);

async function main() {
  say("\nCSIS Hub Desk — setup\n");

  if (!existsSync(SQL_FILE)) fail(`Run this from the csis-hub-desk folder (couldn't find ${SQL_FILE}).`);
  if (existsSync(ENV_FILE)) {
    const ok = await ask(`${ENV_FILE} already exists. Replace it? (y/N) `, "n");
    if (!/^y/i.test(ok)) fail("Stopped — your existing .env.local was left alone.");
  }

  // ---- 1. Access token ---------------------------------------------------
  say("Step 1 — Supabase access token");
  say(`Your browser will open ${TOKEN_PAGE}`);
  say('Sign in, click "Generate new token", name it "csis-setup" and copy it.\n');
  openInBrowser(TOKEN_PAGE);
  token = await ask("Paste the token here and press Return: ");
  if (!token) fail("No token entered.");

  let orgs;
  try {
    orgs = await api("GET", "/organizations");
  } catch (e) {
    fail(`That token didn't work. ${e.message}`);
  }
  if (!orgs?.length) {
    fail(
      "This token can't see any organisations. Delete it, then on the token page click\n" +
        '  "Generate new token" → "Create legacy token" and run this again with that token.\n' +
        "  (If you really have no organisation yet, create one at supabase.com first.)",
    );
  }

  // ---- 2. Project ----------------------------------------------------------
  say("\nStep 2 — Project");
  const existing = await api("GET", "/projects");
  let ref;
  let isNew = false;
  if (existing?.length) {
    say("You already have these projects:");
    existing.forEach((p, i) => say(`  ${i + 1}. ${p.name} (${p.region})`));
    const pick = await ask("Type a number to use one, or press Return to create a new project: ");
    const chosen = existing[Number(pick) - 1];
    if (pick && !chosen) fail("That number isn't in the list.");
    if (chosen) ref = chosen.id;
  }

  if (!ref) {
    let org = orgs[0];
    if (orgs.length > 1) {
      orgs.forEach((o, i) => say(`  ${i + 1}. ${o.name}`));
      org = orgs[Number(await ask("Which organisation? (number) ", "1")) - 1] ?? orgs[0];
    }
    const name = await ask("Project name [csis-hub-desk]: ", "csis-hub-desk");
    const dbPass = randomBytes(18).toString("base64url");
    say("Creating the project in Ireland (eu-west-1)…");
    const project = await api("POST", "/projects", {
      name,
      organization_id: org.id,
      db_pass: dbPass,
      region: "eu-west-1",
    });
    ref = project.id;
    isNew = true;
    say(`Created. Database password (save it in your password manager): ${dbPass}`);
  }

  say("Waiting for the project to be ready (usually 1–3 minutes)…");
  for (let i = 0; ; i++) {
    const p = await api("GET", `/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") break;
    if (i > 60) fail(`The project is still "${p.status}" after 10 minutes. Run this again later and pick it from the list.`);
    process.stdout.write(".");
    await sleep(10_000);
  }
  say(" ready.");

  // ---- 3. Database ---------------------------------------------------------
  say("\nStep 3 — Database tables");
  const runSql = isNew || /^y/i.test(await ask("Run the CSIS database setup on this project? (Y/n) ", "y"));
  if (runSql) {
    try {
      // A brand-new project can take a moment before it accepts SQL.
      for (let i = 0; ; i++) {
        try {
          await api("POST", `/projects/${ref}/database/query`, { query: readFileSync(SQL_FILE, "utf8") });
          break;
        } catch (e) {
          if (/already exists/i.test(e.message) || i >= 5) throw e;
          await sleep(10_000);
        }
      }
      say("Tables created.");
    } catch (e) {
      if (/already exists/i.test(e.message)) say("Tables already exist — skipped.");
      else fail(`The database setup failed: ${e.message}\nYou can paste ${SQL_FILE} into the Supabase SQL Editor instead.`);
    }
  }

  // ---- 4. Auth settings ----------------------------------------------------
  say("\nStep 4 — Sign-in settings");
  try {
    await api("PATCH", `/projects/${ref}/config/auth`, {
      mailer_autoconfirm: true,
      site_url: "http://localhost:3000",
    });
    say('"Confirm email" turned off, so you can sign in straight after signing up.');
  } catch (e) {
    say(`Couldn't change the sign-in settings (${e.message}).`);
    say('Turn off "Confirm email" yourself under Authentication → Sign In / Providers → Email.');
  }

  // ---- 5. Keys and .env.local ---------------------------------------------
  say("\nStep 5 — Writing .env.local");
  const keys = await api("GET", `/projects/${ref}/api-keys?reveal=true`);
  const find = (...names) => keys.find((k) => names.includes(k.name) || names.includes(k.type))?.api_key;
  const anon = find("anon", "publishable");
  const service = find("service_role", "secret");
  if (!anon || !service) fail("Couldn't read the project's API keys. Copy them from Project Settings → API instead.");

  const company = await ask("Company name shown to customers [Agentic Ireland]: ", "Agentic Ireland");
  const support = await ask("Support email address [support@agenticireland.ie]: ", "support@agenticireland.ie");

  writeFileSync(
    ENV_FILE,
    [
      "# Written by `npm run setup`. Never commit this file.",
      `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
      `SUPABASE_SERVICE_ROLE_KEY=${service}`,
      "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
      `NEXT_PUBLIC_COMPANY_NAME="${company.replace(/"/g, "")}"`,
      `CSIS_SUPPORT_EMAIL=${support}`,
      `CSIS_FROM_EMAIL="${company.replace(/"/g, "")} Support <${support}>"`,
      "RESEND_API_KEY=",
      `CSIS_INBOUND_SECRET=${randomBytes(24).toString("hex")}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  say(`${ENV_FILE} written.`);

  say("\nAll done. Next:");
  say("  1. npm run dev");
  say("  2. Open http://localhost:3000/desk/login and click “Create an account”.");
  say("     The first account becomes the admin.");
  say(`\nYou can now delete the "csis-setup" token at ${TOKEN_PAGE}\n`);
}

main()
  .catch((e) => fail(e.message))
  .finally(() => rl.close());
