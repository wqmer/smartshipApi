const Express = require("express");
const router = Express.Router();
const User = require("../../mongoDB/model/User");
const Forwarder = require("../../mongoDB/model/Forwarder");
const Service = require("../../mongoDB/model/Service");
const Rate = require("../../mongoDB/model/Rate");
const Order = require("../../mongoDB/model/Order");
const Message = require("../../mongoDB/model/Message");
const Ticket = require("../../mongoDB/model/Ticket");
const shortid = require("shortid");
const moment = require("moment");
const _ = require("lodash");
const rp = require("request-promise");
const EventEmitter = require("events");
const chukoula = require("../../services/shipping_module/third_party_api/chukoula");
const { responseClient, md5, MD5_SUFFIX } = require("../util");

//管理user

getUsers = async (req, res) => {
  try {
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

    // console.log(query);
    // console.log(options)

    let result = await User.paginate(query, options);
    responseClient(res, 200, 0, "query data success !", result);
  } catch (error) {
    responseClient(res);
  }
};

module.exports = {
  getUsers,
};
