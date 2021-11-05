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

const request = require("request");
const requests = require("request-promise");
const moment = require("moment");
const async = require("async");
const connentMysql = require("../conn");

global.conn = connentMysql.connentMysql();

const checkTask = () => {
  //setPrice();
  //setFee();
  updateHistoryBalance();
};

function setPrice() {
  request(
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      url: "http://app.huodaios.com/api/check_kucun.php",
    },
    function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        var or = response.body;
        console.log(or);
        var ors = eval("(" + or + ")");
        if (ors.code === 200) {
          console.log(200);
        }
      }
    }
  );
}
function setFee() {
  request(
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      url: "http://app.huodaios.com/api/update_ccfee.php",
    },
    function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        var or = response.body;
        console.log(or);
        var ors = eval("(" + or + ")");
        if (ors.code === 200) {
          console.log(200);
        }
      }
    }
  );
}

// var Promise = require("bluebird"); 需要先添加一个库 执行 npm install bluebird

// function golabalConnPromise(global_conn, sql, param) {
//   // Promise化 链接查询
//   return new Promise(function (resolve, reject) {
//     global.conn.query(sql, param, function (err, ret) {
//       if (err) reject(err);
//       resolve(ret);
//     });
//   });
// }

async function updateHistoryBalanceByKim() {
  var sql = "SELECT id FROM `saas_user` where yue<>0 and lastkhyetime<?";
  var param = [moment().format("YYYY-MM-DD")];
  try {
    //查询
    let result = await golabalConnPromise(global.conn, sql, param);
    //提取查询结果里的 id
    let uids = result.map(function (e) {
      return e.id;
    });
    //用查询结果执行操作，这里需要用到Promise all ，因为 虽然数组里的任务并发执行，但是需要等待每个任务完成才算最终完成
    // await Promise.all(
    //   uids.map(async function (uid) {
    //     await request_balance_kim(uid);
    //   })
    // );
    //轮次执行
    uids.forEach(async function (uid) {
      await request_balance_kim(uid);
    });
  } catch (error) {
    console.log(error);
  }
}

// async function request_balance_kim(uid) {
//   try {
//     let result = await requests({
//       method: "POST",
//       headers: { "content-type": "application/json" },
//       url: "http://www.huodaios.com/app/api/updatekhye.php",
//       body: JSON.stringify({
//         uid: uid.uid,
//         nian: 0,
//         yue: 0,
//       }),
//     });

//     console.log(uid.uid + "=====" + result);
//     var ors = eval("(" + result + ")");
//     let usql = "UPDATE saas_user SET lastkhyetime=?, isupdate=?  WHERE id=?";
//     let uparam = [
//       moment().format("YYYY-MM-DD HH:mm:ss"),
//       ors.code === 200 ? 1 : 0,
//       uid.uid,
//     ];
//     await golabalConnPromise(global.conn, usql, uparam);
//     console.log("结束时间" + moment().format("YYYY-MM-DD HH:mm:ss"));
//   } catch (error) {
//      console.log(error)
//}
// }

function updateHistoryBalance() {
  console.log("开始时间" + moment().format("YYYY-MM-DD HH:mm:ss"));
  var sql = "SELECT id FROM `saas_user` where yue<>0 and lastkhyetime<?";
  var param = [moment().format("YYYY-MM-DD")];
  global.conn.query(sql, param, function (err, ret) {
    try {
      if (err) console.log(err);
      var uids = new Array();
      for (var i = 0; i < ret.length; i++) {
        uids.push({
          uid: ret[i]["id"],
        });
      }
      try {
        async.mapLimit(
          uids,
          1,
          function (uid, callback) {
            request_balance(uid, callback);
          },
          function (err, result) {
            if (err) console.log(err);
          }
        );
      } catch (e) {
        console.log(e);
        console.log({ code: 500, message: "internal error" });
      }
    } catch (e) {
      console.log(e);
    }
  });
}

function request_balance(uid) {
  requests({
    method: "POST",
    headers: { "content-type": "application/json" },
    url: "http://www.huodaios.com/app/api/updatekhye.php",
    body: JSON.stringify({
      uid: uid.uid,
      nian: 0,
      yue: 0,
    }),
  })
    .then(async (suc) => {
      console.log(uid.uid + "=====" + suc);
      var ors = eval("(" + suc + ")");
      let usql = "";
      let uparam = [];
      if (ors.code === 200) {
        usql = "UPDATE saas_user SET lastkhyetime=?, isupdate=?  WHERE id=?";
        uparam = [moment().format("YYYY-MM-DD HH:mm:ss"), 1, uid.uid];
      } else {
        usql = "UPDATE saas_user SET lastkhyetime=?, isupdate=?  WHERE id=?";
        uparam = [moment().format("YYYY-MM-DD HH:mm:ss"), 0, uid.uid];
      }
      await global.conn.query(usql, uparam, async function (er, res) {
        if (er) console.log(er);
        await console.log("结束时间" + moment().format("YYYY-MM-DD HH:mm:ss"));
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

module.exports = {
  checkTask,
};
