const { EmbedBuilder } = require("discord.js");

module.exports = {
  async handleError(interaction, error) {
    const developerId = process.env.DEVELOPER_ID || "1234459679640522802";

    let client = interaction?.client || global.client;
    if (!client) {
      console.error("No client available to fetch the developer user.");
      return;
    }

    try {
      const developer = await client.users.fetch(developerId);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🚨 Bot Error Notification")
        .setDescription(`An error occurred during execution.`)
        .addFields({
          name: "Error Message",
          value: `\`\`\`${error.message}\`\`\``,
        });

      if (interaction) {
        errorEmbed.addFields(
          {
            name: "User",
            value: `<@${interaction.user.id}> (${interaction.user.tag})`,
            inline: true,
          },
          {
            name: "Command/Button",
            value: `${interaction.commandName || interaction.customId}`,
            inline: true,
          },
          {
            name: "Guild",
            value: interaction.guild?.name || "DM",
            inline: true,
          }
        );
      }

      await developer.send({ embeds: [errorEmbed] });

      if (interaction) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content:
              "❗ The developer has been notified about the error. Please don't use this command for a while.",
            ephemeral: true,
          });
        } else if (!interaction.replied) {
          await interaction.followUp({
            content:
              "❗ The developer has been notified about the error. Please don't use this command for a while.",
            ephemeral: true,
          });
        }
      }
    } catch (sendError) {
      console.error(
        "Failed to send error notification to developer:",
        sendError
      );
    }

    console.error("Error occurred during interaction execution:", error);
  },
};
