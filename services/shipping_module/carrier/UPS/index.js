const CarrierClass = require("../model.js");
const axios = require("axios");
const SandboxEndPoint = require("../../../../config/dev.js").IBSandBoxEndpoint;
var Promise = require("bluebird");
var base64Img = require("base64-img");
var ImageUpload = require("../../../AWS/imageUpload");
var ImageUploadClusterMode = require("./Cluster/master");
const util = require("util");

class UPS extends CarrierClass {
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
    switch (this.mailClass.toLowerCase()) {
      case "ground":
        code = "03";
        break;
      case "ground freight":
        code = "03";
        break;
      case "next day air":
        code = "01";
        break;
      case "2nd day air":
        code = "02";
        break;
      default:
        code = "03";
    }
    return code;

    // 01 = Next Day Air
    // 02 = 2nd Day Air
    // 03 = Ground
    // 07 = Express
    // 08 = Expedited
    // 11 = UPS Standard
    // 12 = 3 Day Select
    // 13 = Next Day Air Saver
    // 14 = UPS Next Day Air® Early
    // 54 = Express Plus
    // 59 = 2nd Day Air A.M.
    // 65 = UPS Saver
    // M2 = First Class Mail
    // M3 = Priority Mail
    // M4 = Expedited MaiI Innovations
    // M5 = Priority Mail Innovations
    // M6 = Economy Mail Innovations
    // M7 = MaiI Innovations (MI) Returns 70 = UPS Access PointTM Economy 71 = UPS Worldwide Express Freight Midday
    // 74 = UPS Express®12:00 82 = UPS Today Standard 83 = UPS Today Dedicated Courier
    // 84 = UPS Today Intercity 85 = UPS Today Express 86 = UPS Today Express Saver
    // 96 = UPS Worldwide Express Freight.
    // Note: Only service code 03 is used for Ground Freight Pricing shipments
    // The following Services are not available to return shipment: 13, 59, 82, 83, 84, 85, 86
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
      case (result > 15 || result == 15) && result < 22.5:
        freightClass = 70;
        break;
      case (result > 22.5 || result == 22.5) && result < 30:
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
    try {
      let convert_value_weight = this.getConvertFactor(
        shipment.parcel_information.unit_weight,
        unit_weight_accepted
      );
      let convert_value_length = this.getConvertFactor(
        shipment.parcel_information.unit_length,
        unit_length_accepted
      );
      // console.log(Number(parseFloat(2 * 0.0625).toFixed(2)));

      //---------此部分为服务商的请求格式-----------------
      let packagesArray = shipment.parcel_information.parcel_list.map(
        (item) => {
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

          let declareValue = parseFloat(item.declareValue).toFixed(2);
          // declareValue = 200;
          let refernece1 = item.pack_info.reference_1
            ? item.pack_info.reference_1.trim()
              ? {
                  Value: item.pack_info.reference_1,
                }
              : undefined
            : undefined;
          let refernece2 = item.pack_info.reference_2
            ? item.pack_info.reference_2.trim()
              ? {
                  Value: item.pack_info.reference_2,
                }
              : undefined
            : undefined;
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

            ReferenceNumber: [refernece1, refernece2],
            PackageServiceOptions:
              declareValue > 100
                ? {
                    DeclaredValue: {
                      MonetaryValue: declareValue.toString(),
                      CurrencyCode: "USD",
                    },
                  }
                : undefined,

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
        }
      );
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
        receipant_is_residential,
      } = shipment.receipant_information;

      let shipments = [];
      let shipClass = {};
      let myShipment = {};
      let requestTitle = type == "rate" ? "RateRequest" : "ShipmentRequest";

      let isRes = receipant_is_residential
        ? { ResidentialAddressIndicator: {} }
        : undefined;

