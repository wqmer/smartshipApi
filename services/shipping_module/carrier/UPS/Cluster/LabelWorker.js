var cluster = require("cluster");
var imageUpload = require("../../../../AWS/imageUpload");
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
