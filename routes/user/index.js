const Express = require('express')
const router = Express.Router();
const User = require("../../mongoDB/model/User")
const Service = require("../../mongoDB/model/Service")
const Rate = require("../../mongoDB/model/Rate")
const Order = require("../../mongoDB/model/Order")
const shortid = require('shortid');
const uuid = require('uuid')
const moment = require('moment');
const _ = require('lodash');
const rp = require('request-promise');
const mock_submit_order = require('../../services/shipping_module/carrier/fedEx/mock')
const chukoula = require('../../services/shipping_module/third_party_api/chukoula')
const PDFMerger = require('pdf-merger-js');
const ServiceClass = require('../../services/shipping_module/carrier');


const rrad = require('rrad')
const Fakerator = require("fakerator");
const fakerator = Fakerator();

const {
    responseClient,
    md5,
    MD5_SUFFIX
} = require('../util')


//注册
router.post('/register', (req, res) => {
    let {
        user_name,
        password,
        passwordRe,
        forwarder
    } = req.body;

    if (!user_name) {
        responseClient(res, 400, 2, 'username required !');
        return;
    }
    if (!password) {
        responseClient(res, 400, 2, 'password required !');
        return;
    }
    if (password !== passwordRe) {
        responseClient(res, 400, 2, 'password does not match !');
        return;
    }
    //验证用户是否已经在数据库中
    User.findOne({
        user_name: user_name
    })
        .then(data => {
            if (data) {
                responseClient(res, 200, 1, 'username exist !');
                return;
            }

            //保存到数据库
            let user = new User({
                user_name: user_name,
                password: md5(password + MD5_SUFFIX),
                forwarder,
                // service: result.legnth != 0 ? result.map(item => item._id) : [],
            });
            user.save().then(function () {
                // 这里需要改动
                User.findOne({
                    user_name: user_name
                })
                    .then(customerInfo => {
                        let data = {};
                        data.user_name = customerInfo.user_name;
                        // data.userType = userInfo.type;
                        data.user_id = customerInfo.user_id;
                        data.forwarder = customerInfo.forwarder;
                        responseClient(res, 200, 0, '注册成功', data);
                        return;
                    });
            })
        }).catch(err => {
            console.log(err)
            responseClient(res);
            return;
        });
});

//登录
router.post('/login', (req, res) => {
    let {
        user_name,
        password
    } = req.body;

    if (!user_name) {
        responseClient(res, 400, 2, '用户名不可为空');
        return;
    }
    if (!password) {
        responseClient(res, 400, 2, '密码不可为空');
        return;
    }
    User.findOne({
        user_name: user_name,
        password: md5(password + MD5_SUFFIX)
    }).then(customerInfo => {
        if (customerInfo) {
            //登录成功
            let data = {};
            data.user_name = customerInfo.user_name;
            data.user_id = customerInfo.user_id;
            data.user_object_id = customerInfo._id;
            data.user_level = customerInfo.user_level;
            data.balance = customerInfo.balance;
            //登录成功后设置session
            req.session.user_info = data;
            responseClient(res, 200, 0, '登录成功', data);
            // console.log(req.session)
            return;
        }
        responseClient(res, 401, 1, '用户名密码错误');
    }).catch(err => {
        responseClient(res);
    })
});

//登出
router.get('/logout', (req, res) => {
    req.session.destroy();
    responseClient(res, 200, 0, '', 'logout successfully')
});

//用户验证中间件
router.use((req, res, next) => {
    req.session.user_info ? next() : res.send(responseClient(res, 401, 1, 'Session ended , please login again'))
});

//获取用户信息
router.get('/userInfo', (req, res) => {
    User.findOne({
        user_id: req.session.user_info.user_id
    }).then(result => {
        if (result) {
            //登录成功
            let data = {};
            data.user_name = result.user_name;
            data.user_id = result.user_id;
            data.user_object_id = result._id;
            data.user_level = result.user_level;
            data.balance = result.balance;
            //登录成功后设置session
            responseClient(res, 200, 0, '获取成功', data);
            // console.log(req.session)
            return;
        }
        responseClient(res, 401, 1, '无记录');
    }).catch(err => {
        console.log(err)
        responseClient(res);
    })
})

