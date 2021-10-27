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
const mongoose = require("mongoose");
const util = require("../util");

const { responseClient, md5, MD5_SUFFIX } = require("../util");

const getCarriers = async (req, res) => {
  let {
    // text,
    page,
    limit,
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
      forwarder: req.session.forwarder_info.forwarder_object_id,
      // user: req.session.user_info.user_object_id,
      ...filter,
    },
    _.identity
  );
  options.select = "-asset.account_information";
  if (req.body.limit == undefined) {
    options.pagination = false;
  }
  //查询范围
  let query_field = [
    "forwarder",
    // "user",
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

  // console.log(query)
  // console.log(options)

  Carrier.paginate(query, options)
    .then(function (result) {
      // console.log(result)
      responseClient(res, 200, 0, "query data success !", result.docs);
    })
    .catch((err) => {
      console.log(err);
      responseClient(res);
    });
};

const getCarrier = async (req, res) => {
  let { _id } = req.body;

  try {
    let result = await Carrier.findOne({
      _id,
      forwarder: req.session.forwarder_info.forwarder_object_id,
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
        agent: "Smartship",
        forwarder: req.session.forwarder_info.forwarder_object_id,
      });
      let resultOfCarrier = await carrier.save(opts);
      let newServices = util.serviceList(type).map((item) => {
        return {
          carrier: resultOfCarrier._id,
          ship_parameters: util.serviceMapShipPara(type, item.mail_class),
          ...item,
          type: item.type,
          forwarder: req.session.forwarder_info.forwarder_object_id,
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
  let { _id, asset } = req.body;

  let current_nick_name;

  // let options = _.pickBy(
  //   {
  //     asset,
  //     status,
  //   },
  //   _.identity
  // );

  try {
    let carrier = {
      asset: {
        ...asset,
        nick_name: asset.nick_name || type,
      },
    };

    let result = await Carrier.updateOne(
      {
        _id,
        forwarder: req.session.forwarder_info.forwarder_object_id,
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

const upsateCarrierStatus = async (req, res) => {
  let { _id, status } = req.body;
  try {
    let result = await Carrier.updateOne(
      {
        _id,
        forwarder: req.session.forwarder_info.forwarder_object_id,
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
};

const deleteCarrier = async (req, res) => {
  let { _id } = req.body;
  try {
    let result = await Carrier.deleteOne({
      _id,
      forwarder: req.session.forwarder_info.forwarder_object_id,
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

module.exports = {
  getCarriers,
  getCarrier,
  addCarrier,
  updateCarrier,
  upsateCarrierStatus,
  deleteCarrier,
};
