const _ = require("lodash");
const moment = require("moment");
require("dotenv").config();
const Order = require("../../mongoDB/model/Order");
const Ib =
  require("../../services/shipping_module/carrier/InternationalBridge").InternationalBridge;
const { responseClient, md5, MD5_SUFFIX } = require("../util");

const { IBProdEndpoint, IBUsername, IBPassword } = process.env;

const addressValidate = async (req, res) => {
  try {
    let account = {
      username: IBUsername,
      password: IBPassword,
    };
    let ib = new Ib({ ...account }, IBProdEndpoint);
    let result = await ib.validateAddress(req.body);
    responseClient(
      res,
      result.status,
      result.status == 200 ? 0 : 1,
      result.status == 200 ? "success" : "fail",
      result.data
    );
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

const getById = (req, res) => {
  let tracking = req.params.tracking;
  console.log(tracking);
  Order.findOne({
    "parcel.parcelList": { $elemMatch: { tracking_numbers: tracking } },
    // user: req.session.user_info.user_object_id,
  })
    .then((data) => {
      // console.log(data);
      if (!data) {
        responseClient(res, 404, 1, "Order does not exist!");
      } else {
        responseClient(res, 200, 0, "Fetch order success!", data);
      }
    })
    .catch((err) => {
      responseClient(res);
    });
};

const getLabelUrls = async (req, res) => {
  try {
    let { orders_id } = req.body;
    // let result = await Order.find({ order_id: { $in: orders_id } }).select('parcel.parcelList.label').;
    let result = await Order.aggregate([
      {
        $match: { order_id: { $in: orders_id } },
      },
      {
        $project: {
          urls: "$parcel.parcelList.label",
          _id: 0,
        },
      },
    ]);
    if (result.length == req.body.orders_id.length) {
      responseClient(res, 200, 0, "Fetch order success!", result);
    } else {
      responseClient(res, 422, 1, "One ore more record does not exist!");
    }
  } catch (error) {
    responseClient(res);
  }
};





module.exports = {
  addressValidate,
  getById,
  getLabelUrls,
};
