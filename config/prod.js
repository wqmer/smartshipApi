require("dotenv").config();
const {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET,
  testBase64,
  IBProdEndpoint,
  DeftShipProdEndpoint,
  UpsEndpoint,
  UpsLogo,
} = process.env;
const URL = {
  UPS: UpsEndpoint,
  FEDEX: undefined,
};
const LOGO = {
  UPS: UpsLogo,
  FEDEX: undefined,
};
module.exports = {
  URL,
  LOGO,
  IBProdEndpoint,
  DeftShipProdEndpoint,
  UpsEndpoint,
  UpsLogo,
  
  // googleClientID: process.env.GOOGLE_CLIENT_ID,
  // googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // mongoURI: process.env.MONGO_URI,
  // cookieKey: process.env.COOKIE_KEY
};
