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

let Package_array = [
  {
    nborderid: "OS586test0NT8",
    xh: "1",
    boxnote: "",
    boxno: "1",
    weight: "9.070",
    length: "25.40",
    width: "25.40",
    height: "25.40",
    totalvalue: "1.00",
  },
  {
    nborderid: "OS586test0NT8",
    xh: "2",
    boxnote: "",
    boxno: "2",
    weight: "9.070",
    length: "25.40",
    width: "25.40",
    height: "25.40",
    totalvalue: "1.00",
  },
  {
    nborderid: "OS586test0NT8",
    xh: "3",
    boxnote: "",
    boxno: "3",
    weight: "9.070",
    length: "25.40",
    width: "25.40",
    height: "25.40",
    totalvalue: "1.00",
  },
  {
    nborderid: "OS586test0NT8",
    xh: "4",
    boxnote: "",
    boxno: "4",
    weight: "2",
    length: "2",
    width: "2",
    height: "22",
    totalvalue: "1.00",
  },
  {
    nborderid: "OS586test0NT8",
    xh: "5",
    boxnote: "",
    boxno: "5",
    weight: "1",
    length: "1",
    width: "1",
    height: "1",
    totalvalue: "1.00",
  },
  {
    nborderid: "OS586test0NT8",
    xh: "6",
    boxnote: "",
    boxno: "6",
    weight: "1",
    length: "1",
    width: "1",
    height: "1",
    totalvalue: "1.00",
  },
];

let result = _.groupBy(Package_array, (item) => [
  [item["weight"], item["length"], item["width"], item["height"]],
]);

// 需要这样的格式
// {
//   "Weight": "0.280",
//   "Number": "10",
//   "Length": "0.280",
//   "Width": "2.54",
//   "Height": "2.54"
// }
let boxesToSubmit = Object.values(result).map((item) => {
  return {
    Weight: item[0].weight,
    Number: item.length,
    Length: item[0].length,
    Width: item[0].width,
    Height: item[0].height,
  };
});

console.log(boxesToSubmit)
