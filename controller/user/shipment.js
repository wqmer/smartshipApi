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
const ServiceClass = require("../../services/shipping_module/carrier");

const voidShipment = async (req, res) => {
  let { carrier, tracking, order } = req.body;
  try {
    let result = await Carrier.findOne({ _id: carrier });
    const MySerivceClass = ServiceClass(result.type);
    const myService = new MySerivceClass(result.asset.account_information);
    let void_result = await myService.void(tracking);
    const voidSchema = util.voidRepsonseScheme(result.type);
    //  to do validate void_result
    // console.log(void_result.data)
    const errors = voidSchema.validate(void_result.data);
    // console.log(errors);


    
    responseClient(
      res,
      errors.length == 0 ? 200 : 401,
      errors.length == 0 ? 0 : 1,
      errors.length == 0
        ? "void shipment successfully"
        : "Failed to void shipment"
    );
  } catch (error) {
    responseClient(res);
  }
};

module.exports = {
  voidShipment,
};
