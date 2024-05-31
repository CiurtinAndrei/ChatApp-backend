const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MediaSchema = new Schema({
  uploadedFileName: { type: String, required: true },
  creationDate: { type: Date, default: Date.now },
  owner: { type: mongoose.ObjectId, ref: 'User' }
}, { collection: 'media' });

const Media = mongoose.model('Media', MediaSchema);

module.exports =  Media ;