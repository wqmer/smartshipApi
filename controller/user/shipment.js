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
const CarrierClass = require("../../services/shipping_module/carrier/model.js");
const User = require("../../mongoDB/model/User");
const Ledger = require("../../mongoDB/model/Ledger");
// const {
//   mapRequestToModel,
//   responseClient,
//   md5,
//   MD5_SUFFIX,
// } = require("../util");

const getRate = async (req, res) => {
  try {
    //find all carrier account avaialbe
    let shipment = req.body;
    let is_res = shipment.receipant_information.receipant_is_residential;
    let resultOfF = await Service.find(
      {
        auth_group: { $in: req.session.user_info.user_object_id },
        activated_group: { $in: req.session.user_info.user_object_id },
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
    let service_avaialbe = await Carrier.find({
      $or: [
        // { _id: carrier },
        { user: req.session.user_info.user_object_id, status: "activated" },
        {
          _id: ss_carrier,
          activated_group: { $in: req.session.user_info.user_object_id },
        },
      ],
      // match: [{ status: "activated" }],
      // select: ['-rate'],
    }).populate({
      path: "service",
      match: {
        $or: [
          { status: "activated", user: req.session.user_info.user_object_id },
          { activated_group: { $in: req.session.user_info.user_object_id } },
        ],
      },
      perDocumentLimit: 10,
      populate: {
        path: "rate",
        perDocumentLimit: 50,
        match: {
          $or: [
            { user_id: req.session.user_info.user_object_id },
            { auth_group: { $in: req.session.user_info.user_object_id } },
          ],
        },
      },
    });
    console.log(service_avaialbe);
    if (
      service_avaialbe.length == 0 ||
      service_avaialbe
        .map((item) => item.service)
        .every((item) => item.length == 0)
    ) {
      responseClient(res, 404, 1, "no service avaiable");
    } else {
      // responseClient(res, 200, 0, "test here", service_avaialbe);
    }
    // let service_avaiable = service_avaialbe.map((item) => item.service);
    // if (service_avaiable.every((item) => item.length == 0))responseClient(res, 404, 1, "no service avaiable");

    //用重量过滤服务，如果多件货物，只要单个货物，不在服务重量范围，即不可用
    // console.log(shipment)
    const parecels_weight = shipment.parcel_information.parcel_list.map(
      (item) => parseFloat(item.pack_info.weight)
    );

    let serviceAfterFlat = service_avaialbe
      .map(({ service, asset, agent, user, auth_group }) => {
        return service.map(
          ({
            ship_parameters,
            rate,
            status,
            _id,
            carrier,
            mail_class,
            description,
            type,
          }) => {
            return {
              asset,
              user,
              auth_group,
              agent,
              ship_parameters,
              rate,
              status,
              _id,
              carrier,
              mail_class,
              description,
              type,
            };
          }
        );
      })
      .flat(2);

    // // console.log(shipment)
    // // console.log( Number(parseFloat( 1 * convert_value_weight).toFixed(2)))

    const is_invalid = function (
      weight_array,
      service_min_weight,
      service_max_weight,
      unit_weight,
      unit_weight_accepted,
      is_res_only,
      is_bus_only
    ) {
      if (!service_min_weight) service_min_weight = 0;
      let carrierClass = new CarrierClass();
      let convert_value_weight = carrierClass.getConvertFactor(
        unit_weight,
        unit_weight_accepted
      );

      let is_every_pack_in_range = weight_array.every(
        (element) =>
          //element > service_min_weight && element < service_max_weight
          Number(
            parseFloat(element * convert_value_weight).toFixed(2) >
              service_min_weight
          ) &&
          (!service_max_weight ||
            Number(parseFloat(element * convert_value_weight).toFixed(2)) <
              service_max_weight) // True , if service was not set a Max_weight or parcel's weight smaller than Max_weight
      );

      let address_type_vaild = true;

      if (is_res === true) {
        address_type_vaild =
          is_res_only === undefined ||
          is_res_only === true ||
          (is_bus_only === undefined && is_res_only === undefined) ||
          (is_bus_only === false && is_res_only === false);
      }

      if (is_res === false) {
        address_type_vaild =
          is_bus_only === undefined ||
          is_bus_only === true ||
          (is_bus_only === undefined && is_res_only === undefined) ||
          (is_bus_only === false && is_res_only === false);
      }

      // let is_bus_invalid = is_res !== true && is_bus_only !== false;

      return is_every_pack_in_range && address_type_vaild;
    };

    // console.log(serviceAfterFlat);
    let serviceAvail = serviceAfterFlat.filter((item) =>
      is_invalid(
        parecels_weight,
        item.ship_parameters.weight_min,
        item.ship_parameters.weight_max,
        shipment.parcel_information.unit_weight,
        "lb",
        item.ship_parameters.is_res_only,
        item.ship_parameters.is_bus_only
      )
    );

    let status = 200;
    let status_code = 0;
    let response;

    if (serviceAvail.length > 0) {
      let promises = serviceAvail.map(async (item) => {
        const Service = ServiceClass(item.type);
        const service = new Service(
          item.asset.account_information,
          item.asset.request_url,
          item.rate,
          item.type,
          item.mail_class,
          { _id: item._id, description: item.description, ...item.asset },
          item.agent
        );
        let result = await service.rate(shipment);
        return result;
      });
      response = await Promise.all(promises);

      responseClient(res, status, status_code, "rate successfully", response);
    } else {
      responseClient(res, status, status_code, "no service avaiable");
      // return;
    }
  } catch (error) {
    console.log(error);
    // responseClient(res, 400, 1, "no service avaiable");
    responseClient(res);
  }
};

const createShipment = async (req, res) => {
  let {
    sender_information,
    receipant_information,
    customer_order_id,
    service_information,
    billing_information,
  } = req.body;
  // console.log(req.body)
  let shipment = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const opts = { session, new: true };
    //-------检查客户账户状态----------------------------------------------
    //检查余额，小于0 返回res ，如果有预估价格，需要比对
    const query = await User.findOne(
      {
        user_id: req.session.user_info.user_id,
      },
      null,
      opts
    );
    let balance = query.balance;
    if (balance <= 0) {
      await session.abortTransaction();
      session.endSession();
      return responseClient(res, 400, 1, "You have not enough credit");
    }
    if (billing_information) {
      if (balance < billing_information.total) {
        await session.abortTransaction();
        session.endSession();
        return responseClient(res, 400, 1, "You have not enough credit");
      }
    }

    //检查是否有对应渠道，没有返回res
    const rquest_service_code = service_information.service_content[0].code;
    const services = await Service.findOne(
      {
        _id: rquest_service_code,
        $or: [
          { status: "activated", user: req.session.user_info.user_object_id },
          {
            auth_group: { $in: req.session.user_info.user_object_id },
            activated_group: { $in: req.session.user_info.user_object_id },
          },
        ],
      },
      null,
      opts
    ).populate({
      path: "carrier",
      // status: "activated",
      match: {
        $or: [
          { activated_group: { $in: req.session.user_info.user_object_id } },
          { status: "activated", user: req.session.user_info.user_object_id },
        ],
      },
      perDocumentLimit: 10,
    });
    if (!services || !services.carrier)
      return responseClient(
        res,
        200,
        1,
        "Ship method is not avaiable for this account"
      );
    // console.log(services);
    //get service info
    // console.log(services);
    let serviceInfo = {
      _id: mongoose.Types.ObjectId(services._id),
      carrier: mongoose.Types.ObjectId(services.carrier._id),
      mail_class: services.mail_class,
      type: services.type,
      asset: {
        logo_url: services.carrier.asset.logo_url,
        description: services.description,
        code: services._id,
      },
    };

    //检查客户订单号 如果有单号，去检查单号是否重复 ,没有就创建
    let Intital = service_information.service_type
      ? service_information.service_type
      : "Domesitc_ship";
    let order_id =
      Intital[0].toUpperCase() +
      moment().format("YYYYMMDDHHMM") +
      shortid.generate();
    if (customer_order_id) {
      let check_order = Order.findOne(
        {
          customer_order_id,
          user_id: req.session.user_info.user_id,
        },
        null,
        opts
      );
      if (check_order) {
        await session.abortTransaction();
        session.endSession();
        return responseClient(res, 200, 1, "cutomer_order_id exists");
      }
    } else {
      customer_order_id = order_id;
    }
    //-------递交远程服务器，创建运单。 统一接口处理--------------------------
    // console.log(services)
    const MySerivceClass = ServiceClass(services.type);
    const service = new MySerivceClass(
      services.carrier.asset.account_information,
      services.carrier.asset.request_url,
      services.rate,
      services.carrier,
      services.mail_class,
      {
        _id: services._id,
        description: services.description,
        ...services.asset,
      }
    );

    // console.log(util.inspect(shipment, false, null, true /* enable colors */));
    //service_information.requestType imporve ruqest performance in Fedex service.
    let result = await service.ship(
      shipment,
      service_information.service_content[0].RateType
    );

    const handleMultiResult = async (result) => {
      // console.log(result)
      let zone = result[0].data ? result[0].data.zone : undefined;
      let total_fee = result
        .map((item) => (item.status != 201 ? 0 : item.data.price.total))
        .reduce((a, c) => a + c);
      total_fee = parseFloat(total_fee).toFixed(2);

      let weight = parseFloat(
        result.map((item) => item.data.weight).reduce((a, c) => a + c)
      ).toFixed(2);
      let parcelList = result.map((item) => {
        // console.log(item.data)
        return {
          label: item.data.label_image,
          weight: item.data.weight,
          tracking_numbers: item.data.tracking_numbers,
          postage: {
            billing_amount: item.data.price,
          },
        };
      });
      let order_status, response_status, response_message, status;
      // 判断多状态错误，还是单一状态
      let fail_order = result.filter(
        (item) => item.status != 201 && item.status != 200
      );
      const new_balance = parseFloat(balance - total_fee).toFixed(2);
      if (fail_order.length == result.length) {
        let status_array = _.uniqBy(result.map((item) => item.status));
        // console.log(status)
        let messages_array = result.map((item) => item.message);
        if (status_array.length == 1) {
          status = status_array[0];
          response_message =
            "订单失败," + "第三方服务报错： " + messages_array[0];
        } else {
          status = 207;
          response_message = "订单失败, 多状态错误，联系管理员";
        }
        order_status = "fail";
        response_status = 1;
      } else {
        let newLedgerRecord = new Ledger({
          type: "label",
          order_id,
          amount: -total_fee,
          balance: new_balance,
          user: req.session.user_info.user_object_id,
        });

        const add_ledger = await newLedgerRecord.save(opts);
        const update_user = await User.updateOne(
          { user_id: req.session.user_info.user_id },
          { balance: new_balance },
          opts
        );
        order_status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? "completed"
            : "issue";
        status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? 201
            : 207;
        response_status =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? 0
            : 1;
        response_message =
          fail_order.length == 0 &&
          update_user.n == 1 &&
          add_ledger != undefined
            ? "订单创建成功"
            : "订单产生问题，部分未成功";
      }
      let obj = {
        status,
        weight,
        zone,
        total_fee,
        fail_order,
        parcelList,
        order_status,

        response_status,
        response_message,
      };

      return obj;
    };

    const handleSingleResult = async (result) => {
      let total_fee, weight, zone, parcelList;
      let order_status, status, response_status, response_message;
      if (result.status != 200 && result.status != 201) {
        order_status = "fail";
        status = result.status;
        response_status = 1;
        response_message = "订单失败," + "第三方服务报错： " + result.message;
      } else {
        // ups data return
        total_fee = result.data.price.NegotiateTotal
          ? result.data.price.NegotiateTotal
          : result.data.price.total;
        weight = result.data.weight;
        zone = result.data.zone;
        parcelList = result.data.parcel_list;
        const new_balance = parseFloat(balance - total_fee).toFixed(2);
        let newLedgerRecord = new Ledger({
          type: "label",
          order_id,
          amount: -total_fee,
          balance: new_balance,
          user: req.session.user_info.user_object_id,
        });
        const add_ledger = await newLedgerRecord.save(opts);
        const update_user = await User.updateOne(
          { user_id: req.session.user_info.user_id },
          { balance: new_balance },
          opts
        );
        let isOrderSuccess = update_user.n == 1 && add_ledger != undefined;
        order_status = isOrderSuccess ? "completed" : "issue";
        status = isOrderSuccess ? 201 : 400;
        response_status = isOrderSuccess ? 0 : 1;
        response_message = isOrderSuccess ? "订单创建成功" : "订单創建失敗";
      }

      let obj = {
        total_fee,
        weight,
        zone,
        parcelList,
        order_status,
        status,
        response_status,
        response_message,
        // fail_order: result.status == 200 || result.status == 201 ? [] : ["x"],
      };

      return obj;
    };

    let handleResult = Array.isArray(result)
      ? await handleMultiResult(result)
      : await handleSingleResult(result);

    // console.log(
    //   util.inspect(handleResult, false, null, true /* enable colors */)
    // );
    // 根据result 得出 total fee, order_status, response_status, response_message, status 值， result 有两种形式，多次请求返回格式，和单次请求返回格式。根据是否是数组判断
    //------余额变动，添加账簿记录------------------------------------------

    //添加记录到账簿

    //更新客户余额 添加交易记录  如果有失败订单，或者 扣款未成功 则转到问题单。

    let {
      total_fee,
      weight,
      zone,
      parcelList,
      order_status,
      status,
      response_status,
      response_message,
    } = handleResult;

    // console.log(util.inspect(result, false, null, true /* enable colors */));

    //包裹信息
    let parcel_information = {
      weight,
      parcelList,
    };
    //邮费信息
    let postage = {
      billing_amount: {
        total: total_fee,
      },
      zone,
    };
    let tempData = new Order({
      // service_class,
      customer_order_id,
      order_id,
      status: order_status,
      ...util.mapRequestToModel(
        sender_information,
        receipant_information,
        parcel_information
      ),

      // let serviceInfo = {
      //   carrier: mongoose.Types.ObjectId(services.carrier._id),
      //   mail_class: services.mail_class,
      //   type: services.type,
      //   asset: {
      //     logo_url: services.carrier.asset.logo_url,
      //     description: services.description,
      //     code: services._id,
      //   },
      // };
      service: {
        _id: serviceInfo._id,
        carrier: serviceInfo.carrier,
        carrier_type: serviceInfo.type,
        mail_class: serviceInfo.mail_class,
        asset: {
          logo_url: serviceInfo.asset.logo_url,
          description: serviceInfo.asset.description,
          code: serviceInfo.asset.code,
        },
      },
      postage,
      user: req.session.user_info.user_object_id,
    });
    let save_result = await tempData.save(opts);
    // console.log(save_result)
    await session.commitTransaction();
    session.endSession();
    return responseClient(
      res,
      status,
      response_status,
      response_message,
      save_result
    );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    responseClient(
      res,
      400,
      1,
      "Fail to create a shipment. No any transaction created. "
    );
  }
};

const voidShipment = async (req, res) => {
  let { carrier, tracking, order } = req.body;
  try {
    let result = await Carrier.findOne({ _id: carrier });
    const MySerivceClass = ServiceClass(result.type);
    const myService = new MySerivceClass(result.asset.account_information);
    let void_result = await myService.void(tracking);
    const voidSchema = util.voidRepsonseScheme(result.type);
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
  getRate,
  voidShipment,
  createShipment,
};