//订单 筛选，模糊查询，分页
router.post('/get_orders', (req, res) => {
    let {
        // text,
        page,
        limit,
        status,
        filter
    } = req.body

    //分页
    let options = _.pickBy({
        page: req.body.page,
        limit: req.body.limit,
    }, _.identity);

    const query = _.pickBy({
        // "$text":text,
        user: req.session.user_info.user_object_id,
        status,
        ...filter
    }, _.identity);

    if (req.body.limit == undefined) {
        options.pagination = false
        options.select = 'order_id -_id'
    }
    //查询范围
    let query_field = [
        "order_id",
        "customer_order_id",
        "recipient.recipient_name",
        "recipient.add1",
        "recipient.add2",
        "recipient.state",
        "recipient.city"
    ]

    //添加到模糊查询
    if (req.body.searching_string) {
        query["$or"] = []
        for (let i = 0; i < query_field.length; i++) {
            let object = {}
            object[query_field[i]] = {
                "$regex": req.body.searching_string,
                "$options": "i"
            }
            query["$or"].push(object)
        }
    }

    console.log(query)
    // console.log(options)

    Order.paginate(query, options).then(function (result) {

        // console.log(result)
        responseClient(res, 200, 0, 'query data success !', result);
    }).catch(err => {
        console.log(err)
        responseClient(res);
    })
})

//统计所有不同状态订单数量，同时返回所需状态的订单数据
router.post('/get_orders_count', (req, res) => {
    let {
        filter,
        status,
        start,
        end,
    } = req.body

    Order.aggregate()
        .facet({
            "total": [
                { "$count": "total" },
            ],
            "draft": [
                { "$match": { 'status': 'draft' } },
                { "$count": "draft" }
            ],
            "ready_to_ship": [
                { "$match": { 'status': 'ready_to_ship' } },
                { "$count": "ready_to_ship" }
            ],
            "completed": [
                { "$match": { 'status': 'completed' } },
                { "$count": "completed" }
            ],
            "issue": [
                { "$match": { 'status': 'issue' } },
                { "$count": "issue" }
            ],
            "result": [
                { "$match": { 'status': status, ...filter }, },
                { "$skip": start - 1 || 0 },
                { "$limit": end - start + 1 || Number.MAX_SAFE_INTEGER },
            ]
        }).project({
            "count": {
                "total": { "$arrayElemAt": ["$total.total", 0] },
                "draft": { "$arrayElemAt": ["$draft.draft", 0] },
                "completed": { "$arrayElemAt": ["$completed.completed", 0] },
                "issue": { "$arrayElemAt": ["$issue.issue", 0] },
                "ready_to_ship": { "$arrayElemAt": ["$ready_to_ship.ready_to_ship", 0] },
            },
            "result": "$result",

        })
        .then(result => {
            responseClient(res, 200, 0, 'query data success !', result[0]);
            console.log(req.session)
        }).catch(err => {
            console.log(err)
            responseClient(res);
        })
})

//获取单个订单
router.get('/get_order', (req, res) => {
    let {
        order_id
    } = req.body;
    Order.findOne({
        order_id,
        user_id: req.session.user_info.user_id
    }).then(data => {
        if (!data) {
            responseClient(res, 200, 1, 'Order does not exist!');
        } else {
            responseClient(res, 200, 0, 'Fetch order success!', data);
        }
    }).catch(err => {
        responseClient(res);
    });
})

//创建草稿订单
router.post('/create_draft', (req, res) => {
    const {
        service_class,
        customer_order_id,
        status,
        sender,
        recipient,
        carrier,
        parcel,
        postage,
        vendor,
    } = req.body;

    let tempData = new Order({
        service_class,
        customer_order_id,
        order_id: service_class[0].toUpperCase() + moment().format('YYYYMMDDHHMM') + shortid.generate(),
        status,
        sender,
        recipient,
        parcel,
        carrier,
        postage,
        vendor,
        user_id: req.session.user_info.user_id
    });

    Order.findOne({
        customer_order_id,
        user_id: req.session.user_info.user_id
    }).then(data => {
        if (data) {
            responseClient(res, 200, 1, 'customer_order_id has already exist!');
        } else {
            tempData.save().then(data => {
                responseClient(res, 200, 0, 'create draft successfully', data)
            }).catch(err => {
                // console.log(err)
                responseClient(res);
            });
        }
    }).catch(err => {
        responseClient(res);
    });
})

