require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  PermissionsBitField,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const REQUIRED_ENV_VARS = ["DISCORD_TOKEN"];

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const DEFAULT_PREFIX = process.env.PREFIX || "?";
const ENABLE_MESSAGE_CONTENT = process.env.ENABLE_MESSAGE_CONTENT !== "false";
const ENABLE_GUILD_MEMBERS = process.env.ENABLE_GUILD_MEMBERS === "true";
const BOT_OWNER_ID = process.env.BOT_OWNER_ID || "";
const DEFAULT_PANEL_IMAGE_URL = process.env.PANEL_IMAGE_URL || "";
const MINECRAFT_SERVER_ADDRESS = process.env.MINECRAFT_SERVER_ADDRESS || "185.838.938.104";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const DATA_DIR = path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "guild-configs.json");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");
const GIVEAWAYS_FILE = path.join(DATA_DIR, "giveaways.json");
const QUEUES_FILE = path.join(DATA_DIR, "queues.json");
const SHOP_FILE = path.join(DATA_DIR, "shop-items.json");
const BACKUPS_FILE = path.join(DATA_DIR, "backups.json");
const AI_DMS_FILE = path.join(DATA_DIR, "ai-dms.json");
const MY_ROLES_FILE = path.join(DATA_DIR, "my-roles.json");

const TICKET_TYPES = {
  claim: {
    label: "Claim",
    description: "Claims, refunds, and purchase issues",
  },
  giveaway: {
    label: "Giveaway",
    description: "Questions about giveaways or rewards",
  },
  support: {
    label: "Support",
    description: "General help and support",
  },
};

const BOT_TEXT = {
  panelTitle: "Need Assistance? Open a ticket!",
  panelDescription: [
    "Welcome to Botify Support.",
    "Choose a category below to open your ticket.",
    "",
    "**Claim:** Claims, refunds, and purchase issues",
    "**Giveaway:** Giveaways, prizes, and sponsorship questions",
    "**Support:** General help and server support",
    "",
    "Click a button below to create a ticket.",
  ].join("\n"),
  panelFooter: "Powered by Botify",
  claimButton: "Claim",
  giveawayButton: "Giveaway",
  supportButton: "Support",
  closeButton: "Close",
  joinGiveawayButton: "Join Giveaway",
  leaveGiveawayButton: "Leave Giveaway",
};

const GUILD_CONFIG_DEFAULTS = {
  prefix: DEFAULT_PREFIX,
  supportRoleId: "",
  ticketCategoryId: "",
  ticketPanelChannelId: "",
  welcomeChannelId: "",
  goodbyeChannelId: "",
  selfAssignableRoleIds: [],
  giveawayHostRoleId: "",
  panelImageUrl: DEFAULT_PANEL_IMAGE_URL,
  boostsAvailable: 0,
  boostsPrice: "",
  boostsNote: "",
  secureMode: false,
  secureSnapshot: null,
};

const WINTRADE_SETUP_STRUCTURE = [
  {
    key: "welcome",
    name: "Welcome 👋",
    channels: [
      { key: "welcome", type: ChannelType.GuildText, name: "👋・welcome" },
      { key: "goodbye", type: ChannelType.GuildText, name: "🛫・goodbye" },
      { key: "rules", type: ChannelType.GuildText, name: "📖・rules" },
      { key: "invites", type: ChannelType.GuildText, name: "📩・invites" },
    ],
  },
  {
    key: "important",
    name: "Important 🎉",
    channels: [
      { key: "updates", type: ChannelType.GuildText, name: "📣・updates" },
      { key: "announcements", type: ChannelType.GuildText, name: "🎉・announcements" },
      { key: "boosts", type: ChannelType.GuildText, name: "✨・boosts" },
      { key: "giveaways", type: ChannelType.GuildText, name: "🎊・giveaways" },
      { key: "role-system", type: ChannelType.GuildText, name: "📘・role-system" },
      { key: "proofs", type: ChannelType.GuildText, name: "✅・proofs" },
      { key: "invite-rewards", type: ChannelType.GuildText, name: "📝・invite-rewards" },
      { key: "reaction-roles", type: ChannelType.GuildText, name: "🌸・reaction-roles" },
      { key: "collabs", type: ChannelType.GuildText, name: "🤝・collabs" },
      { key: "staff-chat", type: ChannelType.GuildText, name: "🛡️・staff-chat" },
    ],
  },
  {
    key: "support",
    name: "SUPPORT",
    channels: [{ key: "tickets", type: ChannelType.GuildText, name: "🎟️・tickets" }],
  },
  {
    key: "chats",
    name: "Chats 💭",
    channels: [
      { key: "global-chat", type: ChannelType.GuildText, name: "🌍・global-chat" },
      { key: "commands", type: ChannelType.GuildText, name: "💻・commands" },
      { key: "full-focus", type: ChannelType.GuildText, name: "🤡・full-focus" },
      { key: "owner-battlecards", type: ChannelType.GuildText, name: "👑・owner-battlecards" },
      { key: "famous-battlecards", type: ChannelType.GuildText, name: "💎・famous-battlecards" },
      { key: "private-calls", type: ChannelType.GuildText, name: "🔒・private-calls" },
      { key: "prvt-owners", type: ChannelType.GuildText, name: "🔐・prvt-owners" },
    ],
  },
  {
    key: "wintrading",
    name: "Wintrading 🎨",
    channels: [
      { key: "our-spray", type: ChannelType.GuildText, name: "🎨・our-spray" },
      { key: "exclusive-battlecards", type: ChannelType.GuildText, name: "💍・exclusive-battlecards" },
      { key: "member-battlecards", type: ChannelType.GuildText, name: "🖼️・member-battlecards" },
      { key: "map-rotation", type: ChannelType.GuildText, name: "🗺️・map-rotation" },
      { key: "banned-brawlers", type: ChannelType.GuildText, name: "❌・banned-brawlers" },
      { key: "trading-times", type: ChannelType.GuildText, name: "⏳・trading-times" },
    ],
  },
  {
    key: "creators",
    name: "Content Creators 📹",
    channels: [{ key: "content-chat", type: ChannelType.GuildText, name: "🧠・content-chat" }],
  },
  {
    key: "calls",
    name: "Calls 📞",
    channels: [
      { key: "solo-owners-stage", type: ChannelType.GuildVoice, name: "✨・Solo Owners Stage" },
      { key: "owner-call", type: ChannelType.GuildVoice, name: "👑・Owner Call" },
      { key: "mini-wave", type: ChannelType.GuildVoice, name: "🌊・Mini Wave" },
      { key: "solo-1", type: ChannelType.GuildVoice, name: "🔊・Solo 1", userLimit: 1 },
      { key: "solo-2", type: ChannelType.GuildVoice, name: "🔊・Solo 2", userLimit: 1 },
      { key: "solo-3", type: ChannelType.GuildVoice, name: "🔊・Solo 3", userLimit: 1 },
      { key: "solo-4", type: ChannelType.GuildVoice, name: "🔊・Solo 4", userLimit: 1 },
      { key: "solo-5", type: ChannelType.GuildVoice, name: "🔊・Solo 5", userLimit: 1 },
      { key: "duo-1", type: ChannelType.GuildVoice, name: "🔊・Duo 1", userLimit: 2 },
      { key: "duo-2", type: ChannelType.GuildVoice, name: "🔊・Duo 2", userLimit: 2 },
      { key: "duo-3", type: ChannelType.GuildVoice, name: "🔊・Duo 3", userLimit: 2 },
      { key: "duo-4", type: ChannelType.GuildVoice, name: "🔊・Duo 4", userLimit: 2 },
      { key: "trio-1", type: ChannelType.GuildVoice, name: "🔊・Trio 1", userLimit: 3 },
      { key: "trio-2", type: ChannelType.GuildVoice, name: "🔊・Trio 2", userLimit: 3 },
      { key: "trio-3", type: ChannelType.GuildVoice, name: "🔊・Trio 3", userLimit: 3 },
      { key: "squad-1", type: ChannelType.GuildVoice, name: "🔊・Squad 1", userLimit: 4 },
    ],
  },
];

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages];
if (ENABLE_MESSAGE_CONTENT) {
  intents.push(GatewayIntentBits.MessageContent);
}
if (ENABLE_GUILD_MEMBERS) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({ intents, partials: [Partials.Channel] });
const giveawayTimeouts = new Map();
const giveawayLocks = new Map();

