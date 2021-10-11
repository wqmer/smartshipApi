var crypto = require("crypto");

module.exports = {
  MD5_SUFFIX: "dsfsdssdeckdkekekkcckckckcckodododc,sdmeoeeoidjs~kEWICCJD",
  md5: function (pwd) {
    let md5 = crypto.createHash("md5");
    return md5.update(pwd).digest("hex");
  },
  responseClient(
    res,
    httpCode = 500,
    code = 3,
    message = "internal error",
    data = {}
  ) {
    let responseData = {};
    responseData.code = code;
    responseData.message = message;
    responseData.data = data;
    res.status(httpCode).json(responseData);
  },

  error_message_handle: function () {},

  mapRequestToModel: function (
    sender_information,
    receipant_information,
    parcel_information
  ) {
    // let parcel_information =
    let model = {
      sender: {
        Company: sender_information.sender_company,
        sender_name: sender_information.sender_name,
        add1: sender_information.sender_add1,
        add2: sender_information.sender_add2,
        state: sender_information.sender_state,
        city: sender_information.sender_city,
        zipcode: sender_information.sender_zip_code,
        country: sender_information.sender_country,
        phone_number: sender_information.sender_phone_number,
      },
      recipient: {
        Company: receipant_information.receipant_company,
        sender_name: receipant_information.receipant_name,
        add1: receipant_information.receipant_add1,
        add2: receipant_information.receipant_add2,
        state: receipant_information.receipant_state,
        city: receipant_information.receipant_city,
        zipcode: receipant_information.receipant_zip_code,
        country: receipant_information.receipant_country,
        phone_number: receipant_information.receipant_phone_number,
      },
      parcel: parcel_information,
    };
    return model;
  },

  serviceMapShipPara: function (type, mail_class) {
    let para;
    switch (true) {
      case type.toLowerCase() == "fedex" &&
        mail_class.toLowerCase() == "ground home delivery":
        para = {
          is_res_only: true,
          is_bus_only: false,
        };
        break;
      case type.toLowerCase() == "fedex" &&
        mail_class.toLowerCase() == "ground":
        para = {
          is_bus_only: true,
          is_res_only: false,
        };
        break;
      case type.toLowerCase() == "fedex" &&
        mail_class.toLowerCase() == "Ground Multiweight":
        para = {
          is_bus_only: true,
          is_res_only: false,
        };
        break;
      default:
        para = undefined;
    }

    return para;
  },

  //request
  // sender_information:
  // font_type: "warning"
  // is_ready: false
  // panel_title: "编辑中"
  // sender_add1: "12"
  // sender_add2: undefined
  // sender_city: undefined
  // sender_company: undefined
  // sender_name: "qIMIN"
  // sender_phone_number: undefined
  // sender_state: undefined
  // sender_zip_code: undefined

  // parcel_information:
  // font_type: "strong"
  // is_ready: true
  // panel_title: "当前录入1个包裹，重量1 , 尺寸为2 x 3 x 5"
  // parcel_list: Array(1)
  // 0:
  // font_type: "strong"
  // is_panel_opened: true
  // key: "first_pak"
  // pack_info:
  // height: "5"
  // length: "2"
  // order_id: "1"
  // reference: "1"
  // same_pack: "1"
  // weight: "1"
  // width: "3"

  // receipant_information:
  // font_type: "warning"
  // is_ready: false
  // panel_title: "编辑中"
  // receipant_add1: undefined
  // receipant_add2: undefined
  // receipant_city: undefined
  // receipant_company: undefined
  // receipant_name: "1"
  // receipant_phone_number: undefined
  // receipant_state: undefined
  // receipant_zip_code: undefined

  // let response = {
  //     status: item.status,
  //     data: {
  //         // request_id: JSON.parse(item.config.data).request_id,
  //         package_key: JSON.parse(item.config.data).package_key,
  //         // height: undefined,
  //         // length: undefined,
  //         weight: item.data.pricing_weight,
  //         zone: item.data[this.carrier].zone,
  //         agent: 'InternationalBridge',
  //         carrier: this.carrier,
  //         mail_class: this.mailClass,
  //         price: {
  //             total: item.data.total_amount
  //         },
  //         // asset is the data form server-side
  //         asset: {
  //             code: this.asset.code,
  //             logo_url: this.asset.logo_url,
  //             description: this.asset.description,
  //             name: this.asset.name
  //         },
  //         ...extra
  //     }
  // }
};