//删除草稿订单
router.delete('/delete_draft', (req, res) => {
    let {
        order_id
    } = req.body;
    console.log(req.session.user_info.user_id)
    Order.deleteOne({
        order_id,
        user_id: req.session.user_info.user_id
    })
        .then(result => {
            if (result.n === 1) {
                responseClient(res, 200, 0, 'delete successfully!')
            } else {
                responseClient(res, 200, 1, 'order does not exist!');
            }
        }).catch(err => {
            responseClient(res);
        })
})

//批量删除草稿订单
router.post('/delete_drafts', (req, res) => {
    console.log(req.body)
    Order.deleteMany({
        'order_id': { '$in': req.body.order_id },
        user_id: req.session.user_info.user_id
    }).then(result => {
        console.log(result)
        if (result.n == req.body.order_id.length) {
            responseClient(res, 200, 0, 'delete successfully!', result)
        } else {
            responseClient(res, 200, 1, 'delete successfully but one or more order does not exist!', result);
        }
    }).catch(e => {
        console.log(e)
        responseClient(res);
    });
});

//更新草稿订单
router.post('/update_draft', (req, res) => {
    const {
        order_id,
        service_class,
        status,
        server_status,
        sender,
        recipient,
        carrier,
        vendor,
    } = req.body;

    const filter_null = _.pickBy({
        service_class,
        status,
        server_status,
        sender,
        recipient,
        carrier,
        vendor
    }, _.identity);


    Order.updateOne({
        order_id,
        user_id: req.session.user_info.user_id
    }, filter_null)
        .then(result => {
            if (result.n === 1) {
                responseClient(res, 200, 0, 'update successfully')
            } else {
                responseClient(res, 200, 1, 'order does not exist!');
            }
        }).catch(err => {
            console.log(err);
            responseClient(res);
        });
})

//批量更新草稿订单
router.post('/update_drafts', (req, res) => {
    const {
        order_id,
        service_class,
        status,
        server_status,
        sender,
        recipient,
        carrier,
        vendor,
    } = req.body;

    const filter_null = _.pickBy({
        service_class,
        status,
        server_status,
        sender,
        recipient,
        carrier,
        vendor
    }, _.identity);

    console.log(req.body)
    Order.updateMany({
        "order_id": { "$in": order_id },
        user_id: req.session.user_info.user_id
    }, filter_null)
        .then(result => {
            // responseClient(res, 200, 0, 'update successfully' , result)
            if (result.n === order_id.length) {
                responseClient(res, 200, 0, 'update successfully', result)
            } else {
                responseClient(res, 200, 1, 'some order does not exist!');
            }
        }).catch(err => {
            console.log(err);
            responseClient(res);
        });
})

//提交订单   ---- 递交待处理订单至远程服务器拿回label数据 ，-----目前为模拟
router.post('/mock_submit_order', (req, res) => {
    const {
        service_class,
        order_id,
        // status,
        sender,
        recipient,
        carrier,
        parcel,
        postage,
        vendor,
    } = req.body;

    Order.findOne({
        order_id,
        user_id: req.session.user_info.user_id
    }).then(data => {
        if (data && data.status != 'completed') {
            // here to begin submitting order , mock 
            mock_submit_order(req.body).then(response => {
                if (response.code == 0) {
                    //做测试用，暂不改状态
                    let update_data = {
                        status: 'ready_to_ship'
                    }
                    Order.findOneAndUpdate({ order_id: req.body.order_id }, update_data, { new: true }).then((result) => {
                        responseClient(res, 200, 0, 'submit successfully', response.data);
                    }).catch(e => responseClient(res, 500, 3, e))
                } else {
                    responseClient(res, 200, 1, 'can not submit order ', response.message)
                }
            }).catch(error => responseClient(res, 200, 1, error.message, error.data))
        } else {
            responseClient(res, 200, 1, 'order does not exist!');
        }
    }).catch(err => {
        responseClient(res);
    });
})