      let paymentMethod =
        this.mailClass.toLowerCase() === "ground freight"
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
          SubVersion: "1801",
          TransactionReference: {
            CustomerContext: "myorder",
          },
        },
        Shipment: {
          ...paymentMethod,
          ShipmentServiceOptions: {},
          ShipmentRatingOptions: {
            FRSShipmentIndicator:
              this.mailClass.toLowerCase() === "ground freight"
                ? "TRUE"
                : undefined,
            NegotiatedRatesIndicator: "TRUE",
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
            // CompanyDisplayableName : 'test company',
            Address: {
              //   ResidentialAddressIndicator: "",
              ...isRes,
              AddressLine: [receipant_add1, receipant_add2],
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
          RatingMethodRequestedIndicator: "",
          ItemizedChargesRequestedIndicator: "",
          TaxInformationIndicator: "",
          CostCenter: "aaa",
          LabelSpecification: {
            LabelStockSize: { Height: "6" },
            LabelImageFormat: { Code: "gif" },
          },
        },
      };
      //    console.log(
      //   util.inspect(myShipment, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      return myShipment;
    } catch (error) {}

    // console.log(myShipment);
  }

  errorMapResopnse(item) {
    try {
      let response = {
        status: item.response.status,
        message: item.response.data.response.errors[0].message,
        data: {
          package_key: JSON.parse(item.config.data).package_key,
          order_id: undefined,
          _id: this.asset._id,
          agent: "UPS",
          carrier: this.carrier,
          mail_class: this.mailClass,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.nick_name,
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
    // console.log("I got response!");
    //判断是array 还是 object ，统一返回数组
    const selectArrayOrObject = (input) => {
      let result = Array.isArray(input) ? input : [{ ...input }];
      return result;
    };

    switch (item.status) {
      case 200 || 201:
        try {
          let priceObject =
            type == "ship"
              ? item.data.ShipmentResponse.ShipmentResults
              : item.data.RateResponse.RatedShipment;

          // let isNegotiateRateStyle =
          //   priceObject.NegotiatedRateCharges != undefined;

          let Negotiated_Charges = priceObject.NegotiatedRateCharges
            ? priceObject.NegotiatedRateCharges.TotalCharge.MonetaryValue
            : undefined;

          let total_charge =
            type == "rate"
              ? priceObject.TotalCharges.MonetaryValue
              : priceObject.ShipmentCharges.TotalCharges.MonetaryValue;

          // total_charge = Negotiated_Charges ? Negotiated_Charges : total_charge;

          let SurchargeTotal = Array.isArray(priceObject.ItemizedCharges)
            ? priceObject.ItemizedCharges
            : [priceObject.ItemizedCharges];

          let billingWeight = priceObject.BillingWeight.Weight;

          let payload =
            type == "ship"
              ? priceObject.PackageResults
              : priceObject.RatedPackage;

          let charge_detail = selectArrayOrObject(payload).map(
            (item, index) => {
              let newItem = {
                package_key: undefined,
                baseCharges: item.BaseServiceCharge.MonetaryValue,
                surCharges: Array.isArray(item.ItemizedCharges)
                  ? item.ItemizedCharges
                  : [item.ItemizedCharges],
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

          // if (isNegotiateRateStyle) {
          //   //当是合约价时 ，并且一个包裹时，可以尝试设置详情
          //   charge_detail =
          //   selectArrayOrObject(payload).length > 1
          //       ? [
          //           {
          //             package_key: undefined,
          //             baseCharges: total_charge,
          //             totalCharges: total_charge,
          //             BillingWeight: billingWeight,
          //           },
          //         ]
          //       : [
          //           {
          //             package_key: undefined,
          //             baseCharges: total_charge,
          //             surCharges: SurchargeTotal.concat(
          //               selectArrayOrObject(payload)[0].ItemizedCharges
          //             ),
          //             totalCharges: total_charge,
          //             BillingWeight: billingWeight,
          //           },
          //         ];
          // }

          let tracking_array = selectArrayOrObject(payload).map(
            (e) => e.TrackingNumber
          );

          let pl =
            type == "ship"
              ? await ImageUploadClusterMode(
                  selectArrayOrObject(payload),
                  "LabelWorker"
                )
              : undefined;

          extra =
            type == "ship"
              ? {
                  // parcel_list: await Promise.map(
                  //   selectArrayOrObject(payload),
                  //   async (item, index) => {
                  //     //   console.log(item.ShippingLabel.GraphicImage);
                  //     let url = await ImageUpload(
                  //       item.ShippingLabel.GraphicImage,
                  //       item.TrackingNumber,
                  //       "jpg",
                  //       false,
                  //       false
                  //     );
                  //     let obj = {
                  //       label: [url],
                  //       tracking_numbers: [item.TrackingNumber],
                  //       weight: item.BillingWeight,
                  //       postage: {
                  //         billing_amount: {
                  //           baseCharges: item.BaseServiceCharge.MonetaryValue,
                  //           surCharges: item.ItemizedCharges,
                  //         },
                  //       },
                  //     };
                  //     //   console.log(index + ' finished !')
                  //     return obj;
                  //   }
                  // ),
                  parcel_list: pl.sort((a, b) => {
                    return (
                      tracking_array.indexOf(a.tracking_numbers[0]) -
                      tracking_array.indexOf(b.tracking_numbers[0])
                    );
                  }),
                }
              : undefined;

          response = {
            status: item.status,
            data: {
              _id: this.asset._id, // service id
              agent: "UPS",
              carrier: this.carrier,
              mail_class: this.mailClass,
              description: this.asset.description,
              unit_weight: "lb", // api get in future --》 ship_parameters
              //   length_unit: "inch",
              weight: billingWeight,
              price: {
                total: total_charge,
                NegotiateTotal : Negotiated_Charges,
                // ups 住宅附加费显示在最外层
                SurchargeTotal,
                detail: charge_detail,
              },
              // label_image:item.data.base64_labels.map((lables_image ,index )=> base64Img.imgSync('data:image/png;base64,'+ lables_image, 'labels', 'test'+ Math.random())),
              // asset is the data form server-side
              asset: {
                code: this.asset.code,
                logo_url: this.asset.logo_url,
                name: this.asset.nick_name,
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
              _id: this.asset._id,
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
            _id: this.asset._id,
            request_id: JSON.parse(item.config.data).request_id,
            package_key: JSON.parse(item.config.data).package_key,
            order_id: undefined,
            agent: "UPS",
            carrier: this.carrier,
            mail_class: this.mailClass,
            asset: {
              code: this.asset.code,
              logo_url: this.asset.logo_url,
              description: this.asset.description,
              name: this.asset.nick_name,
            },

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

      // console.log(
      //   util.inspect(request_body, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      const response = await axios({
        method: "post",
        url: this.apiEndPoint + url,

        headers: {
          "content-type": "application/json",
          AccessLicenseNumber:
            this.account.AccessLicenseNumber || this.account.AccessKey,
          Password: this.account.Password,
          Username: this.account.Username,
          transId: "random123",
          transactionSrc: "random123",
        },
        data: JSON.stringify(request_body),
      });

      // return response;

      console.log(
        util.inspect(response, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
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
      console.log(
        util.inspect(request_body, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
      const response = await axios({
        method: "post",
        url: this.apiEndPoint + url,
        timeout: 6000,
        headers: {
          "content-type": "application/json",
          AccessLicenseNumber:
            this.account.AccessLicenseNumber || this.account.AccessKey,
          Password: this.account.Password,
          Username: this.account.Username,
          transId: "random123",
          transactionSrc: "random123",
        },
        data: JSON.stringify(request_body),
      });

      console.log(
        util.inspect(response.data, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
      let ResponseWithoutHeader = await this.handleResonse(response, "rate");
      // console.log(
      //   util.inspect(ResponseWithoutHeader, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
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
