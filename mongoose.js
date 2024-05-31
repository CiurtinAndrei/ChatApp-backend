const mongoose = require('mongoose');
require('dotenv').config();
const modulePrefix = "[SERVER/Database]"

const MONGO_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}${process.env.MONGODB_STR}`;

async function connectMongooseDb(){
    try{
        console.log(`${modulePrefix} Attempting to connect to MongoDB.`)
        await mongoose.connect(MONGO_URI, { dbName: process.env.MONGODB_DBNAME });
        console.log(`${modulePrefix} Connected to MongoDB Cloud.`);
    }
    catch(error){
        console.log(`${modulePrefix} Error connecting to MongoDB Cloud: ` ,error);
    }
  }

  module.exports = {connectMongooseDb};