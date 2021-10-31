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
        user: req.session.user_info.user_object_id,
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
};

const updateService = async (req, res) => {
  const { status, _id } = req.body;
  try {
    let result;

    result = await Service.updateOne(
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

const enableService = async (req, res) => {
  const { action, _id } = req.body;
  try {
    let switchAction =
      action == "enable"
        ? { $push: { activated_group: req.session.user_info.user_object_id } }
        : { $pull: { activated_group: req.session.user_info.user_object_id } };
    let result;
    result = await Service.updateOne(
      {
        _id,
      },
      { ...switchAction }
    );
    result.n == 1
      ? responseClient(res, 200, 0, "Update service successfully")
      : responseClient(res, 401, 1, "Fail to update");
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
};

const getServices = (req, res) => {
  //返回所有可用渠道
  let { carrier, agent } = req.body;
  Carrier.findOne(
    {
      _id: carrier,
      // user: req.session.user_info.user_object_id,
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
    .populate({
      path: "service",
      match:
        agent == "Smartship"
          ? { auth_group: { $in: req.session.user_info.user_object_id } }
          : undefined,
      // match: { auth_group: { $in: req.session.user_info.user_object_id } },
    })
    .then((result) => {
      // console.log(result);
      responseClient(res, 200, 0, "Get service successfully", result);
    })
    .catch((error) => {
      console.log(error);
      responseClient(res);
    });
};

module.exports = {
  enableService,
  addService,
  updateService,
  getServices,
};