ensureDataFiles();

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(TOKENS_FILE)) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(GIVEAWAYS_FILE)) {
    fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(QUEUES_FILE)) {
    fs.writeFileSync(QUEUES_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(SHOP_FILE)) {
    fs.writeFileSync(SHOP_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(BACKUPS_FILE)) {
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(AI_DMS_FILE)) {
    fs.writeFileSync(AI_DMS_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(MY_ROLES_FILE)) {
    fs.writeFileSync(MY_ROLES_FILE, JSON.stringify({}, null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${path.basename(filePath)}:`, error);
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getAiDmStore() {
  return readJson(AI_DMS_FILE, {});
}

function updateAiDmStore(updater) {
  const current = getAiDmStore();
  const next = updater(current);
  writeJson(AI_DMS_FILE, next);
  return next;
}

function clearAiDmConversation(userId) {
  updateAiDmStore((current) => {
    const next = { ...current };
    delete next[userId];
    return next;
  });
}

function getMyRoleStore() {
  return readJson(MY_ROLES_FILE, {});
}

function updateMyRoleStore(updater) {
  const current = getMyRoleStore();
  const next = updater(current);
  writeJson(MY_ROLES_FILE, next);
  return next;
}

function getGuildMyRole(guildId, userId) {
  const store = getMyRoleStore();
  return store[guildId]?.[userId] || null;
}

function setGuildMyRole(guildId, userId, roleId) {
  updateMyRoleStore((current) => ({
    ...current,
    [guildId]: {
      ...(current[guildId] || {}),
      [userId]: roleId,
    },
  }));
}

function removeGuildMyRole(guildId, userId) {
  updateMyRoleStore((current) => {
    const next = { ...current };
    if (!next[guildId]) {
      return next;
    }

    const nextGuild = { ...next[guildId] };
    delete nextGuild[userId];

    if (Object.keys(nextGuild).length) {
      next[guildId] = nextGuild;
    } else {
      delete next[guildId];
    }

    return next;
  });
}

function parseHexColor(input) {
  if (!input) {
    return null;
  }

  const normalized = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return parseInt(normalized, 16);
}

function formatAiDmReply(reply) {
  const suffix = "\n\n*script by verk*";
  const maxReplyLength = 1900 - suffix.length;
  const safeReply = reply.trim().slice(0, Math.max(0, maxReplyLength));
  return `${safeReply}${suffix}`;
}

async function createAiDmResponse(userId, input) {
  if (OPENROUTER_API_KEY) {
    const store = getAiDmStore();
    const previousMessages = Array.isArray(store[userId]?.messages) ? store[userId].messages : [];
    const messages = [
      {
        role: "system",
        content:
          "You are Botify AI, a helpful Discord assistant. Reply in German by default unless the user clearly writes in another language. Keep replies concise, friendly, and easy to understand. Use plain text only.",
      },
      ...previousMessages,
      { role: "user", content: input },
    ].slice(-20);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://discord.com",
        "X-OpenRouter-Title": "Botify Discord Bot",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || `OpenRouter API error ${response.status}`;
      throw new Error(errorMessage);
    }

    const rawContent = data?.choices?.[0]?.message?.content;
    const outputText = Array.isArray(rawContent)
      ? rawContent
          .map((part) => (typeof part?.text === "string" ? part.text : typeof part === "string" ? part : ""))
          .join("")
          .trim()
      : typeof rawContent === "string"
        ? rawContent.trim()
        : "";
    if (!outputText) {
      throw new Error("OpenRouter API returned no text output.");
    }

    updateAiDmStore((current) => ({
      ...current,
      [userId]: {
        messages: [...messages.filter((message) => message.role !== "system"), { role: "assistant", content: outputText }].slice(-20),
        updatedAt: new Date().toISOString(),
      },
    }));

    return outputText;
  }

  const store = getAiDmStore();
  const previousResponseId = store[userId]?.previousResponseId || null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      previous_response_id: previousResponseId || undefined,
      instructions:
        "You are Botify AI, a helpful Discord assistant. Reply in German by default unless the user clearly writes in another language. Keep replies concise, friendly, and easy to understand. Use plain text only.",
      input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429 && errorText.includes("insufficient_quota")) {
      throw new Error("AI_TEMPORARILY_UNAVAILABLE_QUOTA");
    }

    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";

  if (!outputText) {
    throw new Error("OpenAI API returned no text output.");
  }

  updateAiDmStore((current) => ({
    ...current,
    [userId]: {
      previousResponseId: data.id,
      updatedAt: new Date().toISOString(),
    },
  }));

  return outputText;
}

function getAllGuildConfigs() {
  return readJson(CONFIG_FILE, {});
}

function getGuildConfig(guildId) {
  const configs = getAllGuildConfigs();
  const guildConfig = configs[guildId] || {};
  return {
    ...GUILD_CONFIG_DEFAULTS,
    ...guildConfig,
    selfAssignableRoleIds: Array.isArray(guildConfig.selfAssignableRoleIds)
      ? guildConfig.selfAssignableRoleIds
      : [],
  };
}

function updateGuildConfig(guildId, updater) {
  const configs = getAllGuildConfigs();
  const current = {
    ...GUILD_CONFIG_DEFAULTS,
    ...(configs[guildId] || {}),
  };
  const next = updater(current);
  configs[guildId] = next;
  writeJson(CONFIG_FILE, configs);
  return next;
}

function getValidSelfAssignableRoles(guild, guildConfig) {
  return (guildConfig.selfAssignableRoleIds || [])
    .map((roleId) => guild.roles.cache.get(roleId))
    .filter((role) => role && !role.managed);
}

function pruneInvalidSelfAssignableRoles(guild) {
  const guildConfig = getGuildConfig(guild.id);
  const validRoleIds = getValidSelfAssignableRoles(guild, guildConfig).map((role) => role.id);
  const currentRoleIds = guildConfig.selfAssignableRoleIds || [];

  if (validRoleIds.length === currentRoleIds.length) {
    return guildConfig;
  }

  return updateGuildConfig(guild.id, (current) => ({
    ...current,
    selfAssignableRoleIds: validRoleIds,
  }));
}

function getTokenStore() {
  return readJson(TOKENS_FILE, {});
}

function getBackupStore() {
  return readJson(BACKUPS_FILE, {});
}

function setBackupStore(store) {
  writeJson(BACKUPS_FILE, store);
}

function setTokenStore(store) {
  writeJson(TOKENS_FILE, store);
}

function getTokens(userId) {
  const store = getTokenStore();
  return Number(store[userId] || 0);
}

function setTokens(userId, amount) {
  const store = getTokenStore();
  store[userId] = Math.max(0, Number(amount) || 0);
  setTokenStore(store);
  return store[userId];
}

function addTokens(userId, amount) {
  return setTokens(userId, getTokens(userId) + amount);
}

function removeTokens(userId, amount) {
  return setTokens(userId, getTokens(userId) - amount);
}

function getGiveawayStore() {
  return readJson(GIVEAWAYS_FILE, {});
}

function setGiveawayStore(store) {
  writeJson(GIVEAWAYS_FILE, store);
}

function getUniqueParticipantIds(giveaway) {
  return [...new Set(giveaway?.participants || [])];
}

async function withGiveawayLock(messageId, task) {
  const previous = giveawayLocks.get(messageId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });

  giveawayLocks.set(messageId, previous.then(() => current));

  await previous;

  try {
    return await task();
  } finally {
    release();
    if (giveawayLocks.get(messageId) === current) {
      giveawayLocks.delete(messageId);
    }
  }
}

function getQueueStore() {
  return readJson(QUEUES_FILE, {});
}

function setQueueStore(store) {
  writeJson(QUEUES_FILE, store);
}

function getGuildQueue(guildId) {
  const store = getQueueStore();
  return Array.isArray(store[guildId]) ? store[guildId] : [];
}

function updateGuildQueue(guildId, updater) {
  const store = getQueueStore();
  const current = Array.isArray(store[guildId]) ? store[guildId] : [];
  const next = updater([...current]);
  store[guildId] = next;
  setQueueStore(store);
  return next;
}

function getShopStore() {
  return readJson(SHOP_FILE, {});
}

function setShopStore(store) {
  writeJson(SHOP_FILE, store);
}

function getGuildShopItems(guildId) {
  const store = getShopStore();
  return Array.isArray(store[guildId]) ? store[guildId] : [];
}

function updateGuildShopItems(guildId, updater) {
  const store = getShopStore();
  const current = Array.isArray(store[guildId]) ? store[guildId] : [];
  const next = updater([...current]);
  store[guildId] = next;
  setShopStore(store);
  return next;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseDuration(input) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(input || "");
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
}

function formatDuration(ms) {
  if (ms % 86400000 === 0) {
    return `${ms / 86400000}d`;
  }
  if (ms % 3600000 === 0) {
    return `${ms / 3600000}h`;
  }
  if (ms % 60000 === 0) {
    return `${ms / 60000}m`;
  }
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
}

function hasStrongStaffPermissions(member) {
  if (!member) {
    return false;
  }

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    member.permissions.has(PermissionsBitField.Flags.ManageRoles)
  );
}

function hasSetupAccess(member) {
  if (!member) {
    return false;
  }

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild)
  );
}

function hasTimeoutAccess(member) {
  if (!member) {
    return false;
  }

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
  );
}

function hasBanAccess(member) {
  if (!member) {
    return false;
  }

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.BanMembers)
  );
}

function hasBotOwnerAccess(userId) {
  if (!userId) {
    return false;
  }

  if (BOT_OWNER_ID) {
    return userId === BOT_OWNER_ID;
  }

  const owner = client.application?.owner;
  if (!owner) {
    return false;
  }

  if ("id" in owner && owner.id) {
    return owner.id === userId;
  }

  if ("members" in owner && owner.members) {
    return owner.members.some((member) => member.id === userId);
  }

  return false;
}

function hasStaffAccess(member, guildConfig) {
  if (!member) {
    return false;
  }

  if (hasStrongStaffPermissions(member)) {
    return true;
  }

  return guildConfig.supportRoleId
    ? member.roles.cache.has(guildConfig.supportRoleId)
    : false;
}

function hasGiveawayAccess(member, guildConfig) {
  if (!member) {
    return false;
  }

  if (hasStrongStaffPermissions(member)) {
    return true;
  }

  if (guildConfig.giveawayHostRoleId && member.roles.cache.has(guildConfig.giveawayHostRoleId)) {
    return true;
  }

  return guildConfig.supportRoleId ? member.roles.cache.has(guildConfig.supportRoleId) : false;
}

function serializeOverwrite(overwrite) {
  if (!overwrite) {
    return null;
  }

  return {
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  };
}

function serializeOverwriteCollection(collection, skipId = null) {
  return [...collection.values()]
    .filter((overwrite) => overwrite.id !== skipId)
    .map((overwrite) => serializeOverwrite(overwrite));
}

function buildEveryoneLockPermissions(channelType) {
  const permissions = {
    CreateInstantInvite: false,
    SendMessages: false,
    AddReactions: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    UseApplicationCommands: false,
  };

  if (
    channelType === ChannelType.GuildVoice ||
    channelType === ChannelType.GuildStageVoice
  ) {
    permissions.Connect = false;
    permissions.Speak = false;
    permissions.Stream = false;
    permissions.UseEmbeddedActivities = false;
  }

  return permissions;
}

function getLockTargetRoles(guild) {
  return guild.roles.cache.filter(
    (role) =>
      role.id !== guild.roles.everyone.id &&
      !role.managed &&
      !role.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

async function applySecureMode(guild, actor) {
  const guildConfig = getGuildConfig(guild.id);
  if (guildConfig.secureMode) {
    return { ok: false, message: "Secure mode is already enabled for this server." };
  }

  const everyoneRole = guild.roles.everyone;
  const snapshot = {
    activatedAt: new Date().toISOString(),
    activatedBy: actor.id,
    everyonePermissions: everyoneRole.permissions.bitfield.toString(),
    channels: guild.channels.cache.map((channel) => ({
      channelId: channel.id,
      everyoneOverwrite: serializeOverwrite(channel.permissionOverwrites.cache.get(everyoneRole.id)),
      otherOverwrites: serializeOverwriteCollection(channel.permissionOverwrites.cache, everyoneRole.id),
    })),
  };

  updateGuildConfig(guild.id, (current) => ({
    ...current,
    secureMode: true,
    secureSnapshot: snapshot,
  }));

  const tightenedEveryonePermissions = new PermissionsBitField(BigInt(snapshot.everyonePermissions)).remove(
    PermissionsBitField.Flags.CreateInstantInvite,
    PermissionsBitField.Flags.MentionEveryone
  );

  await everyoneRole.setPermissions(
    tightenedEveryonePermissions,
    `Secure mode enabled by ${actor.tag}`
  );

  for (const channel of guild.channels.cache.values()) {
    await channel.permissionOverwrites.edit(
      everyoneRole,
      buildEveryoneLockPermissions(channel.type),
      { reason: `Secure mode enabled by ${actor.tag}` }
    );
  }

  return {
    ok: true,
    message:
      "Secure mode enabled. Public channels are locked, voice connect is blocked, and invite permissions were restricted.",
  };
}

async function restoreSecureMode(guild, actor) {
  const guildConfig = getGuildConfig(guild.id);
  if (!guildConfig.secureMode || !guildConfig.secureSnapshot) {
    return { ok: false, message: "Secure mode is not currently enabled for this server." };
  }

  const everyoneRole = guild.roles.everyone;
  const snapshot = guildConfig.secureSnapshot;

  if (snapshot.everyonePermissions) {
    await everyoneRole.setPermissions(
      new PermissionsBitField(BigInt(snapshot.everyonePermissions)),
      `Secure mode disabled by ${actor.tag}`
    );
  }

  for (const channelSnapshot of snapshot.channels || []) {
    const channel = guild.channels.cache.get(channelSnapshot.channelId);
    if (!channel) {
      continue;
    }

    const overwrites = [...(channelSnapshot.otherOverwrites || [])];
    if (channelSnapshot.everyoneOverwrite) {
      overwrites.push(channelSnapshot.everyoneOverwrite);
    }

    await channel.permissionOverwrites.set(overwrites, `Secure mode disabled by ${actor.tag}`);
  }

  updateGuildConfig(guild.id, (current) => ({
    ...current,
    secureMode: false,
    secureSnapshot: null,
  }));

  return {
    ok: true,
    message: "Secure mode disabled. Saved channel permissions were restored.",
  };
}

function findRole(guild, query) {
  if (!query) {
    return null;
  }

  const normalized = query.replace(/[<@&>]/g, "");
  return (
    guild.roles.cache.get(normalized) ||
    guild.roles.cache.find((role) => role.name.toLowerCase() === query.toLowerCase()) ||
    guild.roles.cache.find((role) => role.name.toLowerCase().includes(query.toLowerCase()))
  );
}

function findCategory(guild, query) {
  if (!query) {
    return null;
  }

  return guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildCategory) {
      return false;
    }

    return (
      channel.id === query ||
      channel.name.toLowerCase() === query.toLowerCase() ||
      channel.name.toLowerCase().includes(query.toLowerCase())
    );
  });
}

function findChannelByName(guild, parentId, channelName, channelType) {
  return guild.channels.cache.find(
    (channel) =>
      channel.parentId === parentId &&
      channel.type === channelType &&
      channel.name.toLowerCase() === channelName.toLowerCase()
  );
}

async function ensureRole(guild, roleName, options = {}) {
  const existing = guild.roles.cache.find((role) => role.name.toLowerCase() === roleName.toLowerCase());
  if (existing) {
    return { role: existing, created: false };
  }

  const role = await guild.roles.create({
    name: roleName,
    mentionable: true,
    hoist: false,
    ...options,
  });

  return { role, created: true };
}

async function ensureCategory(guild, categoryName) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === categoryName.toLowerCase()
  );

  if (existing) {
    return { channel: existing, created: false };
  }

  const channel = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
  });

  return { channel, created: true };
}

async function ensureGuildChannel(guild, categoryId, config) {
  const effectiveType =
    config.type === ChannelType.GuildAnnouncement && !guild.features.includes("COMMUNITY")
      ? ChannelType.GuildText
      : config.type;
  const existing = findChannelByName(guild, categoryId, config.name, effectiveType);
  if (existing) {
    return { channel: existing, created: false };
  }

  const channel = await guild.channels.create({
    name: config.name,
    type: effectiveType,
    parent: categoryId,
    userLimit: config.userLimit || undefined,
    permissionOverwrites: config.permissionOverwrites || undefined,
  });

  return { channel, created: true };
}

function buildVisibleReadOnlyOverwrites(guild, allowedRoleIds) {
  return [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      deny: [PermissionsBitField.Flags.SendMessages],
    },
    ...allowedRoleIds.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.SendMessages,
      ],
    })),
  ];
}

function buildRestrictedVoiceOverwrites(guild, allowedRoleIds) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
    },
    ...allowedRoleIds.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
        PermissionsBitField.Flags.Stream,
        PermissionsBitField.Flags.UseVAD,
      ],
    })),
  ];
}

async function sendWelcomeMessage(member) {
  const guildConfig = getGuildConfig(member.guild.id);
  if (!guildConfig.welcomeChannelId) {
    return;
  }

  const channel = await member.client.channels.fetch(guildConfig.welcomeChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  await channel.send(`Welcome to Solo Traders ${member} enjoy your stay`);
}

async function sendGoodbyeMessage(member) {
  const guildConfig = getGuildConfig(member.guild.id);
  if (!guildConfig.goodbyeChannelId) {
    return;
  }

  const channel = await member.client.channels.fetch(guildConfig.goodbyeChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const memberCount = Math.max(0, member.guild.memberCount - 1);
  await channel.send(`${member.user.tag} left, we now have **${memberCount}** members.`);
}

async function deleteAllGuildChannels(guild) {
  const channels = [...guild.channels.cache.values()].sort((a, b) => {
    if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) {
      return 1;
    }
    if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) {
      return -1;
    }
    return 0;
  });

  let deleted = 0;
  let skipped = 0;

  for (const channel of channels) {
    try {
      await channel.delete("Bulk delete requested by admin");
      deleted += 1;
    } catch (error) {
      skipped += 1;
      console.error(`Failed to delete channel ${channel.id}:`, error);
    }
  }

  return { deleted, skipped };
}

function normalizeBackupName(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

function serializePermissionOverwrites(channel) {
  return channel.permissionOverwrites.cache
    .map((overwrite) => {
      if (overwrite.type === 0) {
        const role = channel.guild.roles.cache.get(overwrite.id);
        if (!role) {
          return null;
        }

        return {
          targetType: role.id === channel.guild.roles.everyone.id ? "everyone" : "role",
          targetName: role.name,
          allow: overwrite.allow.toArray(),
          deny: overwrite.deny.toArray(),
        };
      }

      return null;
    })
    .filter(Boolean);
}

function createGuildBackupSnapshot(guild) {
  const guildConfig = getGuildConfig(guild.id);
  const roles = guild.roles.cache
    .filter((role) => role.id !== guild.roles.everyone.id && !role.managed)
    .sort((a, b) => a.position - b.position)
    .map((role) => ({
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
    }));

  const categories = guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((category) => ({
      name: category.name,
      permissionOverwrites: serializePermissionOverwrites(category),
    }));

  const channels = guild.channels.cache
    .filter((channel) => channel.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((channel) => ({
      name: channel.name,
      type: channel.type,
      parentName: channel.parent?.name || null,
      topic: "topic" in channel ? channel.topic || null : null,
      nsfw: "nsfw" in channel ? Boolean(channel.nsfw) : false,
      userLimit: "userLimit" in channel ? channel.userLimit || 0 : 0,
      permissionOverwrites: serializePermissionOverwrites(channel),
    }));

  const resolveRoleName = (roleId) => guild.roles.cache.get(roleId)?.name || "";
  const resolveChannelName = (channelId) => guild.channels.cache.get(channelId)?.name || "";

  return {
    guildName: guild.name,
    createdAt: new Date().toISOString(),
    roles,
    categories,
    channels,
    config: {
      prefix: guildConfig.prefix,
      supportRoleName: resolveRoleName(guildConfig.supportRoleId),
      giveawayHostRoleName: resolveRoleName(guildConfig.giveawayHostRoleId),
      ticketCategoryName: resolveChannelName(guildConfig.ticketCategoryId),
      ticketPanelChannelName: resolveChannelName(guildConfig.ticketPanelChannelId),
      welcomeChannelName: resolveChannelName(guildConfig.welcomeChannelId),
      goodbyeChannelName: resolveChannelName(guildConfig.goodbyeChannelId),
      selfAssignableRoleNames: (guildConfig.selfAssignableRoleIds || [])
        .map((roleId) => resolveRoleName(roleId))
        .filter(Boolean),
      panelImageUrl: guildConfig.panelImageUrl || "",
    },
  };
}

async function ensureBackupRole(guild, roleData) {
  const existing = guild.roles.cache.find((role) => role.name === roleData.name && !role.managed);
  if (existing) {
    return existing;
  }

  return guild.roles.create({
    name: roleData.name,
    color: roleData.color,
    hoist: roleData.hoist,
    mentionable: roleData.mentionable,
    permissions: BigInt(roleData.permissions),
  });
}

function buildBackupOverwrites(guild, roleMap, overwrites) {
  return (overwrites || [])
    .map((overwrite) => {
      let targetId = null;
      if (overwrite.targetType === "everyone") {
        targetId = guild.roles.everyone.id;
      } else if (overwrite.targetType === "role") {
        targetId = roleMap.get(overwrite.targetName)?.id || null;
      }

      if (!targetId) {
        return null;
      }

      return {
        id: targetId,
        allow: overwrite.allow || [],
        deny: overwrite.deny || [],
      };
    })
    .filter(Boolean);
}

async function applyBackupToGuild(guild, backup) {
  const roleMap = new Map();
  let createdRoles = 0;
  let createdCategories = 0;
  let createdChannels = 0;

  for (const roleData of backup.roles || []) {
    const role = await ensureBackupRole(guild, roleData);
    roleMap.set(roleData.name, role);
    if (role.name === roleData.name && role.permissions.bitfield.toString() === roleData.permissions) {
      // no-op
    }
    if (!guild.roles.cache.find((cachedRole) => cachedRole.id === role.id && cachedRole.name === roleData.name)) {
      // no-op
    }
  }

  for (const roleData of backup.roles || []) {
    const role = guild.roles.cache.find((cachedRole) => cachedRole.name === roleData.name && !cachedRole.managed);
    if (role) {
      roleMap.set(roleData.name, role);
    }
  }

  const categoryMap = new Map();
  for (const categoryData of backup.categories || []) {
    const existing = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryData.name
    );

    if (existing) {
      categoryMap.set(categoryData.name, existing);
      continue;
    }

    const category = await guild.channels.create({
      name: categoryData.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: buildBackupOverwrites(guild, roleMap, categoryData.permissionOverwrites),
    });
    categoryMap.set(categoryData.name, category);
    createdCategories += 1;
  }

  for (const channelData of backup.channels || []) {
    const channelType =
      channelData.type === ChannelType.GuildAnnouncement && !guild.features.includes("COMMUNITY")
        ? ChannelType.GuildText
        : channelData.type;
    const parentId = channelData.parentName ? categoryMap.get(channelData.parentName)?.id || null : null;

    const existing = guild.channels.cache.find(
      (channel) =>
        channel.type === channelType &&
        channel.name === channelData.name &&
        (channel.parentId || null) === parentId
    );

    if (existing) {
      continue;
    }

    await guild.channels.create({
      name: channelData.name,
      type: channelType,
      parent: parentId,
      topic: channelData.topic || undefined,
      nsfw: channelData.nsfw || false,
      userLimit: channelData.userLimit || undefined,
      permissionOverwrites: buildBackupOverwrites(guild, roleMap, channelData.permissionOverwrites),
    });
    createdChannels += 1;
  }

  const findRoleIdByName = (name) => (name ? guild.roles.cache.find((role) => role.name === name)?.id || "" : "");
  const findChannelIdByName = (name) => (name ? guild.channels.cache.find((channel) => channel.name === name)?.id || "" : "");

  updateGuildConfig(guild.id, (current) => ({
    ...current,
    prefix: backup.config?.prefix || current.prefix,
    supportRoleId: findRoleIdByName(backup.config?.supportRoleName) || current.supportRoleId,
    giveawayHostRoleId: findRoleIdByName(backup.config?.giveawayHostRoleName) || current.giveawayHostRoleId,
    ticketCategoryId: findChannelIdByName(backup.config?.ticketCategoryName) || current.ticketCategoryId,
    ticketPanelChannelId: findChannelIdByName(backup.config?.ticketPanelChannelName) || current.ticketPanelChannelId,
    welcomeChannelId: findChannelIdByName(backup.config?.welcomeChannelName) || current.welcomeChannelId,
    goodbyeChannelId: findChannelIdByName(backup.config?.goodbyeChannelName) || current.goodbyeChannelId,
    selfAssignableRoleIds:
      (backup.config?.selfAssignableRoleNames || [])
        .map((roleName) => findRoleIdByName(roleName))
        .filter(Boolean),
    panelImageUrl: backup.config?.panelImageUrl || current.panelImageUrl,
  }));

  createdRoles = (backup.roles || []).filter(
    (roleData) => guild.roles.cache.find((role) => role.name === roleData.name && !role.managed)
  ).length;

  return { createdRoles, createdCategories, createdChannels };
}

async function runWintradeSetup(guild) {
  let createdCategories = 0;
  let createdChannels = 0;
  let createdRoles = 0;
  const privateRoleIds = [];
  let ticketsChannelId = "";
  let ticketCategoryId = "";
  let welcomeChannelId = "";
  let goodbyeChannelId = "";
  const staffRoles = {};

  for (const roleName of [
    "Owner",
    "Admin",
    "Head Moderator",
    "Moderator",
    "Support Team",
    "Mini Wave Mod",
    "Mini Wave Headmod",
  ]) {
    const { role, created } = await ensureRole(guild, roleName);
    staffRoles[roleName] = role;
    if (created) {
      createdRoles += 1;
    }
  }

  const staffAccessRoleIds = [
    staffRoles.Owner?.id,
    staffRoles.Admin?.id,
    staffRoles["Head Moderator"]?.id,
    staffRoles.Moderator?.id,
    staffRoles["Support Team"]?.id,
    staffRoles["Mini Wave Mod"]?.id,
    staffRoles["Mini Wave Headmod"]?.id,
  ].filter(Boolean);

  for (const categoryConfig of WINTRADE_SETUP_STRUCTURE) {
    const { channel: category, created } = await ensureCategory(guild, categoryConfig.name);
    if (created) {
      createdCategories += 1;
    }

    if (categoryConfig.key === "support") {
      ticketCategoryId = category.id;
    }

    for (const channelConfig of categoryConfig.channels) {
      let permissionOverwrites = channelConfig.permissionOverwrites;

      if (["updates", "announcements"].includes(channelConfig.key)) {
        channelConfig.type = ChannelType.GuildAnnouncement;
      }

      if (["welcome", "goodbye", "rules", "invites", "boosts", "proofs", "invite-rewards"].includes(channelConfig.key)) {
        permissionOverwrites = buildVisibleReadOnlyOverwrites(guild, staffAccessRoleIds);
      }

      if (channelConfig.key === "role-system" || channelConfig.key === "reaction-roles") {
        permissionOverwrites = buildVisibleReadOnlyOverwrites(guild, staffAccessRoleIds);
      }

      if (channelConfig.key === "updates" || channelConfig.key === "announcements") {
        permissionOverwrites = buildVisibleReadOnlyOverwrites(guild, [
          staffRoles["Head Moderator"]?.id,
        ].filter(Boolean));
      }

      if (channelConfig.key === "staff-chat") {
        permissionOverwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          ...staffAccessRoleIds.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.SendMessages,
            ],
          })),
        ];
      }

      if (channelConfig.key === "prvt-owners") {
        permissionOverwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          ...[
            staffRoles.Owner?.id,
            staffRoles.Admin?.id,
            staffRoles["Head Moderator"]?.id,
          ]
            .filter(Boolean)
            .map((roleId) => ({
              id: roleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.SendMessages,
              ],
            })),
        ];
      }

      if (channelConfig.key === "solo-owners-stage" || channelConfig.key === "owner-call") {
        permissionOverwrites = buildRestrictedVoiceOverwrites(guild, staffAccessRoleIds);
      }

      if (channelConfig.key === "mini-wave") {
        permissionOverwrites = [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            deny: [PermissionsBitField.Flags.Speak],
          },
          {
            id: staffRoles["Mini Wave Mod"]?.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.Stream,
              PermissionsBitField.Flags.UseVAD,
            ],
          },
          {
            id: staffRoles["Mini Wave Headmod"]?.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.Stream,
              PermissionsBitField.Flags.UseVAD,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
              PermissionsBitField.Flags.MoveMembers,
            ],
          },
        ].filter((entry) => entry.id);
      }

      const result = await ensureGuildChannel(guild, category.id, {
        ...channelConfig,
        permissionOverwrites,
      });
      if (result.created) {
        createdChannels += 1;
      }

      if (channelConfig.key === "welcome") {
        welcomeChannelId = result.channel.id;
      }

      if (channelConfig.key === "goodbye") {
        goodbyeChannelId = result.channel.id;
      }

      if (channelConfig.key === "tickets") {
        ticketsChannelId = result.channel.id;
      }
    }
  }

  const callsCategory = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === "calls 📞"
  );

  for (let index = 1; index <= 5; index += 1) {
    const { role, created } = await ensureRole(guild, `Prvt ${index}`);
    if (created) {
      createdRoles += 1;
    }

    privateRoleIds.push(role.id);

    if (callsCategory) {
      const privatePermissions = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.Connect],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
            PermissionsBitField.Flags.Stream,
            PermissionsBitField.Flags.UseVAD,
          ],
        },
      ];

      const result = await ensureGuildChannel(guild, callsCategory.id, {
        name: `Prvt ${index}`,
        type: ChannelType.GuildVoice,
        userLimit: 5,
        permissionOverwrites: privatePermissions,
      });

      if (result.created) {
        createdChannels += 1;
      }
    }
  }

  return {
    createdCategories,
    createdChannels,
    createdRoles,
    privateRoleIds,
    supportRoleId: staffRoles["Support Team"]?.id || "",
    ticketsChannelId,
    ticketCategoryId,
    welcomeChannelId,
    goodbyeChannelId,
  };
}

function isRoleManageable(guild, role) {
  const botMember = guild.members.me;
  if (!botMember || !role) {
    return false;
  }

  return !role.managed && role.position < botMember.roles.highest.position;
}

function canMemberAssignRole(actorMember, role) {
  if (!actorMember || !role) {
    return false;
  }

  if (actorMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  return role.position < actorMember.roles.highest.position;
}

async function resolveMembersForRoleAll(guild, logLabel) {
  try {
    const members = await guild.members.fetch();
    return { members, isPartial: false };
  } catch (error) {
    console.error(`Failed to fetch members for ${logLabel}:`, error);
    return { members: guild.members.cache, isPartial: true };
  }
}

function buildPanelEmbed(guildConfig) {
  const embed = new EmbedBuilder()
    .setColor(0xc8a46a)
    .setTitle(BOT_TEXT.panelTitle)
    .setDescription(BOT_TEXT.panelDescription)
    .setFooter({ text: BOT_TEXT.panelFooter });

  if (guildConfig.panelImageUrl) {
    embed.setThumbnail(guildConfig.panelImageUrl);
  }

  return embed;
}

function buildPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open-ticket-giveaway")
        .setLabel(BOT_TEXT.giveawayButton)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("open-ticket-support")
        .setLabel(BOT_TEXT.supportButton)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("open-ticket-claim")
        .setLabel(BOT_TEXT.claimButton)
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function getRoleButtonStyle(role) {
  const colorValue = Number(role?.color || 0);
  if (!colorValue) {
    return ButtonStyle.Secondary;
  }

  const red = (colorValue >> 16) & 255;
  const green = (colorValue >> 8) & 255;
  const blue = colorValue & 255;

  if (red >= green && red >= blue && red > 90) {
    return ButtonStyle.Danger;
  }

  if (green >= red && green >= blue && green > 90) {
    return ButtonStyle.Success;
  }

  if (blue >= red && blue >= green && blue > 90) {
    return ButtonStyle.Primary;
  }

  return ButtonStyle.Secondary;
}

function buildRolePanelEmbed(guild, guildConfig) {
  const roles = getValidSelfAssignableRoles(guild, guildConfig).slice(0, 25);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Role Selection")
    .setDescription(
      roles.length
        ? [
            ...roles.map((role) => `${role} - **${role.name}**`),
            "",
            "*Click a button below to get or remove the role.*",
          ].join("\n")
        : "No self-assignable roles have been configured yet."
    )
    .setFooter({ text: "Botify • Click a button to get or remove a role" })
    .setTimestamp();
}

function buildRolePanelComponents(guild, guildConfig) {
  const roles = getValidSelfAssignableRoles(guild, guildConfig).slice(0, 25);

  const rows = [];

  for (let index = 0; index < roles.length; index += 5) {
    const chunk = roles.slice(index, index + 5);
    rows.push(
      new ActionRowBuilder().addComponents(
        ...chunk.map((role) =>
          new ButtonBuilder()
            .setCustomId(`rolepanel-toggle-${role.id}`)
            .setLabel(role.name.slice(0, 80))
            .setStyle(getRoleButtonStyle(role))
        )
      )
    );
  }

  return rows;
}

function buildTicketReasonModal(ticketType) {
  const input = new TextInputBuilder()
    .setCustomId("ticket-reason-input")
    .setLabel("What is this ticket about?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(5)
    .setMaxLength(500)
    .setPlaceholder("Describe your issue or request here...")
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(`ticket-reason-${ticketType}`)
    .setTitle(`Open ${TICKET_TYPES[ticketType]?.label || "Ticket"}`)
    .addComponents(new ActionRowBuilder().addComponents(input));
}

function buildShopEmbed(guild, userId = null) {
  const items = getGuildShopItems(guild.id)
    .map((item) => ({
      ...item,
      role: guild.roles.cache.get(item.roleId),
    }))
    .filter((item) => item.role)
    .slice(0, 25);

  const description = items.length
    ? items
        .map(
          (item, index) =>
            `\`${index + 1}.\` ${item.role} - **${item.role.name}** for **${item.price}** tokens`
        )
        .join("\n")
    : "No shop items have been added yet.";

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Botify Token Shop")
    .setDescription(
      [
        userId ? `Your balance: **${getTokens(userId)}** tokens` : "Spend your tokens on roles.",
        "",
        description,
        "",
        items.length ? "*Click a button below to buy a role.*" : "*Ask an admin to add shop items.*",
      ].join("\n")
    )
    .setFooter({ text: "Botify Shop • Tokens are spent instantly on purchase" })
    .setTimestamp();

  return embed;
}

function buildShopComponents(guild) {
  const items = getGuildShopItems(guild.id)
    .map((item) => ({
      ...item,
      role: guild.roles.cache.get(item.roleId),
    }))
    .filter((item) => item.role)
    .slice(0, 25);

  const rows = [];

  for (let index = 0; index < items.length; index += 5) {
    const chunk = items.slice(index, index + 5);
    rows.push(
      new ActionRowBuilder().addComponents(
        ...chunk.map((item) =>
          new ButtonBuilder()
            .setCustomId(`shop-buy-${item.roleId}`)
            .setLabel(`${item.role.name} (${item.price})`.slice(0, 80))
            .setStyle(getRoleButtonStyle(item.role))
        )
      )
    );
  }

  return rows;
}

function buildTicketControls() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket-claim")
        .setLabel(BOT_TEXT.claimButton)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("ticket-close")
        .setLabel(BOT_TEXT.closeButton)
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function buildQueueEmbed(guild) {
  const queue = getGuildQueue(guild.id);
  const guildConfig = getGuildConfig(guild.id);
  const previewList = queue.length
    ? queue
        .slice(0, 5)
        .map((userId, index) => `\`${index + 1}.\` <@${userId}>`)
        .join("\n")
    : "No one is waiting right now.";

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Botify Queue")
    .setDescription(
      [
        "**Priority support queue**",
        "Join the line below and wait for a moderator to pull you into a private ticket.",
        "",
        "When your turn comes up, staff can move you directly into support.",
      ].join("\n")
    )
    .addFields(
      {
        name: "Queue Size",
        value: `**${queue.length}** waiting`,
        inline: true,
      },
      {
        name: "Up Next",
        value: queue.length ? `<@${queue[0]}>` : "**No one queued**",
        inline: true,
      },
      {
        name: "Queue Mode",
        value: "Manual staff call",
        inline: true,
      },
      {
        name: "Live Preview",
        value: previewList,
      }
    )
    .setFooter({ text: "Botify Queue System | Staff can call the next user below." })
    .setTimestamp();

  if (guildConfig.panelImageUrl) {
    embed.setThumbnail(guildConfig.panelImageUrl);
  }

  return embed;
}

function buildQueueComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("queue-join")
        .setLabel("Join Queue")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("queue-leave")
        .setLabel("Leave Queue")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("queue-next")
        .setLabel("Next User")
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

function buildGiveawayButtons(messageId, isJoined = false, entryCount = 0) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway-toggle-${messageId}`)
        .setLabel(
          `${isJoined ? BOT_TEXT.leaveGiveawayButton : BOT_TEXT.joinGiveawayButton} (${entryCount})`
        )
        .setStyle(isJoined ? ButtonStyle.Danger : ButtonStyle.Success)
    ),
  ];
}

function buildGiveawayEmbed(giveaway) {
  const entryCount = getUniqueParticipantIds(giveaway).length;

  return new EmbedBuilder()
    .setColor(0xffb347)
    .setTitle("Botify Giveaway")
    .setDescription("Click the button below to join or leave this giveaway.")
    .addFields(
      { name: "Prize", value: `**${giveaway.prize}**`, inline: false },
      { name: "Hosted by", value: `<@${giveaway.hostId}>`, inline: true },
      { name: "Winners", value: `**${giveaway.winners}**`, inline: true },
      { name: "Entries", value: `**${entryCount}**`, inline: true },
      { name: "Ends", value: `<t:${Math.floor(giveaway.endsAt / 1000)}:R>`, inline: false }
    )
    .setFooter({ text: "Join before the timer ends." })
    .setTimestamp(giveaway.endsAt);
}

function buildHelpEmbed(prefix) {
  return new EmbedBuilder()
    .setColor(0xc8a46a)
    .setTitle("Botify Commands")
    .setDescription(
      [
        `Use \`${prefix}\` commands or slash commands like \`/help\`.`,
        "",
        "**Public**",
        `\`${prefix}help\` / \`/help\``,
        `\`/ip\``,
        `\`/ai\` (DMs)`,
        `\`${prefix}ai <nachricht>\``,
        `\`${prefix}panel\` / \`/panel\` / \`/ticket\``,
        `\`${prefix}queuepanel\` / \`/queuepanel\``,
        `\`/backup create\` / \`/backup use\` / \`/backup list\``,
        `\`/server list\` / \`/server info\` / \`/server roleinfo\` / \`/server channels\` / \`/server categories\``,
        `\`/server config\` / \`/server selfroles\` / \`/server stats\` / \`/server tickets\` / \`/server panels\``,
        `\`/server calls\` / \`/server setup\` / \`/server lock\` / \`/server leave\``,
        `\`${prefix}rolepanel\` / \`/rolepanel send\``,
        `\`${prefix}shop\` / \`/shop\``,
        `\`${prefix}shoppanel\` / \`/shoppanel\``,
        `\`/buy item:Boosts quantity:<anzahl>\``,
        `\`/boosts\``,
        `\`${prefix}selfrole @role\` / \`/selfrole\``,
        `\`${prefix}roleme @role\` / \`/roleme\``,
        `\`${prefix}tokens [@user]\` / \`/tokens\``,
        `\`${prefix}pay @user <amount>\` / \`/pay\``,
        `\`/myrole create\` / \`/myrole delete\``,
        `\`/mute\``,
        `\`/lock\` / \`/unlock\``,
        "",
        "**Staff**",
        `\`${prefix}role @user @role\` / \`/role\``,
        `\`${prefix}roleall @role\` / \`/roleall\``,
        `\`${prefix}giveaway <duration> <winners> <prize>\` / \`/giveaway\``,
        `\`${prefix}reroll <messageId>\` / \`/reroll\``,
        `\`${prefix}endgiveaway <messageId>\` / \`/endgiveaway\``,
        `\`${prefix}addtokens @user <amount>\` / \`/addtokens\``,
        `\`${prefix}removetokens @user <amount>\` / \`/removetokens\``,
        `\`/to user:<user> time:<time> reason:<reason>\``,
        `\`/ban user:<user> reason:<reason>\``,
        `\`/kickrole role:<role> reason:<reason>\``,
        "",
        "**Setup**",
        `\`${prefix}setpanel\` / \`/setpanel\``,
        `\`${prefix}setwelcome\` / \`/setwelcome\``,
        `\`${prefix}setgoodbye\` / \`/setgoodbye\``,
        `\`${prefix}setsupportrole @role\` / \`/setsupportrole\``,
        `\`${prefix}setticketcategory <category>\` / \`/setticketcategory\``,
        `\`${prefix}setprefix <prefix>\` / \`/setprefix\``,
        `\`/boosts available:<anzahl> price:<preis> note:<hinweis>\``,
        `\`/rolepanel setup\` / \`/rolepanel addrole\` / \`/rolepanel removerole\` / \`/rolepanel list\``,
        `\`/setup\``,
        `\`${prefix}delete confirm\` / \`/delete all\` / \`/delete channel\``,
        `\`${prefix}addselfrole @role\` / \`/addselfrole\``,
        `\`${prefix}removeselfrole @role\` / \`/removeselfrole\``,
        `\`${prefix}addshopitem @role <price>\` / \`/addshopitem\``,
        `\`${prefix}removeshopitem @role\` / \`/removeshopitem\``,
        `\`${prefix}config\` / \`/config\``,
        "",
        "**Buttons & Systems**",
        "Queue panel: Join Queue, Leave Queue, Next User",
        "Ticket panel: Claim, Giveaway, Support",
        "Role panel: Click once to get or remove a self-role",
        "Shop panel: Spend tokens on configured roles",
        "Giveaways: Join or leave with the giveaway button",
      ].join("\n")
    )
    .setFooter({ text: "Botify Help | Slash commands are recommended." });
}

function buildConfigEmbed(prefix, guildConfig, guild) {
  const supportRole = guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}>` : "Not set";
  const giveawayRole = guildConfig.giveawayHostRoleId
    ? `<@&${guildConfig.giveawayHostRoleId}>`
    : "Not set";
  const ticketCategory = guildConfig.ticketCategoryId
    ? guild.channels.cache.get(guildConfig.ticketCategoryId)?.name || guildConfig.ticketCategoryId
    : "Not set";
  const panelChannel = guildConfig.ticketPanelChannelId
    ? guild.channels.cache.get(guildConfig.ticketPanelChannelId)?.toString() ||
      guildConfig.ticketPanelChannelId
    : "Not set";
  const welcomeChannel = guildConfig.welcomeChannelId
    ? guild.channels.cache.get(guildConfig.welcomeChannelId)?.toString() || guildConfig.welcomeChannelId
    : "Not set";
  const goodbyeChannel = guildConfig.goodbyeChannelId
    ? guild.channels.cache.get(guildConfig.goodbyeChannelId)?.toString() || guildConfig.goodbyeChannelId
    : "Not set";
  const boostsAvailable = Math.max(0, Number(guildConfig.boostsAvailable) || 0);
  const boostsPrice = guildConfig.boostsPrice || "Not set";
  const boostsNote = guildConfig.boostsNote || "Not set";
  const selfRoles = guildConfig.selfAssignableRoleIds.length
    ? guildConfig.selfAssignableRoleIds.map((id) => `<@&${id}>`).join(", ")
    : "None";

  return new EmbedBuilder()
    .setColor(0x6aa7ff)
    .setTitle(`${guild.name} Configuration`)
    .setDescription(
      [
        `Prefix: \`${prefix}\``,
        `Support Role: ${supportRole}`,
        `Giveaway Host Role: ${giveawayRole}`,
        `Ticket Category: ${ticketCategory}`,
        `Panel Channel: ${panelChannel}`,
        `Welcome Channel: ${welcomeChannel}`,
        `Goodbye Channel: ${goodbyeChannel}`,
        `Boost Stock: ${boostsAvailable}`,
        `Boost Price: ${boostsPrice}`,
        `Boost Notes: ${boostsNote}`,
        `Self Roles: ${selfRoles}`,
        `Panel Image URL: ${guildConfig.panelImageUrl || "Not set"}`,
      ].join("\n")
    );
}

