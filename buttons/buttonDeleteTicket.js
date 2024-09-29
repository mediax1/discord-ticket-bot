const { generateFromMessages } = require("discord-html-transcripts-foxmod");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  customId: "delete_ticket",
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const mongoClient = interaction.client.mongoClient;
    const db = mongoClient.db("ticketBotDB");
    const ticketsCollection = db.collection("tickets");
    const panelsCollection = db.collection("panels");

    const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
    const isAdmin = interaction.member.roles.cache.has(adminRoleId);

    if (!isAdmin) {
      return interaction.followUp({
        content: "🚫 You do not have permission to delete this ticket.",
        ephemeral: true,
      });
    }

    const channel = interaction.channel;
    const channelId = channel.id;

    const ticket = await ticketsCollection.findOne({ channelId });
    const panel = await panelsCollection.findOne();

    if (!ticket || !panel) {
      return interaction.followUp({
        content: "❗ This ticket does not exist or has already been deleted.",
        ephemeral: true,
      });
    }

    const transcriptChannelId = panel.transcriptChannelId;
    const transcriptChannel =
      interaction.guild.channels.cache.get(transcriptChannelId);

    if (!transcriptChannel) {
      return interaction.followUp({
        content:
          "❗ The transcript channel could not be found. Please check the transcript channel ID.",
        ephemeral: true,
      });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const orderedMessages = [...messages.values()].reverse();

      const transcript = await generateFromMessages(
        orderedMessages,
        interaction.channel,
        {
          returnType: "buffer",
          fileName: `transcript-${interaction.channel.name}.html`,
        }
      );

      const usersInTranscript = new Set();
      messages.forEach((msg) => {
        usersInTranscript.add(
          `${msg.author.username}#${msg.author.discriminator} - <@${msg.author.id}>`
        );
      });

      const usersList = Array.from(usersInTranscript).join("\n");

      const transcriptEmbed = new EmbedBuilder()
        .setTitle("📝 Ticket Transcript Summary")
        .setColor(0x00ff00)
        .addFields(
          {
            name: "🎟️ Ticket Owner",
            value: `<@${ticket.userId}>`,
            inline: true,
          },
          {
            name: "📂 Ticket Name",
            value: `${interaction.channel.name}`,
            inline: true,
          },
          {
            name: "🏷️ Panel Name",
            value: `${panel.panelName || "Support Panel"}`,
            inline: true,
          },
          { name: "👥 Users in Transcript", value: usersList || "None" }
        );

      await transcriptChannel.send({
        content: `📄 Transcript for ticket: ${interaction.channel.name}`,
        embeds: [transcriptEmbed],
        files: [
          {
            attachment: transcript,
            name: `transcript-${interaction.channel.name}.html`,
          },
        ],
      });

      console.log(
        `Transcript for ticket ${interaction.channel.name} has been sent.`
      );
    } catch (error) {
      console.error("Error generating or sending the transcript:", error);
      return interaction.followUp({
        content: "❗ There was an error generating or sending the transcript.",
        ephemeral: true,
      });
    }

    try {
      await ticketsCollection.deleteOne({ channelId });
      console.log(`Deleted ticket from the database: ${channelId}`);
    } catch (error) {
      console.error("Error deleting ticket from database:", error);
      return interaction.followUp({
        content: "❗ There was an error deleting the ticket from the database.",
        ephemeral: true,
      });
    }

    try {
      const user = await interaction.guild.members.fetch(ticket.userId);
      if (user) {
        await user.send({
          content: `🔒 Your ticket has been deleted. We would love to hear your feedback! Please use the command \`/feedback\` in any server channel to provide your feedback.`,
        });
        console.log(`Feedback request sent to ${user.user.tag}`);
      }
    } catch (error) {
      console.error(`Error sending feedback request: ${error}`);
    }

    await interaction.followUp({
      content: "🗑️ The ticket will be deleted in 5 seconds...",
      ephemeral: true,
    });

    setTimeout(async () => {
      try {
        await channel.delete();
        console.log(`Deleted ticket channel: ${channelId}`);
      } catch (error) {
        console.error("Error deleting the ticket channel:", error);
        return interaction.followUp({
          content: "❗ There was an error deleting the ticket channel.",
          ephemeral: true,
        });
      }
    }, 5000);
  },
};
