const Express = require("express");
const router = Express.Router();
const User = require("../../mongoDB/model/User");
const Ledger = require("../../mongoDB/model/Ledger");
const Address = require("../../mongoDB/model/Address");
const Service = require("../../mongoDB/model/Service");
const Carrier = require("../../mongoDB/model/Carrier");
const Rate = require("../../mongoDB/model/Rate");
const Order = require("../../mongoDB/model/Order");
const shortid = require("shortid");
const uuid = require("uuid");
const moment = require("moment");
const CarrierClass = require("../../services/shipping_module/carrier/model.js");
const _ = require("lodash");
const rp = require("request-promise");
// const mock_submit_order = require("../../services/shipping_module/carrier/fedEx/mock");
const chukoula = require("../../services/shipping_module/third_party_api/chukoula");
const PDFMerger = require("pdf-merger-js");
const ServiceClass = require("../../services/shipping_module/carrier");
const wb = require("../../services/workBook");
const Fakerator = require("fakerator");
const fakerator = Fakerator();
const util = require("util");
const config = require("../../config/dev");
const mongoose = require("mongoose");
const user = require("../../controller/user");
const {
  mapRequestToModel,
  responseClient,
  md5,
  MD5_SUFFIX,
} = require("../util");

//注册
router.post("/register", (req, res) => {
  let { user_name, password, passwordRe, forwarder } = req.body;

  if (!user_name) {
    responseClient(res, 400, 2, "username required !");
    return;
  }
  if (!password) {
    responseClient(res, 400, 2, "password required !");
    return;
  }
  if (password !== passwordRe) {
    responseClient(res, 400, 2, "password does not match !");
    return;
  }
  //验证用户是否已经在数据库中
  User.findOne({
    user_name: user_name,
  })
    .then((data) => {
      if (data) {
        responseClient(res, 200, 1, "username exist !");
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
          user_name: user_name,
        }).then((customerInfo) => {
          let data = {};
          data.user_name = customerInfo.user_name;
          // data.userType = userInfo.type;
          data.user_id = customerInfo.user_id;
          data.forwarder = customerInfo.forwarder;
          responseClient(res, 200, 0, "注册成功", data);
          return;
        });
      });
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
      return;
    });
});

//登录
router.post("/login", (req, res) => {
  let { user_name, password } = req.body;

  if (!user_name) {
    responseClient(res, 400, 2, "用户名不可为空");
    return;
  }
  if (!password) {
    responseClient(res, 400, 2, "密码不可为空");
    return;
  }
  User.findOne({
    user_name: user_name,
    password: md5(password + MD5_SUFFIX),
  })
    .then((customerInfo) => {
      if (customerInfo) {
        //登录成功
        let data = {};
        data.user_name = customerInfo.user_name;
        data.user_id = customerInfo.user_id;
        data.user_object_id = customerInfo._id;
        data.user_level = customerInfo.user_level;
        data.balance = customerInfo.balance;
        data.billing_type = customerInfo.billing_type;
        //登录成功后设置session
        req.session.user_info = data;
        responseClient(res, 200, 0, "登录成功", data);
        // console.log(req.session)
        return;
      }
      responseClient(res, 401, 1, "用户名密码错误");
    })
    .catch((err) => {
      responseClient(res);
    });
});

//登出
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) responseClient(res);
    responseClient(res, 200, 0, "", "logout successfully");
  });
});

//用户验证中间件
router.use((req, res, next) => {
  req.session.user_info
    ? next()
    : res.send(
        responseClient(res, 401, 1, "Session ended , please login again")
      );
});

