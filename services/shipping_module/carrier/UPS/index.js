const Service = require("../model.js");
const axios = require("axios");
const SandboxEndPoint = require("../../../../config/dev.js").IBSandBoxEndpoint;
var Promise = require("bluebird");
var base64Img = require("base64-img");
var ImageUpload = require("../../../AWS/imageUpload");
var ImageUploadClusterMode = require("./Cluster/master");
const util = require("util");

class UPS extends Service {
  constructor(account, apiEndPoint, discount, carrier, mailClass, asset = {}) {
    super();
    this.account = account;
    this.apiEndPoint = apiEndPoint;
    this.dicount = discount;
    this.carrier = carrier;
    this.mailClass = mailClass;
    this.asset = asset;
  }

  getSurChargeName = () => {
    // 100 ADDITIONAL HANDLING 110 COD
    // 120 DELIVERY CONFIRMATION
    // 121 SHIP DELIVERY CONFIRMATION
    // 190 EXTENDED AREA
    // 199 HAZ MAT
    // 200 DRY ICE
    // 201 ISC SEEDS
    // 202 ISC PERISHABLES
    // 203 ISC TOBACCO
    // 204 ISC PLANTS
    // 205 ISC ALCOHOLIC BEVERAGES
    // 206 ISC BIOLOGICAL SUBSTANCES
    // 207 ISC SPECIAL EXCEPTIONS
    // 220 HOLD FOR PICKUP
    // 240 ORIGIN CERTIFICATE
    // 250 PRINT RETURN LABEL
    // 258 EXPORT LICENSE VERIFICATION
    // 260 PRINT N MAIL
    // 270 RESIDENTIAL ADDRESS
    // 280 RETURN SERVICE 1ATTEMPT
    // 290 RETURN SERVICE 3ATTEMPT
    // 300 SATURDAY DELIVERY
    // 310 SATURDAY INTERNATIONAL PROCESSING FEE 350 ELECTRONIC RETURN LABEL
    // 374 UPS PREPARED SED FORM
    // 375 FUEL SURCHARGE
    // 376 DELIVERY AREA
    // 377 LARGE PACKAGE
    // 378 SHIPPER PAYS DUTY TAX
    // 379 SHIPPER PAYS DUTY TAX UNPAID
  };

  getServiceCode = () => {
    let code;
    switch (this.mailClass) {
      case "GROUND":
        code = "03";
        break;
      case "GROUND FREIGHT":
        code = "03";
        break;
      default:
        code = "03";
    }
    return code;
  };

  calFreightClass = (weight, height, width, length) => {
    let result = parseFloat(
      weight / ((height * width * length) / 1728)
    ).toFixed(2);
    let freightClass = undefined;
    switch (true) {
      case result < 1:
        freightClass = 500;
        break;
      case (result > 1 || result == 1) && result < 2:
        freightClass = 400;
        break;
      case (result > 2 || result == 2) && result < 3:
        freightClass = 300;
        break;
      case (result > 3 || result == 3) && result < 4:
        freightClass = 250;
        break;
      case (result > 4 || result == 4) && result < 5:
        freightClass = 200;
        break;
      case (result > 5 || result == 5) && result < 6:
        freightClass = 175;
        break;
      case (result > 6 || result == 6) && result < 7:
        freightClass = 150;
        break;
      case (result > 7 || result == 7) && result < 8:
        freightClass = 125;
        break;
      case (result > 8 || result == 8) && result < 9:
        freightClass = 110;
        break;
      case (result > 9 || result == 9) && result < 10.5:
        freightClass = 100;
        break;
      case (result > 10.5 || result == 10.5) && result < 12:
        freightClass = 92.5;
        break;
      case (result > 12 || result == 12) && result < 13.5:
        freightClass = 85;
        break;
      case (result > 13.5 || result == 13.5) && result < 15:
        freightClass = 77.5;
        break;
      case (result > 15 || result == 22.5) && result < 22.5:
        freightClass = 70;
        break;
      case (result > 22.5 || result == 30) && result < 30:
        freightClass = 65;
        break;
      case (result > 30 || result == 30) && result < 35:
        freightClass = 60;
        break;
      case (result > 35 || result == 35) && result < 50:
        freightClass = 55;
        break;
      case result > 50:
        freightClass = 50;
        break;
    }
    return freightClass;
  };

