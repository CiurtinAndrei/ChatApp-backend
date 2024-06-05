const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  groupName: {type:String, required:true},
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, default:null }],
  publicGroup : {type:Boolean, default:false},
  creationDate: { type: Date, default: Date.now }
}, { collection: 'conversations' });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports =  Conversation ;
