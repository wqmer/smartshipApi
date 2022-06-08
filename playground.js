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

// let obj = {
//   "2nd Day Air": 1,
// };
// console.log(obj);
// let obj = {
//   accountInfo: {
//     key: "1",
//     id: "2",
//   },
// };

let notes = [
  {
    weight: 2,
    length: 2,
    height: 2,
    width: 2,
    pack_type: "YOUR_PACKAGING",
    reference_1: "2",
    reference_2: "",
  },
  {
    weight: 2,
    length: 2,
    height: 2,
    width: 2,
    pack_type: "YOUR_PACKAGING",
    reference_1: "2",
    reference_2: "",
  },
  {
    weight: 2,
    length: 2,
    height: 2,
    width: 3,
    pack_type: "YOUR_PACKAGING",
    reference_1: "2",
    reference_2: "",
  },
  {
    weight: 2,
    length: 2,
    height: 2,
    width: 12,
    pack_type: "YOUR_PACKAGING",
    reference_1: "2",
    reference_2: "12323",
  },
  {
    weight: 2,
    length: 2,
    height: 2,
    width: 3,
    pack_type: "YOUR_PACKAGING",
    reference_1: "2",
    reference_2: "123",
  },
];

const products = _.groupBy(notes, (item) => [
  item.weight,
  item.length,
  item.height,
  item.width,
  item.pack_type,
  item.reference_1,
  item.reference_2,
]);

// console.log(products);
let pakcage_list = Object.values(products).map((item, index) => {
  let result = {
    font_type: "strong",
    is_panel_opened: false,
    key: "first_pak_" + index,
    pack_info: {
      same_pack: item.length,
      ...item[0],
    },
  };

  return result;
});

console.log(pakcage_list);
// var arr = ['a','b','c','d','d','e','a','b','c','f','g','h','h','h','e','a'];
// var map = arr.reduce(function(prev, cur) {
//   prev[cur] = (prev[cur] || 0) + 1;
//   return prev;
// }, {});

// console.log(map)
