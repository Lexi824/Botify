require("dotenv").config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const REQUIRED_ENV_VARS = ["DISCORD_TOKEN"];

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const PREFIX = process.env.PREFIX || "!";
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID || null;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || null;
const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID || null;
const ENABLE_MESSAGE_CONTENT = process.env.ENABLE_MESSAGE_CONTENT === "true";
const PANEL_IMAGE_URL = process.env.PANEL_IMAGE_URL || null;

const BOT_TEXT = {
  panelTitle: "Need Assistance? Open a ticket!",
  panelDescription: [
    "Welcome to Botify Tickets! We're always ready to assist you!",
    "Kindly choose your ticket category from below.",
    "",
    "**Claim:** For claims, refunds, and purchase issues.",
    "",
    "**Giveaway:** Questions about giveaways, prizes, or sponsorships.",
    "",
    "**Support:** General help from the staff team.",
    "",
    "Click a button below to create a ticket.",
  ].join("\n"),
  panelFooter: "Powered by Botify",
  claimButton: "Claim",
  giveawayButton: "Giveaway",
  supportButton: "Support",
  closeButton: "Close",
  slashPanelDescription: "Send the ticket panel in the current channel.",
  panelSent: "The ticket panel has been sent.",
  textOnlyCommand: "This command can only be used in a text channel.",
  invalidTicketType: "That ticket type does not exist.",
  existingTicket: (channel) => `You already have an open ticket: ${channel}`,
  ticketCreated: (channel) => `Your ticket has been created: ${channel}`,
  ticketEmbedDescription: (user) =>
    [
      `${user}, your ticket has been created.`,
      "",
      "Please describe your issue as clearly as possible.",
      "A staff member can take over this ticket with the `Claim` button.",
    ].join("\n"),
  ticketEmbedTitle: (label) => `${label} Ticket`,
  staffOnlyClaim: "Only staff members can claim tickets.",
  claimedBy: (user) => `${user} has claimed this ticket.`,
  closeDenied: "Only the ticket creator or a staff member can close this ticket.",
  closingSoon: "This ticket will be closed in 5 seconds...",
};

const TICKET_TYPES = {
  claim: {
    label: "Claim",
    description: "Claims, refunds, and order issues",
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

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];

if (ENABLE_MESSAGE_CONTENT) {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({ intents });

function buildPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0xc8a46a)
    .setTitle(BOT_TEXT.panelTitle)
    .setDescription(BOT_TEXT.panelDescription)
    .setFooter({ text: BOT_TEXT.panelFooter });

  if (PANEL_IMAGE_URL) {
    embed.setThumbnail(PANEL_IMAGE_URL);
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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hasStaffAccess(member) {
  if (!member) {
    return false;
  }

  if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return true;
  }

  return SUPPORT_ROLE_ID ? member.roles.cache.has(SUPPORT_ROLE_ID) : false;
}

async function findExistingTicket(guild, userId) {
  return guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      typeof channel.topic === "string" &&
      channel.topic.includes(`ticket-owner:${userId}`)
  );
}

async function sendPanel(targetChannel) {
  await targetChannel.send({
    embeds: [buildPanelEmbed()],
    components: buildPanelComponents(),
  });
}

function findFallbackPanelChannel(guild) {
  return guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildText || !channel.isTextBased()) {
      return false;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    return (
      permissions &&
      permissions.has(PermissionsBitField.Flags.ViewChannel) &&
      permissions.has(PermissionsBitField.Flags.SendMessages) &&
      permissions.has(PermissionsBitField.Flags.EmbedLinks)
    );
  });
}

