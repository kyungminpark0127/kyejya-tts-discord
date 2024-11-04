const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('봇이 현재 음성 채널에 참여합니다.'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('봇이 현재 음성 채널에서 나갑니다.'),
    new SlashCommandBuilder()
        .setName('introducebot')
        .setDescription('봇을 소개합니다.')
];

// 명령어 데이터 형태로 변환
const commandData = commands.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("명령어를 Discord에 등록 중입니다...");

        await rest.put(
            Routes.applicationCommands(DISCORD_CLIENT_ID),
            { body: commandData },
        );

        console.log("명령어가 성공적으로 등록되었습니다!");
    } catch (error) {
        console.error(error);
    }
})();