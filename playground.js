const agentTemplate = require("./config/shppingAgent");

const mongoose = require("mongoose");
const moment = require("moment");
var Fakerator = require("fakerator");
var fakerator = Fakerator();
var name = fakerator.names.name();
const Pusher = require("pusher-js");
const util = require("util");
require("dotenv").config();
var parser = require("parse-address");
const serviceClass = require("./services/shipping_module/carrier");
var numeral = require("numeral");
let imgConvert = require("image-convert");
const { ACCESS_KEY_ID, SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET, testBase64 } =
  process.env;
const ImageUpload = require("./services/AWS/imageUpload");
var Promise = require("bluebird");
var _ = require("lodash");

let obj = {
  "2nd Day Air": 1,
};
console.log(obj);
// let obj = {
//   accountInfo: {
//     key: "1",
//     id: "2",
//   },
// };

// console.log(obj["accountInfo"]["key"]); // 结果是 1
// console.log(obj["accountInfo"]["id"]); // 结果是 2

// let response = {
//   code: 0,
//   message: "Get carrier success !",
//   data: {
//     asset: {
//       nick_name: "dfdf",
//       account_information: {
//         Password: "3434",
//         AccessKey: "34343",
//         AccountNo: "34433",
//       },
//       code: "UPS@Nkm8YctDp",
//       logo_url: "https://ship-service.s3-us-west-2.amazonaws.com/logo/ups.jpeg",
//       request_url: "https://onlinetools.ups.com/ship/v1807",
//     },
//     service: [],
//     agent: "Smartship",
//     auth_group: [],
//     status: "unactivated",
//     description: "无描述",
//     _id: "6150b794814d2f0016e927c2",
//     type: "UPS",
//     forwarder: "5f597b040f1474f73028f737",
//   },
// };

// console.log(response["data"]["asset"]["account_information"]["AccessKey"]);