  shipmentMapRequest(
    shipment,
    unit_length_accepted = "in",
    unit_weight_accepted = "lb",
    type = "rate"
  ) {
    // console.log(shipment);

    let convert_value_weight = this.getConvertFactor(
      shipment.parcel_information.unit_weight,
      unit_weight_accepted
    );
    let convert_value_length = this.getConvertFactor(
      shipment.parcel_information.unit_length,
      unit_length_accepted
    );
    // console.log(Number(parseFloat(2 * 0.0625).toFixed(2)));
    // console.log(convert_value_length)

    //---------此部分为服务商的请求格式-----------------
    let packagesArray = shipment.parcel_information.parcel_list.map((item) => {
      let weight = parseFloat(
        item.pack_info.weight * convert_value_weight
      ).toFixed(2);
      let length = parseFloat(
        item.pack_info.length * convert_value_length
      ).toFixed(2);
      let width = parseFloat(
        item.pack_info.width * convert_value_length
      ).toFixed(2);
      let height = parseFloat(
        item.pack_info.height * convert_value_length
      ).toFixed(2);

      //   console.log("length is " + length);
      //   console.log(
      //     "class is " + this.calFreightClass(weight, height, width, length)
      //   );

      let shipment_ups = {
        Commodity: {
          FreightClass: this.calFreightClass(
            weight,
            height,
            width,
            length
          ).toString(),
        },
        //FOR RATE
        PackagingType: {
          Code: "02",
          Description: "Package",
        },
        //FOR SHIP
        Packaging: {
          Code: "02",
          Description: "Package",
        },

        ReferenceNumber: [
          {
            Value: "test1",
          },
          { Value: "test2" },
        ],

        Dimensions: {
          UnitOfMeasurement: {
            Code: "IN",
          },
          Length: length,
          Width: width,
          Height: height,
        },
        PackageWeight: {
          UnitOfMeasurement: {
            Code: "LBS",
          },
          Weight: weight,
        },
        // customer_ship_id: item.key,
      };
      return shipment_ups;
    });
    // console.log(this.getConvertFactor(shipment.parcel_information.unit_length,unit_length_accepted ))
    let {
      sender_name,
      sender_company,
      sender_add1,
      sender_add2,
      sender_city,
      sender_zip_code,
      sender_state,
      sender_phone_number,
    } = shipment.sender_information;

    let {
      receipant_name,
      receipant_company,
      receipant_add1,
      receipant_add2,
      receipant_city,
      receipant_zip_code,
      receipant_state,
      receipant_phone_number,
    } = shipment.receipant_information;

    let shipments = [];
    let shipClass = {};
    let myShipment = {};
    let requestTitle = type == "rate" ? "RateRequest" : "ShipmentRequest";
    
    let paymentMethod =
      this.mailClass === "GROUND FREIGHT"
        ? {
            FRSPaymentInformation: {
              Type: {
                Code: "01",
              },
              AccountNumber: this.account.AccountNo,
            },
          }
        : {
            PaymentInformation: {
              ShipmentCharge: {
                Type: "01",
                BillShipper: {
                  AccountNumber: this.account.AccountNo,
                },
              },
            },
          };
    //------ UPS request format ---------------
    myShipment[`${requestTitle}`] = {
      Request: {
        SubVersion: "1703",
        TransactionReference: {
          CustomerContext: "myorder",
        },
      },
      Shipment: {
        ...paymentMethod,
        ShipmentServiceOptions: {},
        ShipmentRatingOptions: {
          FRSShipmentIndicator:
            this.mailClass === "GROUND FREIGHT" ? "TRUE" : undefined,
          NegotiatedRatesIndicator: "TRUE",
          // UserLevelDiscountIndicator: "TRUE",
          RateChartIndicator: "TRUE",
        },
        Shipper: {
          Name: sender_name,
          ShipperNumber: this.account.AccountNo,
          Address: {
            AddressLine: sender_add1,
            City: sender_city,
            StateProvinceCode: sender_state,
            PostalCode: sender_zip_code,
            CountryCode: "US",
          },
        },
        ShipTo: {
          Name: receipant_name,
          Address: {
            //   ResidentialAddressIndicator: "",
            AddressLine: receipant_add1,
            City: receipant_city,
            StateProvinceCode: receipant_state,
            PostalCode: receipant_zip_code,
            CountryCode: "US",
          },
        },
        ShipFrom: {
          Name: sender_name,
          Address: {
            AddressLine: sender_add1,
            City: sender_city,
            StateProvinceCode: sender_state,
            PostalCode: sender_zip_code,
            CountryCode: "US",
          },
        },

        Service: {
          Code: this.getServiceCode(),
          Description: this.mailClass,
        },
        // ShipmentTotalWeight: {
        //   UnitOfMeasurement: {
        //     Code: "LBS",
        //     Description: "Pounds",
        //   },
        //   Weight: "3",
        // },
        Package: packagesArray,
        LabelSpecification: {
          LabelStockSize: { Height: "6" },
          LabelImageFormat: { Code: "gif" },
        },
      },
    };
    // console.log(myShipment);
    return myShipment;
  }

