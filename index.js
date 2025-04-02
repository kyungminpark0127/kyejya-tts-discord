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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions // 메시지 반응 인텐트 추가
    ]
});
client.commands = new Collection();
const mongoose = require('mongoose');

// 전역 변수 선언
let messageQueue = [];
let isSpeaking = false;
let connection = null;

// MongoDB URI
const MONGO_URI = 'mongodb+srv://hjeepark2005:jasmin2005%40@kj-cluster.n2guy.mongodb.net/?retryWrites=true&w=majority&appName=KJ-Cluster';

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

// 명령어 실행 - ephemeral 사용 방식 수정
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // ephemeral 대신 flags 사용
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '명령어 실행 중 오류가 발생했습니다!', 
                flags: { ephemeral: true }
            });
        }
    }
});

// 서버에 봇이 추가되었을 때 tts 채널 생성
client.on('guildCreate', async guild => {
    try {
        let ttsChannel = guild.channels.cache.find(channel => channel.name === 'tts' && channel.type === 0); // 텍스트 채널 타입은 0
        
        if (!ttsChannel) {
            ttsChannel = await guild.channels.create({
                name: 'tts',
                type: 0, // 텍스트 채널
                reason: 'TTS 봇용 채널 생성'
            });
            console.log(`'tts' 채널을 ${guild.name} 서버에 생성했습니다.`);
        }
    } catch (error) {
        console.error(`'tts' 채널 생성 중 오류가 발생했습니다: ${error}`);
    }
});

// 메시지 반응 처리 - fetchStarterMessage 오류 수정
client.on('messageReactionAdd', async (reaction, user) => {
    try {
        // 봇의 반응은 무시
        if (user.bot) return;
        
        // 스레드 확인
        const message = reaction.message;
        if (!message.channel.isThread()) return;
        
        // 출석 체크 로직
        // parentThread.fetchStarterMessage 대신 적절한 방법으로 접근
        const parentThread = message.channel;
        
        try {
            // 최신 Discord.js에서는 이렇게 스레드의 시작 메시지를 가져올 수 있습니다
            const messages = await parentThread.messages.fetch({ limit: 1, after: '0' });
            const starterMessage = messages.first();
            
            console.log('출석 체크 처리 중...');
            // 여기에 출석 체크 로직 추가
            
        } catch (error) {
            console.error('출석 기록 중 오류:', error);
        }
    } catch (error) {
        console.error('메시지 반응 처리 중 오류:', error);
    }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // 전역 connection 변수를 사용하되, 현재 상태를 반영하기 위해 확인
    if (newState.guild && newState.guild.id) {
        const currentConnection = getVoiceConnection(newState.guild.id);
        if (currentConnection) {
            connection = currentConnection;
        }
    }

    // 봇이 음성 채널에 있고, 유저가 봇과 같은 채널에 들어왔을 때
    if (connection && newState.channelId === connection.joinConfig.channelId && oldState.channelId !== newState.channelId) {
        const username = newState.member.displayName;
        const welcomeMessage = `${username}님이 들어오셨어요`;

        // TTS 음성 생성 및 재생
        const gtts = new gTTS(welcomeMessage, 'ko');
        const welcomeFilePath = path.join(__dirname, 'welcome.mp3');
        
        gtts.save(welcomeFilePath, (err) => {
            if (err) {
                console.error('TTS 생성 오류:', err);
                return;
            }
            
            // 파일이 생성되었는지 확인
            fs.access(welcomeFilePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('TTS 파일이 생성되지 않았습니다:', err);
                    return;
                }
                
                console.log(`환영 메시지 파일 생성됨: ${welcomeFilePath}`);
                
                try {
                    const player = createAudioPlayer();
                    const resource = createAudioResource(welcomeFilePath);
                    
                    console.log('환영 오디오 리소스 생성됨');
                    player.play(resource);
                    console.log('환영 메시지 플레이어 재생 시작');
                    
                    connection.subscribe(player);
                    console.log('환영 메시지 플레이어에 연결됨');
                    
                    player.on('idle', () => {
                        console.log('환영 메시지 재생 완료');
                        // 파일 삭제 (선택 사항)
                        fs.unlink(welcomeFilePath, (err) => {
                            if (err) console.error('임시 파일 삭제 중 오류:', err);
                        });
                    });
                    
                    player.on('error', (err) => {
                        console.error('환영 메시지 플레이어 오류:', err);
                    });
                } catch (playError) {
                    console.error('환영 메시지 재생 중 오류:', playError);
                }
            });
        });
    }

    // 유저가 봇과 같은 채널에서 나갔을 때
    if (connection && oldState.channelId === connection.joinConfig.channelId && newState.channelId !== oldState.channelId) {
        const username = oldState.member.displayName;
        const goodbyeMessage = `${username}님이 나가셨어요`;

        // TTS 음성 생성 및 재생
        const gtts = new gTTS(goodbyeMessage, 'ko');
        const goodbyeFilePath = path.join(__dirname, 'goodbye.mp3');
        
        gtts.save(goodbyeFilePath, (err) => {
            if (err) {
                console.error('TTS 생성 오류:', err);
                return;
            }
            
            // 파일이 생성되었는지 확인
            fs.access(goodbyeFilePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('TTS 파일이 생성되지 않았습니다:', err);
                    return;
                }
                
                console.log(`작별 인사 파일 생성됨: ${goodbyeFilePath}`);
                
                try {
                    const player = createAudioPlayer();
                    const resource = createAudioResource(goodbyeFilePath);
                    
                    console.log('작별 인사 오디오 리소스 생성됨');
                    player.play(resource);
                    console.log('작별 인사 플레이어 재생 시작');
                    
                    connection.subscribe(player);
                    console.log('작별 인사 플레이어에 연결됨');
                    
                    player.on('idle', () => {
                        console.log('작별 인사 재생 완료');
                        // 파일 삭제 (선택 사항)
                        fs.unlink(goodbyeFilePath, (err) => {
                            if (err) console.error('임시 파일 삭제 중 오류:', err);
                        });
                    });
                    
                    player.on('error', (err) => {
                        console.error('작별 인사 플레이어 오류:', err);
                    });
                } catch (playError) {
                    console.error('작별 인사 재생 중 오류:', playError);
                }
            });
        });
    }
});

