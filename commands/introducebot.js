const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('introducebot')
        .setDescription('봇 소개를 표시합니다.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🌱 봇 소개 🌱')
            .setDescription('이 봇의 사용법과 안내에 대한 내용이에요!')
            .setThumbnail('https://i.imgur.com/UbLSjHR.png')
            .addFields(
                { name: '**제작자**', value: 'kyejya', inline: true },
                { name: '**용도**', value: '아주 예의바른 TTS봇', inline: true },
                {
                    name: '**상세 설명**',
                    value: '이 봇은 kyejya가 직접 TTS봇을 만들고 싶다는 명분으로 갑작스럽게 제작된 봇입니다.\n\n아주 예의바른 봇이라는 명분에 걸맞게 유저의 입장과 퇴장, 봇의 입장과 퇴장까지 알리는 등\n예의바른 기능들이 있으니 편안히 이용해주세요!\n\n기본적으로 봇이 입장하면 "tts"라는 채널이 생기며,\n해당 채널에서 자유롭게 메시지를 보내주시면 됩니다!\n\n갑자기 세상에 태어나서 오류가 있을 수 있으니 오류사항은 주저없이 문의 주세요!!\n문의 바로가기 링크는 프로필 소개글에 있습니다!\n\n명령어는 /join, /leave, /introducebot이 있으며,\n각각 입장, 퇴장, 소개를 담당합니다!\n\n주의사항 : 봇이 들어올 때 생성된 tts채널의 이름을 **바꾸지 말아주세요!!**\n\n__**봇이 주인을 닮아서 커피를 아주 좋아해요... 응애.**__'
                }
            )
            .setFooter({ text: 'Bot by kyejya' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};