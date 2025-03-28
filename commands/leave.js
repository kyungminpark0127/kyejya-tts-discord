const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const gTTS = require('gtts');
const GuildSettings = require('../models/guildSettings'); // MongoDB 모델 가져오기

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('봇이 현재 음성 채널에서 나갑니다.'),

    async execute(interaction) {
        // 먼저 응답을 미리 보내고, 작업이 완료되면 업데이트
        await interaction.deferReply();

        const connection = getVoiceConnection(interaction.guild.id);

        if (connection) {
            // "봇 가볼게요" TTS 생성
            const gtts = new gTTS('TTS는 가볼게요', 'ko');
            gtts.save('leave.mp3', async (err) => {
                if (err) {
                    console.error('TTS 생성 오류:', err);
                    await interaction.editReply('TTS 생성 오류가 발생했습니다.');
                    return;
                }

                const player = createAudioPlayer();
                const resource = createAudioResource('./leave.mp3');
                player.play(resource);
                connection.subscribe(player);

                player.on('idle', async () => {
                    connection.destroy(); // 음성 출력 후 채널 나가기
                    await interaction.editReply('음성 채널에서 퇴장했습니다!');
                });
            });
        } else {
            await interaction.editReply('봇이 현재 음성 채널에 없습니다.');
        }
    },
};