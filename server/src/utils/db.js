const mongoose = require('mongoose');

async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_app';
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    dbName: mongoUri.split('/').pop(),
  });
  return mongoose.connection;
}

module.exports = { connectToDatabase };


