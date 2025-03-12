const path = require('path');
const fs = require('fs');
const { Collection } = require('discord.js');
require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const gTTS = require('gtts');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});
client.commands = new Collection();
const mongoose = require('mongoose');

// MongoDB URI
const MONGO_URI = process.env.MONGO_URI;

// MongoDB 연결 설정
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB에 성공적으로 연결되었습니다.');
    })
    .catch((err) => {
        console.error('MongoDB 연결 오류:', err);
    });

// 명령어 파일 읽기
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log('봇이 준비되었습니다!');

    try {
        client.user.setActivity('커피 마시면서 디스코드', { type: 'WATCHING' });
        console.log('상태 설정 완료!');
    } catch (err) {
        console.error('상태 설정 중 오류 발생:', err);
    }
});

// 명령어 실행
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다!', ephemeral: true });
    }
});

// 서버에 봇이 추가되었을 때 tts 채널 생성
client.on('guildCreate', async guild => {
    let ttsChannel = guild.channels.cache.find(channel => channel.name === 'tts' && channel.type === 'GUILD_TEXT');
    if (!ttsChannel) {
        try {
            ttsChannel = await guild.channels.create('tts', {
                type: 'GUILD_TEXT',
                reason: 'TTS 봇용 채널 생성'
            });
            console.log(`'tts' 채널을 ${guild.name} 서버에 생성했습니다.`);
        } catch (error) {
            console.error(`'tts' 채널 생성 중 오류가 발생했습니다: ${error}`);
        }
    }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const connection = getVoiceConnection(newState.guild.id);

    // 봇이 음성 채널에 있고, 유저가 봇과 같은 채널에 들어왔을 때
    if (connection && newState.channelId === connection.joinConfig.channelId && oldState.channelId !== newState.channelId) {
        const username = newState.member.displayName;
        const welcomeMessage = `${username}님이 들어오셨어요`;

        // TTS 음성 생성 및 재생
        const gtts = new gTTS(welcomeMessage, 'ko');
        gtts.save('welcome.mp3', (err) => {
            if (err) {
                console.error('TTS 생성 오류:', err);
                return;
            }
            const player = createAudioPlayer();
            const resource = createAudioResource('./welcome.mp3');
            player.play(resource);
            connection.subscribe(player);
        });
    }

    // 유저가 봇과 같은 채널에서 나갔을 때
    if (connection && oldState.channelId === connection.joinConfig.channelId && newState.channelId !== oldState.channelId) {
        const username = oldState.member.displayName;
        const goodbyeMessage = `${username}님이 나가셨어요`;

        // TTS 음성 생성 및 재생
        const gtts = new gTTS(goodbyeMessage, 'ko');
        gtts.save('goodbye.mp3', (err) => {
            if (err) {
                console.error('TTS 생성 오류:', err);
                return;
            }
            const player = createAudioPlayer();
            const resource = createAudioResource('./goodbye.mp3');
            player.play(resource);
            connection.subscribe(player);
        });
    }
});

// 메시지 수신 및 TTS 처리
client.on('messageCreate', async message => {
    if (message.author.bot) return; // 봇 메시지는 무시합니다.

    // TTS 채널에서만 동작하도록 채널 검사
    if (message.channel.name === 'tts') {
        const voiceChannel = message.member.voice.channel;
        if (voiceChannel) {
            // TTS 변환 및 파일 저장
            const gtts = new gTTS(message.content, 'ko'); // 한국어 설정
            gtts.save('tts-audio.mp3', function (err) {
                if (err) {
                    console.error('TTS 변환 중 오류가 발생했습니다:', err);
                    return;
                }

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                const resource = createAudioResource('tts-audio.mp3');
                player.play(resource);
                connection.subscribe(player);
            });
        } else {
            message.reply('음성 채널에 들어가주세요!');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