//获取用户信息
router.get("/userInfo", (req, res) => {
  User.findOne({
    user_id: req.session.user_info.user_id,
  })
    .then((result) => {
      if (result) {
        //登录成功
        let data = {};
        data.user_name = result.user_name;
        data.user_id = result.user_id;
        data.user_object_id = result._id;
        data.user_level = result.user_level;
        data.balance = result.balance;
        data.billing_type = result.billing_type;
        //登录成功后设置session
        responseClient(res, 200, 0, "获取成功", data);
        // console.log(req.session)
        return;
      }
      responseClient(res, 401, 1, "无记录");
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//订单 筛选，模糊查询，分页
router.post("/get_orders", (req, res) => {
  let {
    // text,
    page,
    limit,
    status,
    filter,
  } = req.body;

  //分页
  let options = _.pickBy(
    {
      page: req.body.page,
      limit: req.body.limit,
      sort: "-created_at",
    },
    _.identity
  );

  const query = _.pickBy(
    {
      // "$text":text,
      user: req.session.user_info.user_object_id,
      status,
      ...filter,
    },
    _.identity
  );

  if (req.body.limit == undefined) {
    options.pagination = false;
    options.select = "order_id -_id";
  }
  //查询范围
  let query_field = [
    "order_id",
    "customer_order_id",
    "recipient.recipient_name",
    "recipient.add1",
    "recipient.add2",
    "recipient.state",
    "recipient.city",
  ];

  //添加到模糊查询
  if (req.body.searching_string) {
    query["$or"] = [];
    for (let i = 0; i < query_field.length; i++) {
      let object = {};
      object[query_field[i]] = {
        $regex: req.body.searching_string,
        $options: "i",
      };
      query["$or"].push(object);
    }
  }

  console.log(query);
  // console.log(options)

  Order.paginate(query, options)
    .then(function (result) {
      // console.log(result)
      responseClient(res, 200, 0, "query data success !", result);
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//统计所有不同状态订单数量，同时返回所需状态的订单数据
router.post("/get_orders_count", (req, res) => {
  let { filter, status, start, end } = req.body;

  Order.aggregate()
    .facet({
      total: [{ $count: "total" }],
      draft: [{ $match: { status: "draft" } }, { $count: "draft" }],
      ready_to_ship: [
        { $match: { status: "ready_to_ship" } },
        { $count: "ready_to_ship" },
      ],
      completed: [{ $match: { status: "completed" } }, { $count: "completed" }],
      issue: [{ $match: { status: "issue" } }, { $count: "issue" }],
      result: [
        { $match: { status: status, ...filter } },
        { $skip: start - 1 || 0 },
        { $limit: end - start + 1 || Number.MAX_SAFE_INTEGER },
      ],
    })
    .project({
      count: {
        total: { $arrayElemAt: ["$total.total", 0] },
        draft: { $arrayElemAt: ["$draft.draft", 0] },
        completed: { $arrayElemAt: ["$completed.completed", 0] },
        issue: { $arrayElemAt: ["$issue.issue", 0] },
        ready_to_ship: { $arrayElemAt: ["$ready_to_ship.ready_to_ship", 0] },
      },
      result: "$result",
    })
    .then((result) => {
      responseClient(res, 200, 0, "query data success !", result[0]);
      console.log(req.session);
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//获取单个订单
router.get("/get_order", (req, res) => {
  let { order_id } = req.body;
  Order.findOne({
    order_id,
    user_id: req.session.user_info.user_id,
  })
    .then((data) => {
      if (!data) {
        responseClient(res, 200, 1, "Order does not exist!");
      } else {
        responseClient(res, 200, 0, "Fetch order success!", data);
      }
    })
    .catch((err) => {
      responseClient(res);
    });
});

//获取单个订单 by tracking
router.get("/get_order/:tracking", user.getById);

//获取label url
router.post("/get_urls", user.getLabelUrls);

//创建草稿订单
router.post("/create_draft", (req, res) => {
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
    order_id:
      service_class[0].toUpperCase() +
      moment().format("YYYYMMDDHHMM") +
      shortid.generate(),
    status,
    sender,
    recipient,
    parcel,
    carrier,
    postage,
    vendor,
    user_id: req.session.user_info.user_id,
  });

  Order.findOne({
    customer_order_id,
    user_id: req.session.user_info.user_id,
  })
    .then((data) => {
      if (data) {
        responseClient(res, 200, 1, "customer_order_id has already exist!");
      } else {
        tempData
          .save()
          .then((data) => {
            responseClient(res, 200, 0, "create draft successfully", data);
          })
          .catch((err) => {
            // console.log(err)
            responseClient(res);
          });
      }
    })
    .catch((err) => {
      responseClient(res);
    });
});

//删除草稿订单
router.delete("/delete_draft", (req, res) => {
  let { order_id } = req.body;
  Order.deleteOne({
    order_id,
    user_id: req.session.user_info.user_id,
  })
    .then((result) => {
      if (result.n === 1) {
        responseClient(res, 200, 0, "delete successfully!");
      } else {
        responseClient(res, 200, 1, "order does not exist!");
      }
    })
    .catch((err) => {
      responseClient(res);
    });
});

//批量删除草稿订单
router.post("/delete_drafts", (req, res) => {
  console.log(req.body);
  Order.deleteMany({
    order_id: { $in: req.body.order_id },
    user_id: req.session.user_info.user_id,
  })
    .then((result) => {
      console.log(result);
      if (result.n == req.body.order_id.length) {
        responseClient(res, 200, 0, "delete successfully!", result);
      } else {
        responseClient(
          res,
          200,
          1,
          "delete successfully but one or more order does not exist!",
          result
        );
      }
    })
    .catch((e) => {
      console.log(e);
      responseClient(res);
    });
});

//更新草稿订单
router.post("/update_draft", (req, res) => {
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

  const filter_null = _.pickBy(
    {
      service_class,
      status,
      server_status,
      sender,
      recipient,
      carrier,
      vendor,
    },
    _.identity
  );

  Order.updateOne(
    {
      order_id,
      user_id: req.session.user_info.user_id,
    },
    filter_null
  )
    .then((result) => {
      if (result.n === 1) {
        responseClient(res, 200, 0, "update successfully");
      } else {
        responseClient(res, 200, 1, "order does not exist!");
      }
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//批量更新草稿订单
router.post("/update_drafts", (req, res) => {
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

  const filter_null = _.pickBy(
    {
      service_class,
      status,
      server_status,
      sender,
      recipient,
      carrier,
      vendor,
    },
    _.identity
  );

  console.log(req.body);
  Order.updateMany(
    {
      order_id: { $in: order_id },
      user_id: req.session.user_info.user_id,
    },
    filter_null
  )
    .then((result) => {
      // responseClient(res, 200, 0, 'update successfully' , result)
      if (result.n === order_id.length) {
        responseClient(res, 200, 0, "update successfully", result);
      } else {
        responseClient(res, 200, 1, "some order does not exist!");
      }
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//预估邮费，返回可用服务渠道和价格
router.post("/get_service_rate", (req, res) => {
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
    $or: [
      { auth_group: { $in: req.session.user_info.user_id } },
      { type: "default" },
    ],
  })
    .populate({
      path: "rate",
      match: {
        $or: [{ user_id: req.session.user_info.user_id }, { type: "default" }],
      },
    })
    .then((result) => {
      if (result.length > 0) {
        responseClient(res, 200, 0, "find service successfully", result);
      } else {
        responseClient(res, 200, 0, "no service avaiable");
      }
    })
    .catch((error) => responseClient(res));
});

//预估邮费by包裹信息
router.post("/get_rate", async (req, res) => {
  try {
    //find all carrier account avaialbe
    let shipment = req.body;
    let is_res = shipment.receipant_information.receipant_is_residential;
    let carrier_avaiable = await Carrier.find({
      // _id: carrier,
      // user: req.session.user_info.user_object_id,
      status: "activated",
      $or: [
        // { _id: carrier },
        { user: req.session.user_info.user_object_id },
        { auth_group: { $in: req.session.user_info.user_object_id } },
      ],
      // match: [{ status: "activated" }],
      // select: ['-rate'],
    }).populate({
      path: "service",
      match: [{ status: "activated" }],
      perDocumentLimit: 10,
      populate: {
        path: "rate",
        perDocumentLimit: 50,
        match: {
          $or: [
            { user_id: req.session.user_info.user_object_id },
            { auth_group: { $in: req.session.user_info.user_object_id } },
          ],
        },
      },
    });

    // console.log(carrier_avaiable);

    if (
      carrier_avaiable.length == 0 ||
      carrier_avaiable
        .map((item) => item.service)
        .every((item) => item.length == 0)
    ) {
      responseClient(res, 404, 1, "no service avaiable");
    } else {
      // responseClient(res, 200, 0, "test here", carrier_avaiable);
    }
    // let service_avaiable = carrier_avaiable.map((item) => item.service);
    // if (service_avaiable.every((item) => item.length == 0))responseClient(res, 404, 1, "no service avaiable");

    //用重量过滤服务，如果多件货物，只要单个货物，不在服务重量范围，即不可用
    // console.log(shipment)
    const parecels_weight = shipment.parcel_information.parcel_list.map(
      (item) => parseFloat(item.pack_info.weight)
    );

    let serviceAfterFlat = carrier_avaiable
      .map(({ service, asset, agent, user, auth_group }) => {
        return service.map(
          ({
            ship_parameters,
            rate,
            status,
            _id,
            carrier,
            mail_class,
            description,
            type,
          }) => {
            return {
              asset,
              user,
              auth_group,
              agent,
              ship_parameters,
              rate,
              status,
              _id,
              carrier,
              mail_class,
              description,
              type,
            };
          }
        );
      })
      .flat(2);

    // // console.log(shipment)
    // // console.log( Number(parseFloat( 1 * convert_value_weight).toFixed(2)))

    const is_invalid = function (
      weight_array,
      service_min_weight,
      service_max_weight,
      unit_weight,
      unit_weight_accepted,
      is_res_only,
      is_bus_only
    ) {
      if (!service_min_weight) service_min_weight = 0;
      let carrierClass = new CarrierClass();
      let convert_value_weight = carrierClass.getConvertFactor(
        unit_weight,
        unit_weight_accepted
      );

      let is_every_pack_in_range = weight_array.every(
        (element) =>
          //element > service_min_weight && element < service_max_weight
          Number(
            parseFloat(element * convert_value_weight).toFixed(2) >
              service_min_weight
          ) &&
          (!service_max_weight ||
            Number(parseFloat(element * convert_value_weight).toFixed(2)) <
              service_max_weight) // True , if service was not set a Max_weight or parcel's weight smaller than Max_weight
      );

      let address_type_vaild = true;

      if (is_res === true) {
        address_type_vaild =
          is_res_only === undefined ||
          is_res_only === true ||
          (is_bus_only === undefined && is_res_only === undefined) ||
          (is_bus_only === false && is_res_only === false);
      }

      if (is_res === false) {
        address_type_vaild =
          is_bus_only === undefined ||
          is_bus_only === true ||
          (is_bus_only === undefined && is_res_only === undefined) ||
          (is_bus_only === false && is_res_only === false);
      }

      // let is_bus_invalid = is_res !== true && is_bus_only !== false;

      return is_every_pack_in_range && address_type_vaild;
    };

    // console.log(serviceAfterFlat);
    let serviceAvail = serviceAfterFlat.filter((item) =>
      is_invalid(
        parecels_weight,
        item.ship_parameters.weight_min,
        item.ship_parameters.weight_max,
        shipment.parcel_information.unit_weight,
        "lb",
        item.ship_parameters.is_res_only,
        item.ship_parameters.is_bus_only
      )
    );

    let status = 200;
    let status_code = 0;
    let response;

    if (serviceAvail.length > 0) {
      let promises = serviceAvail.map(async (item) => {
        const Service = ServiceClass(item.type);
        const service = new Service(
          item.asset.account_information,
          item.asset.request_url,
          item.rate,
          item.type,
          item.mail_class,
          { _id: item._id, description: item.description, ...item.asset }
        );
        let result = await service.rate(shipment);
        return result;
      });
      response = await Promise.all(promises);

      responseClient(res, status, status_code, "rate successfully", response);
    } else {
      responseClient(res, status, status_code, "no service avaiable");
      // return;
    }
  } catch (error) {
    console.log(error);
    // responseClient(res, 400, 1, "no service avaiable");
    responseClient(res);
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
});

// 添加 carrier
router.post("/add_carrier", async (req, res) => {
  let { type, asset } = req.body;
  try {
    let carrier = new Carrier({
      type,
      asset: {
        ...asset,
        nick_name: asset.nick_name || type,
        code: type + "@" + shortid.generate(),
        logo_url: config.LOGO[type],
        request_url: config.URL[type],
      },
      user: req.session.user_info.user_object_id,
    });

    let result = await carrier.save();

    // console.log(result)
    responseClient(res, 200, 0, "Add carrier account successfully", result);
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
});

//获取所有 carrier 列表
router.post("/get_carriers", user.getCarriers);

//获取单个 carrier
router.post("/get_carrier", user.getCarrier);

//更新一个carrier
router.post("/update_carrier", async (req, res) => {
  let { _id, asset } = req.body;
  try {
    let carrier = {
      asset: {
        ...asset,
      },
    };

    console.log(carrier);

    let result = await Carrier.updateOne(
      {
        _id,
        user: req.session.user_info.user_object_id,
      },
      { asset: carrier.asset }
    );

    // console.log(result)
    result.n == 1
      ? responseClient(res, 200, 0, "Update carrier account successfully")
      : responseClient(res, 404, 1, "No carrier account found");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
});

//更新一个carrier状态
router.put("/update_carrier_status", async (req, res) => {
  let { _id, status } = req.body;
  try {
    let result = await Carrier.updateOne(
      {
        _id,
        user: req.session.user_info.user_object_id,
      },
      { status }
    );

    // console.log(result)
    result.n == 1
      ? responseClient(res, 200, 0, "Update carrier account successfully")
      : responseClient(res, 404, 1, "No carrier account found");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
});

//删除一个carrier
router.post("/delete_carrier", async (req, res) => {
  let { _id } = req.body;

  try {
    let result = await Carrier.deleteOne({
      _id,
      user: req.session.user_info.user_object_id,
    });

    if (result.n == 1) {
      await Service.deleteMany({ carrier: _id });
      responseClient(res, 200, 0, "delete successfully!");
    } else {
      responseClient(res, 404, 1, "Carrier account does not exist!");
    }
  } catch (error) {
    console.log(error);
    responseClient(res, 500, 1);
  }
});

//添加渠道
router.post("/add_service", user.addService);

//获取渠道
router.post("/get_service", user.getServices);

//更新渠道
router.put("/update_service", user.updateService);

//查询tracking
router.post("/get_tracking", (req, res) => {
  rp(chukoula.fedex_tracking(req.body))
    .then((result) => {
      responseClient(res, 200, 0, "tracking successfully", result);
      // POST succeeded...
    })
    .catch((err) => {
      responseClient(res);
    });
});

//创建运单
router.post("/create_shipment", async (req, res) => {
  let {
    sender_information,
    receipant_information,
    customer_order_id,
    service_information,
    billing_information,
  } = req.body;
  // console.log(req.body)
  let shipment = req.body;
  try {
    //-------检查客户账户状态----------------------------------------------
    //检查余额，小于0 返回res ，如果有预估价格，需要比对
    const query = await User.findOne({
      user_id: req.session.user_info.user_id,
    });
    let balance = query.balance;
    if (balance <= 0)
      return responseClient(res, 400, 1, "You have not enough credit");
    if (billing_information) {
      if (balance < billing_information.total)
        return responseClient(res, 400, 1, "You have not enough credit");
    }

    //检查是否有对应渠道，没有返回res
    const rquest_service_code = service_information.service_content[0].code;
    const services = await Service.findOne({
      _id: rquest_service_code,
      $or: [
        { status: "activated" },
        { auth_group: { $in: req.session.user_info.user_object_id } },
      ],
    }).populate({
      path: "carrier",
      // status: "activated",
      match: {
        $or: [
          { auth_group: { $in: req.session.user_info.user_object_id } },
          { user: req.session.user_info.user_object_id },
        ],
        status: "activated",
      },
      perDocumentLimit: 10,
    });
    if (!services || !services.carrier)
      return responseClient(
        res,
        200,
        1,
        "Ship method is not avaiable for this account"
      );
    // console.log(services);
    //get service info
    // console.log(services);
    let serviceInfo = {
      carrier: mongoose.Types.ObjectId(services.carrier._id),
      mail_class: services.mail_class,
      type: services.type,
      asset: {
        logo_url: services.carrier.asset.logo_url,
        description: services.description,
        code: services._id,
      },
    };

    //检查客户订单号 如果有单号，去检查单号是否重复 ,没有就创建
    let Intital = service_information.service_type
      ? service_information.service_type
      : "Domesitc_ship";
    let order_id =
      Intital[0].toUpperCase() +
      moment().format("YYYYMMDDHHMM") +
      shortid.generate();
    if (customer_order_id) {
      let check_order = Order.findOne({
        customer_order_id,
        user_id: req.session.user_info.user_id,
      });
      if (check_order)
        return responseClient(res, 200, 1, "cutomer_order_id exists");
    } else {
      customer_order_id = order_id;
    }
    //-------递交远程服务器，创建运单。 统一接口处理--------------------------
    // console.log(services)
    const MySerivceClass = ServiceClass(services.type);
    const service = new MySerivceClass(
      services.carrier.asset.account_information,
      services.carrier.asset.request_url,
      services.rate,
      services.carrier,
      services.mail_class,
      {
        _id: services._id,
        description: services.description,
        ...services.asset,
      }
    );

    // console.log(util.inspect(shipment, false, null, true /* enable colors */));
    //service_information.requestType imporve ruqest performance in Fedex service.
    let result = await service.ship(
      shipment,
      service_information.service_content[0].RateType
    );

    const handleMultiResult = async (result) => {
      // console.log(result)
      let zone = result[0].data ? result[0].data.zone : undefined;
      let total_fee = result
        .map((item) => (item.status != 201 ? 0 : item.data.price.total))
        .reduce((a, c) => a + c);
      total_fee = parseFloat(total_fee).toFixed(2);

      let weight = parseFloat(
        result.map((item) => item.data.weight).reduce((a, c) => a + c)
      ).toFixed(2);
      let parcelList = result.map((item) => {
        // console.log(item.data)
        return {
          label: item.data.label_image,
          weight: item.data.weight,
          tracking_numbers: item.data.tracking_numbers,
          postage: {
            billing_amount: item.data.price,
          },
        };
      });
      let order_status, response_status, response_message, status;
      // 判断多状态错误，还是单一状态
      let fail_order = result.filter(
        (item) => item.status != 201 && item.status != 200
      );
      const new_balance = parseFloat(balance - total_fee).toFixed(2);
      if (fail_order.length == result.length) {
        let status_array = _.uniqBy(result.map((item) => item.status));
        // console.log(status)
        let messages_array = result.map((item) => item.message);
        if (status_array.length == 1) {
          status = status_array[0];
          response_message =
            "订单失败," + "第三方服务报错： " + messages_array[0];
        } else {
          status = 207;
          response_message = "订单失败, 多状态错误，联系管理员";
        }
        order_status = "fail";
        response_status = 1;
      } else {
        let newLedgerRecord = new Ledger({
          type: "label",
          order_id,
          amount: -total_fee,
          balance: new_balance,
          user: req.session.user_info.user_object_id,
        });

        const add_ledger = await newLedgerRecord.save();
        const update_user = await User.updateOne(
          { user_id: req.session.user_info.user_id },
          { balance: new_balance }
        );
        order_status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? "completed"
            : "issue";
        status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? 201
            : 207;
        response_status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? 0
            : 1;
        response_message =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? "订单创建成功"
            : "订单产生问题，部分未成功";
      }
      let obj = {
        status,
        weight,
        zone,
        total_fee,
        fail_order,
        parcelList,
        order_status,

        response_status,
        response_message,
      };

      return obj;
    };

    const handleSingleResult = async (result) => {
      let total_fee, weight, zone, parcelList;
      let order_status, status, response_status, response_message;
      if (result.status != 200 && result.status != 201) {
        order_status = "fail";
        status = result.status;
        response_status = 1;
        response_message = "订单失败," + "第三方服务报错： " + result.message;
      } else {
        // ups data return
        total_fee = result.data.price.NegotiateTotal
          ? result.data.price.NegotiateTotal
          : result.data.price.total;
        weight = result.data.weight;
        zone = result.data.zone;
        parcelList = result.data.parcel_list;
        const new_balance = parseFloat(balance - total_fee).toFixed(2);
        let newLedgerRecord = new Ledger({
          type: "label",
          order_id,
          amount: -total_fee,
          balance: new_balance,
          user: req.session.user_info.user_object_id,
        });
        const add_ledger = await newLedgerRecord.save();
        const update_user = await User.updateOne(
          { user_id: req.session.user_info.user_id },
          { balance: new_balance }
        );
        let isOrderSuccess = update_user.n == 1 && add_ledger != undefined;
        order_status = isOrderSuccess ? "completed" : "issue";
        status = isOrderSuccess ? 201 : 400;
        response_status = isOrderSuccess ? 0 : 1;
        response_message = isOrderSuccess ? "订单创建成功" : "订单創建失敗";
      }

      let obj = {
        total_fee,
        weight,
        zone,
        parcelList,
        order_status,
        status,
        response_status,
        response_message,
        // fail_order: result.status == 200 || result.status == 201 ? [] : ["x"],
      };

      return obj;
    };

    let handleResult = Array.isArray(result)
      ? await handleMultiResult(result)
      : await handleSingleResult(result);

    // console.log(
    //   util.inspect(handleResult, false, null, true /* enable colors */)
    // );
    // 根据result 得出 total fee, order_status, response_status, response_message, status 值， result 有两种形式，多次请求返回格式，和单次请求返回格式。根据是否是数组判断
    //------余额变动，添加账簿记录------------------------------------------

    //添加记录到账簿

    //更新客户余额 添加交易记录  如果有失败订单，或者 扣款未成功 则转到问题单。

    let {
      total_fee,
      weight,
      zone,
      parcelList,
      order_status,
      status,
      response_status,
      response_message,
    } = handleResult;

    // console.log(util.inspect(result, false, null, true /* enable colors */));

    //包裹信息
    let parcel_information = {
      weight,
      parcelList,
    };
    //邮费信息
    let postage = {
      billing_amount: {
        total: total_fee,
      },
      zone,
    };
    let tempData = new Order({
      // service_class,
      customer_order_id,
      order_id,
      status: order_status,
      ...mapRequestToModel(
        sender_information,
        receipant_information,
        parcel_information
      ),

      // let serviceInfo = {
      //   carrier: mongoose.Types.ObjectId(services.carrier._id),
      //   mail_class: services.mail_class,
      //   type: services.type,
      //   asset: {
      //     logo_url: services.carrier.asset.logo_url,
      //     description: services.description,
      //     code: services._id,
      //   },
      // };
      service: {
        carrier: serviceInfo.carrier,
        carrier_type: serviceInfo.type,
        mail_class: serviceInfo.mail_class,
        asset: {
          logo_url: serviceInfo.asset.logo_url,
          description: serviceInfo.asset.description,
          code: serviceInfo.asset.code,
        },
      },
      postage,
      user: req.session.user_info.user_object_id,
    });
    let save_result = await tempData.save();
    // console.log(save_result)
    return responseClient(
      res,
      status,
      response_status,
      response_message,
      save_result
    );
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//账簿 筛选，模糊查询，分页
router.post("/get_ledgers", async (req, res) => {
  let {
    // text,
    page,
    limit,
    type,
    filter,
  } = req.body;
  try {
    //分页
    let options = _.pickBy(
      {
        page: req.body.page,
        limit: req.body.limit,
        sort: "-created_at",
      },
      _.identity
    );

    const query = _.pickBy(
      {
        // "$text":text,
        user: req.session.user_info.user_object_id,
        type,
        ...filter,
      },
      _.identity
    );

    if (req.body.limit == undefined) {
      options.pagination = false;
      options.select = "order_id -_id";
    }
    //查询范围
    let query_field = ["order_id"];

    //添加到模糊查询
    if (req.body.searching_string) {
      query["$or"] = [];
      for (let i = 0; i < query_field.length; i++) {
        let object = {};
        object[query_field[i]] = {
          $regex: req.body.searching_string,
          $options: "i",
        };
        query["$or"].push(object);
      }
    }

    // console.log(query)
    // console.log(options)

    let result = await Ledger.paginate(query, options);

    responseClient(res, 200, 0, "query data success !", result);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

// router.post("/get_label_urls", req, res) =>{});

//获取地址列表
router.post("/get_address", async (req, res) => {
  let {
    // text,
    page,
    limit,
    type,
    filter,
  } = req.body;
  try {
    //分页
    let options = _.pickBy(
      {
        page: req.body.page,
        limit: req.body.limit,
        sort: "-created_at",
      },
      _.identity
    );

    const query = _.pickBy(
      {
        // "$text":text,
        user: req.session.user_info.user_object_id,
        type,
        ...filter,
      },
      _.identity
    );

    if (req.body.limit == undefined) {
      options.pagination = false;
      // options.select = '-_id'
    }
    //查询范围
    let query_field = ["_id"];

    //添加到模糊查询
    if (req.body.searching_string) {
      query["$or"] = [];
      for (let i = 0; i < query_field.length; i++) {
        let object = {};
        object[query_field[i]] = {
          $regex: req.body.searching_string,
          $options: "i",
        };
        query["$or"].push(object);
      }
    }
    let result = await Address.paginate(query, options);
    if (type == "receipant") {
      let FBA = wb.readFBAList();
      result = { ...FBA, ...result };
    }
    responseClient(res, 200, 0, "query data success !", result);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//添加地址
router.post("/add_address", async (req, res) => {
  let {
    type,
    nickname,
    first_name,
    last_name,
    phone_number,
    company,
    address_one,
    address_two,
    city,
    zip_code,
    state,
    is_residential,
  } = req.body;

  company = company ? company : "";
  last_name = last_name ? last_name : "";

  try {
    let tempData = new Address({
      type,
      nickname,
      first_name,
      last_name,
      phone_number,
      company,
      address_one,
      address_two,
      city,
      zip_code,
      state,
      is_residential,
      user: req.session.user_info.user_object_id,
    });
    let addNewAddress = await tempData.save();
    responseClient(res, 200, 0, "query data success !", addNewAddress);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//更新地址
router.post("/update_address", async (req, res) => {
  let {
    _id,
    type,
    nickname,
    first_name,
    phone_number,
    last_name,
    company,
    address_one,
    address_two,
    city,
    state,
    zip_code,
    is_residential,
  } = req.body;

  const filter_null = _.pickBy(
    {
      _id,
      type,
      nickname,
      first_name,
      last_name,
      phone_number,
      company,
      address_one,
      address_two,
      city,
      state,
      zip_code,
      is_residential,
    },
    _.identity
  );

  filter_null.last_name =
    filter_null.last_name == undefined ? "" : filter_null.last_name;
  filter_null.company =
    filter_null.company == undefined ? "" : filter_null.company;
  filter_null.address_two =
    filter_null.address_two == undefined ? "" : filter_null.address_two;

  try {
    let updateNewAddress = await Address.updateOne(
      { _id, user: req.session.user_info.user_object_id },
      filter_null
    );
    updateNewAddress.n == 1
      ? responseClient(res, 200, 0, "update data success !")
      : responseClient(res, 404, 1, "failed to update, address did not found!");
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//删除地址
router.post("/delete_address", async (req, res) => {
  let { _id } = req.body;
  try {
    let deleteAddress = await Address.deleteOne({
      _id,
      user: req.session.user_info.user_object_id,
    });
    console.log(deleteAddress);
    deleteAddress.n == 1
      ? responseClient(res, 200, 0, "delete data success !")
      : responseClient(res, 404, 1, "failed to delete, address did not found!");
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//设置默认地址
router.put("/set_default_address", async (req, res) => {
  let { _id } = req.body;

  const filter_null = _.pickBy(
    {
      _id,
      type: "default",
    },
    _.identity
  );
  try {
    let updateCurrentAddress = await Address.updateOne(
      { type: "default", user: req.session.user_info.user_object_id },
      { type: "sender" }
    );
    let setDefaultAddress = await Address.updateOne(
      { _id, user: req.session.user_info.user_object_id },
      filter_null
    );
    setDefaultAddress.n == 1
      ? responseClient(res, 200, 0, "update data success !")
      : responseClient(res, 404, 1, "failed to update, address did not found!");
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

router.post("/address_validate", user.addressValidate);

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

router.post("/read_sheet", (req, res) => {
  try {
    let data = wb.readSheet();
    data = data.map((item) => item[" 跟踪号"].toString());
    res.status(200).json({ code: 0, message: "Success !", data });
  } catch (error) {
    res.status(500).json({ code: 1, message: "internal error" });
  }
});

module.exports = router;
