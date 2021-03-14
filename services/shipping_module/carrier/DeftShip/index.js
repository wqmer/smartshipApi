const Service = require("../model.js");
const axios = require("axios");
const SandboxEndPoint = require("../../../../config/dev.js").IBSandBoxEndpoint;
const redis = require("redis");
const { promisify } = require("util");
var Promise = require("bluebird");
var base64Img = require("base64-img");
var ImageUpload = require("../../../AWS/imageUpload");
const { time } = require("console");

class DeftShip extends Service {
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
    unit_length_accepted = "in",
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
    // console.log(Number(parseFloat(2 * 0.0625).toFixed(2)));
    // console.log(this.getConvertFactor(shipment.parcel_information.unit_length,unit_length_accepted ))

    //---------此部分为服务商的请求格式-----------------
    let packagesArray = shipment.parcel_information.parcel_list.map((item) => {
      let new_item = {
        package_type: "02", //custom package type
        count: 1,
        height: Number(
          parseFloat(item.pack_info.height * convert_value_length).toFixed(2)
        ),
        width: Number(
          parseFloat(item.pack_info.width * convert_value_length).toFixed(2)
        ),
        length: Number(
          parseFloat(item.pack_info.length * convert_value_length).toFixed(2)
        ),
        weight: Number(
          parseFloat(item.pack_info.weight * convert_value_weight).toFixed(2)
        ),
        reference_2: item.pack_info.reference,
        customer_ship_id: item.key,
      };
      return new_item;
    });
    let shipments = {
      shipper_id: this.account.shipper_id, // 11
      service: this.mailClass, // FEDEX_GROUND
      ship_from_address: {
        name: shipment.sender_information.sender_name,
        attention: shipment.sender_information.sender_company,
        address_1: shipment.sender_information.sender_add1,
        address_2: shipment.sender_information.sender_add2,
        address_3: "",
        city: shipment.sender_information.sender_city,
        post_code: shipment.sender_information.sender_zip_code,
        state: shipment.sender_information.sender_state,
        country: "US",
        telephone: shipment.receipant_information.receipant_phone_number,
        // is_residential: "false",
      },
      ship_to_address: {
        name: shipment.receipant_information.receipant_name,
        attention: shipment.receipant_information.receipant_company,
        address_1: shipment.receipant_information.receipant_add1,
        address_2: shipment.receipant_information.receipant_add2,
        address_3: "",
        city: shipment.receipant_information.receipant_city,
        post_code: shipment.receipant_information.receipant_zip_code,
        state: shipment.receipant_information.receipant_state,
        country: "US",
        telephone: shipment.receipant_information.receipant_phone_number,
        // is_residential: false,
      },
      packages: packagesArray,
    };

    // console.log(shipments)
    return shipments;
  }

  errorMapResopnse(item) {
    console.log(item)
    try {
      let response = {};
      let package_key = JSON.parse(item.config.data).packages[0]
        .customer_ship_id;
      let asset = {
        code: this.asset.code,
        logo_url: this.asset.logo_url,
        description: this.asset.description,
        name: this.asset.name,
        isDisplayOnly: this.asset.isDisplayOnly,
      };
      //有返回报错
      if (item.response) {
        let error_message =
          typeof item.response.data === "object"
            ? item.response.data.errors
              ? item.response.data.errors
              : item.response.data.message
            : item.response.data;
        //服务商报错统一格式
        response = {
          status: item.response.status,
          //根据远程服务返回 判断错误信息读取字段
          message: error_message,
          data: {
            package_key,
            order_id: undefined,
            // asset is the data form server-side
            asset,
          },
        }; //无返回
      } else {
        response = {
          status: 503,
          //根据远程服务返回 判断错误信息读取字段
          message: "No response form remote server",
          data: {
            package_key,
            order_id: undefined,
            // asset is the data form server-side
            asset,
          },
        };
      }
      return response;
    } catch (error) {
      console.log(error);
    }
  }

  async getToken(url = "/authenticate") {
    //从缓存拿token，如果没有就从远程服务器拿，并存入缓存
    let key = this.account.email;
    const client = redis.createClient();
    const setAsync = promisify(client.set).bind(client);
    const getAsync = promisify(client.get).bind(client);
    let token = await getAsync(key);
    // let token = null //测试模式
    // console.log("fetch from redis : " + token);
    if (!token) {
      //   console.log("i am in ");
      try {
        let response = await axios({
          method: "post",
          url: this.apiEndPoint + url,
          data: { email: this.account.email, password: this.account.password },
          headers: { "Content-Type": "application/json" },
        });
        // console.log(response);
        if (response.status == 200) {
          //   console.log(
          //     "fetch from remote server : " + response.data.access_token
          //   );
          await setAsync(key, response.data.access_token, "EX", 60 * 25 * 1);
          return response.data.access_token;
        }
        return "NO_TOKEN_GET_ERROR";
      } catch (error) {
        console.log(error);
        // console.log("the error is coming from authenticate");
      }
    } else {
      return token;
    }
  }

  async handleResonse(item, type = "ship") {
    let response = {};
    let extra;
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
              // status: undefined, // service status
              package_key: JSON.parse(item.config.data).packages[0]
                .customer_ship_id, //第一个包裹KEY
              // height: undefined,
              // length: undefined,
              // unit_length: item.data.dimensions_unit,
              agent: "Deftship",
              carrier: this.carrier,
              mail_class: this.mailClass,
              price: {
                total: item.data.final_price,
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
              agent: "DeftShip",
              carrier: this.carrier,
              mail_class: this.mailClass,
              price: {
                total: item.data.final_price,
              },
              // label_image:item.data.base64_labels.map((lables_image ,index )=> base64Img.imgSync('data:image/png;base64,'+ lables_image, 'labels', 'test'+ Math.random())),
              // asset is the data form server-side
              asset: {
                code: this.asset.code,
                logo_url: this.asset.logo_url,
                description: this.asset.description,
                name: this.asset.name,
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
          status: item.status,
          message: item.data.message,
          data: {
            package_key: JSON.parse(item.config.data).packages[0]
              .customer_ship_id, //第一个包裹KEY
            asset: {
              code: this.asset.code,
              logo_url: this.asset.logo_url,
              description: this.asset.description,
              name: this.asset.name,
            },
            agent: "DeftShip",
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

  async rate(shipment, url = "/fedex/rating") {
    let api_url = { fedex: "/fedex/rating", ups: "/ups/package/rating" };
    if (api_url == undefined) api_url = url;
    // console.log(api_url[`${this.carrier}`]);
    try {
      // console.log(shipment)
      let token = await this.getToken();
      let request_body = this.shipmentMapRequest(shipment);
      const response = await axios({
        method: "post",
        url: this.apiEndPoint + api_url[`${this.carrier}`],
        timeout: 6000,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(request_body),
      });
      // console.log(response);
      let ResponseWithoutHeader = await this.handleResonse(response, "rate");
      //   console.log(ResponseWithoutHeader)
      return ResponseWithoutHeader;
    } catch (error) {
      //   console.log(error);
      return this.errorMapResopnse(error);
    }
  }

  // void = () => {

  // }

  // track = () => {

  // }

  // verify = () => {

  // }
}

module.exports = { DeftShip };