  errorMapResopnse(item) {
    try {
      let response = {
        status: item.response.status,
        message: item.response.data.response.errors[0].message,
        data: {
          package_key: JSON.parse(item.config.data).package_key,
          order_id: undefined,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.name,
            isDisplayOnly: this.asset.isDisplayOnly,
          },
          // asset is the data form server-side
        },
      };
      return response;
    } catch (error) {
      let response = {
        status: 503,
        // status: item.status ? item.status : 503,
        message: item.code ? item.code : "No response from remote",
        data: {
          package_key: JSON.parse(item.config.data).package_key,
          order_id: undefined,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.name,
            isDisplayOnly: this.asset.isDisplayOnly,
          },
          // asset is the data form server-side
        },
      };

      return response;
    }
  }

  async handleResonse(item, type = "ship") {
    let response = {};
    let extra;
    console.log("I got response!");
    //判断是array 还是 object ，统一返回数组
    const selectArrayOrObject = (input) => {
      let result = Array.isArray(input) ? input : [{ ...input }];
      return result;
    };

    switch (item.status) {
      case 200 || 201:
        try {
          let total_charge =
            type == "ship"
              ? item.data.ShipmentResponse.ShipmentResults.ShipmentCharges
                  .TotalCharges.MonetaryValue
              : item.data.RateResponse.RatedShipment.TotalCharges.MonetaryValue;
          let billingWeight =
            type == "ship"
              ? item.data.ShipmentResponse.ShipmentResults.BillingWeight.Weight
              : item.data.RateResponse.RatedShipment.BillingWeight.Weight;
          let payload =
            type == "ship"
              ? item.data.ShipmentResponse.ShipmentResults.PackageResults
              : item.data.RateResponse.RatedShipment.RatedPackage;

          let charge_detail = selectArrayOrObject(payload).map(
            (item, index) => {
              let newItem = {
                package_key: undefined,
                baseCharges: item.BaseServiceCharge.MonetaryValue,
                surCharges: item.ItemizedCharges,
                totalCharges: item.TotalCharges
                  ? item.TotalCharges.MonetaryValue
                  : undefined,
                BillingWeight: item.BillingWeight
                  ? item.BillingWeight.Weight
                  : undefined,
              };
              return newItem;
            }
          );

          extra =
            type == "ship"
              ? {
                  //   parcel_list: await Promise.map(
                  //     selectArrayOrObject(payload),
                  //     async (item, index) => {
                  //       //   console.log(item.ShippingLabel.GraphicImage);
                  //       let url = await ImageUpload(
                  //         item.ShippingLabel.GraphicImage,
                  //         item.TrackingNumber,
                  //         "jpg",
                  //         true,
                  //         true
                  //       );
                  //       let obj = {
                  //         label: [url],
                  //         tracking_numbers: [item.TrackingNumber],
                  //         weight: item.BillingWeight,
                  //         postage: {
                  //           billing_amount: {
                  //             baseCharges: item.BaseServiceCharge.MonetaryValue,
                  //             surCharges: item.ItemizedCharges,
                  //           },
                  //         },
                  //       };
                  //       //   console.log(index + ' finished !')
                  //       return obj;
                  //     }
                  //   ),
                  parcel_list: await ImageUploadClusterMode(
                    selectArrayOrObject(payload),
                    "LabelWorker"
                  ),
                }
              : undefined;

          response = {
            status: item.status,
            data: {
              agent: "UPS",
              carrier: this.carrier,
              mail_class: this.mailClass,
              unit_weight: "lb", // api get in future --》 ship_parameters
              //   length_unit: "inch",
              weight: billingWeight,
              price: {
                total: total_charge,
                detail: charge_detail,
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
          response = {
            status: 500,
            message: "internal error",
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
              agent: "UPS",
              carrier: this.carrier,
              mail_class: this.mailClass,
              // asset is the data form server-side
            },
          };

          return response;
        }
        break;
      default:
        response = {
          status: item.status,
          message: item.data.message,
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
            agent: "UPS",
            carrier: this.carrier,
            mail_class: this.mailClass,
            // asset is the data form server-side
          },
        };
    }

    return response;
  }

  async ship(shipment, url = "/shipments") {
    // console.log(shipment)
    // console.log(util.inspect(shipment, false, null, true /* enable colors */));
    try {
      // console.log(shipment)
      let request_body = this.shipmentMapRequest(shipment, "in", "lb", "ship");
      const response = await axios({
        method: "post",
        url: this.apiEndPoint + url,

        headers: {
          "content-type": "application/json",
          AccessLicenseNumber: this.account.AccessLicenseNumber,
          Password: this.account.Password,
          Username: this.account.Username,
          transId: "random123",
          transactionSrc: "random123",
        },
        data: JSON.stringify(request_body),
      });

      // return response;
      // console.log(response);
      let ResponseWithoutHeader = await this.handleResonse(response, "ship");
      // console.log(ResponseWithoutHeader)
      return ResponseWithoutHeader;
    } catch (error) {
      //   console.log(error);
      // return;
      console.log("error happened from ship method");
      return this.errorMapResopnse(error);
    }
  }

  async rate(shipment, url = "/rating/Rate") {
    // console.log(shipment)
    try {
      // console.log(shipment)
      let request_body = this.shipmentMapRequest(shipment);
      const response = await axios({
        method: "post",
        url: this.apiEndPoint + url,
        timeout: 5000,
        headers: {
          "content-type": "application/json",
          AccessLicenseNumber: this.account.AccessLicenseNumber,
          Password: this.account.Password,
          Username: this.account.Username,
          transId: "random123",
          transactionSrc: "random123",
        },
        data: JSON.stringify(request_body),
      });

      // return response;
      // console.log(response);
      let ResponseWithoutHeader = await this.handleResonse(response, "rate");
      //   console.log(ResponseWithoutHeader)
      return ResponseWithoutHeader;
    } catch (error) {
      console.log(error);
      // return;
      console.log("error happened");
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

module.exports = { UPS };

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
