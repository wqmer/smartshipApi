const Express = require("express");
const router = Express.Router();
const User = require("../../mongoDB/model/User");
const Forwarder = require("../../mongoDB/model/Forwarder");
const Service = require("../../mongoDB/model/Service");
const Rate = require("../../mongoDB/model/Rate");
const Order = require("../../mongoDB/model/Order");
const shortid = require("shortid");
const moment = require("moment");
const _ = require("lodash");
const rp = require("request-promise");
const EventEmitter = require("events");
const config = require("../../config/dev");
const chukoula = require("../../services/shipping_module/third_party_api/chukoula");
const { responseClient, md5, MD5_SUFFIX } = require("../util");

const forwarder = require("../../controller/forwarder");

const myEmitter = new EventEmitter();

//测试性临时服务 ----------------------------获取IB运单记录-----------------------------
router.get("/IB", async (req, res) => {
  let params = req.body;
  const IB_PROD_ENDPOINT = require("../../config/prod").IBProdEndpoint;
  const ACCOUNT = {
    username: "wqmer11532@gmail.com",
    password: "`198811532Ww",
  };
  const serviceClass = require("../../services/shipping_module/carrier");
  const Service = serviceClass("InternationalBridge");
  const service = new Service(ACCOUNT, IB_PROD_ENDPOINT);

  try {
    getDataNeeded = (item) => {
      let {
        request_id,
        weight,
        pricing_weight,
        total_amount,
        status,
        postmark_date,
        usps,
      } = item;
      let tracking = usps.tracking_numbers[0];
      return {
        request_id,
        weight,
        pricing_weight,
        total_amount,
        status,
        postmark_date,
        tracking_numbers: tracking,
      };
    };
    let response = await service.index(params);

    if (response.status == 200) {
      if (response.data.length > 0) {
        let myData = response.data.map((item) => getDataNeeded(item));
        responseClient(res, response.status, 0, "fetch data success !", myData);
      } else {
        responseClient(
          res,
          response.status,
          0,
          "fetch data successfully, but no data !"
        );
      }
    }
  } catch (error) {
    responseClient(res);
  }
});

