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
  UpsEndpoint,
  UpsLogo,
  FedexLogo
} = process.env;

const URL = {
  UPS: UpsEndpoint,
  FEDEX: undefined,
};
const LOGO = {
  UPS: UpsLogo,
  FEDEX: FedexLogo,
};

module.exports = {
  URL,
  LOGO,
  mongoURI,
  IBSandBoxEndpoint,
  DeftShipSandBoxEndpoint,
  UpsEndpoint,
  UpsLogo,
  // redisUrl: 'redis://127.0.0.1:6379',
};