client.on('messageCreate', async (message) => {
    // 봇의 메시지는 무시
    if (message.author.bot) return;

    const ttsChannelName = 'tts'; // TTS 채널 이름
    // 채널 이름 비교 시 대소문자 구분 제거
    if (message.channel.name.toLowerCase() !== ttsChannelName) return;

    // 보이스 채널에 있는지 확인
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        message.reply('음성 채널에 들어가주세요!');
        return;
    }

    // 메시지 내용 길이 제한 (선택사항)
    if (message.content.length > 200) {
        message.reply('메시지가 너무 깁니다. 200자 이내로 줄여주세요.');
        return;
    }

    // 디버그 로그 추가
    console.log(`TTS 메시지 수신: ${message.content}`);
    console.log(`음성 채널: ${voiceChannel.name}`);

    messageQueue.push(message);

    // 음성 연결 로직 개선
    try {
        if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            console.log('새 음성 연결 생성');
        }
    } catch (error) {
        console.error('음성 채널 연결 중 오류:', error);
        message.reply('음성 채널 연결 중 오류가 발생했습니다.');
        return;
    }

    // 큐 처리 시작
    if (!isSpeaking) {
        console.log('큐 처리 시작');
        processQueue();
    }
});

async function processQueue() {
    if (isSpeaking || messageQueue.length === 0) {
        console.log(`현재 상태 - isSpeaking: ${isSpeaking}, 큐 길이: ${messageQueue.length}`);
        return;
    }

    isSpeaking = true;
    const message = messageQueue.shift();

    try {
        // 절대 경로로 파일명 설정
        const uniqueFileName = path.join(__dirname, `tts-audio-${Date.now()}.mp3`);
        
        // 디버그 로그 추가
        console.log(`현재 처리 메시지: ${message.content}`);

        const gtts = new gTTS(message.content, 'ko');

        gtts.save(uniqueFileName, async (err) => {
            if (err) {
                console.error('TTS 변환 중 오류가 발생했습니다:', err);
                isSpeaking = false;
                processQueue(); // 다음 메시지 처리
                return;
            }

            // 파일이 생성되었는지 확인
            fs.access(uniqueFileName, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('TTS 파일이 생성되지 않았습니다:', err);
                    isSpeaking = false;
                    processQueue(); // 다음 메시지 처리
                    return;
                }
                
                console.log(`TTS 오디오 파일 생성됨: ${uniqueFileName}`);

                try {
                    const player = createAudioPlayer();
                    const resource = createAudioResource(uniqueFileName);
                    
                    console.log('오디오 리소스 생성됨');
                    player.play(resource);
                    console.log('플레이어 재생 시작');
                    
                    connection.subscribe(player);
                    console.log('오디오 플레이어에 연결됨, 상태:', player.state.status);
                    
                    player.on('idle', () => {
                        console.log('오디오 재생 완료');
                        isSpeaking = false;
                        
                        // 파일 삭제 (선택 사항)
                        fs.unlink(uniqueFileName, (err) => {
                            if (err) console.error('임시 파일 삭제 중 오류:', err);
                        });
                        
                        processQueue();
                    });
                    
                    player.on('error', (err) => {
                        console.error('플레이어 오류:', err);
                        isSpeaking = false;
                        processQueue();
                    });
                } catch (playError) {
                    console.error('오디오 재생 중 오류:', playError);
                    isSpeaking = false;
                    processQueue();
                }
            });
        });
    } catch (err) {
        console.error('전체 프로세스 오류:', err);
        isSpeaking = false;
        processQueue();
    }
}

client.login(process.env.DISCORD_TOKEN);