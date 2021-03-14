const Service = require("../model.js");
const axios = require("axios");
const SandboxEndPoint = require("../../../../config/dev.js").IBSandBoxEndpoint;
var Promise = require("bluebird");
var base64Img = require("base64-img");
var ImageUpload = require("../../../AWS/imageUpload");

class InternationalBridge extends Service {
  constructor(account, apiEndPoint, discount, carrier, mailClass, asset = {}) {
    super();
    this.account = account;
    this.apiEndPoint = apiEndPoint;
    this.dicount = discount;
    this.carrier = carrier;
    this.mailClass = mailClass;
    this.asset = asset;
  }

  shipmentMapRequest(
    shipment,
    unit_length_accepted = "inch",
    unit_weight_accepted = "lb"
  ) {
    let convert_value_weight = this.getConvertFactor(
      shipment.parcel_information.unit_weight,
      unit_weight_accepted
    );
    let convert_value_length = this.getConvertFactor(
      shipment.parcel_information.unit_length,
      unit_length_accepted
    );
    console.log(Number(parseFloat(2 * 0.0625).toFixed(2)));

    // console.log(this.getConvertFactor(shipment.parcel_information.unit_length,unit_length_accepted ))
    let shipments = [];
    let shipClass = {};
    shipment.parcel_information.parcel_list.forEach((element) => {
      let saddress_line2 = shipment.sender_information.sender_add2;
      let raddress_line2 = shipment.receipant_information.receipant_add2;

      // saddress_line2 = saddress_line2 ? saddress_line2 : ''
      // raddress_line2 = raddress_line2 ? raddress_line2 : ''
      shipClass[this.carrier] = {
        shape: "Parcel",
        mail_class: this.mailClass,
        image_size: "4x6",
      };
      let myShipment = {
        package_key: element.key,
        request_id: "Smartship",
        from_address: {
          company_name: shipment.sender_information.sender_company,
          first_name: shipment.sender_information.sender_name,
          last_name: shipment.sender_information.last_name || " ",
          line1: shipment.sender_information.sender_add1,
          line2: saddress_line2,
          city: shipment.sender_information.sender_city,
          state_province: shipment.sender_information.sender_state,
          postal_code: shipment.sender_information.sender_zip_code,
          phone_number: shipment.sender_information.sender_phone_number,
          sms: shipment.sender_information.sender_sms,
          email: shipment.sender_information.sender_email,
          country_code: "US",
        },
        to_address: {
          company_name: shipment.receipant_information.receipant_company,
          first_name: shipment.receipant_information.receipant_name,
          last_name: shipment.receipant_information.last_name || " ",
          line1: shipment.receipant_information.receipant_add1,
          line2: raddress_line2,
          city: shipment.receipant_information.receipant_city,
          state_province: shipment.receipant_information.receipant_state,
          postal_code: shipment.receipant_information.receipant_zip_code,
          phone_number: shipment.receipant_information.receipant_phone_number,
          email: shipment.receipant_information.receipant_email,
          country_code: "US",
        },
        // "weight": Number(element.pack_info.weight),
        weight: Number(
          parseFloat(element.pack_info.weight * convert_value_weight).toFixed(2)
        ),
        weight_unit: unit_weight_accepted,
        image_format: "png",
        image_resolution: 300,
        ...shipClass,
      };
      shipments.push(myShipment);
    });

    return shipments;
  }

  errorMapResopnse(item) {
    let response = {
      status: item.status,
      message: item.data.error,
      data: {
        request_id: JSON.parse(item.config.data).request_id,
        package_key: JSON.parse(item.config.data).package_key,
        order_id: undefined,
        // asset is the data form server-side
      },
    };
    return response;
  }

  async handleResonse(item, type = "ship") {
    let response = {};
    let extra;
    if (!item)
      return {
        status: 503,
        message: "No response from remote server",
        data: {
          request_id: undefined,
          package_key: undefined,
          order_id: undefined,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.name,
          },
          agent: "InternationalBridge",
          carrier: this.carrier,
          mail_class: this.mailClass,
          // asset is the data form server-side
        },
      };

