var cluster = require("cluster");
// var imageUpload = require("./services/AWS/imageUpload");
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

console.log(`[worker ${cluster.worker.id}] start ...`);
process.on("message", async function (msg) {
  var st = Date.now();
  console.log(`[worker ${cluster.worker.id}] start to work`);
  //   var result = fibo(msg);
  var result = await imageUpload(msg, cluster.worker.id, "jpg", true, true);
  console.log(
    `[worker ${cluster.worker.id}] work finish work and using ${
      Date.now() - st
    } ms`
  );
  process.send(result);
});
