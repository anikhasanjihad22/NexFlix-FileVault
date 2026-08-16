const { nanoid } = require('nanoid');
const File = require('../models/File');

/**
 * Handles inline queries triggered by the "↗️ FORWARD" button
 * (a switch_to_chat button pre-filled with the file's slug).
 * The user picks a target chat, Telegram sends us an inline_query with
 * that slug as the query text, and we answer with the same cached file
 * so it lands in the chosen chat.
 */
function registerInlineShareHandler(bot) {
  bot.on('inline_query', async (ctx) => {
    const slug = (ctx.inlineQuery.query || '').trim();
    if (!slug) {
      return ctx.answerInlineQuery([], { cache_time: 0 });
    }

    const file = await File.findOne({ slug, active: true });
    if (!file) {
      return ctx.answerInlineQuery([], { cache_time: 0 });
    }

    const resultId = nanoid(16);
    let result;

    switch (file.mediaType) {
      case 'video':
        result = { type: 'video', id: resultId, video_file_id: file.fileId, title: file.fileName };
        break;
      case 'audio':
        result = { type: 'audio', id: resultId, audio_file_id: file.fileId, title: file.fileName };
        break;
      case 'photo':
        result = { type: 'photo', id: resultId, photo_file_id: file.fileId };
        break;
      case 'document':
      default:
        result = { type: 'document', id: resultId, document_file_id: file.fileId, title: file.fileName };
        break;
    }

    await ctx.answerInlineQuery([result], { cache_time: 0 }).catch(() => {});
  });
}

module.exports = { registerInlineShareHandler };