//预估邮费，返回可用服务渠道和价格
router.post('/get_service_rate', (req, res) => {
    // let new_rate = new Rate({
    //     "_id":"5dd3aa1438192f0dba6136cd","appiled_to_level":"regular","user_id":"","service_id":"5dd3654b38192f0dba6136cc","base_zone":{"one":["2.0","2.0"],"two":["3.0"]},"surcharge":[{"name":"fuel","amount":"7%"}]
    // });
    // new_rate.save().then(data => responseClient(res, 200, 0, 'query successfully', data))

    // 先返回客户所有可以用的渠道。
    // 然后用客户级别user_level去对应所有相关渠道的报价表 ：如果user_level是regular ，返回所有标注为regular对应渠道的价格表，如果是customized 找到对应customized ，和关联user_id的报价表.
    // 如果没有对应的customized报价表，但是又是可用的渠道，就用regular 报价表

    // to_do 传邮编分区，重量，尺寸参数得到最终费用
    Service.find({
        status: "activated",
        $or: [{ auth_group: { $in: req.session.user_info.user_id } }, { type: "default" }],
    }).populate({
        path: 'rate',
        match: { $or: [{ user_id: req.session.user_info.user_id }, { type: "default" }] },
    })
        .then(result => {





            if (result.length > 0) {
                responseClient(res, 200, 0, 'find service successfully', result)
            } else {
                responseClient(res, 200, 0, 'no service avaiable')
            }
        })
        .catch(error => responseClient(res))
})

//预估邮费by包裹信息
router.post('/get_rate', async (req, res) => {
    try {
        let shipment = req.body
        //获取所有对此用户开放的服务
        let services = await Service
            .find({ status: "activated", $or: [{ auth_group: { $in: req.session.user_info.user_id } }, { type: "default" }], })
            .populate({
                path: 'rate',
                match: { $or: [{ user_id: req.session.user_info.user_id }, { type: "default" }] },
            })
        //用重量过滤服务，如果多件货物，只要单个货物，不在服务重量范围，即不可用
        const parecels_weight = shipment.parcel_information.parcel_list.map(item => parseFloat(item.pack_info.weight))
        const is_in_range = function (weight_array, service_min_weight, service_max_weight) {
            return weight_array.every(element => element >= service_min_weight && element <= service_max_weight)
        }
        let serviceAvail = services.filter(item => is_in_range(parecels_weight, item.ship_parameters.weight_min, item.ship_parameters.weight_max))
        //获得服务后调用对应类方法的rate 方法返回报价
        if (serviceAvail.length > 0) {
            let promises = serviceAvail.map(item => {
                const Service = ServiceClass(item.agent)
                const service = new Service(item.api_parameters.account_information, item.api_parameters.request_url, item.rate, item.carrier, item.mail_class , item.asset)
                return service.rate(shipment)
            })
            const response = await Promise.all(promises)
            responseClient(res, 200, 0, 'rate successfully', response)
        } else {
            responseClient(res, 200, 0, 'no service avaiable')
        }
    } catch (error) {
        console.log(error)
        responseClient(res)
    }

    // Service.find({
    //     status: "activated",
    //     $or: [{ auth_group: { $in: req.session.user_info.user_id } }, { type: "default" }],
    // }).populate({
    //     path: 'rate',
    //     match: { $or: [{ user_id: req.session.user_info.user_id }, { type: "default" }] },
    // })
    //     .then(result => {
    //         let services
    //         if (result.length > 0) {
    //             services = result.filter(item => {
    //                 if (weight <= item.ship_parameters.weight_max && weight >= item.ship_parameters.weight_min) {
    //                     const ServiceClass = ServiceClass(item.agent)
    //                     const service = new ServiceClass(item.api_parameters.account_information, IbSandboxEndpoint, item.rate, item.carrier, item.mail_class)
    //                     return AgentClass.rate(req.body)
    //                 }
    //             })
    //             responseClient(res, 200, 0, 'rate successfully', result)
    //         } else {
    //             responseClient(res, 200, 0, 'no service avaiable')
    //         }
    //     })
    //     .catch(error => responseClient(res))
})

