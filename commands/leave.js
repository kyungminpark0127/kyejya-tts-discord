const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const gTTS = require('gtts');
const GuildSettings = require('../models/guildSettings'); // MongoDB 모델 가져오기

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('봇이 현재 음성 채널에서 나갑니다.'),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection) {
            // "봇 가볼게요" TTS 생성
            const gtts = new gTTS('TTS는 가볼게요', 'ko');
            gtts.save('leave.mp3', async (err) => {
                if (err) {
                    console.error('TTS 생성 오류:', err);
                    return;
                }
                const player = createAudioPlayer();
                const resource = createAudioResource('./leave.mp3');
                player.play(resource);
                connection.subscribe(player);

                // MongoDB에서 TTS 채널 ID 불러오기
                try {
                    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
                    if (settings && settings.ttsChannelId) {
                        console.log('TTS 채널 ID:', settings.ttsChannelId);
                    }
                } catch (error) {
                    console.error('MongoDB 불러오기 오류:', error);
                }

                player.on('idle', () => {
                    connection.destroy(); // 음성 출력 후 채널 나가기
                    interaction.reply('음성 채널에서 퇴장했습니다!');
                });
            });
        } else {
            await interaction.reply('봇이 현재 음성 채널에 없습니다.');
        }
    },
};