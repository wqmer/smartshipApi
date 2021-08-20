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
// let test = '321' || '123'

// console.log(test)

// let a = { x : '1232cons'}

// console.log(a.b && a.b.c)

let pakList = [
  {
    key: "first_pak",
    pack_info: {
      height: "6",
      length: "4",
      width: "1",
      order_id: "1",
      reference: "1",
      same_pack: "1",
      weight: 12,
    },
  },
];

for (i = 0; i < 10; i++) {
  pakList.push({
    key: "first_pak",
    pack_info: {
      height: "8",
      length: "8",
      width: "4",
      order_id: "1",
      reference: "1",
      same_pack: "1",
      weight: 15,
    },
  });
}

const test_shipment = {
  sender_information: {
    sender_add1: "2850 kelvin ave , apt 123",
    sender_city: "Irvine",
    sender_company: "SmartshipLLC",
    sender_name: "QIMIN",
    sender_phone_number: "2155880271",
    sender_state: "CA",
    sender_zip_code: "92614",
  },
  receipant_information: {
    receipant_add1: "12510 Micro Dr",
    receipant_city: "Mira Loma",
    receipant_name: "Kimi",
    receipant_phone_number: "2155880271",
    receipant_state: "CA",
    receipant_zip_code: "91752",
    receipant_is_residential: true,
  },
  parcel_information: {
    parcel_list: pakList,
  },
};

const FEDEX = serviceClass("FEDEX");

const fedex = new FEDEX(
  account_information,
  "test",
  "discount",
  "carrier",
  "ground home delivery",
  // "ground multiweight",
  ""
);

let GetCustomResultMasterTracking = (result) =>
  result.map((e) => e.CompletedShipmentDetail.MasterTrackingId.TrackingNumber);

let GetResult = (result, index) => {
  if (index == "max") return result[result.length - 1];
  return result[index];
};

let testFun = async () => {
  try {
    let result = await fedex.rate(test_shipment);

    // console.log(result)

    // let urlArray = await Promise.map(result, async (item, index) => {
    //   let url = await ImageUpload(
    //     item.CompletedShipmentDetail.CompletedPackageDetails[0].Label.Parts[0].Image,
    //     item.CompletedShipmentDetail.CompletedPackageDetails[0].TrackingIds[0].TrackingNumber,
    //     "png",
    //     false,
    //     false
    //   );

    //   let obj = {
    //     label: [url],
    //     tracking_numbers: [item.TrackingNumber],
    //     weight: item.BillingWeight,
    //     postage: {
    //       billing_amount: {
    //         baseCharges: item.BaseServiceCharge.MonetaryValue,
    //         surCharges: item.ItemizedCharges,
    //       },
    //     },
    //   };

    //   return obj;
    // });

    // console.log(urlArray)
    console.log(
      util.inspect(result, {
        showHidden: false,
        depth: null,
        colors: true,
      })
    );
    // console.log(
    //   util.inspect(GetResult(result, "max"), {
    //     showHidden: false,
    //     depth: null,
    //     colors: true,
    //   })
    // );
  } catch (error) {
    console.log(error);
  }
};

testFun();
