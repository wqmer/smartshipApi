const request = require('request');
const requests = require('request-promise');
const fs = require('fs');

const post_deft = (order, callback, connection) => {
  var qcsql = "SELECT json, ztid, cost FROM saas_qudao WHERE id=?";
  var qcparmes = [order.orders.channel_id];
  var oid = order.orders.oid;
  //console.log(order.orders.oid);return false;
  connection.query(qcsql, qcparmes, function (err, result) {
    if (err) console.log(err);
    var qjson = JSON.stringify(result);
    var qjsons = JSON.parse(qjson);
    var mr = JSON.parse(qjsons[0].json);
    //console.log(mr);return false;
    var osql = "SELECT nborderid, sadd1, sadd2, scity, scompany, spostcode, sstate, stel, sname, faddid, note, weight, baoguolb, shengbao, country, box_num, box_json, shenbao_json, uid FROM saas_order WHERE id=? LIMIT 1";
    var oparams = [order.orders.oid];
    connection.query(osql, oparams, function (oerr, oresult) {
      if (oerr) {
        console.log(oerr);
      }
      else {
        var ores = JSON.stringify(oresult);
        var oress = JSON.parse(ores);
        //console.log(oress);return false;
        try {
          var ofsql = "SELECT fname, fdz1, fdz2, fcity, fzhou, fpostcode, ftel, ftime, fdzname, iskf, fcountry FROM saas_faddress WHERE id=? LIMIT 1";
          var ofparams = [oress[0].faddid];
          connection.query(ofsql, ofparams, function (oferr, ofresult) {
            if (oferr) {
              console.log(oferr);
            }
            else {
              var ofres = JSON.stringify(ofresult);
              var ofress = JSON.parse(ofres);
              try {
                var box_json = oress[0]['box_json'];
                var box_jsons = JSON.parse(box_json);
                if (box_jsons == null) {
                  console.log("box is error");
                }
              } catch (e) {
                console.log(e);
              }
              var box = new Array();
              for (var b = 0; b < box_jsons.length; b++) {
                console.log(box_jsons[b].weight);
                var weight = (box_jsons[b].weight * 2.204).toFixed(2);
                box.push({
                  "package_type": mr[4],
                  "count": "1",
                  "height": (box_jsons[b].height * 0.3937).toFixed(2),
                  "width": (box_jsons[b].width * 0.3937).toFixed(2),
                  "length": (box_jsons[b].length * 0.3937).toFixed(2),
                  "weight": weight,
                  "reference_2": oress[0].note.replace('*', '_'),
                  "customer_ship_id": box_jsons[b].nborderid
                });
              }
              console.log(box);
              fs.mkdir('token/', { recursive: true }, (err) => {
                if (err) throw err
              });
              var token_json = fs.existsSync('./token/access_token.json');
              var times = new Date();
              var nowtime = times.getTime() / 1000;
              if (!token_json) {
                requests({
                  url: order.urls + 'deftShip/production/Auth',
                  method: 'POST',
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    "email": mr[0],
                    "password": mr[1]
                  })
                })
                  .then(res => {
                    if (res.status == 404) {
                      var oSql = "UPDATE saas_order SET autoAPI=3, sub_add=? WHERE id=?";
                      var oParams = ["接口服务器错误", oid];
                      cn.query(oSql, oParams, function (oerr, oresult) {

                      });
                      callback(null, { "code": res.status, msg: res.message });
                    }

                    console.log(typeof res);
                    var tok = JSON.parse(res);
                    tok.data.create_time = parseInt(nowtime);
                    if (tok.code === 200) {
                      fs.writeFile('./token/access_token.json', JSON.stringify(tok.data), function (err) {
                        if (err) {
                          console.error(err);
                        }
                        console.log('----------success-------------');
                        fs.readFile('./token/access_token.json', function (err, data) {
                          console.log(data);
                          if (err) {
                            console.log(err);
                          } else {
                            const jso = JSON.stringify({
                              "access_token": tok.data.access_token,
                              "shipper_id": mr[2],
                              "service": mr[3],
                              "ship_from_address": {
                                "name": ofress[0].fname,
                                "attention": "",
                                "address_1": ofress[0].fdz1,
                                "address_2": ofress[0].fdz2,
                                "address_3": "",
                                "city": ofress[0].fcity,
                                "post_code": ofress[0].fpostcode,
                                "state": ofress[0].fzhou,
                                "country": ofress[0].fcountry,
                                "telephone": ofress[0].ftel,
                                "is_residential": "false"
                              },
                              "ship_to_address": {
                                "name": oress[0].sname,
                                "attention": "",
                                "address_1": oress[0].sadd1,
                                "address_2": oress[0].sadd2,
                                "address_3": "",
                                "city": oress[0].scity,
                                "post_code": oress[0].spostcode,
                                "state": oress[0].sstate,
                                "country": oress[0].country,
                                "telephone": oress[0].stel,
                                "is_residential": "false"
                              },
                              "packages": box

                            });
                            console.log(jso);
                            request({
                              method: 'POST',
                              headers: { "content-type": "application/json" },
                              url: order.urls + 'deftShip/production/Ship',
                              body: jso
                            }, async function (error, response, body) {
                              try {
                                var s = response.body;
                                console.log(s);
                                var oore = eval('(' + oos + ')');
                                //console.log(oores);oore.data.tracking_numbers[0]
                                if (oore.code === 200) {
                                  let times = new Date().getTime();
                                  let nowtime = parseInt(times / 1000);
                                  var ousql = "UPDATE saas_order SET autoAPI=?, ddzt=?, trackingno=?, ydh=?, gys_post_fee=?, nextapitime=? WHERE id=?";
                                  var ouparams = [1, qjsons[0].ztid, oore.data.tracking_numbers[0], oore.data.label_id, oore.data.final_price, nowtime, order.orders.oid];
                                  //console.log(ouparams);
                                  await connection.query(ousql, ouparams, async function (oerr, oresult) {
                                    if (oerr) {
                                      console.log(oerr);
                                    } else {
                                      var tracks = oore.data.tracking_numbers.length;
                                      var count = 0;
                                      for (var t = 0; t < tracks; t++) {
                                        count++;
                                        var bsql = "UPDATE box SET trackingno=? WHERE nborderid=? AND xh=?";
                                        var bparams = [oore.data.tracking_numbers[t], oore[0].nborderid, box_jsons[t].xh];
                                        //console.log(ouparams);
                                        await connection.query(bsql, bparams, function (berr, bresult) {
                                          if (berr) {
                                            console.log(berr);
                                          }
                                        });
                                      }
                                      if (parseInt(count) === parseInt(tracks)) {
                                        try {
                                          if (qjsons[0].cost === 2) {
                                            setPrice(qjsons[0].cost, oress[0].uid, connection, oress[0].nborderid)
                                          }
                                        } catch (e) {
                                          console.log('price error');
                                        }
                                        callback(null, { "code": 200, 'orderid': oress[0].orderid, "nborderid": oress[0].nborderid });
                                      }
                                    }
                                  });
                                } else if (oore.code == 500 || oore.code == 401 || oore.code == 404) {
                                  var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                                  var oeparams = [oore.data.message, 3, order.orders.oid];
                                  //console.log(ouparams);
                                  await connection.query(oesql, oeparams, function (oerr, oresult) {
                                    if (oerr) {
                                      console.log(oerr);
                                    } else {
                                      callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message, 'orderid': oress[0].orderid });
                                    }
                                  });
                                } else if (oore.code == 422) {
                                  var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                                  var oeparams = [JSON.stringify(oore.data.errors), 3, order.orders.oid];
                                  //console.log(ouparams);
                                  await connection.query(oesql, oeparams, function (oerr, oresult) {
                                    if (oerr) {
                                      console.log(oerr);
                                    } else {
                                      callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.errors, 'orderid': oress[0].orderid });
                                    }
                                  });
                                } else {
                                  callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message, 'orderid': oress[0].orderid });
                                }
                                //callback(null, JSON.parse(s));
                              } catch (error) {
                                console.log(error);
                                callback(null, { "code": 505, "message": "server disconnect" });
                              }
                            });
                          }
                        });
                      });
                      console.log(res); return false;
                    }
                  })
                  .catch(err => {
                    console.log(err);
                  });
              }
              else {
                fs.readFile('./token/access_token.json', function (err, data) {
                  var toke = data.toString();//将二进制的数据转换为字符串
                  tokes = JSON.parse(toke);//将字符串转换为json对象
                  console.log(typeof tokes);
                  //console.log(tokes);return false;
                  var token_time = parseInt(tokes.create_time) + parseInt(tokes.expires_in);
                  console.log(token_time);
                  var tel = '';
                  var stel = oress[0].stel;
                  if (stel.length < 10) {
                    tel = '8888888888';
                  }
                  tel = stel.replace(/(\@)|(\#)|(\$)|(\%)|(\^)|(\&)|(\*)|(\()|(\))|(\{)｜(\})｜(\:)｜(\")｜(\<)｜(\>)｜(\?)｜(\[)｜(\])|(\-)|(\")|(\')/g, '');
                  if (parseInt(nowtime) < token_time) {
                    const jso = JSON.stringify({
                      "access_token": tokes.access_token,
                      "shipper_id": mr[2],
                      "service": mr[3],
                      "ship_from_address": {
                        "name": ofress[0].fname,
                        "attention": "",
                        "address_1": ofress[0].fdz1,
                        "address_2": ofress[0].fdz2,
                        "address_3": "",
                        "city": ofress[0].fcity,
                        "post_code": ofress[0].fpostcode,
                        "state": ofress[0].fzhou,
                        "country": ofress[0].fcountry,
                        "telephone": ofress[0].ftel,
                        "is_residential": "false"
                      },
                      "ship_to_address": {
                        "name": oress[0].sname,
                        "attention": "",
                        "address_1": oress[0].sadd1,
                        "address_2": oress[0].sadd2,
                        "address_3": "",
                        "city": oress[0].scity,
                        "post_code": oress[0].spostcode,
                        "state": oress[0].sstate,
                        "country": oress[0].country,
                        "telephone": tel,
                        "is_residential": "false"
                      },
                      "packages": box

                    });
                    console.log(jso);
                    request({
                      method: 'POST',
                      headers: { "content-type": "application/json" },
                      url: order.urls + 'deftShip/production/Ship',
                      body: jso
                    }, async function (error, response, body) {
                      try {
                        /*if (response.code == 500) {
                            var oSql = "UPDATE saas_order SET autoAPI=3, sub_add=? WHERE id=?";
                            var oParams = ["接口服务器错误", oid];
                            cn.query(oSql, oParams, function (oerr, oresult) {

                            });
                            callback(null, {"code": 500, msg: 'error'});
                        }*/
                        var s = response.body;
                        console.log(s);
                        var oo = JSON.stringify(s);
                        var oos = JSON.parse(oo);
                        var oore = eval('(' + oos + ')');
                        //console.log(oores);
                        if (oore.code === 200) {
                          var ousql = "UPDATE saas_order SET autoAPI=?, ddzt=?, trackingno=?, ydh=?, gys_post_fee=? WHERE id=?";
                          var ouparams = [1, qjsons[0].ztid, oore.data.tracking_numbers[0], oore.data.label_id, oore.data.final_price, order.orders.oid];
                          //console.log(ouparams);oore.data.tracking_numbers[0]
                          await connection.query(ousql, ouparams, async function (oerr, oresult) {
                            if (oerr) {
                              console.log(oerr);
                            } else {
                              var tracks = oore.data.tracking_numbers.length;
                              var count = 0;
                              for (var t = 0; t < tracks; t++) {
                                count++;
                                console.log(oore.data.tracking_numbers[t], box_jsons[t].xh, oress[0].nborderid);
                                var bsql = "UPDATE box SET trackingno=? WHERE nborderid=? AND xh=?";
                                var bparams = [oore.data.tracking_numbers[t], oress[0].nborderid, box_jsons[t].xh];
                                //console.log(ouparams);
                                await connection.query(bsql, bparams, function (berr, bresult) {
                                  if (berr) {
                                    console.log(berr);
                                  }
                                });
                              }
                              if (parseInt(count) === parseInt(tracks)) {
                                try {
                                  if (qjsons[0].cost == 2) {
                                    setPrice(qjsons[0].cost, oress[0].uid, connection, oress[0].nborderid)
                                  }
                                } catch (e) {
                                  console.log('price error');
                                }
                                callback(null, { "code": 200, 'orderid': oress[0].orderid, "nborderid": oress[0].nborderid });
                              }
                            }
                          });
                        }
                        else if (oore.code === 500 || oore.code === 401 || oore.code === 404) {
                          var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                          var oeparams = [oore.data.message, 3, order.orders.oid];
                          //console.log(ouparams);
                          await connection.query(oesql, oeparams, function (oerr, oresult) {
                            if (oerr) {
                              console.log(oerr);
                            } else {
                              callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message, 'orderid': oress[0].orderid });
                            }
                          });
                        }
                        else if (oore.code == 422) {
                          var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                          var oeparams = [JSON.stringify(oore.data.errors), 3, order.orders.oid];
                          //console.log(ouparams);
                          await connection.query(oesql, oeparams, function (oerr, oresult) {
                            if (oerr) {
                              console.log(oerr);
                            } else {
                              callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.errors, 'orderid': oress[0].orderid });
                            }
                          });
                        } else {
                          callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message, 'orderid': oress[0].orderid });
                        }
                        //callback(null, JSON.parse(s));
                      }
                      catch (error) {
                        console.log(error);
                        callback(null, { "code": 505, "message": "server disconnect" });
                      }
                    });
                  } else {
                    requests({
                      url: order.urls + 'deftShip/production/Auth',
                      method: 'POST',
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        "email": mr[0],
                        "password": mr[1]
                      })
                    }).then(res => {
                      /*if (res.status == 404) {
                          var oSql = "UPDATE saas_order SET autoAPI=3, sub_add=? WHERE id=?";
                          var oParams = ["接口服务器错误", oid];
                          cn.query(oSql, oParams, function (oerr, oresult) {

                          });
                      }*/
                      var tok = JSON.parse(res);
                      tok.data.create_time = parseInt(nowtime);
                      fs.writeFile('./token/access_token.json', JSON.stringify(tok.data), function (err) {
                        if (err) {
                          console.error(err);
                        }
                        console.log('----------success-------------');
                        fs.readFile('./token/access_token.json', function (err, data) {
                          var toke = data.toString();//将二进制的数据转换为字符串
                          tokes = JSON.parse(toke);//将字符串转换为json对象
                          console.log(typeof tokes);
                          console.log(tokes);
                          if (err) {
                            console.log(err);
                          } else {
                            const jso = JSON.stringify({
                              "access_token": tokes.access_token,
                              "shipper_id": mr[2],
                              "service": mr[3],
                              "ship_from_address": {
                                "name": ofress[0].fname,
                                "attention": "",
                                "address_1": ofress[0].fdz1,
                                "address_2": ofress[0].fdz2,
                                "address_3": "",
                                "city": ofress[0].fcity,
                                "post_code": ofress[0].fpostcode,
                                "state": ofress[0].fzhou,
                                "country": ofress[0].fcountry,
                                "telephone": ofress[0].ftel,
                                "is_residential": "false"
                              },
                              "ship_to_address": {
                                "name": oress[0].sname,
                                "attention": "",
                                "address_1": oress[0].sadd1,
                                "address_2": oress[0].sadd2,
                                "address_3": "",
                                "city": oress[0].scity,
                                "post_code": oress[0].spostcode,
                                "state": oress[0].sstate,
                                "country": oress[0].country,
                                "telephone": oress[0].stel,
                                "is_residential": "false"
                              },
                              "packages": box

                            });
                            console.log(jso);
                            request({
                              method: 'POST',
                              headers: { "content-type": "application/json" },
                              url: order.urls + 'deftShip/production/Ship',
                              body: jso
                            },
                              async function (error, response, body) {
                                try {
                                  var s = response.body;
                                  console.log(s);
                                  var oo = JSON.stringify(s);
                                  var oos = JSON.parse(oo);
                                  var oore = eval('(' + oos + ')');
                                  //console.log(oores);oore.data.tracking_numbers[0];
                                  if (oore.code === 200) {
                                    var ousql = "UPDATE saas_order SET autoAPI=?, ddzt=?, trackingno=?, ydh=?, gys_post_fee=? WHERE id=?";
                                    var ouparams = [1, qjsons[0].ztid, oore.data.tracking_numbers[0], oore.data.label_id, oore.data.final_price, order.orders.oid];
                                    //console.log(ouparams);
                                    await connection.query(ousql, ouparams, async function (oerr, oresult) {
                                      if (oerr) {
                                        console.log(oerr);
                                      } else {
                                        var tracks = oore.data.tracking_numbers.length;
                                        var count = 0;
                                        for (var t = 0; t < tracks; t++) {
                                          count++;
                                          var bsql = "UPDATE box SET trackingno=? WHERE nborderid=? AND xh=?";
                                          var bparams = [oore.data.tracking_numbers[t], oress[0].nborderid, box_jsons[t].xh];
                                          //console.log(ouparams);
                                          await connection.query(bsql, bparams, function (berr, bresult) {
                                            if (berr) {
                                              console.log(berr);
                                            }
                                          });
                                        }
                                        if (parseInt(count) === parseInt(tracks)) {
                                          try {
                                            if (qjsons[0].cost == 2) {
                                              setPrice(qjsons[0].cost, oress[0].uid, connection, oress[0].nborderid)
                                            }
                                          } catch (e) {
                                            console.log('price error');
                                          }
                                          callback(null, { "code": 200, 'orderid': oress[0].orderid, "nborderid": oress[0].nborderid });
                                        }
                                      }
                                    });
                                  }
                                  else if (oore.code === 500 || oore.code === 401 || oore.code === 404) {
                                    var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                                    var oeparams = [oore.data.message, 3, order.orders.oid];
                                    //console.log(ouparams);
                                    await connection.query(oesql, oeparams, function (oerr, oresult) {
                                      if (oerr) {
                                        console.log(oerr);
                                      } else {
                                        callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message, 'orderid': oress[0].orderid });
                                      }
                                    });
                                  }
                                  else if (oore.code === 422) {
                                    var oesql = "UPDATE saas_order SET reorder=?, autoAPI=? WHERE id=?";
                                    var oeparams = [JSON.stringify(oore.data.errors), 3, order.orders.oid];
                                    //console.log(ouparams);
                                    await connection.query(oesql, oeparams, function (oerr, oresult) {
                                      if (oerr) {
                                        console.log(oerr);
                                      } else {
                                        callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.errors, 'orderid': oress[0].orderid });
                                      }
                                    });
                                  }
                                  else {
                                    callback(null, { "code": oore.code, "nborderid": oress[0].nborderid, "msg": oore.data.message });
                                  }
                                  //callback(null, JSON.parse(s));
                                } catch (error) {
                                  console.log(error);
                                  callback(null, { "code": 505, "message": "server disconnect" });
                                }
                              });
                          }
                        });
                      });
                    }).catch({});
                  }
                });

              }
            }
          });
        }
        catch (e) {
          callback(null, { "code": 400, msg: "data error" });
        }
      }
    });
  });
};

module.exports = {
  post_deft
};

function setPrice(cost, uid, cn, nboid) {
  console.log(cost, uid, nboid);
  var psql = "SELECT `token`, `key` FROM saas_user WHERE id=? LIMIT 1";
  var pparam = [uid];
  console.log(psql);
  cn.query(psql, pparam, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      request({
        method: 'POST',
        headers: { "content-type": "application/json" },
        url: "http://www.huodaios.com/app/API/update_jiekou_price.php",
        body: JSON.stringify({
          "AppKey": result[0].key,
          "AppSecret": result[0].token,
          "nborderid": nboid
        })
      }, function (error, response, body) {
        if (error) {
          console.log(error);
        } else {
          var or = response.body;
          var ors = eval('(' + or + ')');
          if (ors.result[0].code == 200) {
            console.log(200);
          } else {
            var osql = "UPDATE saas_order SET price_error=? WHERE nborderid=? LIMIT 1";
            var oparam = [ors.result[0].msg, nboid];
            cn.query(osql, oparam, function (oerr, oreslut) {
              if (oerr) {
                console.log(oerr);
              }
            });
          }
        }
      });
    }
  });
}
