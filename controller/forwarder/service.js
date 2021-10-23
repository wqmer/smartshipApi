const Express = require("express");
const router = Express.Router();
const Forwarder = require("../../mongoDB/model/Forwarder");
const Service = require("../../mongoDB/model/Service");
const Rate = require("../../mongoDB/model/Rate");
const Order = require("../../mongoDB/model/Order");
const Carrier = require("../../mongoDB/model/Carrier");
const shortid = require("shortid");
const moment = require("moment");
const _ = require("lodash");
const config = require("../../config/dev");
const User = require("../../mongoDB/model/User");
const { responseClient, md5, MD5_SUFFIX } = require("../util");
const mongoose = require("mongoose");
const util = require("../util");

const addService = async (req, res) => {
  let { carrier, mail_class, type, description, ship_parameters } = req.body;
  ship_parameters = util.serviceMapShipPara(type, mail_class);
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      //开始事务;
      const opts = { session, new: true };
      let service = new Service({
        carrier,
        mail_class,
        description,
        ship_parameters,
        type,
        forwarder: req.session.forwarder_info.forwarder_object_id,
      });
      let result_add = await service.save();
      let result_update = await Carrier.update(
        { _id: carrier },
        { $push: { service: result_add._id } }
      );
      //结束事务;
      if (result_update.n === 1) {
        await session.commitTransaction();
        session.endSession();
        responseClient(res, 200, 0, "Add successfully!", result_add);
      } else {
        throw new Error("Failed to add!");
      }
    } catch (error) {
      //结束事务;
      await session.abortTransaction();
      session.endSession();
      responseClient(res, 400, 1, "Failed to add");
    }
  } catch (error) {
    responseClient(res, 500, 1);
  }

  //原来添加服务逻辑，参考
  //   let {
  //     asset,
  //     rate,
  //     agent,
  //     carrier,
  //     mail_class,
  //     ship_parameters,
  //     api_parameters,
  //   } = req.body;

  //   console.log(req.body);

  //   // if (!name) responseClient(res, 200, 1, '请输入渠道名字')
  //   try {
  //     if (rate) {
  //       let tempRate = new Rate({ ...rate });
  //       let result = await tempRate.save();
  //       rate = [result._id];
  //     }

  //     let tempService = new Service({
  //       // ...req.body,
  //       asset: {
  //         ...asset,
  //         code: "s" + shortid.generate(),
  //       },
  //       api_parameters,
  //       rate,
  //       carrier,
  //       agent,
  //       mail_class,
  //       ship_parameters,
  //       forwarder: req.session.forwarder_info.forwarder_object_id,
  //     });
  //     let result = await tempService.save();
  //     result
  //       ? responseClient(res, 200, 0, "添加成功", result)
  //       : responseClient(res, 401, 1, "添加失败", result);
  //   } catch (error) {
  //     console.log(error);
  //     responseClient(res);
  //   }
};

const updateService = async (req, res) => {
  const { status, _id } = req.body;
  try {
    let result = await Service.updateOne(
      {
        _id,
      },
      { status }
    );
    result.n == 1
      ? responseClient(res, 200, 0, "Update service successfully")
      : responseClient(res, 404, 1, "No service found");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
};

const getServices = (req, res) => {
  //返回所有可用渠道
  let { carrier } = req.body;
  Carrier.findOne(
    {
      _id: carrier,
      forwarder: req.session.forwarder_info.forwarder_object_id,
      // status: "activated",
      // $or: [
      //   { auth_group: { $in: req.session.user_info.user_id } },
      //   { _id: carrier },
      //   { user: req.session.user_info.user_object_id },
      //   { auth_group: { $in: req.session.user_info.user_id } },
      // ],
      // match: [],
      // select: ["-asset"],
    },
    "-asset"
  )
    .populate("service")
    .then((result) => {
      // console.log(result);
      if (result) {
        responseClient(res, 200, 0, "Get service successfully", result);
      } else {
        responseClient(res, 404, 1, "No carrier account found");
      }
    })
    .catch((error) => responseClient(res));
};

const getServicesAuthStatus = async (req, res) => {
  //返回所有可用渠道
  let { carrier } = req.body;
  try {
    //get carrier service
    let result_service = await Carrier.findOne(
      {
        _id: carrier,
        forwarder: req.session.forwarder_info.forwarder_object_id,
        // status: "activated",
        // $or: [
        //   { auth_group: { $in: req.session.user_info.user_id } },
        //   { _id: carrier },
        //   { user: req.session.user_info.user_object_id },
        //   { auth_group: { $in: req.session.user_info.user_id } },
        // ],
        // match: [],
        // select: ["-asset"],
      },
      "-asset"
    ).populate({ path: "service", select: "_id mail_class rate " });

    console.log(result_service);
    if (result_service.service.length == 0) {
      responseClient(res, 404, 1, "No service !");
      return;
    }

    // 再获取客户列表
    let {
      // text,
      page,
      limit,
      // status,
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
    options.select = "user_name user_id service";
    const query = _.pickBy(
      {
        // "$text":text,
        // forwarder: req.session.forwarder_info.forwarder_object_id,
        // status,
        ...filter,
      },
      _.identity
    );

    if (req.body.limit == undefined) {
      options.pagination = false;
      // options.select = 'order_id -_id'
    }
    //查询范围
    let query_field = ["user_id"];

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
    let result_users = await User.paginate(query, options);
    let reuslt = result_users.docs.map((item) => {
      let newItem = {};
      result_service.service.forEach((e) => {
        newItem[e.mail_class] = { status: undefined, _id: undefined };
        newItem[e.mail_class]["status"] = item.service.includes(e._id);
        newItem[e.mail_class]["_id"] = e._id;
      });
      newItem = { ...item.toObject(), ...newItem };
      delete newItem.service;
      return newItem;
    });

    // console.log(reuslt);

    // console.log(result_users);
    responseClient(res, 200, 0, "query data success !", {
      ...result_users,
      docs: reuslt,
    });
    //get user list
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

module.exports = {
  addService,
  updateService,
  getServices,
  getServicesAuthStatus,
};