async function registerSlashCommands(readyClient) {
  const ipCommand = new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Show the Minecraft server IP.")
    .setDMPermission(true)
    .toJSON();

  const aiCommand = new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Start or continue an AI chat in DMs.")
    .setDMPermission(true)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Optional first message for the AI")
        .setRequired(false)
    )
    .toJSON();

  const serverCommand = new SlashCommandBuilder()
    .setName("server")
    .setDescription("Bot owner server management.")
    .setDMPermission(true)
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all servers the bot is currently in.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roleinfo")
        .setDescription("Show the roles of one server the bot is in.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Run the Botify wintrade setup on a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lock")
        .setDescription("Lock a server so everyone can no longer send messages.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("all")
            .setDescription("Also lock voice and stage channels")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Show info about one server the bot is in.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channels")
        .setDescription("Show channels of one server the bot is in.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("categories")
        .setDescription("Show categories of one server the bot is in.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Show the saved Botify config for one server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("selfroles")
        .setDescription("Show the configured self-roles for one server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("Show channel and role stats for one server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tickets")
        .setDescription("Show the ticket setup of one server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("panels")
        .setDescription("Show saved panel channels and image settings.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("calls")
        .setDescription("Show voice and stage channels of one server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leave")
        .setDescription("Make the bot leave a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("Choose the server")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .toJSON();

  const commands = [
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("Send the ticket panel in the current channel.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Send the ticket panel in the current channel.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("queuepanel")
      .setDescription("Send the queue panel in the current channel.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("backup")
      .setDescription("Create, list, or use a server backup.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("create")
          .setDescription("Create a backup of this server setup.")
          .addStringOption((option) =>
            option.setName("name").setDescription("Backup name").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("use")
          .setDescription("Use a saved backup on this server.")
          .addStringOption((option) =>
            option.setName("name").setDescription("Backup name").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("list").setDescription("List saved backups.")
      )
      .toJSON(),
    serverCommand,
    new SlashCommandBuilder()
      .setName("rolepanel")
      .setDescription("Manage and send the self-role panel.")
      .addSubcommand((subcommand) =>
        subcommand.setName("send").setDescription("Send the self-role panel in the current channel.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("addrole")
          .setDescription("Add a role to the role panel.")
          .addRoleOption((option) =>
            option.setName("role").setDescription("The role to add").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("removerole")
          .setDescription("Remove a role from the role panel.")
          .addRoleOption((option) =>
            option.setName("role").setDescription("The role to remove").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("list").setDescription("List all roles currently in the role panel.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("setup")
          .setDescription("Set up the role panel with up to five selected server roles.")
          .addRoleOption((option) =>
            option.setName("role1").setDescription("First role").setRequired(true)
          )
          .addRoleOption((option) =>
            option.setName("role2").setDescription("Second role").setRequired(false)
          )
          .addRoleOption((option) =>
            option.setName("role3").setDescription("Third role").setRequired(false)
          )
          .addRoleOption((option) =>
            option.setName("role4").setDescription("Fourth role").setRequired(false)
          )
          .addRoleOption((option) =>
            option.setName("role5").setDescription("Fifth role").setRequired(false)
          )
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("shop")
      .setDescription("Show the token shop.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("shoppanel")
      .setDescription("Send the token shop panel in the current channel.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Create a purchase request for available boosts.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("What you want to buy")
          .setRequired(true)
          .addChoices({ name: "Boosts", value: "boosts" })
      )
      .addIntegerOption((option) =>
        option
          .setName("quantity")
          .setDescription("How many boosts you want to buy")
          .setRequired(false)
          .setMinValue(1)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("boosts")
      .setDescription("Show or update the current boost stock.")
      .addIntegerOption((option) =>
        option
          .setName("available")
          .setDescription("How many boosts are currently available")
          .setRequired(false)
          .setMinValue(0)
      )
      .addStringOption((option) =>
        option
          .setName("price")
          .setDescription("Price text like 4€ each or 10€ per 3 boosts")
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("note")
          .setDescription("Optional note, payment info, or purchase instructions")
          .setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("help")
      .setDescription("Show the available bot commands.")
      .toJSON(),
    ipCommand,
    aiCommand,
    new SlashCommandBuilder()
      .setName("role")
      .setDescription("Add or remove a role for a user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The target user").setRequired(true)
      )
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to add or remove").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("roleall")
      .setDescription("Give a role to all members who do not have it.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to give").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("selfrole")
      .setDescription("Add or remove one of your self-assignable roles.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The self-assignable role").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("roleme")
      .setDescription("Add or remove one of your self-assignable roles.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The self-assignable role").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("tokens")
      .setDescription("Show a user's token balance.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to check").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("addtokens")
      .setDescription("Add tokens to a user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount of tokens").setRequired(true).setMinValue(1)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("removetokens")
      .setDescription("Remove tokens from a user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount of tokens").setRequired(true).setMinValue(1)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("pay")
      .setDescription("Send tokens to another user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The target user").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount of tokens").setRequired(true).setMinValue(1)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("giveaway")
      .setDescription("Start a giveaway.")
      .addStringOption((option) =>
        option.setName("duration").setDescription("Example: 10m, 1h, 1d").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("winners").setDescription("Number of winners").setRequired(true).setMinValue(1)
      )
      .addStringOption((option) =>
        option.setName("prize").setDescription("The giveaway prize").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("reroll")
      .setDescription("Reroll a giveaway winner.")
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Select an active giveaway")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("endgiveaway")
      .setDescription("End a giveaway immediately.")
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Select an active giveaway")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setpanel")
      .setDescription("Set the current channel as the ticket panel channel.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setwelcome")
      .setDescription("Set the welcome channel.")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The welcome channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setgoodbye")
      .setDescription("Set the goodbye channel.")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The goodbye channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("welcometest")
      .setDescription("Send a test welcome message.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setsupportrole")
      .setDescription("Set the support role.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The support role").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setticketcategory")
      .setDescription("Set the ticket category.")
      .addChannelOption((option) =>
        option
          .setName("category")
          .setDescription("The ticket category")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setprefix")
      .setDescription("Set the bot prefix for this server.")
      .addStringOption((option) =>
        option.setName("prefix").setDescription("The new prefix").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Create the Brawl Stars wintrade server setup.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("delete")
      .setDescription("Delete channels in this server.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("all")
          .setDescription("Delete all channels in this server.")
          .addBooleanOption((option) =>
            option
              .setName("confirm")
              .setDescription("Must be true to continue")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("channel")
          .setDescription("Delete one specific channel.")
          .addChannelOption((option) =>
            option.setName("channel").setDescription("The channel to delete").setRequired(true)
          )
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("addselfrole")
      .setDescription("Allow a role to be self-assigned.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to allow").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("removeselfrole")
      .setDescription("Remove a role from self-assignable roles.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to remove").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("addshopitem")
      .setDescription("Add a role to the token shop.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to sell").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("price").setDescription("Token price").setRequired(true).setMinValue(1)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("removeshopitem")
      .setDescription("Remove a role from the token shop.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to remove").setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("config")
      .setDescription("Show the current server configuration.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("myrole")
      .setDescription("Create or delete your own personal role.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("create")
          .setDescription("Create your own personal role.")
          .addStringOption((option) =>
            option.setName("name").setDescription("Role name").setRequired(true)
          )
          .addStringOption((option) =>
            option.setName("color").setDescription("Hex color like #ff8800").setRequired(false)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("delete").setDescription("Delete your personal role.")
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("to")
      .setDescription("Timeout a member.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The member to timeout").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("time").setDescription("Example: 10m, 1h, 1d").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the timeout").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a member from the server.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The member to ban").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the ban").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Server mute a member in voice channels.")
      .addUserOption((option) =>
        option.setName("user").setDescription("The member to mute").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the mute").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("lock")
      .setDescription("Lock the current text channel for everyone.")
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the channel lock").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("Unlock the current text channel again.")
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the channel unlock").setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("kickrole")
      .setDescription("Kick all members with a specific role.")
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to target").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the kick").setRequired(false)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const guildIds = [...readyClient.guilds.cache.keys()];

  await rest.put(Routes.applicationCommands(readyClient.user.id), {
    body: [serverCommand, ipCommand, aiCommand],
  });

  for (const guildId of guildIds) {
    await rest.put(Routes.applicationGuildCommands(readyClient.user.id, guildId), {
      body: commands,
    });
  }
}

async function sendPanel(targetChannel, guildConfig) {
  await targetChannel.send({
    embeds: [buildPanelEmbed(guildConfig)],
    components: buildPanelComponents(),
  });
}

async function sendRolePanel(targetChannel, guildConfig) {
  const cleanedConfig = pruneInvalidSelfAssignableRoles(targetChannel.guild);
  const validRoles = getValidSelfAssignableRoles(targetChannel.guild, cleanedConfig);
  if (!validRoles.length) {
    await targetChannel.send({
      content: "No valid self-assignable roles are configured for this server yet.",
    });
    return;
  }

  await targetChannel.send({
    embeds: [buildRolePanelEmbed(targetChannel.guild, cleanedConfig)],
    components: buildRolePanelComponents(targetChannel.guild, cleanedConfig),
  });
}

async function sendShopPanel(targetChannel, userId = null) {
  await targetChannel.send({
    embeds: [buildShopEmbed(targetChannel.guild, userId)],
    components: buildShopComponents(targetChannel.guild),
  });
}

async function sendQueuePanel(targetChannel) {
  await targetChannel.send({
    embeds: [buildQueueEmbed(targetChannel.guild)],
    components: buildQueueComponents(),
  });
}

async function findUserTickets(guild, userId) {
  return guild.channels.cache.filter(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      typeof channel.topic === "string" &&
      channel.topic.includes(`ticket-owner:${userId}`)
  );
}

async function createTicketChannel(guild, user, guildConfig, ticketType, introLine, reason = "") {
  const config = TICKET_TYPES[ticketType];

  if (!config || !guild) {
    return { error: "That ticket type does not exist." };
  }

  const existingTickets = await findUserTickets(guild, user.id);
  if (existingTickets.size >= 2) {
    return { error: "You already have 2 open tickets." };
  }

  const channelName = `${ticketType}-${slugify(user.username)}`;
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    },
  ];

  if (guildConfig.supportRoleId) {
    permissionOverwrites.push({
      id: guildConfig.supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: guildConfig.ticketCategoryId || null,
    topic: `ticket-owner:${user.id};type:${ticketType};claimed:none`,
    permissionOverwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(0xe3c18a)
    .setTitle(`${config.label} Ticket`)
    .setDescription(
      [
        `${user}, your ticket has been created.`,
        "",
        introLine || "Please describe your issue as clearly as possible.",
        reason ? `**Reason:** ${reason}` : null,
        "A staff member can take over this ticket with the `Claim` button.",
      ]
        .filter(Boolean)
        .join("\n")
    );

  await channel.send({
    content: guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}> ${user}` : `${user}`,
    embeds: [embed],
    components: buildTicketControls(),
  });

  return { channel };
}

async function createTicket(interaction, ticketType, reason) {
  const guildConfig = getGuildConfig(interaction.guild.id);
  const result = await createTicketChannel(
    interaction.guild,
    interaction.user,
    guildConfig,
    ticketType,
    null,
    reason
  );

  if (result.error) {
    await interaction.reply({ content: result.error, flags: 64 });
    return;
  }

  await interaction.reply({
    content: `Your ticket has been created: ${result.channel}`,
    flags: 64,
  });
}

function saveGiveaway(giveaway) {
  const store = getGiveawayStore();
  store[giveaway.messageId] = giveaway;
  setGiveawayStore(store);
}

function deleteGiveaway(messageId) {
  const store = getGiveawayStore();
  delete store[messageId];
  setGiveawayStore(store);
}

async function announceGiveawayWinner(giveaway) {
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    deleteGiveaway(giveaway.messageId);
    return;
  }

  const participants = getUniqueParticipantIds(giveaway);
  if (!participants.length) {
    await channel.send(`Giveaway ended. No one joined for **${giveaway.prize}**.`);
    deleteGiveaway(giveaway.messageId);
    return;
  }

  const winners = [];
  const pool = [...participants];
  const winnerCount = Math.min(giveaway.winners, pool.length);

  while (winners.length < winnerCount) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }

  await channel.send(
    `Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}. You won **${giveaway.prize}**.`
  );
  deleteGiveaway(giveaway.messageId);
}

function scheduleGiveaway(giveaway) {
  if (giveawayTimeouts.has(giveaway.messageId)) {
    clearTimeout(giveawayTimeouts.get(giveaway.messageId));
  }

  const delay = Math.max(1000, giveaway.endsAt - Date.now());
  const timeout = setTimeout(async () => {
    giveawayTimeouts.delete(giveaway.messageId);
    const store = getGiveawayStore();
    const current = store[giveaway.messageId];
    if (!current) {
      return;
    }

    await announceGiveawayWinner(current);
  }, delay);

  giveawayTimeouts.set(giveaway.messageId, timeout);
}

function restoreGiveaways() {
  const giveaways = getGiveawayStore();

  for (const giveaway of Object.values(giveaways)) {
    if (giveaway.endsAt <= Date.now()) {
      announceGiveawayWinner(giveaway).catch((error) => {
        console.error("Failed to restore giveaway:", error);
      });
      continue;
    }

    scheduleGiveaway(giveaway);
  }
}

async function startGiveaway(message, durationMs, winners, prize) {
  const giveaway = {
    messageId: "pending",
    guildId: message.guild.id,
    channelId: message.channel.id,
    hostId: message.author.id,
    prize,
    winners,
    participants: [],
    endsAt: Date.now() + durationMs,
  };

  const giveawayMessage = await message.channel.send({
    embeds: [buildGiveawayEmbed(giveaway)],
    components: buildGiveawayButtons("pending", false, 0),
  });

  giveaway.messageId = giveawayMessage.id;

  await giveawayMessage.edit({
    embeds: [buildGiveawayEmbed(giveaway)],
    components: buildGiveawayButtons(giveawayMessage.id, false, 0),
  });

  saveGiveaway(giveaway);
  scheduleGiveaway(giveaway);
}

async function rerollGiveaway(message, messageId) {
  const giveaways = getGiveawayStore();
  const giveaway = giveaways[messageId];

  if (!giveaway) {
    await message.reply("I could not find an active giveaway with that message ID.");
    return;
  }

  const participants = getUniqueParticipantIds(giveaway);
  if (!participants.length) {
    await message.reply("No one joined that giveaway yet.");
    return;
  }

  const winnerId = participants[Math.floor(Math.random() * participants.length)];
  await message.channel.send(`Rerolled winner: <@${winnerId}> for **${giveaway.prize}**.`);
}

async function endGiveaway(message, messageId) {
  const giveaways = getGiveawayStore();
  const giveaway = giveaways[messageId];

  if (!giveaway) {
    await message.reply("I could not find an active giveaway with that message ID.");
    return;
  }

  if (giveawayTimeouts.has(messageId)) {
    clearTimeout(giveawayTimeouts.get(messageId));
    giveawayTimeouts.delete(messageId);
  }

  await announceGiveawayWinner(giveaway);
}

async function autoPostPanels(readyClient) {
  const configs = getAllGuildConfigs();

  for (const guild of readyClient.guilds.cache.values()) {
    const guildConfig = {
      ...GUILD_CONFIG_DEFAULTS,
      ...(configs[guild.id] || {}),
    };

    if (!guildConfig.ticketPanelChannelId) {
      continue;
    }

    try {
      const channel = await readyClient.channels.fetch(guildConfig.ticketPanelChannelId);
      if (channel && channel.isTextBased()) {
        await sendPanel(channel, guildConfig);
        console.log(`Ticket panel sent successfully in ${guild.name}.`);
      }
    } catch (error) {
      console.error(`Failed to send automatic panel for ${guild.name}:`, error);
    }
  }
}

async function handleRoleCommand(message, args, guildConfig) {
  if (!hasStaffAccess(message.member, guildConfig)) {
    await message.reply("Only staff members can give or remove roles.");
    return;
  }

  const targetUser = message.mentions.members.first();
  const roleMention = message.mentions.roles.first();

  if (!targetUser || !roleMention) {
    await message.reply(`Usage: \`${guildConfig.prefix}role @user @role\``);
    return;
  }

  if (!isRoleManageable(message.guild, roleMention)) {
    await message.reply("I cannot manage that role.");
    return;
  }

  if (!canMemberAssignRole(message.member, roleMention)) {
    await message.reply("You cannot assign a role higher than your highest role.");
    return;
  }

  if (targetUser.roles.cache.has(roleMention.id)) {
    await targetUser.roles.remove(roleMention);
    await message.reply(`Removed **${roleMention.name}** from ${targetUser}.`);
    return;
  }

  await targetUser.roles.add(roleMention);
  await message.reply(`Added **${roleMention.name}** to ${targetUser}.`);
}

async function handleRoleAllCommand(message, args, guildConfig) {
  if (!hasStaffAccess(message.member, guildConfig)) {
    await message.reply("Only staff members can give roles to everyone.");
    return;
  }

  const role = message.mentions.roles.first() || findRole(message.guild, args.join(" "));
  if (!role) {
    await message.reply(`Usage: \`${guildConfig.prefix}roleall @role\``);
    return;
  }

  if (!isRoleManageable(message.guild, role)) {
    await message.reply("I cannot manage that role.");
    return;
  }

  if (!canMemberAssignRole(message.member, role)) {
    await message.reply("You cannot assign a role higher than your highest role.");
    return;
  }

  await message.reply(
    `Starting role assignment for **${role.name}**. This can take a moment on larger servers.`
  );

  const { members, isPartial } = await resolveMembersForRoleAll(message.guild, "roleall");

  let addedCount = 0;
  let skippedCount = 0;

  for (const member of members.values()) {
    if (member.user.bot || member.roles.cache.has(role.id)) {
      skippedCount += 1;
      continue;
    }

    try {
      await member.roles.add(role);
      addedCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.error(`Failed to add role ${role.id} to member ${member.id}:`, error);
    }
  }

  await message.channel.send([
    `Finished giving **${role.name}** to everyone.`,
    `Added: **${addedCount}**`,
    `Skipped: **${skippedCount}**`,
    isPartial
      ? "Note: I could only use currently loaded members. For full `/roleall`, enable `SERVER MEMBERS INTENT` in the Discord Developer Portal, set `ENABLE_GUILD_MEMBERS=true` in `.env`, and restart the bot."
      : null,
  ].filter(Boolean).join("\n"));
}

async function handleSelfRoleCommand(message, args, guildConfig) {
  const role = message.mentions.roles.first() || findRole(message.guild, args.join(" "));

  if (!role) {
    await message.reply(`Usage: \`${guildConfig.prefix}selfrole @role\``);
    return;
  }

  if (!guildConfig.selfAssignableRoleIds.includes(role.id)) {
    await message.reply("That role is not self-assignable.");
    return;
  }

  if (!isRoleManageable(message.guild, role)) {
    await message.reply("I cannot manage that role.");
    return;
  }

  if (message.member.roles.cache.has(role.id)) {
    await message.member.roles.remove(role);
    await message.reply(`Removed **${role.name}** from you.`);
    return;
  }

  await message.member.roles.add(role);
  await message.reply(`Added **${role.name}** to you.`);
}

async function handleQueueJoin(interaction) {
  const queue = getGuildQueue(interaction.guild.id);
  if (queue.includes(interaction.user.id)) {
    await interaction.reply({
      content: `You are already in the queue at position **${queue.indexOf(interaction.user.id) + 1}**.`,
      flags: 64,
    });
    return;
  }

  const nextQueue = updateGuildQueue(interaction.guild.id, (current) => [...current, interaction.user.id]);

  try {
    await interaction.message.edit({
      embeds: [buildQueueEmbed(interaction.guild)],
      components: buildQueueComponents(),
    });
  } catch (error) {
    console.error("Failed to refresh queue panel:", error);
  }

  await interaction.reply({
    content: `You joined the queue at position **${nextQueue.length}**.`,
    flags: 64,
  });
}

async function handleQueueLeave(interaction) {
  const queue = getGuildQueue(interaction.guild.id);
  const currentPosition = queue.indexOf(interaction.user.id);

  if (currentPosition === -1) {
    await interaction.reply({
      content: "You are not currently in the queue.",
      flags: 64,
    });
    return;
  }

  const nextQueue = updateGuildQueue(interaction.guild.id, (current) =>
    current.filter((userId) => userId !== interaction.user.id)
  );

  try {
    await interaction.message.edit({
      embeds: [buildQueueEmbed(interaction.guild)],
      components: buildQueueComponents(),
    });
  } catch (error) {
    console.error("Failed to refresh queue panel after leave:", error);
  }

  await interaction.reply({
    content: `You left the queue. ${nextQueue.length ? `There are now **${nextQueue.length}** people waiting.` : "The queue is now empty."}`,
    flags: 64,
  });
}

async function handleQueueNext(interaction) {
  const guildConfig = getGuildConfig(interaction.guild.id);
  if (!hasStaffAccess(interaction.member, guildConfig)) {
    await interaction.reply({
      content: "Only staff members can call the next user.",
      flags: 64,
    });
    return;
  }

  let calledMember = null;
  let skippedCount = 0;

  updateGuildQueue(interaction.guild.id, (current) => {
    const next = [...current];

    while (next.length) {
      const userId = next.shift();
      const member = interaction.guild.members.cache.get(userId);
      if (!member) {
        skippedCount += 1;
        continue;
      }

      calledMember = member;
      break;
    }

    return next;
  });

  if (!calledMember) {
    try {
      await interaction.message.edit({
        embeds: [buildQueueEmbed(interaction.guild)],
        components: buildQueueComponents(),
      });
    } catch (error) {
      console.error("Failed to refresh empty queue panel:", error);
    }

    await interaction.reply({
      content: skippedCount ? "The queue was cleaned, but no valid users were left." : "The queue is empty.",
      flags: 64,
    });
    return;
  }

  const result = await createTicketChannel(
    interaction.guild,
    calledMember.user,
    guildConfig,
    "support",
    "You were called from the queue. Please describe what you need help with."
  );

  try {
    await interaction.message.edit({
      embeds: [buildQueueEmbed(interaction.guild)],
      components: buildQueueComponents(),
    });
  } catch (error) {
    console.error("Failed to refresh queue panel after next user:", error);
  }

  if (result.error) {
    await interaction.reply({
      content: `Could not create a ticket for ${calledMember}: ${result.error}`,
      flags: 64,
    });
    return;
  }

  await interaction.reply({
    content: `Called ${calledMember} from the queue and created ${result.channel}.`,
    flags: 64,
  });
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    await registerSlashCommands(readyClient);
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }

  restoreGiveaways();
  await autoPostPanels(readyClient);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await sendWelcomeMessage(member);
  } catch (error) {
    console.error("Failed to send welcome message:", error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    await sendGoodbyeMessage(member);
  } catch (error) {
    console.error("Failed to send goodbye message:", error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!ENABLE_MESSAGE_CONTENT || message.author.bot) {
    return;
  }

  if (!message.guild) {
    const content = message.content.trim();
    if (!content) {
      return;
    }

    if (content.startsWith("/")) {
      return;
    }

    if (content.toLowerCase() === "reset") {
      clearAiDmConversation(message.author.id);
      await message.reply("AI chat history reset.");
      return;
    }
    const aiInput = content.startsWith("!") ? content.slice(1).trim() : content;
    if (!aiInput) {
      return;
    }

    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      await message.reply(
        "AI DMs are not configured yet. Add `OPENROUTER_API_KEY` or `OPENAI_API_KEY` to the bot `.env` file first."
      );
      return;
    }

    try {
      await message.channel.sendTyping();
      const reply = await createAiDmResponse(message.author.id, aiInput);
      await message.reply(formatAiDmReply(reply).slice(0, 1900));
    } catch (error) {
      console.error("Failed to answer AI DM:", error);
      await message.reply(
        error.message === "AI_TEMPORARILY_UNAVAILABLE_QUOTA"
          ? "Die KI ist momentan nicht verfügbar. Bitte versuche es später erneut.\n\nScript by Verk"
          : `DM-KI-Fehler: ${String(error.message || error).slice(0, 150)}\n\nScript by Verk`
      );
    }
    return;
  }

  const guildConfig = getGuildConfig(message.guild.id);
  const prefix = guildConfig.prefix || DEFAULT_PREFIX;
  const universalPrefix = "!";

  if (!message.content.startsWith(prefix) && !message.content.startsWith(universalPrefix)) {
    return;
  }

  const usedPrefix = message.content.startsWith(universalPrefix) ? universalPrefix : prefix;
  const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) {
    return;
  }

  if (command === "help") {
    await message.reply({ embeds: [buildHelpEmbed(prefix)] });
    return;
  }

  if (command === "ai") {
    const aiInput = args.join(" ").trim();

    if (!aiInput) {
      await message.reply(`Usage: \`${prefix}ai <nachricht>\``);
      return;
    }

    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      await message.reply(
        "The AI system is not configured yet. Add `OPENROUTER_API_KEY` or `OPENAI_API_KEY` to the bot `.env` file first."
      );
      return;
    }

    try {
      await message.channel.sendTyping();
      const reply = await createAiDmResponse(message.author.id, aiInput);
      await message.reply(formatAiDmReply(reply).slice(0, 1900));
    } catch (error) {
      console.error("Failed to answer !ai command:", error);
      await message.reply(
        error.message === "AI_TEMPORARILY_UNAVAILABLE_QUOTA"
          ? "Die KI ist momentan nicht verfügbar. Bitte versuche es später erneut.\n\nScript by Verk"
          : `KI-Fehler: ${String(error.message || error).slice(0, 150)}\n\nScript by Verk`
      );
    }
    return;
  }

  if (command === "panel" || command === "ticket") {
    await sendPanel(message.channel, guildConfig);
    await message.reply("The ticket panel has been sent.");
    return;
  }

  if (command === "queuepanel") {
    await sendQueuePanel(message.channel);
    await message.reply("The queue panel has been sent.");
    return;
  }

  if (command === "rolepanel") {
    await sendRolePanel(message.channel, guildConfig);
    await message.reply("The role panel has been sent.");
    return;
  }

  if (command === "shop") {
    await message.reply({
      embeds: [buildShopEmbed(message.guild, message.author.id)],
      components: buildShopComponents(message.guild),
    });
    return;
  }

  if (command === "shoppanel") {
    await sendShopPanel(message.channel);
    await message.reply("The shop panel has been sent.");
    return;
  }

  if (command === "setpanel") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const nextConfig = updateGuildConfig(message.guild.id, (current) => ({
      ...current,
      ticketPanelChannelId: message.channel.id,
    }));

    await sendPanel(message.channel, nextConfig);
    await message.reply(`Saved ${message.channel} as the ticket panel channel.`);
    return;
  }

  if (command === "delete") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    if (args[0] !== "confirm") {
      await message.reply(`Usage: \`${prefix}delete confirm\``);
      return;
    }

    await message.reply("Starting bulk channel deletion...");
    await deleteAllGuildChannels(message.guild);
    return;
  }

  if (command === "setwelcome" || command === "setgoodbye") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const channel = message.mentions.channels.first() || findChannelByName(message.guild, null, args.join(" "), ChannelType.GuildText);
    if (!channel) {
      await message.reply(
        command === "setwelcome"
          ? `Usage: \`${prefix}setwelcome #channel\``
          : `Usage: \`${prefix}setgoodbye #channel\``
      );
      return;
    }

    updateGuildConfig(message.guild.id, (current) => ({
      ...current,
      [command === "setwelcome" ? "welcomeChannelId" : "goodbyeChannelId"]: channel.id,
    }));

    await message.reply(
      command === "setwelcome"
        ? `Welcome channel set to ${channel}.`
        : `Goodbye channel set to ${channel}.`
    );
    return;
  }

  if (command === "setsupportrole") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const role = message.mentions.roles.first() || findRole(message.guild, args.join(" "));
    if (!role) {
      await message.reply(`Usage: \`${prefix}setsupportrole @role\``);
      return;
    }

    updateGuildConfig(message.guild.id, (current) => ({
      ...current,
      supportRoleId: role.id,
      giveawayHostRoleId: current.giveawayHostRoleId || role.id,
    }));

    await message.reply(`Support role set to **${role.name}**.`);
    return;
  }

  if (command === "setticketcategory") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const query = args.join(" ");
    const category = findCategory(message.guild, query);
    if (!category) {
      await message.reply(`Usage: \`${prefix}setticketcategory <category>\``);
      return;
    }

    updateGuildConfig(message.guild.id, (current) => ({
      ...current,
      ticketCategoryId: category.id,
    }));

    await message.reply(`Ticket category set to **${category.name}**.`);
    return;
  }

  if (command === "setprefix") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      await message.reply(`Usage: \`${prefix}setprefix <prefix>\``);
      return;
    }

    updateGuildConfig(message.guild.id, (current) => ({
      ...current,
      prefix: newPrefix,
    }));

    await message.reply(`Prefix updated to \`${newPrefix}\`.`);
    return;
  }

  if (command === "secure") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to enable secure mode.");
      return;
    }

    const result = await applySecureMode(message.guild, message.author);
    await message.reply(result.message);
    return;
  }

  if (command === "unsecure") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to disable secure mode.");
      return;
    }

    const result = await restoreSecureMode(message.guild, message.author);
    await message.reply(result.message);
    return;
  }

  if (command === "addselfrole" || command === "removeselfrole") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const role = message.mentions.roles.first() || findRole(message.guild, args.join(" "));
    if (!role) {
      await message.reply(`Usage: \`${prefix}${command} @role\``);
      return;
    }

    updateGuildConfig(message.guild.id, (current) => {
      const roleIds = new Set(current.selfAssignableRoleIds || []);
      if (command === "addselfrole") {
        roleIds.add(role.id);
      } else {
        roleIds.delete(role.id);
      }

      return {
        ...current,
        selfAssignableRoleIds: [...roleIds],
      };
    });

    await message.reply(
      command === "addselfrole"
        ? `Added **${role.name}** to self-assignable roles.`
        : `Removed **${role.name}** from self-assignable roles.`
    );
    return;
  }

  if (command === "addshopitem" || command === "removeshopitem") {
    if (!hasSetupAccess(message.member)) {
      await message.reply("You need Administrator or Manage Server to do that.");
      return;
    }

    const role = message.mentions.roles.first() || findRole(message.guild, args[0]);
    const price = Number(args[1]);

    if (!role) {
      await message.reply(
        command === "addshopitem"
          ? `Usage: \`${prefix}addshopitem @role <price>\``
          : `Usage: \`${prefix}removeshopitem @role\``
      );
      return;
    }

    if (command === "addshopitem") {
      if (!Number.isFinite(price) || price <= 0) {
        await message.reply(`Usage: \`${prefix}addshopitem @role <price>\``);
        return;
      }

      updateGuildShopItems(message.guild.id, (current) => {
        const filtered = current.filter((item) => item.roleId !== role.id);
        filtered.push({ roleId: role.id, price });
        return filtered;
      });

      await message.reply(`Added **${role.name}** to the shop for **${price}** tokens.`);
      return;
    }

    updateGuildShopItems(message.guild.id, (current) =>
      current.filter((item) => item.roleId !== role.id)
    );
    await message.reply(`Removed **${role.name}** from the shop.`);
    return;
  }

  if (command === "config") {
    await message.reply({ embeds: [buildConfigEmbed(prefix, guildConfig, message.guild)] });
    return;
  }

  if (command === "role") {
    await handleRoleCommand(message, args, guildConfig);
    return;
  }

  if (command === "roleall") {
    await handleRoleAllCommand(message, args, guildConfig);
    return;
  }

  if (command === "selfrole" || command === "roleme") {
    await handleSelfRoleCommand(message, args, guildConfig);
    return;
  }

  if (command === "tokens") {
    const user = message.mentions.users.first() || message.author;
    await message.reply(`${user} has **${getTokens(user.id)}** tokens.`);
    return;
  }

  if (command === "addtokens" || command === "removetokens") {
    if (!hasStaffAccess(message.member, guildConfig)) {
      await message.reply("Only staff members can manage tokens.");
      return;
    }

    const user = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!user || !Number.isFinite(amount) || amount <= 0) {
      await message.reply(`Usage: \`${prefix}${command} @user <amount>\``);
      return;
    }

    const total =
      command === "addtokens" ? addTokens(user.id, amount) : removeTokens(user.id, amount);

    await message.reply(`${user} now has **${total}** tokens.`);
    return;
  }

  if (command === "pay") {
    const user = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!user || !Number.isFinite(amount) || amount <= 0) {
      await message.reply(`Usage: \`${prefix}pay @user <amount>\``);
      return;
    }

    if (user.id === message.author.id) {
      await message.reply("You cannot send tokens to yourself.");
      return;
    }

    if (getTokens(message.author.id) < amount) {
      await message.reply("You do not have enough tokens.");
      return;
    }

    removeTokens(message.author.id, amount);
    addTokens(user.id, amount);
    await message.reply(`Sent **${amount}** tokens to ${user}.`);
    return;
  }

  if (command === "giveaway") {
    if (!hasGiveawayAccess(message.member, guildConfig)) {
      await message.reply("Only staff members can start giveaways.");
      return;
    }

    const duration = parseDuration(args[0]);
    const winners = Number(args[1]);
    const prize = args.slice(2).join(" ");

    if (!duration || !Number.isInteger(winners) || winners <= 0 || !prize) {
      await message.reply(`Usage: \`${prefix}giveaway 10m 1 Nitro\``);
      return;
    }

    await startGiveaway(message, duration, winners, prize);
    return;
  }

  if (command === "reroll") {
    if (!hasGiveawayAccess(message.member, guildConfig)) {
      await message.reply("Only staff members can reroll giveaways.");
      return;
    }

    const messageId = args[0];
    if (!messageId) {
      await message.reply(`Usage: \`${prefix}reroll <messageId>\``);
      return;
    }

    await rerollGiveaway(message, messageId);
    return;
  }

  if (command === "endgiveaway") {
    if (!hasGiveawayAccess(message.member, guildConfig)) {
      await message.reply("Only staff members can end giveaways.");
      return;
    }

    const messageId = args[0];
    if (!messageId) {
      await message.reply(`Usage: \`${prefix}endgiveaway <messageId>\``);
      return;
    }

    await endGiveaway(message, messageId);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.guildId) {
    const guildConfig = getGuildConfig(interaction.guildId);
    const memberHasAccess =
      interaction.member &&
      (interaction.member.permissions?.has?.(PermissionsBitField.Flags.Administrator) ||
        interaction.member.permissions?.has?.(PermissionsBitField.Flags.ManageGuild));

    if (
      guildConfig.secureMode &&
      !memberHasAccess &&
      (interaction.isButton() ||
        interaction.isAnySelectMenu() ||
        interaction.isModalSubmit() ||
        interaction.isChatInputCommand())
    ) {
      if (interaction.replied || interaction.deferred) {
        return;
      }

      await interaction.reply({
        content: "This server is currently in secure mode. Only administrators can use bot interactions right now.",
        ephemeral: true,
      });
      return;
    }
  }

  if (
    interaction.isAutocomplete() &&
    (interaction.commandName === "reroll" || interaction.commandName === "endgiveaway")
  ) {
    const focused = interaction.options.getFocused().toLowerCase();
    const store = getGiveawayStore();
    const choices = Object.values(store)
      .filter((giveaway) => giveaway.guildId === interaction.guild.id)
      .map((giveaway) => ({
        name: `${giveaway.prize} | ${formatDuration(Math.max(0, giveaway.endsAt - Date.now()))} | ${giveaway.messageId}`,
        value: giveaway.messageId,
      }))
      .filter((choice) => !focused || choice.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
    return;
  }

  if (interaction.isAutocomplete() && interaction.commandName === "server") {
    if (!hasBotOwnerAccess(interaction.user.id)) {
      await interaction.respond([]);
      return;
    }

    const focused = interaction.options.getFocused().toLowerCase();
    const choices = [...client.guilds.cache.values()]
      .map((guild) => ({
        name: `${guild.name} | ${guild.id}`,
        value: guild.id,
      }))
      .filter((choice) => !focused || choice.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    (interaction.commandName === "panel" || interaction.commandName === "ticket")
  ) {
    const guildConfig = getGuildConfig(interaction.guild.id);

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: 64,
      });
      return;
    }

    await sendPanel(interaction.channel, guildConfig);
    await interaction.reply({
      content: "The ticket panel has been sent.",
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "queuepanel") {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: 64,
      });
      return;
    }

    await sendQueuePanel(interaction.channel);
    await interaction.reply({
      content: "The queue panel has been sent.",
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "rolepanel") {
    const guildConfig = pruneInvalidSelfAssignableRoles(interaction.guild);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "send") {
      if (!interaction.channel || !interaction.channel.isTextBased()) {
        await interaction.reply({
          content: "This command can only be used in a text channel.",
          flags: 64,
        });
        return;
      }

      await sendRolePanel(interaction.channel, guildConfig);
      await interaction.reply({
        content: "The role panel has been sent.",
        flags: 64,
      });
      return;
    }

    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    if (subcommand === "list") {
      const roles = guildConfig.selfAssignableRoleIds
        .map((roleId) => interaction.guild.roles.cache.get(roleId))
        .filter(Boolean);

      await interaction.reply({
        content: roles.length
          ? `Current role panel roles:\n${roles.map((role) => `- ${role.name}`).join("\n")}`
          : "There are no roles in the role panel yet.",
        flags: 64,
      });
      return;
    }

    if (subcommand === "setup") {
      const selectedRoles = ["role1", "role2", "role3", "role4", "role5"]
        .map((optionName) => interaction.options.getRole(optionName))
        .filter(Boolean);

      const uniqueRoles = Array.from(new Map(selectedRoles.map((role) => [role.id, role])).values());

      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        selfAssignableRoleIds: uniqueRoles.map((role) => role.id),
      }));

      await interaction.reply({
        content: `Role panel setup saved with ${uniqueRoles.length} role(s): ${uniqueRoles
          .map((role) => `**${role.name}**`)
          .join(", ")}`,
        flags: 64,
      });
      return;
    }

    const role = interaction.options.getRole("role");

    if (subcommand === "addrole") {
      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        selfAssignableRoleIds: Array.from(new Set([...(current.selfAssignableRoleIds || []), role.id])),
      }));

      await interaction.reply({
        content: `Added **${role.name}** to the role panel.`,
        flags: 64,
      });
      return;
    }

    updateGuildConfig(interaction.guild.id, (current) => ({
      ...current,
      selfAssignableRoleIds: (current.selfAssignableRoleIds || []).filter((roleId) => roleId !== role.id),
    }));

    await interaction.reply({
      content: `Removed **${role.name}** from the role panel.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "shop") {
    await interaction.reply({
      embeds: [buildShopEmbed(interaction.guild, interaction.user.id)],
      components: buildShopComponents(interaction.guild),
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "shoppanel") {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: 64,
      });
      return;
    }

    await sendShopPanel(interaction.channel);
    await interaction.reply({
      content: "The shop panel has been sent.",
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "boosts") {
    const available = interaction.options.getInteger("available");
    const price = interaction.options.getString("price");
    const note = interaction.options.getString("note");
    const wantsUpdate = available !== null || price !== null || note !== null;

    if (wantsUpdate) {
      if (!hasSetupAccess(interaction.member)) {
        await interaction.reply({
          content: "You need Administrator or Manage Server to update the boost stock.",
          flags: 64,
        });
        return;
      }

      const nextConfig = updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        boostsAvailable: available ?? current.boostsAvailable ?? 0,
        boostsPrice: price ?? current.boostsPrice ?? "",
        boostsNote: note ?? current.boostsNote ?? "",
      }));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6aa7ff)
            .setTitle("Boost stock updated")
            .setDescription(
              [
                `Available: **${Math.max(0, Number(nextConfig.boostsAvailable) || 0)}**`,
                `Price: **${nextConfig.boostsPrice || "Not set"}**`,
                `Note: **${nextConfig.boostsNote || "Not set"}**`,
              ].join("\n")
            ),
        ],
        flags: 64,
      });
      return;
    }

    const guildConfig = getGuildConfig(interaction.guild.id);
    const stock = Math.max(0, Number(guildConfig.boostsAvailable) || 0);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x6aa7ff)
          .setTitle(`${interaction.guild.name} Boost Stock`)
          .setDescription(
            [
              `Available: **${stock}**`,
              `Price: **${guildConfig.boostsPrice || "Not set"}**`,
              `Note: **${guildConfig.boostsNote || "Not set"}**`,
            ].join("\n")
          )
          .setFooter({ text: "Use /buy item:Boosts to create a purchase request." }),
      ],
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "buy") {
    const item = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") || 1;
    const guildConfig = getGuildConfig(interaction.guild.id);

    if (item !== "boosts") {
      await interaction.reply({
        content: "That item is not available right now.",
        flags: 64,
      });
      return;
    }

    const stock = Math.max(0, Number(guildConfig.boostsAvailable) || 0);
    const supportRolePing = guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}>` : "a staff member";

    if (stock <= 0) {
      await interaction.reply({
        content: `Boosts are currently sold out. Please contact ${supportRolePing}.`,
        flags: 64,
      });
      return;
    }

    if (quantity > stock) {
      await interaction.reply({
        content: `Only **${stock}** boost(s) are currently available.`,
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xc8a46a)
          .setTitle("Boost purchase request")
          .setDescription(
            [
              `${interaction.user} wants to buy **${quantity}** boost(s).`,
              `Available stock: **${stock}**`,
              `Price: **${guildConfig.boostsPrice || "Ask staff"}**`,
              `Instructions: **${guildConfig.boostsNote || `Please contact ${supportRolePing} to finish the payment.`}**`,
              "",
              "This command creates a purchase request only. Payment is handled manually by staff.",
            ].join("\n")
          ),
      ],
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "help") {
    const guildConfig = getGuildConfig(interaction.guild.id);
    await interaction.reply({
      embeds: [buildHelpEmbed(guildConfig.prefix)],
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "ip") {
    await interaction.reply({
      content: `IP: \`${MINECRAFT_SERVER_ADDRESS}\``,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "ai") {
    if (interaction.guild) {
      await interaction.reply({
        content: "Use `/ai` in the bot DMs to start chatting with the AI.",
        flags: 64,
      });
      return;
    }

    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      await interaction.reply({
        content:
          "AI DMs are not configured yet. Add `OPENROUTER_API_KEY` or `OPENAI_API_KEY` to the bot `.env` file first.",
        flags: 64,
      });
      return;
    }

    const input = interaction.options.getString("message")?.trim();

    if (!input) {
      clearAiDmConversation(interaction.user.id);
      await interaction.reply({
        content:
          "AI chat started. Send me a DM message now and I will reply. Send `reset` anytime to clear the chat history.",
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const reply = await createAiDmResponse(interaction.user.id, input);
      await interaction.editReply({
        content: reply.slice(0, 1900),
      });
    } catch (error) {
      console.error("Failed to answer /ai command:", error);
      await interaction.editReply({
        content:
          error.message === "AI_TEMPORARILY_UNAVAILABLE_QUOTA"
            ? "The AI is currently unavailable. Please try again later."
            : "The AI DM system is currently unavailable. Check the OpenAI API key and model settings.",
      });
    }
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "config") {
    const guildConfig = getGuildConfig(interaction.guild.id);
    await interaction.reply({
      embeds: [buildConfigEmbed(guildConfig.prefix, guildConfig, interaction.guild)],
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "myrole") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const existingRoleId = getGuildMyRole(interaction.guild.id, interaction.user.id);
      const existingRole = existingRoleId ? interaction.guild.roles.cache.get(existingRoleId) : null;

      if (existingRole) {
        await interaction.reply({
          content: `You already have a personal role: <@&${existingRole.id}>`,
          flags: 64,
        });
        return;
      }

      const roleName = interaction.options.getString("name").trim();
      const colorInput = interaction.options.getString("color");
      const colorValue = parseHexColor(colorInput);

      if (colorInput && colorValue === null) {
        await interaction.reply({
          content: "Invalid color. Use a hex color like `#ff8800`.",
          flags: 64,
        });
        return;
      }

      const botMember = interaction.guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        await interaction.reply({
          content: "I need Manage Roles permission to create personal roles.",
          flags: 64,
        });
        return;
      }

      const role = await interaction.guild.roles.create({
        name: roleName.slice(0, 100),
        color: colorValue || undefined,
        mentionable: false,
        hoist: false,
        permissions: [],
        reason: `Personal role for ${interaction.user.tag}`,
      });

      await interaction.member.roles.add(role, "Assigned personal role");
      setGuildMyRole(interaction.guild.id, interaction.user.id, role.id);

      await interaction.reply({
        content: `Your personal role ${role} has been created and assigned to you.`,
        flags: 64,
      });
      return;
    }

    const existingRoleId = getGuildMyRole(interaction.guild.id, interaction.user.id);
    const existingRole = existingRoleId ? interaction.guild.roles.cache.get(existingRoleId) : null;

    if (!existingRole) {
      removeGuildMyRole(interaction.guild.id, interaction.user.id);
      await interaction.reply({
        content: "You do not have a personal role to delete.",
        flags: 64,
      });
      return;
    }

    if (interaction.member.roles.cache.has(existingRole.id)) {
      await interaction.member.roles.remove(existingRole, "Removed personal role");
    }

    await existingRole.delete("Deleted personal role").catch(() => null);
    removeGuildMyRole(interaction.guild.id, interaction.user.id);

    await interaction.reply({
      content: "Your personal role has been deleted.",
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "backup") {
    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const store = getBackupStore();

    if (subcommand === "list") {
      const names = Object.keys(store);
      await interaction.reply({
        content: names.length ? `Saved backups:\n${names.map((name) => `- ${name}`).join("\n")}` : "No backups have been saved yet.",
        flags: 64,
      });
      return;
    }

    const rawName = interaction.options.getString("name");
    const backupName = normalizeBackupName(rawName);

    if (!backupName) {
      await interaction.reply({
        content: "Please use a valid backup name.",
        flags: 64,
      });
      return;
    }

    if (subcommand === "create") {
      store[backupName] = createGuildBackupSnapshot(interaction.guild);
      setBackupStore(store);
      await interaction.reply({
        content: `Backup **${backupName}** has been created.`,
        flags: 64,
      });
      return;
    }

    const backup = store[backupName];
    if (!backup) {
      await interaction.reply({
        content: `I could not find a backup named **${backupName}**.`,
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: `Applying backup **${backupName}**...`,
      flags: 64,
    });

    const result = await applyBackupToGuild(interaction.guild, backup);
    await interaction.followUp({
      content: [
        `Backup **${backupName}** applied.`,
        `Roles processed: **${result.createdRoles}**`,
        `Categories created: **${result.createdCategories}**`,
        `Channels created: **${result.createdChannels}**`,
      ].join("\n"),
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "server") {
    if (!hasBotOwnerAccess(interaction.user.id)) {
      await interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: 64,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "list") {
      const guildLines = [...client.guilds.cache.values()]
        .sort((left, right) => right.memberCount - left.memberCount)
        .map(
          (guild) =>
            `• **${guild.name}**\nID: \`${guild.id}\` • Members: **${guild.memberCount.toLocaleString("en-US")}**`
        );

      await interaction.reply({
        content: guildLines.length
          ? `I am currently in **${guildLines.length}** server(s):\n\n${guildLines.join("\n\n")}`.slice(0, 1900)
          : "I am not currently in any servers.",
        flags: 64,
      });
      return;
    }

    if (subcommand === "roleinfo") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const roleLines = targetGuild.roles.cache
        .filter((role) => role.id !== targetGuild.roles.everyone.id)
        .sort((left, right) => right.position - left.position)
        .map((role) => `• **${role.name}** — \`${role.id}\``);

      const chunks = [];
      let currentChunk = "";

      for (const line of roleLines) {
        const nextValue = currentChunk ? `${currentChunk}\n${line}` : line;
        if (nextValue.length > 1800) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk = nextValue;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      if (!chunks.length) {
        chunks.push("This server has no custom roles.");
      }

      const roleEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${targetGuild.name} Roles`)
        .setDescription(chunks[0])
        .setFooter({
          text: `Botify Role Info • ${roleLines.length} custom role(s)`,
        });

      await interaction.reply({
        embeds: [roleEmbed],
        flags: 64,
      });

      for (let index = 1; index < chunks.length; index += 1) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(`${targetGuild.name} Roles (cont.)`)
              .setDescription(chunks[index]),
          ],
          flags: 64,
        });
      }
      return;
    }

    if (subcommand === "setup") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      await interaction.reply({
        content: `Creating the Botify Brawl Stars wintrade setup in **${targetGuild.name}**. This may take a moment...`,
        flags: 64,
      });

      const result = await runWintradeSetup(targetGuild);

      updateGuildConfig(targetGuild.id, (current) => ({
        ...current,
        supportRoleId: result.supportRoleId || current.supportRoleId,
        ticketCategoryId: result.ticketCategoryId || current.ticketCategoryId,
        ticketPanelChannelId: result.ticketsChannelId || current.ticketPanelChannelId,
        welcomeChannelId: result.welcomeChannelId || current.welcomeChannelId,
        goodbyeChannelId: result.goodbyeChannelId || current.goodbyeChannelId,
        selfAssignableRoleIds: Array.from(
          new Set([...(current.selfAssignableRoleIds || []), ...result.privateRoleIds])
        ),
      }));

      await interaction.followUp({
        content: [
          `Wintrade setup finished in **${targetGuild.name}**.`,
          `Categories created: **${result.createdCategories}**`,
          `Channels created: **${result.createdChannels}**`,
          `Private roles created: **${result.createdRoles}**`,
          result.ticketsChannelId ? `Tickets channel saved: <#${result.ticketsChannelId}>` : null,
          result.privateRoleIds.length
            ? `Private call roles added to self-roles: **${result.privateRoleIds.length}**`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        flags: 64,
      });
      return;
    }

    if (subcommand === "lock") {
      const guildId = interaction.options.getString("server");
      const lockAll = interaction.options.getBoolean("all") || false;
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      await interaction.reply({
        content: `Locking **${targetGuild.name}**...`,
        flags: 64,
      });

      let updatedTextChannels = 0;
      let updatedVoiceChannels = 0;
      for (const channel of targetGuild.channels.cache.values()) {
        if (
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.GuildAnnouncement
        ) {
          await channel.permissionOverwrites
            .edit(targetGuild.roles.everyone, buildEveryoneLockPermissions(channel.type))
            .catch(() => null);
          for (const role of getLockTargetRoles(targetGuild).values()) {
            await channel.permissionOverwrites
              .edit(role, buildEveryoneLockPermissions(channel.type))
              .catch(() => null);
          }
          updatedTextChannels += 1;
        }

        if (
          lockAll &&
          (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice)
        ) {
          await channel.permissionOverwrites
            .edit(targetGuild.roles.everyone, buildEveryoneLockPermissions(channel.type))
            .catch(() => null);
          for (const role of getLockTargetRoles(targetGuild).values()) {
            await channel.permissionOverwrites
              .edit(role, buildEveryoneLockPermissions(channel.type))
              .catch(() => null);
          }
          updatedVoiceChannels += 1;
        }
      }

      await interaction.followUp({
        content: lockAll
          ? `Locked **${targetGuild.name}**. Updated **${updatedTextChannels}** text channel(s) and **${updatedVoiceChannels}** voice/stage channel(s).`
          : `Locked **${targetGuild.name}**. Updated **${updatedTextChannels}** text channel(s).`,
        flags: 64,
      });
      return;
    }

    if (subcommand === "info") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const createdAtUnix = Math.floor(targetGuild.createdTimestamp / 1000);
      const serverEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${targetGuild.name}`)
        .addFields(
          { name: "Server ID", value: `\`${targetGuild.id}\``, inline: false },
          {
            name: "Members",
            value: `${targetGuild.memberCount.toLocaleString("en-US")}`,
            inline: true,
          },
          {
            name: "Channels",
            value: `${targetGuild.channels.cache.size}`,
            inline: true,
          },
          {
            name: "Roles",
            value: `${targetGuild.roles.cache.size}`,
            inline: true,
          },
          {
            name: "Owner ID",
            value: targetGuild.ownerId ? `\`${targetGuild.ownerId}\`` : "Unknown",
            inline: false,
          },
          {
            name: "Created",
            value: `<t:${createdAtUnix}:F>`,
            inline: false,
          }
        )
        .setFooter({ text: "Botify Server Info" });

      await interaction.reply({
        embeds: [serverEmbed],
        flags: 64,
      });
      return;
    }

    if (subcommand === "channels") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const channelLines = targetGuild.channels.cache
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .map((channel) => {
          const typeLabel =
            channel.type === ChannelType.GuildCategory
              ? "Category"
              : channel.type === ChannelType.GuildText
                ? "Text"
                : channel.type === ChannelType.GuildAnnouncement
                  ? "Announcement"
                  : channel.type === ChannelType.GuildVoice
                    ? "Voice"
                    : channel.type === ChannelType.GuildStageVoice
                      ? "Stage"
                      : channel.type === ChannelType.GuildForum
                        ? "Forum"
                        : "Other";

          return `• **${channel.name}** - ${typeLabel}`;
        });

      const chunks = [];
      let currentChunk = "";

      for (const line of channelLines) {
        const nextValue = currentChunk ? `${currentChunk}\n${line}` : line;
        if (nextValue.length > 3800) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk = nextValue;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      if (!chunks.length) {
        chunks.push("This server has no channels.");
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Channels`)
            .setDescription(chunks[0])
            .setFooter({ text: `Botify Server Channels • ${channelLines.length} channel(s)` }),
        ],
        flags: 64,
      });

      for (let index = 1; index < chunks.length; index += 1) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(`${targetGuild.name} Channels (cont.)`)
              .setDescription(chunks[index]),
          ],
          flags: 64,
        });
      }
      return;
    }

    if (subcommand === "categories") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const categoryLines = targetGuild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildCategory)
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .map((category) => {
          const children = targetGuild.channels.cache.filter((channel) => channel.parentId === category.id).size;
          return `• **${category.name}** - ${children} child channel(s)`;
        });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Categories`)
            .setDescription(categoryLines.join("\n") || "This server has no categories.")
            .setFooter({ text: `Botify Categories • ${categoryLines.length} categor${categoryLines.length === 1 ? "y" : "ies"}` }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "config") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const guildConfig = getGuildConfig(guildId);
      const panelChannel = guildConfig.ticketPanelChannelId
        ? targetGuild.channels.cache.get(guildConfig.ticketPanelChannelId)
        : null;
      const ticketCategory = guildConfig.ticketCategoryId
        ? targetGuild.channels.cache.get(guildConfig.ticketCategoryId)
        : null;
      const supportRole = guildConfig.supportRoleId
        ? targetGuild.roles.cache.get(guildConfig.supportRoleId)
        : null;
      const welcomeChannel = guildConfig.welcomeChannelId
        ? targetGuild.channels.cache.get(guildConfig.welcomeChannelId)
        : null;
      const goodbyeChannel = guildConfig.goodbyeChannelId
        ? targetGuild.channels.cache.get(guildConfig.goodbyeChannelId)
        : null;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Botify Config`)
            .addFields(
              { name: "Prefix", value: `\`${guildConfig.prefix || DEFAULT_PREFIX}\``, inline: true },
              { name: "Support Role", value: supportRole ? `@${supportRole.name}` : "Not set", inline: true },
              { name: "Ticket Category", value: ticketCategory ? `#${ticketCategory.name}` : "Not set", inline: true },
              { name: "Ticket Panel", value: panelChannel ? `#${panelChannel.name}` : "Not set", inline: true },
              { name: "Welcome Channel", value: welcomeChannel ? `#${welcomeChannel.name}` : "Not set", inline: true },
              { name: "Goodbye Channel", value: goodbyeChannel ? `#${goodbyeChannel.name}` : "Not set", inline: true },
              {
                name: "Panel Image",
                value: guildConfig.panelImageUrl || "Not set",
                inline: false,
              },
              {
                name: "Secure Mode",
                value: guildConfig.secureMode ? "Enabled" : "Disabled",
                inline: true,
              },
              {
                name: "Self-Roles",
                value: `${(guildConfig.selfAssignableRoleIds || []).length}`,
                inline: true,
              }
            )
            .setFooter({ text: "Botify Server Config" }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "selfroles") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const guildConfig = getGuildConfig(guildId);
      const selfRoleIds = guildConfig.selfAssignableRoleIds || [];
      const lines = selfRoleIds.map((roleId) => {
        const role = targetGuild.roles.cache.get(roleId);
        return role ? `• @${role.name} (\`${role.id}\`)` : `• Unknown role (\`${roleId}\`)`;
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Self-Roles`)
            .setDescription(lines.join("\n") || "No self-roles are configured on this server.")
            .setFooter({ text: `Botify Self-Roles • ${selfRoleIds.length} role(s)` }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "stats") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const stats = {
        categories: 0,
        text: 0,
        announcements: 0,
        voice: 0,
        stage: 0,
        forum: 0,
      };

      for (const channel of targetGuild.channels.cache.values()) {
        if (channel.type === ChannelType.GuildCategory) stats.categories += 1;
        if (channel.type === ChannelType.GuildText) stats.text += 1;
        if (channel.type === ChannelType.GuildAnnouncement) stats.announcements += 1;
        if (channel.type === ChannelType.GuildVoice) stats.voice += 1;
        if (channel.type === ChannelType.GuildStageVoice) stats.stage += 1;
        if (channel.type === ChannelType.GuildForum) stats.forum += 1;
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Stats`)
            .addFields(
              { name: "Members", value: `${targetGuild.memberCount}`, inline: true },
              { name: "Roles", value: `${targetGuild.roles.cache.size}`, inline: true },
              { name: "Categories", value: `${stats.categories}`, inline: true },
              { name: "Text", value: `${stats.text}`, inline: true },
              { name: "Announcements", value: `${stats.announcements}`, inline: true },
              { name: "Voice", value: `${stats.voice}`, inline: true },
              { name: "Stage", value: `${stats.stage}`, inline: true },
              { name: "Forum", value: `${stats.forum}`, inline: true }
            )
            .setFooter({ text: "Botify Server Stats" }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "tickets") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const guildConfig = getGuildConfig(guildId);
      const panelChannel = guildConfig.ticketPanelChannelId
        ? targetGuild.channels.cache.get(guildConfig.ticketPanelChannelId)
        : null;
      const ticketCategory = guildConfig.ticketCategoryId
        ? targetGuild.channels.cache.get(guildConfig.ticketCategoryId)
        : null;
      const supportRole = guildConfig.supportRoleId
        ? targetGuild.roles.cache.get(guildConfig.supportRoleId)
        : null;
      const openTickets = targetGuild.channels.cache.filter(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          typeof channel.topic === "string" &&
          channel.topic.includes("ticket-owner:")
      ).size;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Ticket Setup`)
            .addFields(
              { name: "Ticket Panel", value: panelChannel ? `#${panelChannel.name}` : "Not set", inline: true },
              { name: "Ticket Category", value: ticketCategory ? `#${ticketCategory.name}` : "Not set", inline: true },
              { name: "Support Role", value: supportRole ? `@${supportRole.name}` : "Not set", inline: true },
              { name: "Open Tickets", value: `${openTickets}`, inline: true }
            )
            .setFooter({ text: "Botify Ticket Info" }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "panels") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const guildConfig = getGuildConfig(guildId);
      const ticketPanel = guildConfig.ticketPanelChannelId
        ? targetGuild.channels.cache.get(guildConfig.ticketPanelChannelId)
        : null;
      const welcomeChannel = guildConfig.welcomeChannelId
        ? targetGuild.channels.cache.get(guildConfig.welcomeChannelId)
        : null;
      const goodbyeChannel = guildConfig.goodbyeChannelId
        ? targetGuild.channels.cache.get(guildConfig.goodbyeChannelId)
        : null;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Panels`)
            .addFields(
              { name: "Ticket Panel", value: ticketPanel ? `#${ticketPanel.name}` : "Not set", inline: true },
              { name: "Welcome Channel", value: welcomeChannel ? `#${welcomeChannel.name}` : "Not set", inline: true },
              { name: "Goodbye Channel", value: goodbyeChannel ? `#${goodbyeChannel.name}` : "Not set", inline: true },
              { name: "Panel Image URL", value: guildConfig.panelImageUrl || "Not set", inline: false }
            )
            .setFooter({ text: "Botify Panel Info" }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "calls") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const callLines = targetGuild.channels.cache
        .filter(
          (channel) =>
            channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice
        )
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .map((channel) => {
          const kind = channel.type === ChannelType.GuildStageVoice ? "Stage" : "Voice";
          const limit = typeof channel.userLimit === "number" && channel.userLimit > 0 ? ` • limit ${channel.userLimit}` : "";
          return `• **${channel.name}** - ${kind}${limit}`;
        });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${targetGuild.name} Calls`)
            .setDescription(callLines.join("\n") || "This server has no voice or stage channels.")
            .setFooter({ text: `Botify Calls • ${callLines.length} call channel(s)` }),
        ],
        flags: 64,
      });
      return;
    }

    if (subcommand === "leave") {
      const guildId = interaction.options.getString("server");
      const targetGuild = client.guilds.cache.get(guildId);

      if (!targetGuild) {
        await interaction.reply({
          content: "I could not find that server.",
          flags: 64,
        });
        return;
      }

      const targetName = targetGuild.name;
      await interaction.reply({
        content: `Leaving **${targetName}**...`,
        flags: 64,
      });

      await targetGuild.leave().catch((error) => {
        console.error(`Failed to leave guild ${guildId}:`, error);
      });
      return;
    }
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "welcometest") {
    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!guildConfig.welcomeChannelId) {
      await interaction.reply({
        content: "No welcome channel is set yet. Use `/setwelcome` first.",
        flags: 64,
      });
      return;
    }

    const channel = await interaction.client.channels.fetch(guildConfig.welcomeChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: "The configured welcome channel could not be found.",
        flags: 64,
      });
      return;
    }

    await channel.send(`Welcome to Solo Traders ${interaction.user} enjoy your stay`);
    await interaction.reply({
      content: `Sent a test welcome message in ${channel}.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "setup") {
    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: "Creating the Botify Brawl Stars wintrade setup. This may take a moment...",
      flags: 64,
    });

    const result = await runWintradeSetup(interaction.guild);

    updateGuildConfig(interaction.guild.id, (current) => ({
      ...current,
      supportRoleId: result.supportRoleId || current.supportRoleId,
      ticketCategoryId: result.ticketCategoryId || current.ticketCategoryId,
      ticketPanelChannelId: result.ticketsChannelId || current.ticketPanelChannelId,
      welcomeChannelId: result.welcomeChannelId || current.welcomeChannelId,
      goodbyeChannelId: result.goodbyeChannelId || current.goodbyeChannelId,
      selfAssignableRoleIds: Array.from(new Set([...(current.selfAssignableRoleIds || []), ...result.privateRoleIds])),
    }));

    await interaction.followUp({
      content: [
        "Wintrade setup finished.",
        `Categories created: **${result.createdCategories}**`,
        `Channels created: **${result.createdChannels}**`,
        `Private roles created: **${result.createdRoles}**`,
        result.ticketsChannelId ? `Tickets channel saved: <#${result.ticketsChannelId}>` : null,
        result.privateRoleIds.length ? `Private call roles added to self-roles: **${result.privateRoleIds.length}**` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "delete") {
    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel", true);

      if (!channel.guild || channel.guild.id !== interaction.guild.id) {
        await interaction.reply({
          content: "Please choose a channel from this server.",
          flags: 64,
        });
        return;
      }

      await interaction.reply({
        content: `Deleting channel **${channel.name}**...`,
        flags: 64,
      });

      await channel.delete(`Deleted by ${interaction.user.tag} using /delete channel`);
      return;
    }

    const confirm = interaction.options.getBoolean("confirm");
    if (!confirm) {
      await interaction.reply({
        content: "Set `confirm` to true if you really want to delete all channels.",
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: "Starting bulk channel deletion...",
      flags: 64,
    });

    await deleteAllGuildChannels(interaction.guild);
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "tokens") {
    const user = interaction.options.getUser("user") || interaction.user;
    await interaction.reply({
      content: `${user} has **${getTokens(user.id)}** tokens.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "pay") {
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (user.id === interaction.user.id) {
      await interaction.reply({ content: "You cannot send tokens to yourself.", flags: 64 });
      return;
    }

    if (getTokens(interaction.user.id) < amount) {
      await interaction.reply({ content: "You do not have enough tokens.", flags: 64 });
      return;
    }

    removeTokens(interaction.user.id, amount);
    addTokens(user.id, amount);
    await interaction.reply({ content: `Sent **${amount}** tokens to ${user}.`, flags: 64 });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "to") {
    if (!hasTimeoutAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Moderate Members permission to use this command.",
        flags: 64,
      });
      return;
    }

    const targetMember = interaction.options.getMember("user");
    const timeInput = interaction.options.getString("time");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const duration = parseDuration(timeInput);

    if (!targetMember) {
      await interaction.reply({
        content: "I could not find that member in this server.",
        flags: 64,
      });
      return;
    }

    if (!duration) {
      await interaction.reply({
        content: "Invalid time. Example: 10m, 1h, 1d",
        flags: 64,
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        content: "I cannot timeout that member.",
        flags: 64,
      });
      return;
    }

    await targetMember.timeout(duration, reason);
    await interaction.reply({
      content: `Timed out ${targetMember} for **${timeInput}**.\nReason: **${reason}**`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "ban") {
    if (!hasBanAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Ban Members permission to use this command.",
        flags: 64,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (targetMember && !targetMember.bannable) {
      await interaction.reply({
        content: "I cannot ban that member.",
        flags: 64,
      });
      return;
    }

    await interaction.guild.members.ban(targetUser.id, { reason });
    await interaction.reply({
      content: `Banned ${targetUser}.\nReason: **${reason}**`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "mute") {
    if (!hasTimeoutAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Moderate Members permission to use this command.",
        flags: 64,
      });
      return;
    }

    const targetMember = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!targetMember) {
      await interaction.reply({
        content: "I could not find that member in this server.",
        flags: 64,
      });
      return;
    }

    if (!targetMember.manageable || !targetMember.voice) {
      await interaction.reply({
        content: "I cannot mute that member.",
        flags: 64,
      });
      return;
    }

    await targetMember.voice.setMute(true, reason);
    await interaction.reply({
      content: `Muted ${targetMember} in voice channels.\nReason: **${reason}**`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "lock") {
    if (!interaction.channel || !interaction.channel.isTextBased() || !("permissionOverwrites" in interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: 64,
      });
      return;
    }

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      await interaction.reply({
        content: "You need Manage Channels permission to use this command.",
        flags: 64,
      });
      return;
    }

    const reason = interaction.options.getString("reason") || "No reason provided";
    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      buildEveryoneLockPermissions(interaction.channel.type),
      { reason: `Channel locked by ${interaction.user.tag}: ${reason}` }
    );

    for (const role of getLockTargetRoles(interaction.guild).values()) {
      await interaction.channel.permissionOverwrites.edit(
        role,
        buildEveryoneLockPermissions(interaction.channel.type),
        { reason: `Channel locked by ${interaction.user.tag}: ${reason}` }
      );
    }

    await interaction.reply({
      content: `Locked ${interaction.channel}.\nReason: **${reason}**`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "unlock") {
    if (!interaction.channel || !interaction.channel.isTextBased() || !("permissionOverwrites" in interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: 64,
      });
      return;
    }

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      await interaction.reply({
        content: "You need Manage Channels permission to use this command.",
        flags: 64,
      });
      return;
    }

    const reason = interaction.options.getString("reason") || "No reason provided";

    await interaction.channel.permissionOverwrites.delete(interaction.guild.roles.everyone, {
      reason: `Channel unlocked by ${interaction.user.tag}: ${reason}`,
    }).catch(() => null);

    for (const role of getLockTargetRoles(interaction.guild).values()) {
      await interaction.channel.permissionOverwrites.delete(role, {
        reason: `Channel unlocked by ${interaction.user.tag}: ${reason}`,
      }).catch(() => null);
    }

    await interaction.reply({
      content: `Unlocked ${interaction.channel}.\nReason: **${reason}**`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "kickrole") {
    if (!hasBanAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Ban Members permission to use this command.",
        flags: 64,
      });
      return;
    }

    const role = interaction.options.getRole("role");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (role.id === interaction.guild.roles.everyone.id) {
      await interaction.reply({
        content: "You cannot use `/kickrole` with `@everyone`.",
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: `Starting kick for members with **${role.name}**...`,
      flags: 64,
    });

    const { members } = await resolveMembersForRoleAll(interaction.guild, "kickrole");
    let kicked = 0;
    let skipped = 0;

    for (const member of members.values()) {
      if (member.user.bot || !member.roles.cache.has(role.id) || !member.kickable) {
        skipped += 1;
        continue;
      }

      try {
        await member.kick(reason);
        kicked += 1;
      } catch (error) {
        skipped += 1;
        console.error(`Failed to kick member ${member.id} for role ${role.id}:`, error);
      }
    }

    await interaction.followUp({
      content: `Finished kicking members with **${role.name}**.\nKicked: **${kicked}**\nSkipped: **${skipped}**`,
      flags: 64,
    });
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    (interaction.commandName === "addtokens" || interaction.commandName === "removetokens")
  ) {
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!hasStaffAccess(interaction.member, guildConfig)) {
      await interaction.reply({ content: "Only staff members can manage tokens.", flags: 64 });
      return;
    }

    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const total =
      interaction.commandName === "addtokens"
        ? addTokens(user.id, amount)
        : removeTokens(user.id, amount);

    await interaction.reply({ content: `${user} now has **${total}** tokens.`, flags: 64 });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "role") {
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!hasStaffAccess(interaction.member, guildConfig)) {
      await interaction.reply({
        content: "Only staff members can give or remove roles.",
        flags: 64,
      });
      return;
    }

    const targetUser = interaction.options.getMember("user");
    const role = interaction.options.getRole("role");

    if (!isRoleManageable(interaction.guild, role)) {
      await interaction.reply({ content: "I cannot manage that role.", flags: 64 });
      return;
    }

    if (!canMemberAssignRole(interaction.member, role)) {
      await interaction.reply({
        content: "You cannot assign a role higher than your highest role.",
        flags: 64,
      });
      return;
    }

    if (targetUser.roles.cache.has(role.id)) {
      await targetUser.roles.remove(role);
      await interaction.reply({
        content: `Removed **${role.name}** from ${targetUser}.`,
        flags: 64,
      });
      return;
    }

    await targetUser.roles.add(role);
    await interaction.reply({
      content: `Added **${role.name}** to ${targetUser}.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "roleall") {
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!hasStaffAccess(interaction.member, guildConfig)) {
      await interaction.reply({
        content: "Only staff members can give roles to everyone.",
        flags: 64,
      });
      return;
    }

    const role = interaction.options.getRole("role");

    if (!isRoleManageable(interaction.guild, role)) {
      await interaction.reply({ content: "I cannot manage that role.", flags: 64 });
      return;
    }

    if (!canMemberAssignRole(interaction.member, role)) {
      await interaction.reply({
        content: "You cannot assign a role higher than your highest role.",
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: `Starting role assignment for **${role.name}**. This can take a moment on larger servers.`,
      flags: 64,
    });

    const { members, isPartial } = await resolveMembersForRoleAll(interaction.guild, "slash roleall");

    let addedCount = 0;
    let skippedCount = 0;

    for (const member of members.values()) {
      if (member.user.bot || member.roles.cache.has(role.id)) {
        skippedCount += 1;
        continue;
      }

      try {
        await member.roles.add(role);
        addedCount += 1;
      } catch (error) {
        skippedCount += 1;
        console.error(`Failed to add role ${role.id} to member ${member.id}:`, error);
      }
    }

    await interaction.followUp({
      content: [
        `Finished giving **${role.name}** to everyone.`,
        `Added: **${addedCount}**`,
        `Skipped: **${skippedCount}**`,
        isPartial
          ? "Note: I could only use currently loaded members. For full `/roleall`, enable `SERVER MEMBERS INTENT` in the Discord Developer Portal, set `ENABLE_GUILD_MEMBERS=true` in `.env`, and restart the bot."
          : null,
      ].filter(Boolean).join("\n"),
      flags: 64,
    });
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    (interaction.commandName === "selfrole" || interaction.commandName === "roleme")
  ) {
    const guildConfig = pruneInvalidSelfAssignableRoles(interaction.guild);
    const role = interaction.options.getRole("role");

    if (!guildConfig.selfAssignableRoleIds.includes(role.id)) {
      await interaction.reply({ content: "That role is not self-assignable.", flags: 64 });
      return;
    }

    if (!isRoleManageable(interaction.guild, role)) {
      await interaction.reply({ content: "I cannot manage that role.", flags: 64 });
      return;
    }

    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role);
      await interaction.reply({ content: `Removed **${role.name}** from you.`, flags: 64 });
      return;
    }

    await interaction.member.roles.add(role);
    await interaction.reply({ content: `Added **${role.name}** to you.`, flags: 64 });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "giveaway") {
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!hasGiveawayAccess(interaction.member, guildConfig)) {
      await interaction.reply({ content: "Only staff members can start giveaways.", flags: 64 });
      return;
    }

    const durationInput = interaction.options.getString("duration");
    const winners = interaction.options.getInteger("winners");
    const prize = interaction.options.getString("prize");
    const duration = parseDuration(durationInput);

    if (!duration) {
      await interaction.reply({
        content: "Invalid duration. Example: 10m, 1h, 1d",
        flags: 64,
      });
      return;
    }

    await interaction.reply({ content: "Creating giveaway...", flags: 64 });

    const fakeMessage = {
      author: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    };

    await startGiveaway(fakeMessage, duration, winners, prize);
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    (interaction.commandName === "reroll" || interaction.commandName === "endgiveaway")
  ) {
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!hasGiveawayAccess(interaction.member, guildConfig)) {
      await interaction.reply({
        content:
          interaction.commandName === "reroll"
            ? "Only staff members can reroll giveaways."
            : "Only staff members can end giveaways.",
        flags: 64,
      });
      return;
    }

    const messageId = interaction.options.getString("message_id");

    const fakeMessage = {
      author: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
      reply: async (payload) =>
        interaction.reply(typeof payload === "string" ? { content: payload, flags: 64 } : payload),
    };

    if (interaction.commandName === "reroll") {
      await rerollGiveaway(fakeMessage, messageId);
      return;
    }

    await endGiveaway(fakeMessage, messageId);
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    ["setpanel", "setwelcome", "setgoodbye", "setsupportrole", "setticketcategory", "setprefix", "addselfrole", "removeselfrole", "addshopitem", "removeshopitem"].includes(
      interaction.commandName
    )
  ) {
    if (!hasSetupAccess(interaction.member)) {
      await interaction.reply({
        content: "You need Administrator or Manage Server to do that.",
        flags: 64,
      });
      return;
    }

    if (interaction.commandName === "setpanel") {
      const nextConfig = updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        ticketPanelChannelId: interaction.channel.id,
      }));

      await sendPanel(interaction.channel, nextConfig);
      await interaction.reply({
        content: `Saved ${interaction.channel} as the ticket panel channel.`,
        flags: 64,
      });
      return;
    }

    if (interaction.commandName === "setwelcome" || interaction.commandName === "setgoodbye") {
      const channel = interaction.options.getChannel("channel");
      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        [interaction.commandName === "setwelcome" ? "welcomeChannelId" : "goodbyeChannelId"]: channel.id,
      }));

      await interaction.reply({
        content:
          interaction.commandName === "setwelcome"
            ? `Welcome channel set to ${channel}.`
            : `Goodbye channel set to ${channel}.`,
        flags: 64,
      });
      return;
    }

    if (interaction.commandName === "setsupportrole") {
      const role = interaction.options.getRole("role");
      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        supportRoleId: role.id,
        giveawayHostRoleId: current.giveawayHostRoleId || role.id,
      }));

      await interaction.reply({ content: `Support role set to **${role.name}**.`, flags: 64 });
      return;
    }

    if (interaction.commandName === "setticketcategory") {
      const category = interaction.options.getChannel("category");
      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        ticketCategoryId: category.id,
      }));

      await interaction.reply({
        content: `Ticket category set to **${category.name}**.`,
        flags: 64,
      });
      return;
    }

    if (interaction.commandName === "setprefix") {
      const newPrefix = interaction.options.getString("prefix");
      updateGuildConfig(interaction.guild.id, (current) => ({
        ...current,
        prefix: newPrefix,
      }));

      await interaction.reply({ content: `Prefix updated to \`${newPrefix}\`.`, flags: 64 });
      return;
    }

    const role = interaction.options.getRole("role");
    if (interaction.commandName === "addshopitem") {
      const price = interaction.options.getInteger("price");
      updateGuildShopItems(interaction.guild.id, (current) => {
        const filtered = current.filter((item) => item.roleId !== role.id);
        filtered.push({ roleId: role.id, price });
        return filtered;
      });

      await interaction.reply({
        content: `Added **${role.name}** to the shop for **${price}** tokens.`,
        flags: 64,
      });
      return;
    }

    if (interaction.commandName === "removeshopitem") {
      updateGuildShopItems(interaction.guild.id, (current) =>
        current.filter((item) => item.roleId !== role.id)
      );

      await interaction.reply({
        content: `Removed **${role.name}** from the shop.`,
        flags: 64,
      });
      return;
    }

    updateGuildConfig(interaction.guild.id, (current) => {
      const roleIds = new Set(current.selfAssignableRoleIds || []);
      if (interaction.commandName === "addselfrole") {
        roleIds.add(role.id);
      } else {
        roleIds.delete(role.id);
      }

      return {
        ...current,
        selfAssignableRoleIds: [...roleIds],
      };
    });

    await interaction.reply({
      content:
        interaction.commandName === "addselfrole"
          ? `Added **${role.name}** to self-assignable roles.`
          : `Removed **${role.name}** from self-assignable roles.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("open-ticket-")) {
    const ticketType = interaction.customId.replace("open-ticket-", "");
    await interaction.showModal(buildTicketReasonModal(ticketType));
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket-reason-")) {
    const ticketType = interaction.customId.replace("ticket-reason-", "");
    const reason = interaction.fields.getTextInputValue("ticket-reason-input")?.trim();

    if (!reason) {
      await interaction.reply({
        content: "Please enter a reason for your ticket.",
        flags: 64,
      });
      return;
    }

    await createTicket(interaction, ticketType, reason);
    return;
  }

  if (interaction.isButton() && interaction.customId === "queue-join") {
    await handleQueueJoin(interaction);
    return;
  }

  if (interaction.isButton() && interaction.customId === "queue-leave") {
    await handleQueueLeave(interaction);
    return;
  }

  if (interaction.isButton() && interaction.customId === "queue-next") {
    await handleQueueNext(interaction);
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("giveaway-toggle-")) {
    const messageId = interaction.customId.replace("giveaway-toggle-", "");
    const result = await withGiveawayLock(messageId, async () => {
      const store = getGiveawayStore();
      const giveaway = store[messageId];

      if (!giveaway) {
        return { missing: true };
      }

      const participants = new Set(getUniqueParticipantIds(giveaway));
      let responseText = "";

      if (participants.has(interaction.user.id)) {
        participants.delete(interaction.user.id);
        responseText = "You left the giveaway.";
      } else {
        participants.add(interaction.user.id);
        responseText = "You joined the giveaway.";
      }

      giveaway.participants = [...participants];
      store[messageId] = giveaway;
      setGiveawayStore(store);

      const entryCount = giveaway.participants.length;

      try {
        await interaction.message.edit({
          embeds: [buildGiveawayEmbed(giveaway)],
          components: buildGiveawayButtons(messageId, participants.has(interaction.user.id), entryCount),
        });
      } catch (error) {
        console.error(`Failed to update giveaway message ${messageId}:`, error);
      }

      return { responseText };
    });

    if (result?.missing) {
      await interaction.reply({
        content: "This giveaway is no longer active.",
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      content: result.responseText,
      flags: 64,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("rolepanel-toggle-")) {
    const roleId = interaction.customId.replace("rolepanel-toggle-", "");
    const guildConfig = pruneInvalidSelfAssignableRoles(interaction.guild);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role || !guildConfig.selfAssignableRoleIds.includes(roleId)) {
      await interaction.reply({
        content: "This role is no longer available from the role panel. Please send a new `/rolepanel send` panel.",
        flags: 64,
      });
      return;
    }

    if (!isRoleManageable(interaction.guild, role)) {
      await interaction.reply({
        content: "I cannot manage that role right now. Move the bot role above that role in Server Settings > Roles.",
        flags: 64,
      });
      return;
    }

    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role);
      await interaction.reply({
        content: `Removed **${role.name}** from you.`,
        flags: 64,
      });
      return;
    }

    await interaction.member.roles.add(role);
    await interaction.reply({
      content: `Added **${role.name}** to you.`,
      flags: 64,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("shop-buy-")) {
    const roleId = interaction.customId.replace("shop-buy-", "");
    const shopItem = getGuildShopItems(interaction.guild.id).find((item) => item.roleId === roleId);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!shopItem || !role) {
      await interaction.reply({
        content: "This shop item is no longer available.",
        flags: 64,
      });
      return;
    }

    if (!isRoleManageable(interaction.guild, role)) {
      await interaction.reply({
        content: "I cannot give out that role right now.",
        flags: 64,
      });
      return;
    }

    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: `You already own **${role.name}**.`,
        flags: 64,
      });
      return;
    }

    const balance = getTokens(interaction.user.id);
    if (balance < shopItem.price) {
      await interaction.reply({
        content: `You need **${shopItem.price}** tokens for **${role.name}**, but you only have **${balance}**.`,
        flags: 64,
      });
      return;
    }

    removeTokens(interaction.user.id, shopItem.price);
    await interaction.member.roles.add(role);
    await interaction.reply({
      content: `You bought **${role.name}** for **${shopItem.price}** tokens. You now have **${getTokens(interaction.user.id)}** tokens left.`,
      flags: 64,
    });
    return;
  }

  if (!interaction.isButton() || !interaction.guild || !interaction.channel) {
    return;
  }

  const guildConfig = getGuildConfig(interaction.guild.id);
  const channel = interaction.channel;

  if (channel.type !== ChannelType.GuildText) {
    return;
  }

  if (interaction.customId === "ticket-claim") {
    if (!hasStaffAccess(interaction.member, guildConfig)) {
      await interaction.reply({
        content: "Only staff members can claim tickets.",
        flags: 64,
      });
      return;
    }

    const currentTopic = channel.topic || "";
    if (currentTopic.includes("claimed:none")) {
      await channel.setTopic(currentTopic.replace("claimed:none", `claimed:${interaction.user.id}`));
    }

    await interaction.reply({
      content: `${interaction.user} has claimed this ticket.`,
    });
    return;
  }

  if (interaction.customId === "ticket-close") {
    const currentTopic = channel.topic || "";
    const ownerIdMatch = currentTopic.match(/ticket-owner:(\d+)/);
    const ownerId = ownerIdMatch ? ownerIdMatch[1] : null;
    const isOwner = ownerId === interaction.user.id;

    if (!isOwner && !hasStaffAccess(interaction.member, guildConfig)) {
      await interaction.reply({
        content: "Only the ticket creator or a staff member can close this ticket.",
        flags: 64,
      });
      return;
    }

    await interaction.reply("This ticket will be closed in 5 seconds...");
    setTimeout(async () => {
      try {
        await channel.delete("Ticket closed");
      } catch (error) {
        console.error("Failed to delete ticket channel:", error);
      }
    }, 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);
