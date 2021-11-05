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
          { _id: item._id, description: item.description, ...item.asset }
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
};
