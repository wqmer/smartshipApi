var cluster = require("cluster");
var imageUpload = require("../../../../AWS/imageUpload");

// require("dotenv").config();
// const {
//   ACCESS_KEY_ID,
//   SECRET_ACCESS_KEY,
//   AWS_REGION,
//   S3_BUCKET,
//   testBase64,
// } = process.env;

// function fibo(n) {
//   return n == 0 ? 0 : n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
// }

// console.log(`[worker ${cluster.worker.id}] start ...`);
process.on("message", async function (msg) {
  // var st = Date.now();
  // console.log(`[worker ${cluster.worker.id}] start to work`);
  //   var result = fibo(msg);
  var url = await imageUpload(
    msg.ShippingLabel.GraphicImage,
    msg.TrackingNumber,
    "jpg",
    true,
    true
  );
 //以下格式来自于UPS 返回
  var result = {
    label: [url],
    tracking_numbers: [msg.TrackingNumber],
    weight: msg.BillingWeight,
    postage: {
      billing_amount: {
        baseCharges: msg.BaseServiceCharge.MonetaryValue,
        surCharges: msg.ItemizedCharges,
      },
    },
  };

  console.log(result)

  // console.log(
  //   `[worker ${cluster.worker.id}] work finish work and using ${
  //     Date.now() - st
  //   } ms`
  // );
  process.send(result);
});
