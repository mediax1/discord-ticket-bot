const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const getButtonStyle = (color) => {
  switch (color.toLowerCase()) {
    case "primary":
      return ButtonStyle.Primary;
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Primary;
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription(
      "Sets up a ticket panel with up to 4 buttons in the specified channel."
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where the ticket panel will be sent")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("categoryid1")
        .setDescription(
          "The ID of the category where the first ticket button will create tickets"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("transcript_channel_id")
        .setDescription(
          "The ID of the channel where transcripts will be sent after tickets are closed"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("label1")
        .setDescription("The label for the first button")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color1")
        .setDescription(
          "Color for the first button (primary, secondary, success, danger)"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("categoryid2")
        .setDescription(
          "The ID of the category where the second ticket button will create tickets"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("label2")
        .setDescription("The label for the second button")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color2")
        .setDescription(
          "Color for the second button (primary, secondary, success, danger)"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("categoryid3")
        .setDescription(
          "The ID of the category where the third ticket button will create tickets"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("label3")
        .setDescription("The label for the third button")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color3")
        .setDescription(
          "Color for the third button (primary, secondary, success, danger)"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("categoryid4")
        .setDescription(
          "The ID of the category where the fourth ticket button will create tickets"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("label4")
        .setDescription("The label for the fourth button")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color4")
        .setDescription(
          "Color for the fourth button (primary, secondary, success, danger)"
        )
        .setRequired(false)
    ),

  adminOnly: true,

  async execute(interaction) {
    try {
      const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
      const isAdmin =
        interaction.member.permissions.has("Administrator") ||
        interaction.member.roles.cache.has(adminRoleId);

      if (!isAdmin) {
        return interaction.reply({
          content: "🚫 You do not have permission to use this command.",
          ephemeral: true,
        });
      }

      const panelChannel = interaction.options.getChannel("channel");
      const categoryIds = [
        interaction.options.getString("categoryid1"),
        interaction.options.getString("categoryid2"),
        interaction.options.getString("categoryid3"),
        interaction.options.getString("categoryid4"),
      ].filter(Boolean);

      const labels = [
        interaction.options.getString("label1") || "📩 Create Ticket 1",
        interaction.options.getString("label2") || "📩 Create Ticket 2",
        interaction.options.getString("label3") || "📩 Create Ticket 3",
        interaction.options.getString("label4") || "📩 Create Ticket 4",
      ];

      const colors = [
        interaction.options.getString("color1") || "primary",
        interaction.options.getString("color2") || "primary",
        interaction.options.getString("color3") || "primary",
        interaction.options.getString("color4") || "primary",
      ];

      const transcriptChannelId = interaction.options.getString(
        "transcript_channel_id"
      );

      if (!panelChannel.isTextBased()) {
        return interaction.reply({
          content: "❗ The specified channel is not a valid text channel.",
          ephemeral: true,
        });
      }

      if (categoryIds.length > 4) {
        return interaction.reply({
          content: "❗ You can only specify up to 4 category IDs.",
          ephemeral: true,
        });
      }

      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const panelsCollection = db.collection("panels");

      await panelsCollection.deleteMany({});
      await panelsCollection.insertOne({
        categoryIds: categoryIds,
        transcriptChannelId: transcriptChannelId,
      });

      const embed = new EmbedBuilder()
        .setColor(0x1f8b4c)
        .setTitle("🎟️ Welcome to DarkEyes Store Support")
        .setDescription(
          `At **DarkEyes Store**, we offer the best deals on OTTs, software, keys, games, and much more!\n\nIf you have any issues or inquiries, feel free to open a support ticket by clicking the buttons below.`
        )
        .setThumbnail("https://i.postimg.cc/Ss2mpf93/logo.gif")
        .addFields({
          name: "🛒 Shop with Us",
          value:
            "[Visit DarkEyes Store](https://darkeyesstore.com) for more exciting offers and products!",
        })
        .setImage("https://i.postimg.cc/nzChhtyd/main.gif")
        .setFooter({
          text: "DarkEyes Store - Your one-stop shop for premium software and services.",
          iconURL: "https://i.postimg.cc/G36H9Hhv/logo.png",
        });

      const buttonRow = new ActionRowBuilder();

      categoryIds.forEach((categoryId, index) => {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`create_ticket_${categoryId}`)
            .setLabel(labels[index])
            .setStyle(getButtonStyle(colors[index]))
        );
      });

      await panelChannel.send({ embeds: [embed], components: [buttonRow] });

      await interaction.reply({
        content: `✅ Ticket panel has been successfully sent to ${panelChannel}.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error setting up ticket panel:", error);
      throw error;
    }
  },
};
