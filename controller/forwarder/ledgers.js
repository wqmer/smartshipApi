const Express = require("express");
const router = Express.Router();
const User = require("../../mongoDB/model/User");
const Forwarder = require("../../mongoDB/model/Forwarder");
const Ledger = require("../../mongoDB/model/Ledger");
const shortid = require("shortid");
const moment = require("moment");
const _ = require("lodash");
const rp = require("request-promise");
const EventEmitter = require("events");
const chukoula = require("../../services/shipping_module/third_party_api/chukoula");
const { responseClient, md5, MD5_SUFFIX } = require("../util");

//管理ledgers

const getLedgers = async (req, res) => {
  let {
    // text,
    page,
    limit,
    type,
    filter,
  } = req.body;

  //分页
  let options = _.pickBy(
    {
      populate: { path: "user", select: ["user_name", "user_id"] },
      page: req.body.page,
      limit: req.body.limit,
      sort: "-created_at",
    },
    _.identity
  );

  const query = _.pickBy(
    {
      // "$text":text,
      // forwarder: req.session.forwarder_info.forwarder_object_id,
      type,
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
    "order_id",
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
  try {
    let result = await Ledger.paginate(query, options);
    responseClient(res, 200, 0, "query data success !", result);
  } catch {
    responseClient(res);
  }
};

const getLedger = async (req, res) => {
  let { _id } = req.body;

  try {
    let result = await Ledger.findOne({
      _id,

      // match: [{ status: "activated" }],
      // select: ['-rate'],
    }).populate({
      path: "user",
      select: ["user_name", "user_id"],
      // match: [{ status: "activated" }],
      // perDocumentLimit: 10,
    });
    if (result) {
      responseClient(res, 200, 0, "Get ledger successfully !", result);
    } else {
      responseClient(res, 404, 1, "No record found");
    }
  } catch (error) {
    responseClient(res);
  }
};

const addLedger = async (req, res) => {
  let { user, type, amount } = req.body;
  try {
    const query = await User.findOne({
      _id: user,
    });
    let balance = query.balance;

    let ledger = new Ledger({
      order_id: "L" + moment().format("YYYYMMDDHHMM") + shortid.generate(),
      forwarder: req.session.forwarder_info.forwarder_object_id,
      user,
      balance: balance + amount,
      type,
      amount,
    });
    const update_user = await User.updateOne(
      { _id: user },
      { balance: balance + amount }
    );
    let result = await ledger.save();
    if (result) {
      responseClient(res, 200, 0, "add ledger successfully !", result);
    } else {
      responseClient(res, 400, 1);
    }
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

module.exports = {
  getLedgers,
  getLedger,
  addLedger,
};
