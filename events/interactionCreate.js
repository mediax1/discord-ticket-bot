const fs = require("fs");
const path = require("path");
const config = require("../config/config.json");
const errorHandler = require("../util/errorHandler");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const memberRoles = interaction.member.roles.cache;
        if (command.adminOnly && !memberRoles.has(config.roles.admin)) {
          return interaction.reply({
            content:
              "🚫 You don't have permission to use this admin-only command.",
            ephemeral: true,
          });
        }

        if (command.devOnly && !memberRoles.has(config.roles.dev)) {
          return interaction.reply({
            content:
              "🚫 You don't have permission to use this dev-only command.",
            ephemeral: true,
          });
        }

        await command.execute(interaction, client);
      }

      if (interaction.isButton()) {
        const buttonFiles = fs
          .readdirSync(path.join(__dirname, "../buttons"))
          .filter((file) => file.endsWith(".js"));

        for (const file of buttonFiles) {
          const buttonHandler = require(`../buttons/${file}`);

          if (buttonHandler.customId instanceof RegExp) {
            if (buttonHandler.customId.test(interaction.customId)) {
              await buttonHandler.execute(interaction, client);
              break;
            }
          } else if (interaction.customId === buttonHandler.customId) {
            await buttonHandler.execute(interaction, client);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error handling interaction:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ ephemeral: true });
      }

      await errorHandler.handleError(interaction, error);
    }
  },
};
