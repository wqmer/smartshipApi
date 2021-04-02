// Don't be like me and commit this file!
// These keys have been disabled, but remain here for reference purposes.
require("dotenv").config();
const {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET,
  testBase64,
  mongoURI,
  IBSandBoxEndpoint,
  DeftShipSandBoxEndpoint,
} = process.env;

module.exports = {

  mongoURI,
  IBSandBoxEndpoint,
  DeftShipSandBoxEndpoint,
  // redisUrl: 'redis://127.0.0.1:6379',

};