    switch (item.status) {
      case 200:
        try {
          extra =
            type == "ship"
              ? {
                  tracking_numbers: item.data[this.carrier].tracking_numbers,
                  label_image: await Promise.all(
                    item.data.base64_labels.map(async (lables_image, index) => {
                      let url = await ImageUpload(
                        lables_image,
                        item.data[this.carrier].tracking_numbers[index]
                      );
                      return url;
                    })
                  ),
                  // labels: item.data.base64_labels,
                }
              : undefined;

          response = {
            status: item.status,
            data: {
              // request_id: JSON.parse(item.config.data).request_id,
              package_key: JSON.parse(item.config.data).package_key,
              // height: undefined,
              // length: undefined,
              weight: item.data.pricing_weight,
              unit_weight: item.data.weight_unit,
              // unit_length: item.data.dimensions_unit,
              zone: item.data[this.carrier].zone,
              agent: "InternationalBridge",
              carrier: this.carrier,
              mail_class: this.mailClass,
              price: {
                total: item.data.total_amount,
              },
              // label_image:item.data.base64_labels.map((lables_image ,index )=> base64Img.imgSync('data:image/png;base64,'+ lables_image, 'labels', 'test'+ Math.random())),
              // asset is the data form server-side
              asset: {
                code: this.asset.code,
                logo_url: this.asset.logo_url,
                description: this.asset.description,
                name: this.asset.name,
                isDisplayOnly: this.asset.isDisplayOnly,
              },
              ...extra,
            },
          };
        } catch (error) {
          extra = undefined;
          console.log(error);
        }

        break;
      case 201:
        try {
          extra =
            type == "ship"
              ? {
                  tracking_numbers: item.data[this.carrier].tracking_numbers,
                  label_image: await Promise.all(
                    item.data.base64_labels.map(async (lables_image, index) => {
                      let url = await ImageUpload(
                        lables_image,
                        item.data[this.carrier].tracking_numbers[index]
                      );
                      return url;
                    })
                  ),
                  // labels: item.data.base64_labels,
                }
              : undefined;

          response = {
            status: item.status,
            data: {
              // request_id: JSON.parse(item.config.data).request_id,
              package_key: JSON.parse(item.config.data).package_key,
              // height: undefined,
              // length: undefined,
              weight: item.data.pricing_weight,
              zone: item.data[this.carrier].zone,
              agent: "InternationalBridge",
              carrier: this.carrier,
              mail_class: this.mailClass,
              price: {
                total: item.data.total_amount,
              },
              // label_image:item.data.base64_labels.map((lables_image ,index )=> base64Img.imgSync('data:image/png;base64,'+ lables_image, 'labels', 'test'+ Math.random())),
              // asset is the data form server-side
              asset: {
                code: this.asset.code,
                logo_url: this.asset.logo_url,
                description: this.asset.description,
                name: this.asset.name,
                isDisplayOnly: this.asset.isDisplayOnly,
              },
              ...extra,
            },
          };
        } catch (error) {
          extra = undefined;
          console.log(error);
        }

        break;
      default:
        response = {
          status: item.status ? item.status : 400,
          message: item.data.message
            ? item.data.message
            : "No response from remote server",
          data: {
            request_id: JSON.parse(item.config.data).request_id,
            package_key: JSON.parse(item.config.data).package_key,
            order_id: undefined,
            asset: {
              code: this.asset.code,
              logo_url: this.asset.logo_url,
              description: this.asset.description,
              name: this.asset.name,
            },
            agent: "InternationalBridge",
            carrier: this.carrier,
            mail_class: this.mailClass,
            // asset is the data form server-side
          },
        };
    }

    return response;
  }

  async ship(shipment, url = "/labels") {
    try {
      let getPackagesRate = this.shipmentMapRequest(shipment);
      let promises = getPackagesRate.map((shipment) => {
        return new Promise((resolve, reject) => {
          axios({
            method: "post",
            url: this.apiEndPoint + url,
            data: shipment,
            auth: { ...this.account },
          })
            .then((result) => {
              resolve(result);
            })
            .catch((er) => {
              resolve(er.response);
            });
        });
      });
      const response = await Promise.all(promises);
      // console.log(response)
      let ResponseWithoutHeader = await Promise.all(
        response.map(async (item) => {
          // console.log(this.resultMapResonse(item))
          // item.labels = item.data.base64_labels.map(lables_image => base64Img.imgSync(lables_image, 'test', 'test'))
          let result = await this.handleResonse(item);
          // console.log(result)
          return result;
        })
      );
      // console.log(ResponseWithoutHeader)
      return ResponseWithoutHeader;
    } catch (error) {
      console.log(error);
    }
  }

  async rate(shipment, url = "/price.json") {
    try {
      // console.log(shipment)
      let getPackagesRate = this.shipmentMapRequest(shipment);
      let promises = getPackagesRate.map((shipment) => {
        return new Promise((resolve, reject) => {
          axios({
            method: "post",
            url: this.apiEndPoint + url,
            timeout: 2000,
            data: shipment,
            auth: { ...this.account },
          })
            .then((result) => {
              resolve(result);
            })
            .catch((er) => {
              resolve(er.response);
            });
        });
      });
      const response = await Promise.all(promises);
      // console.log(response)
      let ResponseWithoutHeader = await Promise.all(
        response.map(async (item) => {
          let result = await this.handleResonse(item, "rate");
          return result;
        })
      );

      // console.log(ResponseWithoutHeader)
      return ResponseWithoutHeader;
    } catch (error) {
      console.log(error);
    }
  }

  async index(params, url = "/labels") {
    try {
      // console.log(shipment)

      let result = await axios({
        method: "get",
        params,
        url: this.apiEndPoint + url,
        auth: { ...this.account },
      });
      return result;
      // return ResponseWithoutHeader
    } catch (error) {
      console.log(error);
    }
  }
  // void = () => {

  // }

  // track = () => {

  // }

  // verify = () => {

  // }
}

module.exports = { InternationalBridge };

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