//获取当前客户可用服务渠道
router.post('/get_service', (req, res) => {
    //返回所有可用渠道，由管理员或者代理添加。会有默认可用渠道
    Service.find({
        status: "activated",
        $or: [{ auth_group: { $in: req.session.user_info.user_id } }, { type: "default" }],
        // match:{ status : "activated" },
        // select: ['-rate'],
    }).then(result => {
        console.log(result)
        if (result.length > 0) {
            responseClient(res, 200, 0, 'find service successfully', result)
        } else {
            responseClient(res, 200, 0, 'no service avaiable')
        }
    })
        .catch(error => responseClient(res))
})

//查询tracking
router.post('/get_tracking', (req, res) => {
    rp(chukoula.fedex_tracking(req.body))
        .then(result => {
            responseClient(res, 200, 0, 'tracking successfully', result)
            // POST succeeded...
        })
        .catch((err) => {
            responseClient(res)
        });
})

//模拟批量
router.post('/mock_batch_drafts', (req, res) => {
    let fake_carrier = ['FedEx_ground', 'FedEx_2day', 'Usps_First_class', 'UPS_next_day']
    let fake_order_array = []
    let server_status_pool = ['default', 'error', 'processing']
    for (i = 0; i < 500; i++) {
        let fake_name = fakerator.names.firstName() + ' ' + fakerator.names.lastName()
        let fake_company = fakerator.company.name()
        let fake_address = rrad.addresses[Math.floor(Math.random() * rrad.addresses.length)]
        let fake_phone_number = fakerator.phone.number()
        let fake_server_status = server_status_pool[Math.floor(Math.random() * server_status_pool.length)]
        // console.log(fake_server_status)
        let order = {
            service_class: 'International_Parcel',
            customer_order_id: uuid(),
            order_id: 'I' + moment().format('YYYYMMDDHHMM') + shortid.generate(),
            status: 'ready_to_ship',
            server_status: fake_server_status,
            sender: {
                "sender_name": 'Kimi_mock'
            },
            recipient: {
                "Company": fake_company,
                "recipient_name": fake_name,
                "add1": fake_address.address1,
                "add2": fake_address.address2,
                "state": fake_address.state,
                "city": fake_address.city,
                "zipcode": fake_address.postalCode,
                "country": "us",
                "phone_number": fake_phone_number
            },
            parcel: {
                "sku": "product_" + shortid.generate(),
                "weight": Math.floor(Math.random() * (1000 - 100) + 500) / 100,
                "length": Math.floor(Math.random() * (1000 - 100) + 500) / 100,
                "width": Math.floor(Math.random() * (600 - 100) + 500) / 100,
                "height": Math.floor(Math.random() * (600 - 100) + 500) / 100,

            },
            carrier: fake_carrier[Math.floor(Math.random() * fake_carrier.length)],

            postage: {
                "estimate_amount": Math.floor(Math.random() * (1500 - 100) + 500) / 100
            },
            forwarder: '5eed9f7ff9ee931e68754fa3', //目前先固定为100008这个个代理
            // user_id: req.session.user_info.user_id,
            user: req.session.user_info.user_object_id
        };
        fake_order_array.push(order)
    }

    Order.insertMany(fake_order_array)
        .then(result => {
            responseClient(res, 200, 0, 'batch add draft successfully')
        }).catch(err => {
            console.log(err);
            responseClient(res);
        });
})


//测试合并
// router.post('/merge_pdf', async(req, res) => {
//     var merger = new PDFMerger()
//     try {  
//         let pdf_array = req.body.pdf    
//         for (var i = 0; i < pdf_array.length; i++) {
//             merger.add(pdf_array[i]);
//         }
//         await merger.save('merged.pdf')
//         await res.status(200).json({code: 0, message:'merged successfully'})
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({code: 1, message:'internal error'})
//     }
// })









module.exports = router