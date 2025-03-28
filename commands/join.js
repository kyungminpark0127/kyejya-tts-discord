const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const gTTS = require('gtts');
const GuildSettings = require('../models/guildSettings'); // MongoDB 모델 가져오기

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('봇이 현재 음성 채널에 참여합니다.'),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('먼저 음성 채널에 접속해주세요!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        await interaction.reply('음성 채널에 입장했습니다!');

        // "저 봇이에요" TTS 생성
        const gtts = new gTTS('저 봇이에요', 'ko');
        gtts.save('join.mp3', async (err) => {
            if (err) {
                console.error('TTS 생성 오류:', err);
                return;
            }
            const player = createAudioPlayer();
            const resource = createAudioResource('./join.mp3');
            player.play(resource);
            connection.subscribe(player);
        });

        // TTS 채널 찾기 또는 생성
        try {
            let ttsChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tts' && channel.type === 0); // 텍스트 채널 타입은 0
            
            if (!ttsChannel) {
                ttsChannel = await interaction.guild.channels.create({
                    name: 'tts',
                    type: 0, // 텍스트 채널
                    reason: 'TTS 봇용 채널 생성'
                });
                console.log(`'tts' 채널을 ${interaction.guild.name} 서버에 생성했습니다.`);
            }

            // MongoDB에 guildId와 ttsChannelId 저장
            let settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
            if (!settings) {
                settings = new GuildSettings({
                    guildId: interaction.guild.id,
                    ttsChannelId: ttsChannel.id,
                });
                await settings.save();
                console.log('새로운 TTS 채널 설정이 저장되었습니다.');
            } else {
                settings.ttsChannelId = ttsChannel.id;
                await settings.save();
                console.log('기존 TTS 채널 설정이 업데이트되었습니다.');
            }
        } catch (error) {
            console.error('TTS 채널 생성 또는 저장 중 오류:', error);
        }
    },
};