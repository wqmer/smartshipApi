const Express = require("express");
const router = Express.Router();
const Forwarder = require("../../mongoDB/model/Forwarder");
const Service = require("../../mongoDB/model/Service");
const Rate = require("../../mongoDB/model/Rate");
const Order = require("../../mongoDB/model/Order");
const Carrier = require("../../mongoDB/model/Carrier");
const shortid = require("shortid");
const moment = require("moment");

const mongoose = require("mongoose");
const util = require("../util");
const _ = require("lodash");
const config = require("../../config/dev");
const { responseClient, md5, MD5_SUFFIX } = require("../util");

const getCarriers = async (req, res) => {
  let {
    // text,
    page,
    limit,
    filter,
  } = req.body;

  try {
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
        // user: req.session.user_info.user_object_id,
        //   user: req.session.user_info.user_object_id,
        ...filter,
      },
      _.identity
    );
    options.select = "-asset.account_information";
    options.sort = "agent type";
    if (req.body.limit == undefined) {
      options.pagination = false;
    }
    //查询范围
    let query_field = [
      "user",
      // "customer_order_id",
      // "recipient.recipient_name",
      // "recipient.add1",
      // "recipient.add2",
      // "recipient.state",
      // "recipient.city"
    ];

    //添加到模糊查询
    // if (req.body.searching_string) {
    //   query["$or"] = [];
    //   for (let i = 0; i < query_field.length; i++) {
    //     let object = {};
    //     object[query_field[i]] = {
    //       $regex: req.body.searching_string,
    //       $options: "i",
    //     };
    //     query["$or"].push(object);
    //   }
    // }
    // query["$or"] = [];

    // console.log(options)
    // 找到 授权使用的的service ，拿出对应的carrier
    let resultOfF = await Service.find(
      {
        auth_group: { $in: req.session.user_info.user_object_id },
        status: "activated",
      },
      "-ship_parameters -rate -auth_group -activated_group -status -_id -mail_class -description -forwarder"
    ).populate({
      path: "carrier",
      select: "-asset.account_information",
    });
    // console.log(resultOfF);
    let ss_carrier = _.uniqBy(
      resultOfF.map((e) => e.carrier._id),
      "_id"
    );

    console.log(ss_carrier);

    query["$or"] = [
      { user: req.session.user_info.user_object_id },
      { _id: ss_carrier, status: "activated" },
    ];
    console.log(query);
    let resultOfU = await Carrier.paginate(query, options);
    // console.log(result)
    responseClient(res, 200, 0, "query data success !", resultOfU);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

const getCarrier = async (req, res) => {
  let { _id } = req.body;

  try {
    let result = await Carrier.findOne({
      _id,
      user: req.session.user_info.user_object_id,
      // match: [{ status: "activated" }],
      // select: ['-rate'],
    });
    if (result) {
      responseClient(res, 200, 0, "Get carrier success !", result);
    } else {
      responseClient(res, 404, 1, "No carrier account found!");
    }
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

const addCarrier = async (req, res) => {
  let { type, asset } = req.body;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const opts = { session, new: true };
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
      let resultOfCarrier = await carrier.save(opts);
      let newServices = util.serviceList(type).map((item) => {
        return {
          carrier: resultOfCarrier._id,
          ship_parameters: util.serviceMapShipPara(type, item.mail_class),
          ...item,
          type,
          user: req.session.user_info.user_object_id,
        };
      });

      let resultOfServices = await Service.insertMany(newServices, opts);
      // console.log(resultOfServices);
      let result_update = await Carrier.updateMany(
        { _id: resultOfCarrier._id },
        { service: resultOfServices.map((item) => item._id) },
        opts
      );
      //结束事务;
      if (result_update.n === 1) {
        await session.commitTransaction();
        session.endSession();
        responseClient(res, 200, 0, "Add carrier account successfully");
      } else {
        throw new Error("Failed to add!");
      }
    } catch (error) {
      console.log(error)
      await session.abortTransaction();
      session.endSession();
      responseClient(res, 400, 1, "Failed to add");
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    responseClient(res);
    console.log(error);
  }
};

const updateCarrier = async (req, res) => {
  let { _id, asset, status } = req.body;

  // let options = _.pickBy(
  //   {
  //     asset,
  //     status,
  //   },
  //   _.identity
  // );

  try {
    let result = await Carrier.updateOne(
      {
        _id,
        user: req.session.user_info.user_object_id,
      },
      {
        $set: {
          "asset.nick_name": asset.nick_name,
          "asset.account_information": asset.account_information,
        },
      }
    );

    // console.log(result)
    result.n == 1
      ? responseClient(res, 200, 0, "Update carrier account successfully")
      : responseClient(res, 404, 1, "No carrier account found");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
};

const deleteCarrier = async (req, res) => {
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
};

const enableCarrier = async (req, res) => {
  let { _id, status, agent } = req.body;
  try {
    let result;
    if (agent == "Smartship") {
      result = await Carrier.updateOne(
        {
          _id,
        },
        status == "activated"
          ? { $push: { activated_group: req.session.user_info.user_object_id } }
          : { $pull: { activated_group: req.session.user_info.user_object_id } }
      );
    } else {
      result = await Carrier.updateOne(
        {
          _id,
          user: req.session.user_info.user_object_id,
        },
        { status }
      );
    }

    // console.log(result)
    result.n == 1
      ? responseClient(res, 200, 0, "Update carrier account successfully")
      : responseClient(res, 404, 1, "No carrier account found");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
};

module.exports = {
  getCarriers,
  getCarrier,
  addCarrier,
  updateCarrier,
  deleteCarrier,
  enableCarrier,
};
