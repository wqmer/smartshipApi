const fs = require('fs');
const path = require('path');
const moment = require('moment');
const requests = require('request-promise');
const request = require('request');
const parseString = require('xml2js').parseString;
require('tls').DEFAULT_MIN_VERSION = 'TLSv1';
const oss = require('../common/oss');

const post_accordpost = (order, callback, connection) => {
    var qcsql = "SELECT json, ztid, cost, showlog FROM saas_qudao WHERE id=?";
    var qcparmes = [order.orders.channel_id];
    //console.log(order.orders.oid);return false;
    connection.query(qcsql, qcparmes, function (err, results) {
        if (err) console.log(err);
        var mr = JSON.parse(results[0].json);
        //console.log(mr);return false;
        var osql = "SELECT nborderid, sadd1, sadd2, scity, scompany, spostcode, sstate, stel, sname, faddid, note, weight, baoguolb, country, box_num, box_json, shenbao_json, uid, hdid, method_id, orderid, uptime FROM saas_order WHERE id=? LIMIT 1";
        var oparams = [order.orders.oid];
        connection.query(osql, oparams, function (oerr, oresult) {
            if (oerr) {
                console.log(oerr);
            } else {
                //console.log(oresult);return false;
                try {
                    var ofsql = "SELECT fname, fdz1, fdz2, fcity, fzhou, fpostcode, ftel, ftime, fdzname, iskf, fcountry, fcompany FROM saas_faddress WHERE id=? LIMIT 1";
                    var ofparams = [oresult[0].faddid];
                    connection.query(ofsql, ofparams, function (oferr, ofresult) {
                        if (oferr) {
                            console.log(oferr);
                        } else {
                            var ofres = JSON.stringify(ofresult);
                            var ofress = JSON.parse(ofres);
                            var box_json = oresult[0]['box_json'];
                            var box_jsons = JSON.parse(box_json);
                            var dec_json = oresult[0]['shenbao_json'];
                            var dec_jsons = JSON.parse(dec_json);
                            if (box_jsons == null) {
                                console.log("box is error");
                            }
                            var tracks = mr[7].toString() + (10000000000 + Number(order.orders.oid));
                            var dec = "";
                            for (var d=0;d<dec_jsons.length;d++) {
                                dec += `<Cargo name="${dec_jsons[d]['itemcn']}" ename="${dec_jsons[d]['itemen']}" hscode="${dec_jsons[d]['hscode']}" count="${parseInt(dec_jsons[d]['num'])}" unit="PCE" weight="${parseFloat(dec_jsons[d]['cweight']).toFixed(3)}" amount="1" diNote=" ${dec_jsons[d]['sku']}" diPickName="${dec_jsons[d]['itemcn']}"></Cargo>`;
                            }
                            var originalid = '';
                            if (oresult[0]['ysid'] === null || oresult[0]['ysid'] === '' || oresult[0]['ysid'] === undefined) {
                                originalid = oresult[0].orderid;
                            } else {
                                originalid = oresult[0].ysid;
                            }
                            moment.locale('zh-cn');
                            var _today = new moment();
                            var nowtime = _today.format('YYYYMMDD');
                            var nowtimess = _today.format('YYYY-MM-DD');
                            var psss = "../log/"+moment(oresult[0].uptime).format('YYYY-MM-DD')+'/';
                            var dirPaths = path.join(__dirname, psss);
                            if (!fs.existsSync(dirPaths)) {
                                fs.mkdirSync(dirPaths);
                                console.log("文件夹创建成功");
                            } else {
                                //console.log("文件夹已存在");
                            }
                            /*requests({
                                method: 'POST',
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                url: "http://109.248.248.23:8083/dsship/v1/login",
                                ssl: {
                                    rejectUnauthorized: true,
                                },
                                body: JSON.stringify({
                                    "login": "test",
                                    "password": "test"
                                })
                            }).then(tok => {
                                let token = eval('('+tok+')');
                                console.log(token['accessToken']);*/
                            try {
                                let json = {
                                    "orders": {
                                        "cp": true,
                                        "item": [
                                            {
                                                "id": oresult[0].id,
                                                "address_string": oresult[0].spostcode+','+oresult[0].sstate+','+oresult[0].scity+','+oresult[0].sadd1+oresult[0].sadd2
                                            }
                                        ]
                                    }
                                };
                                if (Number(results[0]['showlog']) === 1) {
                                    console.log(JSON.stringify(json));
                                }
                                requests({
                                    method: 'POST',
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": mr[8]
                                    },
                                    url: "http://109.248.248.6:8083/dsship/v1/check_address",
                                    ssl: {
                                        rejectUnauthorized: true,
                                    },
                                    body: JSON.stringify(json)
                                }).then(addr => {
                                    if (Number(results[0]['showlog']) === 1) {
                                        console.log('456'+addr);
                                    }
                                    let addrs = eval('('+addr+')');
                                    let jsonsfio = {
                                        "FioList": {
                                            "Fio": [
                                                {
                                                    "id": "001",
                                                    "original_fio": oresult[0]['sname']
                                                }
                                            ]
                                        }
                                    };
                                    if (Number(results[0]['showlog']) === 1) {
                                        console.log(jsonsfio);
                                    }
                                    if (addrs[0]['valid'] === true || addrs[0]['valid'] === false) {
                                        requests({
                                            method: 'POST',
                                            headers: {
                                                "Content-Type": "application/json",
                                                "Authorization": mr[8]
                                            },
                                            url: "http://109.248.248.6:8083/dsship/v1/check_fio",
                                            ssl: {
                                                rejectUnauthorized: true,
                                            },
                                            body: JSON.stringify(jsonsfio)
                                        }).then(uname => {
                                            if (Number(results[0]['showlog']) === 1) {
                                                console.log("123"+uname);
                                            }
                                            var unames = eval('('+uname+')');
                                            requests({
                                                method: 'POST',
                                                headers: {
                                                    "Content-Type": "text/xml",
                                                    "Accept": "application/xml"
                                                },
                                                url: mr[0],
                                                ssl: {
                                                    rejectUnauthorized: true,
                                                },
                                                body: `<create-access-token partner_id="${mr[1]}" password="${mr[2]}"/>`
                                            }).then(suc => {
                                                if (Number(results[0]['showlog']) === 1) {
                                                    console.log(suc);
                                                }
                                                parseString(suc, (err, result) => {
                                                    try {
                                                        var ydh_ware = "SELECT id, ydh, hdid, qdid FROM ydh_ku WHERE hdid=? AND qdid=? AND isuse=0 ORDER BY id ASC LIMIT 1";
                                                        var ydh_param = [oresult[0]['hdid'], oresult[0]['method_id']];
                                                        connection.query(ydh_ware, ydh_param, function (yer, yres) {
                                                            if (yer) console.log(yer);
                                                            if (yres.length > 0) {
                                                                console.log("运单号："+yres[0]['ydh']);
                                                                var dydh1 = "UPDATE ydh_ku SET isuse=2 WHERE hdid=? AND qdid=? AND id=?";
                                                                var dparam1 = [yres[0]['hdid'], yres[0]['qdid'], yres[0]['id']];
                                                                console.log("运单号1："+dparam1);
                                                                connection.query(dydh1, dparam1, function (ner, nres) {
                                                                    if (ner) console.log(ner);
                                                                });
                                                                var batch = 'OS'+oresult[0]['uid']+nowtime;
                                                                var xml = `<create-purchase-order-plan token="${result['token']['value'][0]}"><doc zdoc_id="${originalid}"><order order_id="${originalid}" delivery_type="16" dev1mail_type="4" dev1nal_scheme="0" zip="${addrs[0].structure.index}" clnt_name="${unames['FioList']['Fio'][0]['surname']+' '+unames['FioList']['Fio'][0]['name']+' '+unames['FioList']['Fio'][0]['middle_name']}" clnt_phone="${oresult[0].stel}" dev_barcode="${yres[0]['ydh']}" zbarcode="${originalid}" parcel_sumvl="0" parcel_nalog="0" post_addr="${addrs[0].verified_address}"><struct_addr region="${addrs[0].structure['region']}" city="${addrs[0].structure['place']}" street="${addrs[0].structure['street']}" house="${addrs[0].structure['house']}"/><custom><dev16 dev16mass="${oresult[0]['weight']}"/></custom></order></doc></create-purchase-order-plan>`;
                                                                /*写日志*/
                                                                if (Number(results[0]['showlog']) === 1) {
                                                                    console.log(xml);
                                                                    fs.writeFile('./log/'+moment(oresult[0].uptime).format('YYYY-MM-DD')+'/'+oresult[0]['nborderid']+'submit'+'.txt', xml, function (file_er) {
                                                                        if (file_er) {
                                                                            console.log(file_er);
                                                                        } else {
                                                                            oss.put('logs/'+moment(oresult[0].uptime).format('YYYY-MM-DD')+'/'+oresult[0].nborderid+'submit'+'.txt', path.resolve(__dirname, '../log/'+moment(oresult[0].uptime).format('YYYY-MM-DD')+'/'+oresult[0].nborderid+'submit'+'.txt'));
                                                                        }
                                                                    });
                                                                }
                                                                /*日志结束*/
                                                                requests({
                                                                    method: 'POST',
                                                                    headers: {
                                                                        "Content-Type": "text/xml",
                                                                        "Accept": "application/xml"
                                                                    },
                                                                    url: mr[0],
                                                                    body: xml
                                                                }).then(su => {
                                                                    try {
                                                                        if (Number(results[0]['showlog']) === 1) {
                                                                            console.log(su);
                                                                        }
                                                                        parseString(su, async (err, result) => {
                                                                            if (Number(results[0]['showlog']) === 1) {
                                                                                console.log("ey："+JSON.stringify(result));
                                                                                await fs.writeFile('./log/' + moment(oresult[0].uptime).format('YYYY-MM-DD') + '/' + oresult[0]['nborderid'] + 'return' + '.txt', JSON.stringify(result), function (file_er) {
                                                                                    if (file_er) {
                                                                                        console.log(file_er);
                                                                                    } else {
                                                                                        oss.put('logs/' + moment(oresult[0].uptime).format('YYYY-MM-DD') + '/' + oresult[0].nborderid + 'return' + '.txt', path.resolve(__dirname, '../log/' + moment(oresult[0].uptime).format('YYYY-MM-DD') + '/' + oresult[0].nborderid + 'return' + '.txt'));
                                                                                    }
                                                                                });
                                                                            }
                                                                            if (result['create-purchase-order-plan-response']['$']['state'] === "0") {
                                                                                let times = new Date().getTime();
                                                                                let nowtime = parseInt(times / 1000);
                                                                                let all_json = JSON.stringify({
                                                                                    "name": unames['FioList']['Fio'][0]['surname']+' '+unames['FioList']['Fio'][0]['name']+' '+unames['FioList']['Fio'][0]['middle_name'],
                                                                                    "region": addrs[0].structure['region'],
                                                                                    "city": addrs[0].structure['place'],
                                                                                    "address": addrs[0].structure['street']+' '+addrs[0].structure['house']+' '+addrs[0].structure['letter']+' '+addrs[0].structure['building']
                                                                                });
                                                                                var dydh2 = "UPDATE ydh_ku SET isuse=1 WHERE hdid=? AND qdid=? AND id=? AND isuse=2";
                                                                                var dparam2 = [yres[0]['hdid'], yres[0]['qdid'], yres[0]['id']];
                                                                                console.log("运单号2："+dparam2);
                                                                                connection.query(dydh2, dparam2, function (der, dres) {
                                                                                    if (der) console.log(der);
                                                                                    var ousql = "UPDATE saas_order SET autoAPI=?, ddzt=?, nextapitime=?, trackingno=?, ydh=?, all_json=? WHERE id=?";
                                                                                    var ouparams = [1, results[0].ztid, nowtime, tracks, yres[0]['ydh'], all_json, order.orders.oid];
                                                                                    connection.query(ousql, ouparams, function (oerr, oresul) {
                                                                                        if (oerr) console.log(oerr);
                                                                                        callback(null, {
                                                                                            "code": 200,
                                                                                            "nborderid": oresult[0].nborderid,
                                                                                            'orderid': oresult[0]['orderid']
                                                                                        });
                                                                                    });
                                                                                });
                                                                            } else {
                                                                                let errs = result['create-purchase-order-plan-response']['errors'][0]['error'][0]['message'][0];
                                                                                console.log(errs.indexOf('Документ c таким номером уже зарегистрирован'));
                                                                                /*if (errs.indexOf('Документ c таким номером уже зарегистрирован') !== -1) {
                                                                                    var dydh3 = "UPDATE ydh_ku SET isuse=0 WHERE hdid=? AND qdid=? AND id=? AND isuse=2";
                                                                                    var dparam3 = [yres[0]['hdid'], yres[0]['qdid'], yres[0]['id']];
                                                                                    console.log("运单号3："+dparam3);
                                                                                    connection.query(dydh3, dparam3, function (der, dres) {
                                                                                        if (der) console.log(der);
                                                                                        callback(null, {"code": 400, "msg": yres[0]['ydh']+'  '+result['create-purchase-order-plan-response']['errors'][0]['error'][0]['message'][0], "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                                                                    });
                                                                                } else {*/
                                                                                callback(null, {"code": 400, "msg": yres[0]['ydh']+'  '+result['create-purchase-order-plan-response']['errors'][0]['error'][0]['message'][0], "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                                                                /*}*/
                                                                            }
                                                                        });
                                                                    } catch (error) {
                                                                        console.log(error);
                                                                        callback(null, {"code": 400, "msg": "server disconnect", "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                                                    }
                                                                }).catch(fa => {
                                                                    console.log(fa);
                                                                });
                                                            } else {
                                                                callback(null, {"code": 400, "msg": '无可用的运单号', "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                                            }
                                                        });
                                                    } catch (e) {
                                                        callback(null, {"code": 400, "msg": 'token异常', "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                                    }
                                                });
                                            }).catch(err => {
                                                console.log(err);
                                                callback(null, {"code": 400, "msg": '俄方服务器报错：'+err.message, "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                            });
                                        }).catch(fails => {
                                            callback(null, {"code": 400, "msg": fails.error, "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                        });
                                    } else {
                                        callback(null, {"code": 400, "nborderid": oresult[0].nborderid, "msg": '地址匹配不上'});
                                    }
                                }).catch(addr_err => {
                                    console.log(addr_err);
                                    callback(null, {"code": 400, "msg": addr_err.error, "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                                });
                            } catch (e) {
                                console.log(e);
                                callback(null, {"code": 400, "msg": e.error, "nborderid": oresult[0].nborderid, 'orderid': oresult[0]['orderid']});
                            }
                            /*}).catch(addr_err => {
                                console.log(addr_err);
                            });*/
                        }
                    });
                } catch (e) {
                    console.log(e);
                    callback(null, {"code": 400, msg: e.message});
                }
            }
        });
    });
};

module.exports = {
    post_accordpost
};