async function registerSlashCommands(readyClient) {
  const commands = [
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription(BOT_TEXT.slashPanelDescription)
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const guildIds = [...readyClient.guilds.cache.keys()];

  for (const guildId of guildIds) {
    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, guildId),
      { body: commands }
    );
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    await registerSlashCommands(readyClient);
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }

  try {
    if (PANEL_CHANNEL_ID) {
      const channel = await readyClient.channels.fetch(PANEL_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        await sendPanel(channel);
        console.log("Ticket panel sent successfully.");
        return;
      }
    }

    for (const guild of readyClient.guilds.cache.values()) {
      const fallbackChannel = findFallbackPanelChannel(guild);
      if (!fallbackChannel) {
        continue;
      }

      await sendPanel(fallbackChannel);
      console.log(`Ticket panel sent automatically to #${fallbackChannel.name} in ${guild.name}.`);
      return;
    }
  } catch (error) {
    console.error("Failed to send automatic ticket panel:", error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!ENABLE_MESSAGE_CONTENT) {
    return;
  }

  if (message.author.bot || !message.guild) {
    return;
  }

  if (!message.content.startsWith(PREFIX)) {
    return;
  }

  const [command] = message.content.slice(PREFIX.length).trim().split(/\s+/);

  if (command?.toLowerCase() !== "panel") {
    return;
  }

  await sendPanel(message.channel);
  await message.reply(BOT_TEXT.panelSent);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === "panel") {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: BOT_TEXT.textOnlyCommand,
        flags: 64,
      });
      return;
    }

    await sendPanel(interaction.channel);
    await interaction.reply({
      content: BOT_TEXT.panelSent,
      flags: 64,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("open-ticket-")) {
    const ticketType = interaction.customId.replace("open-ticket-", "");
    const config = TICKET_TYPES[ticketType];

    if (!config || !interaction.guild) {
      await interaction.reply({ content: BOT_TEXT.invalidTicketType, flags: 64 });
      return;
    }

    const existingTicket = await findExistingTicket(interaction.guild, interaction.user.id);
    if (existingTicket) {
      await interaction.reply({
        content: BOT_TEXT.existingTicket(existingTicket),
        flags: 64,
      });
      return;
    }

    const channelName = `${ticketType}-${slugify(interaction.user.username)}`;
    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
    ];

    if (SUPPORT_ROLE_ID) {
      permissionOverwrites.push({
        id: SUPPORT_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
        ],
      });
    }

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID || null,
      topic: `ticket-owner:${interaction.user.id};type:${ticketType};claimed:none`,
      permissionOverwrites,
    });

    const embed = new EmbedBuilder()
      .setColor(0xe3c18a)
      .setTitle(BOT_TEXT.ticketEmbedTitle(config.label))
      .setDescription(BOT_TEXT.ticketEmbedDescription(interaction.user));

    await channel.send({
      content: SUPPORT_ROLE_ID ? `<@&${SUPPORT_ROLE_ID}> ${interaction.user}` : `${interaction.user}`,
      embeds: [embed],
      components: buildTicketControls(),
    });

    await interaction.reply({
      content: BOT_TEXT.ticketCreated(channel),
      flags: 64,
    });
    return;
  }

  if (!interaction.isButton() || !interaction.guild || !interaction.channel) {
    return;
  }

  const channel = interaction.channel;
  if (channel.type !== ChannelType.GuildText) {
    return;
  }

  if (interaction.customId === "ticket-claim") {
    if (!hasStaffAccess(interaction.member)) {
      await interaction.reply({
        content: BOT_TEXT.staffOnlyClaim,
        flags: 64,
      });
      return;
    }

    const currentTopic = channel.topic || "";
    if (currentTopic.includes("claimed:none")) {
      await channel.setTopic(
        currentTopic.replace("claimed:none", `claimed:${interaction.user.id}`)
      );
    }

    await interaction.reply({
      content: BOT_TEXT.claimedBy(interaction.user),
    });
    return;
  }

  if (interaction.customId === "ticket-close") {
    const currentTopic = channel.topic || "";
    const ownerIdMatch = currentTopic.match(/ticket-owner:(\d+)/);
    const ownerId = ownerIdMatch ? ownerIdMatch[1] : null;
    const isOwner = ownerId === interaction.user.id;

    if (!isOwner && !hasStaffAccess(interaction.member)) {
      await interaction.reply({
        content: BOT_TEXT.closeDenied,
        flags: 64,
      });
      return;
    }

    await interaction.reply(BOT_TEXT.closingSoon);
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