//注册
router.post("/register", (req, res) => {
  let { forwarder_name, password, passwordRe } = req.body;

  if (!forwarder_name) {
    responseClient(res, 400, 2, "name required !");
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
  Forwarder.findOne({
    forwarder_name: forwarder_name,
  })
    .then((data) => {
      if (data) {
        responseClient(res, 200, 1, "Forwarder name exist !");
        return;
      }
      //保存到数据库
      let forwarder = new Forwarder({
        forwarder_name: forwarder_name,
        password: md5(password + MD5_SUFFIX),
        // type: 'Customer'
      });
      forwarder.save().then(function () {
        Forwarder.findOne({
          forwarder_name: forwarder_name,
        }).then((forwarder_info) => {
          let data = {};
          data.forwarder_name = forwarder_info.forwarder_name;
          // data.userType = userInfo.type;
          data.forwarder_id = forwarder_info.forwarder_id;
          responseClient(res, 200, 0, "注册成功", data);
          return;
        });
      });
    })
    .catch((err) => {
      responseClient(res);
      return;
    });
});

//login
router.post("/login", (req, res) => {
  let { forwarder_name, password } = req.body;

  if (!forwarder_name) {
    responseClient(res, 400, 2, "用户名不可为空");
    return;
  }
  if (!password) {
    responseClient(res, 400, 2, "密码不可为空");
    return;
  }
  Forwarder.findOne({
    forwarder_name: forwarder_name,
    password: md5(password + MD5_SUFFIX),
  })
    .then((result) => {
      if (result) {
        //登录成功
        let data = {};
        data.forwarder_name = result.forwarder_name;
        data.forwarder_id = result.forwarder_id;
        data.forwarder_object_id = result._id;
        //登录成功后设置session
        req.session.forwarder_info = data;
        responseClient(res, 200, 0, "登录成功", data);
        return;
      }
      responseClient(res, 401, 1, "用户名密码错误");
    })
    .catch((err) => {
      responseClient(res);
    });
});

//logout
router.get("/logout", (req, res) => {
  try {
    req.session.destroy();
    responseClient(res, 200, 0, "", "logout successfully");
  } catch (error) {
    responseClient(res);
  }
});

//获取session
router.get("/forwarderInfo", (req, res) =>
  responseClient(res, 200, 0, "", req.session.forwarder_info)
);

//验证中间件
router.use((req, res, next) => {
  req.session.forwarder_info
    ? next()
    : res.send(
        responseClient(res, 401, 1, "Session ended , please login again")
      );
});

//获取所有carrier账号
router.post("/get_carriers", forwarder.getCarriers);

//获取一个carrier账号
router.post("/get_carrier", forwarder.getCarrier);

//添加carrier账号
router.post("/add_carrier", forwarder.addCarrier);

//更新一个账号
router.put("/update_carrier", forwarder.updateCarrier);

//更新一个账号状态
router.put("/update_carrier_status", forwarder.upsateCarrierStatus);

//删除一个账号
router.post("/delete_carrier", forwarder.deleteCarrier);

//添加服务
router.post("/add_service", forwarder.addService);

//获取一个账号下服务
router.post("/get_service", forwarder.getServices);

//更新一个服务
router.put("/update_service", forwarder.updateService);





//为一个服务添加报价
router.post("/add_rate", async (req, res) => {});

//更新一个服务的报价

//获取所有服务

//获取所有客户
router.post("/get_users", async (req, res) => {
  // try {
  //     console.log(req.body)
  //     const data = await User.find()
  //     responseClient(res, 200, 0, 'Fetch user success!', data)
  // } catch (error) {
  //     console.log(error)
  //     responseClient(res);
  // }

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
    },
    _.identity
  );

  const query = _.pickBy(
    {
      // "$text":text,
      // forwarder: req.session.forwarder_info.forwarder_object_id,
      status,
      ...filter,
    },
    _.identity
  );

  if (req.body.limit == undefined) {
    options.pagination = false;
    // options.select = 'order_id -_id'
  }
  //查询范围
  let query_field = [
    "user_id",
    // "customer_order_id",
    // "recipient.recipient_name",
    // "recipient.add1",
    // "recipient.add2",
    // "recipient.state",
    // "recipient.city"
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

  User.paginate(query, options)
    .then(function (result) {
      // console.log(result)
      responseClient(res, 200, 0, "query data success !", result);
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
});

//获取所有ticket
router.post("/get_tickets", forwarder.getTickets);

//获取单个ticket 详情
router.post("/get_ticket", forwarder.getTicket);

//添加单个ticket 详情
router.post("/add_ticket", forwarder.addTicket);

//更新单个ticket 详情
router.put("/update_ticket", forwarder.updateTicket);

//更新用户信息，余额，状态等
router.post("/update_user", async (req, res) => {
  let { user_id, balance, status, service, type } = req.body;

  const query = _.pickBy(
    {
      // "$text":text,
      balance,
      status,
      service,
      type,
    },
    _.identity
  );

  //update action
  const result = await User.updateOne(
    {
      user_id,
      forwarder: req.session.forwarder_info.forwarder_object_id,
    },
    query
  );

  try {
    result.n == 1
      ? responseClient(res, 200, 0, "修改成功")
      : responseClient(res, 200, 1, "修改失败");
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//获取所有订单
router.post("/get_orders", async (req, res) => {
  let {
    // text,
    page,
    limit,
    status,
    filter,
  } = req.body;

  //设置 pignate的option ，此处popluate user
  let options = _.pickBy(
    {
      populate: { path: "user", select: ["user_name", "user_id"] },
      page: req.body.page,
      limit: req.body.limit,
    },
    _.identity
  );

  //设置 pignate 的query ，此处先过滤空数据
  const query = _.pickBy(
    {
      // "$text":text,
      // forwarder: req.session.forwarder_info.forwarder_object_id,
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

  try {
    let result = await Order.paginate(query, options);
    responseClient(res, 200, 0, "query data success !", result);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
});

//监听一个事件
router.get("/event", async (req, res) => {
  res.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Tell the client to retry every 10 seconds if connectivity is lost
  res.write("retry: 10000\n\n");
  let count = 0;
  let con = true;

  let result = await Order.countDocuments({ status: "processing" });
  res.write(`data: ${JSON.stringify({ processingOrder: result })}\n\n`);

  let interValID = setInterval(async () => {
    count++;
    let result = await Order.countDocuments({ status: "processing" });
    res.write(`data: ${JSON.stringify({ processingOrder: result })}\n\n`); // res.write() instead of res.send()
  }, 5000);

  // myEmitter.removeListener('event', runner);
  req.on("close", () => {
    console.log("client dropped me");
    clearInterval(interValID);
    // myEmitter.removeListener('event', runner);
    // res.end();
  });
});

module.exports = router;
