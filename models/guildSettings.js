const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true }, // 서버 ID
    ttsChannelId: { type: String, required: true },           // TTS 채널 ID
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);