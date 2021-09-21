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

getCarriers = async (req, res) => {
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
      //   user: req.session.user_info.user_object_id,
      ...filter,
    },
    _.identity
  );

  if (req.body.limit == undefined) {
    options.pagination = false;
    options.select = "-asset.account_information";
  }
  //查询范围
  let query_field = [
    "forwarder",
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

getCarrier = async (req, res) => {
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

addCarrier = async (req, res) => {
  let { type, asset } = req.body;
  try {
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
    let result = await carrier.save();
    // console.log(result)
    responseClient(res, 200, 0, "Add carrier account successfully", result);
  } catch (error) {
    responseClient(res);
    console.log(error);
  }
};

updateCarrier = async (req, res) => {
  let { _id, asset, status } = req.body;

  let options = _.pickBy(
    {
      asset,
      status,
    },
    _.identity
  );

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
      options
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

deleteCarrier = async (req, res) => {
  let { _id } = req.body;
  Carrier.deleteOne({
    _id,
    forwarder: req.session.forwarder_info.forwarder_object_id,
  })
    .then((result) => {
      if (result.n === 1) {
        responseClient(res, 200, 0, "delete successfully!");
      } else {
        responseClient(res, 404, 1, "Carrier account does not exist!");
      }
    })
    .catch((err) => {
      responseClient(res);
    });
};

module.exports = {
  getCarriers,
  getCarrier,
  addCarrier,
  updateCarrier,
  deleteCarrier,
};
