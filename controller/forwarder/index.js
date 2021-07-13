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

//管理ticket

getTickets = async (req, res) => {
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
      populate: { path: "user", select: ["user_name", "user_id"] },
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
    "ticket_id",
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
    let result = await Ticket.paginate(query, options);
    responseClient(res, 200, 0, "query data success !", result);
  } catch {
    responseClient(res);
  }
};

getTicket = async (req, res) => {
  let { _id } = req.body;

  try {
    let result = await Ticket.find({
      _id,

      // match: [{ status: "activated" }],
      // select: ['-rate'],
    })
      .populate({
        path: "user",
        select:['user_name','user_id'],
        // match: [{ status: "activated" }],
        // perDocumentLimit: 10,
      })
      .populate({
        path: "messages",
        // match: [{ status: "activated" }],
        // perDocumentLimit: 10,
      });
    responseClient(res, 200, 0, "Get ticket success !", result);
  } catch (error) {
    responseClient(res);
  }
};

addTicket = async (req, res) => {
  let { supporter, user, type, message, reference } = req.body;
  let new_message = new Message({ supporter, body: message });
  try {
    let result_add_message = await new_message.save();
    let ticket = new Ticket({
      ticket_id: "T" + moment().format("YYYYMMDDHHMM") + shortid.generate(),
      user,
      type,
      messages: [result_add_message._id],
      reference,
      // type: 'Customer'
    });
    let result = await ticket.save();
    responseClient(res, 200, 0, "create ticket success !", result);
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

updateTicket = async (req, res) => {
  let { _id, message, supporter, status } = req.body;
  let new_message = new Message({ supporter, body: message });
  try {
    let result_add_new_message = await new_message.save();
    let result = await Ticket.updateOne(
      {
        _id,
      },
      { status, $push: { messages: result_add_new_message._id } }
    );

    if (result.n == 1) {
      responseClient(res, 200, 0, "update ticket success !");
    } else {
      responseClient(res, 405, 1, "No Record found or update");
    }
  } catch (error) {
    responseClient(res);
  }
};

deleteTicket = async (req, res) => {
  let { _id } = req.body;
};

module.exports = {
  getTickets,
  getTicket,
  addTicket,
  updateTicket,
  deleteTicket,
};
