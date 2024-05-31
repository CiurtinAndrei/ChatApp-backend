const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  creationDate: { type: Date, default: Date.now }
}, { collection: 'conversations' });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports =  Conversation ;
