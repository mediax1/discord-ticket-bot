const { SlashCommandBuilder } = require("discord.js");
const { generateFromMessages } = require("discord-html-transcripts-foxmod");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Generates and sends the transcript of the current ticket"),

  adminOnly: true,

  async execute(interaction) {
    const mongoClient = interaction.client.mongoClient;
    const db = mongoClient.db("ticketBotDB");
    const ticketsCollection = db.collection("tickets");
    const panelsCollection = db.collection("panels");

    const channelId = interaction.channel.id;
    const ticket = await ticketsCollection.findOne({ channelId });
    const panel = await panelsCollection.findOne({});

    if (!ticket || !panel) {
      return interaction.reply({
        content:
          "❗ This ticket does not exist or there was an error generating the transcript.",
        ephemeral: true,
      });
    }

    const transcriptChannelId = panel.transcriptChannelId;
    const transcriptChannel =
      interaction.guild.channels.cache.get(transcriptChannelId);
    if (!transcriptChannel) {
      return interaction.reply({
        content: "❗ Transcript channel not found.",
        ephemeral: true,
      });
    }

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const orderedMessages = [...messages.values()].reverse();

    try {
      const transcript = await generateFromMessages(
        orderedMessages,
        interaction.channel,
        {
          returnType: "buffer",
          fileName: `transcript-${interaction.channel.name}.html`,
        }
      );

      await transcriptChannel.send({
        content: `📄 Transcript for ticket: ${interaction.channel.name}`,
        files: [
          {
            attachment: transcript,
            name: `transcript-${interaction.channel.name}.html`,
          },
        ],
      });

      await interaction.reply({
        content: "✅ Transcript generated and sent to the transcript channel.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("❗ Error generating transcript:", error);
      return interaction.reply({
        content: "❗ There was an error generating the transcript.",
        ephemeral: true,
      });
    }
  },
};
