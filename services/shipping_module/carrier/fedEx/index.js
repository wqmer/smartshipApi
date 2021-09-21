const CarrierClass = require("../model.js");
const axios = require("axios");
var Promise = require("bluebird");
var base64Img = require("base64-img");
var ImageUpload = require("../../../AWS/imageUpload");
// var ImageUploadClusterMode = require("./Cluster/master");
var Promise = require("bluebird");
const util = require("util");
const soap = require("soap");
const path = require("path");
const date = new Date();
const delay = require("delay");



class FEDEX extends CarrierClass {
  constructor(account, apiEndPoint, discount, carrier, mailClass, asset = {}) {
    super();
    this.account = account;
    this.apiEndPoint = apiEndPoint;
    this.dicount = discount;
    this.carrier = carrier;
    this.mailClass = mailClass;
    this.asset = asset;
  }

  getSurChargeName = () => {};

  // responseSechema = (rateType) => {
  //   let total_charge =
  //     type == "ship"
  //       ? requestType == "shipment"
  //         ? shipRateInfo.TotalNetFedExCharge.Amount
  //         : parseFloat(calTotalAmount)
  //       : rateInfo.ShipmentRateDetail.TotalNetFedExCharge.Amount;

  //   let billingWeight =
  //     type == "ship"
  //       ? requestType == "shipment"
  //         ? shipRateInfo.TotalBillingWeight.Value
  //         : parseFloat(calTotalWeight)
  //       : rateInfo.ShipmentRateDetail.TotalBillingWeight.Value;

  //   let packagesRateDetail =
  //     type == "ship"
  //       ? item.map(
  //           (item) =>
  //             item.CompletedShipmentDetail.CompletedPackageDetails[0]
  //               .PackageRating.PackageRateDetails[0]
  //         )
  //       : rateInfo.RatedPackages;
  // };

  getServiceCode = () => {
    let code;
    switch (this.mailClass.toLowerCase()) {
      case "ground":
        code = "FEDEX_GROUND";
        break;
      case "ground home delivery":
        code = "GROUND_HOME_DELIVERY";
        break;
      case "priority overnight":
        code = "PRIORITY_OVERNIGHT";
        break;
      case "express saver":
        code = "FEDEX_EXPRESS_SAVER";
        break;
      case "standard overnight":
        code = "STANDARD_OVERNIGHT";
        break;
      case "2 day":
        code = "FEDEX_2_DAY";
        break;
      case "smartpost":
        code = "SMART_POST";
        break;
      case "ground multiweight":
        code = "FEDEX_GROUND";
        break;
      default:
        ``;
        code = "FEDEX_GROUND";
    }
    return code;
  };

  shipmentMapRequest(
    shipment,
    type = "rate",
    sequence = 1,
    packageCount,
    masterTrackingId,
    unit_length_accepted = "in",
    unit_weight_accepted = "lb",
    multiFlag = false
  ) {
    let convert_value_weight = this.getConvertFactor(
      shipment.parcel_information.unit_weight,
      unit_weight_accepted
    );
    let convert_value_length = this.getConvertFactor(
      shipment.parcel_information.unit_length,
      unit_length_accepted
    );

    //---------此部分为服务商的请求格式-----------------
    // covert unit
    let packagesArray = shipment.parcel_information.parcel_list.map(
      (item, index) => {
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

        let refernece1 = item.pack_info.reference_1
          ? item.pack_info.reference_1.trim()
            ? {
                CustomerReferenceType: "P_O_NUMBER",
                Value: item.pack_info.reference_1,
              }
            : undefined
          : undefined;
        let refernece2 = item.pack_info.reference_2
          ? item.pack_info.reference_2.trim()
            ? {
                CustomerReferenceType: "CUSTOMER_REFERENCE",
                Value: item.pack_info.reference_2,
              }
            : undefined
          : undefined;
        let InsuredValue = item.declareValue
          ? {
              Currency: "USD",
              Amount: parseFloat(item.declareValue).toFixed(2),
            }
          : undefined;
        let CustomerReferences = undefined;
        if (refernece1 && !refernece2) {
          CustomerReferences = [refernece1];
        } else if (!refernece1 && refernece2) {
          CustomerReferences = [refernece2];
        } else if (refernece1 && refernece2) {
          CustomerReferences = [refernece1, refernece2];
        }

        let shipment_fedex = {
          SequenceNumber: this.getServiceCode() == "SMART_POST" ? 1 : sequence,
          GroupPackageCount: 1,
          InsuredValue,
          Weight: {
            Units: "LB",
            Value: parseFloat(weight),
          },
          Dimensions: {
            Length: Math.ceil(parseFloat(length)),
            Width: Math.ceil(parseFloat(width)),
            Height: Math.ceil(parseFloat(height)),
            Units: "IN",
          },
          CustomerReferences: {
            CustomerReferenceType: "P_O_NUMBER",
            Value: item.reference_1,
          },
          CustomerReferences: {
            CustomerReferenceType: "CUSTOMER_REFERENCE",
            Value: item.pack_info.reference_2,
          },

          CustomerReferences,
        };

        //--- todo
        return shipment_fedex;
      }
    );

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

    //------ Fedex request format ---------------
    let isRes =
      receipant_is_residential ||
      this.getServiceCode() == "GROUND_HOME_DELIVERY"
        ? true
        : false;

    let SpecialServicesRequested = { SpecialServiceTypes: "FEDEX_ONE_RATE" };

    let SmartPostDetail =
      this.getServiceCode() == "SMART_POST"
        ? {
            Indicia:
              this.mailClass.toLowerCase() == "smartpost-lightWeight"
                ? "PRESORTED_STANDARD"
                : "PARCEL_SELECT",
            AncillaryEndorsement: "ADDRESS_CORRECTION",
            HubId: this.account.HubId,
          }
        : undefined;

    // let SpecialRatingAppliedType =
    //   type == "rate"
    //     ? undefined
    //     : {
    //       SpecialRatingAppliedType: "FEDEX_ONE_RATE",
    //       };

    let MasterTrackingId =
      masterTrackingId && this.getServiceCode() != "SMART_POST"
        ? {
            TrackingIdType: "FEDEX",
            TrackingNumber: masterTrackingId,
          }
        : undefined;

    let TotalWeight =
      sequence == 1
        ? {
            Units: "LB",
            Value: packagesArray
              .map((item) => item.Weight.Value)
              .reduce((a, c) => a + c),
          }
        : undefined;

    let Pcount =
      this.getServiceCode() == "SMART_POST" && type != "rate"
        ? 1
        : packageCount || packagesArray.length;

    let myShipment = {
      TransactionDetail: {
        CustomerTransactionId: "SMARTSHIP",
      },

      Version: {
        ServiceId: type == "rate" ? "crs" : "ship",
        Major: type == "rate" ? 24 : 23, // version code should match to file name
        Intermediate: 0,
        Minor: 0,
      },
      // VariableOptions: ["FEDEX_ONE_RATE"],
      RequestedShipment: {
        ShipTimestamp: new Date(date.getTime()).toISOString(),

        DropoffType: "REGULAR_PICKUP",

        ServiceType: this.getServiceCode(),

        PackagingType: "YOUR_PACKAGING",

        // PackagingType: "FEDEX_PAK",

        TotalWeight,

        PreferredCurrency: "USD",

        Shipper: {
          Contact: {
            PersonName: sender_name,
            CompanyName: sender_company,
            PhoneNumber: sender_phone_number,
          },
          Address: {
            StreetLines: [sender_add1, sender_add2],
            City: sender_city,
            StateOrProvinceCode: sender_state,
            PostalCode: sender_zip_code,
            CountryCode: "US",
          },
        },

        Recipient: {
          Contact: {
            PersonName: receipant_name,
            CompanyName: receipant_company,
            PhoneNumber: receipant_phone_number,
          },
          Address: {
            StreetLines: [receipant_add1, receipant_add2],
            City: receipant_city,
            StateOrProvinceCode: receipant_state,
            PostalCode: receipant_zip_code,
            CountryCode: "US",
            Residential: isRes,
          },
        },

        ShippingChargesPayment: {
          PaymentType: "SENDER",
          Payor: {
            ResponsibleParty: {
              AccountNumber: this.account.AccountNumber,
            },
          },
        },

        // SpecialServicesRequested,

        SmartPostDetail,

        LabelSpecification: {
          LabelFormatType: "COMMON2D",
          ImageType: "PNG",
          LabelStockType: "PAPER_4X6",
        },

        // RateRequestTypes: "LIST",
        // CustomerSelectedActualRateType: "PAYOR_ACCOUNT_SHIPMENT",
        MasterTrackingId,

        PackageCount: Pcount,

        // TotalShipmentWeight: {
        //   Units: "LB",
        //   Value: 150,
        // },

        RequestedPackageLineItems:
          type == "rate" ? packagesArray : [packagesArray[0]],

        // packagesArray,

        // RequestedPackageLineItems: [packagesArray[0]],
      },
    };

    return myShipment;
  }

  errorMapResopnse(item) {
    try {
      let response = {
        status: item.response.status,
        message: item.response.data.response.errors[0].message,
        data: {
          _id: this.asset._id,
          request_id: undefined,
          package_key: undefined,
          order_id: undefined,
          agent: "FEDEX",
          carrier: this.carrier,
          mail_class: this.mailClass,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.nick_name,
          },
        },
      };
      return response;
    } catch (error) {
      let response = {
        status: 503,
        // status: item.status ? item.status : 503,
        message: item.code ? item.code : "No response from remote",
        data: {
          _id: this.asset._id,
          request_id: undefined,
          package_key: undefined,
          order_id: undefined,
          agent: "FEDEX",
          carrier: this.carrier,
          mail_class: this.mailClass,
          asset: {
            code: this.asset.code,
            logo_url: this.asset.logo_url,
            description: this.asset.description,
            name: this.asset.nick_name,
          },
        },
      };

      return response;
    }
  }

  authDetail() {
    return {
      WebAuthenticationDetail: {
        UserCredential: {
          Key: this.account.Key,
          Password: this.account.Password,
        },
      },
      ClientDetail: {
        AccountNumber: this.account.AccountNumber,
        MeterNumber: this.account.MeterNumber,
      },
    };
  }

  async handleResonse(item, type = "ship", requestType = "shipment") {
    let response = {};
    let extra;
    // console.log("I got response!");
    //判断是array 还是 object ，统一返回数组
    const selectArrayOrObject = (input) => {
      let result = Array.isArray(input) ? input : [{ ...input }];
      return result;
    };

    let mutliFlag;

    let isScuss =
      type == "rate"
        ? item.HighestSeverity != "ERROR" && item.HighestSeverity != "FAILURE"
        : item.every(
            (e) =>
              e.HighestSeverity != "ERROR" && e.HighestSeverity != "FAILURE"
          );
    switch (true) {
      case isScuss:
        try {
          let rateInfo;
          let shipRateInfo;
          let calTotalWeight;
          let calTotalAmount;
          let total_charge;
          let billingWeight;
          let packagesRateDetail;
          let charge_detail;
          let tracking_array;

          if (requestType == "oneRate") {
            calTotalAmount =
              type == "ship"
                ? item
                    .map(
                      (item) =>
                        item.CompletedShipmentDetail.CompletedPackageDetails[0]
                          .PackageRating.PackageRateDetails[0].NetFedExCharge
                          .Amount
                    )
                    .reduce((a, c) => a + c)
                    .toFixed(2)
                : undefined;

            // calTotalWeight =
            //   type == "ship"
            //     ? item
            //         .map(
            //           (item) =>
            //             item.CompletedShipmentDetail.CompletedPackageDetails[0]
            //               .PackageRating.PackageRateDetails[0].BillingWeight
            //               .Value
            //         )
            //         .reduce((a, c) => a + c)
            //         .toFixed(2)
            //     : undefined;

            if (type == "rate") {
              rateInfo = item.RateReplyDetails[0].RatedShipmentDetails[0];
              mutliFlag =
                item.RateReplyDetails[0].RatedShipmentDetails[0]
                  .ShipmentRateDetail.RateType == "PAYOR_ACCOUNT_SHIPMENT"
                  ? "shipment"
                  : "package";
            } else {
              shipRateInfo =
                item[item.length - 1].CompletedShipmentDetail.ShipmentRating
                  .ShipmentRateDetails[0];
            }

            total_charge =
              type == "ship"
                ? calTotalAmount
                : rateInfo.ShipmentRateDetail.TotalNetFedExCharge.Amount;

            // billingWeight =
            //   type == "ship"
            //     ? requestType == "shipment"
            //       ? shipRateInfo.TotalBillingWeight.Value
            //       : parseFloat(calTotalWeight)
            //     : rateInfo.ShipmentRateDetail.TotalBillingWeight.Value;

            packagesRateDetail =
              type == "ship"
                ? item.map(
                    (item) =>
                      item.CompletedShipmentDetail.CompletedPackageDetails[0]
                        .PackageRating.PackageRateDetails[0]
                  )
                : rateInfo.RatedPackages;

            // console.log(packagesRateDetail);
            if (!packagesRateDetail) {
              charge_detail = [
                {
                  package_key: undefined,
                  baseCharges:
                    rateInfo.ShipmentRateDetail.TotalNetFreight.Amount,
                  // surCharges: rateInfo.ShipmentRateDetail.Surcharges,
                  totalCharges: total_charge,
                  BillingWeight: billingWeight,
                },
              ];
            } else {
              charge_detail = selectArrayOrObject(packagesRateDetail).map(
                (item, index) => {
                  if (type == "rate") item = item.PackageRateDetail;
                  let newItem = {
                    package_key: undefined,
                    baseCharges: item.NetFreight.Amount,
                    // surCharges: [item.TotalSurcharges],
                    totalCharges: item.NetFedExCharge
                      ? item.NetFedExCharge.Amount
                      : undefined,
                    BillingWeight: item.BillingWeight
                      ? item.BillingWeight.Value
                      : undefined,
                  };
                  return newItem;
                }
              );
            }
          } else {
            calTotalAmount =
              type == "ship"
                ? item
                    .map(
                      (item) =>
                        item.CompletedShipmentDetail.CompletedPackageDetails[0]
                          .PackageRating.PackageRateDetails[0].NetFedExCharge
                          .Amount
                    )
                    .reduce((a, c) => a + c)
                    .toFixed(2)
                : undefined;
            calTotalWeight =
              type == "ship"
                ? item
                    .map(
                      (item) =>
                        item.CompletedShipmentDetail.CompletedPackageDetails[0]
                          .PackageRating.PackageRateDetails[0].BillingWeight
                          .Value
                    )
                    .reduce((a, c) => a + c)
                    .toFixed(2)
                : undefined;

            if (type == "rate") {
              rateInfo = item.RateReplyDetails[0].RatedShipmentDetails[0];
              mutliFlag =
                item.RateReplyDetails[0].RatedShipmentDetails[0]
                  .ShipmentRateDetail.RateType == "PAYOR_ACCOUNT_SHIPMENT"
                  ? "shipment"
                  : "package";
            } else {
              // 如果是shipment 的计价方式需要用 最后一个包裹来结算总价
              shipRateInfo =
                item[item.length - 1].CompletedShipmentDetail.ShipmentRating
                  .ShipmentRateDetails[0];
            }

            total_charge =
              type == "ship"
                ? requestType == "shipment"
                  ? shipRateInfo.TotalNetFedExCharge.Amount
                  : parseFloat(calTotalAmount)
                : rateInfo.ShipmentRateDetail.TotalNetFedExCharge.Amount;

            billingWeight =
              type == "ship"
                ? requestType == "shipment"
                  ? shipRateInfo.TotalBillingWeight.Value
                  : parseFloat(calTotalWeight)
                : rateInfo.ShipmentRateDetail.TotalBillingWeight.Value;

            packagesRateDetail =
              type == "ship"
                ? item.map(
                    (item) =>
                      item.CompletedShipmentDetail.CompletedPackageDetails[0]
                        .PackageRating.PackageRateDetails[0]
                  )
                : rateInfo.RatedPackages;

            // console.log(packagesRateDetail);

            charge_detail;
            if (!packagesRateDetail) {
              charge_detail = [
                {
                  package_key: undefined,
                  baseCharges:
                    rateInfo.ShipmentRateDetail.TotalNetFreight.Amount,
                  surCharges: rateInfo.ShipmentRateDetail.Surcharges,
                  totalCharges: total_charge,
                  BillingWeight: billingWeight,
                },
              ];
            } else {
              charge_detail = selectArrayOrObject(packagesRateDetail).map(
                (item, index) => {
                  if (type == "rate") item = item.PackageRateDetail;
                  let newItem = {
                    package_key: undefined,
                    baseCharges: item.NetFreight.Amount,
                    surCharges: item.Surcharges,
                    totalCharges: item.NetFedExCharge
                      ? item.NetFedExCharge.Amount
                      : undefined,
                    BillingWeight: item.BillingWeight
                      ? item.BillingWeight.Value
                      : undefined,
                  };
                  return newItem;
                }
              );
            }
          }

          //shipping section
          tracking_array =
            type == "ship"
              ? selectArrayOrObject(item).map(
                  (e) =>
                    e.CompletedShipmentDetail.CompletedPackageDetails[0]
                      .TrackingIds[0].TrackingNumber
                )
              : [];

          extra =
            type == "ship"
              ? {
                  parcel_list: await Promise.map(item, async (e, index) => {
                    let url = await ImageUpload(
                      e.CompletedShipmentDetail.CompletedPackageDetails[0].Label
                        .Parts[0].Image,
                      e.CompletedShipmentDetail.CompletedPackageDetails[0]
                        .TrackingIds[0].TrackingNumber,
                      "png",
                      false,
                      false
                    );

                    let obj = {
                      label: [url],
                      tracking_numbers: [
                        e.CompletedShipmentDetail.CompletedPackageDetails[0]
                          .TrackingIds[0].TrackingNumber,
                      ],
                      weight:
                        requestType == "oneRate"
                          ? undefined
                          : e.CompletedShipmentDetail.CompletedPackageDetails[0]
                              .PackageRating.PackageRateDetails[0].BillingWeight
                              .Value,
                      postage: {
                        billing_amount: {
                          baseCharges:
                            e.CompletedShipmentDetail.CompletedPackageDetails[0]
                              .PackageRating.PackageRateDetails[0]
                              .NetFedExCharge.Amount,
                          surCharges:
                            e.CompletedShipmentDetail.CompletedPackageDetails[0]
                              .PackageRating.PackageRateDetails[0].Surcharges,
                        },
                      },
                    };

                    return obj;
                  }),
                }
              : undefined;

          response = {
            status: 200,
            data: {
              _id: this.asset._id, // service id
              agent: "FEDEX",
              carrier: this.carrier,
              mail_class: this.mailClass,
              description: this.asset.description,
              unit_weight: "lb", // api get in future --》 ship_parameters
              //   length_unit: "inch",
              weight: billingWeight,
              price: {
                rateType: mutliFlag,
                total: total_charge,
                detail: charge_detail,
              },
              asset: {
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
              request_id: undefined,
              package_key: undefined,
              order_id: undefined,
              asset: {
                code: this.asset.code,
                logo_url: this.asset.logo_url,
                description: this.asset.description,
                name: this.asset.name,
              },
              agent: "FEDEX",
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
          status: 422,
          message:
            type == "rate"
              ? item.Notifications.map((item) => item.Message)
              : item.map((item) => item.Notifications[0].Message),
          data: {
            _id: this.asset._id,
            request_id: undefined,
            package_key: undefined,
            order_id: undefined,
            agent: "FEDEX",
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

  async ship(shipment, requestType = "shipment", url = "ShipService_v23.wsdl") {
    try {
      requestType = ["ground home delivery", "smartpost"].includes(
        this.mailClass.toLowerCase()
      )
        ? "package"
        : requestType;

      let client = await soap.createClientAsync(
        path.join(__dirname, "wsdl/production", url)
      );

      let packageCount = shipment.parcel_information.parcel_list.length;
      // console.log(
      //   util.inspect(
      //     {
      //       ...this.authDetail(),
      //       ...this.shipmentMapRequest(shipment, "ship"),
      //     },
      //     {
      //       showHidden: false,
      //       depth: null,
      //       colors: true,
      //     }
      //   )
      // );

      let shipAsync = util.promisify(client.processShipment);

      let firstShipment = await shipAsync({
        ...this.authDetail(),
        ...this.shipmentMapRequest(shipment, "ship"),
      });

      console.log(
        util.inspect([firstShipment], {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
      // return [firstShipment];
      let response = [];
      if (shipment.parcel_information.parcel_list.length == 1) {
        response = [firstShipment];
        // return response
        let Response = await this.handleResonse(response, "ship");
        // console.log(
        //   util.inspect(Response, {
        //     showHidden: false,
        //     depth: null,
        //     colors: true,
        //   })
        // );
        return Response;
      }
      // console.log(
      //   util.inspect(firstShipment, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      shipment.parcel_information.parcel_list.shift();

      if (
        firstShipment.HighestSeverity != "ERROR" &&
        firstShipment.HighestSeverity != "FAILURE"
      ) {
        if (requestType == "shipment") {
          let {
            sender_information,
            receipant_information,
            parcel_information,
          } = shipment;

          for (
            let i = 0;
            i < shipment.parcel_information.parcel_list.length;
            i++
          ) {
            let result = await shipAsync({
              ...this.authDetail(),
              ...this.shipmentMapRequest(
                {
                  sender_information,
                  receipant_information,
                  parcel_information: {
                    ...parcel_information,
                    parcel_list: [shipment.parcel_information.parcel_list[i]],
                  },
                },
                "ship",
                i + 2,
                packageCount,
                firstShipment.CompletedShipmentDetail.MasterTrackingId
                  .TrackingNumber
              ),
            });
            response.push(result);
            // console.log(response.length)
          }
        } else {
          response = await Promise.all(
            await shipment.parcel_information.parcel_list.map(
              async (item, index) => {
                let {
                  sender_information,
                  receipant_information,
                  parcel_information,
                } = shipment;
                shipment.parcel_information.parcel_list = [item];
                let result = await shipAsync({
                  ...this.authDetail(),
                  ...this.shipmentMapRequest(
                    {
                      sender_information,
                      receipant_information,
                      parcel_information,
                    },
                    "ship",
                    index + 2,
                    packageCount,
                    firstShipment.CompletedShipmentDetail.MasterTrackingId
                      .TrackingNumber
                  ),
                });
                // console.log(
                //   util.inspect(result, {
                //     showHidden: false,
                //     depth: null,
                //     colors: true,
                //   })
                // );
                return result;
              }
            )
          );
        }
      } else {
      }

      // console.log(
      //   util.inspect(response[response.length - 1], {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      (await response).unshift(firstShipment);

      // return response;

      let Response = await this.handleResonse(response, "ship", requestType);

      // console.log(
      //   util.inspect(Response, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      return Response;
    } catch (error) {
      console.log(error);
      // return;
      console.log("error happened");
    }
  }

  async rate(shipment, url = "RateService_v24.wsdl") {
    // console.log(shipment)
    try {
      let client = await soap.createClientAsync(
        path.join(__dirname, "wsdl/production", url)
      );

      // console.log(
      //   util.inspect(
      //     {
      //       ...this.authDetail(),
      //       ...this.shipmentMapRequest(shipment),
      //     },
      //     {
      //       showHidden: false,
      //       depth: null,
      //       colors: true,
      //     }
      //   )
      // );

      let getRatesAsync = util.promisify(client.getRates);

      let response = await getRatesAsync(
        {
          ...this.authDetail(),
          ...this.shipmentMapRequest(shipment),
        },
        { timeout: 6000 }
      );

      // console.log(
      //   util.inspect(response, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );

      // return response;

      let Response = await this.handleResonse(response, "rate");

      // console.log(
      //   util.inspect(Response, {
      //     showHidden: false,
      //     depth: null,
      //     colors: true,
      //   })
      // );
      return Response;
    } catch (error) {
      console.log(error);
      // return;
      console.log("error happened");
      return this.errorMapResopnse(error);
    }
  }

  // test enviroment
  // async ship(shipment, requestType = "shipment", url = "ShipService_v23.wsdl") {
  //   try {
  //     requestType = ["ground home delivery", "smartpost"].includes(
  //       this.mailClass.toLowerCase()
  //     )
  //       ? "package"
  //       : requestType;

  //     let client = await soap.createClientAsync(
  //       path.join(__dirname, "wsdl/test", url)
  //     );

  //     let packageCount = shipment.parcel_information.parcel_list.length;
  //     // console.log(
  //     //   util.inspect(
  //     //     {
  //     //       ...this.authDetail(),
  //     //       ...this.shipmentMapRequest(shipment, "ship"),
  //     //     },
  //     //     {
  //     //       showHidden: false,
  //     //       depth: null,
  //     //       colors: true,
  //     //     }
  //     //   )
  //     // );

  //     let shipAsync = util.promisify(client.processShipment);

  //     let firstShipment = await shipAsync({
  //       ...this.authDetail(),
  //       ...this.shipmentMapRequest(shipment, "ship"),
  //     });

  //     console.log(
  //       util.inspect([firstShipment], {
  //         showHidden: false,
  //         depth: null,
  //         colors: true,
  //       })
  //     );
  //     // return [firstShipment];
  //     let response = [];
  //     if (shipment.parcel_information.parcel_list.length == 1) {
  //       response = [firstShipment];
  //       // return response
  //       let Response = await this.handleResonse(response, "ship");
  //       // console.log(
  //       //   util.inspect(Response, {
  //       //     showHidden: false,
  //       //     depth: null,
  //       //     colors: true,
  //       //   })
  //       // );
  //       return Response;
  //     }
  //     // console.log(
  //     //   util.inspect(firstShipment, {
  //     //     showHidden: false,
  //     //     depth: null,
  //     //     colors: true,
  //     //   })
  //     // );
  //     shipment.parcel_information.parcel_list.shift();

  //     if (
  //       firstShipment.HighestSeverity != "ERROR" &&
  //       firstShipment.HighestSeverity != "FAILURE"
  //     ) {
  //       if (requestType == "shipment") {
  //         let {
  //           sender_information,
  //           receipant_information,
  //           parcel_information,
  //         } = shipment;

  //         for (
  //           let i = 0;
  //           i < shipment.parcel_information.parcel_list.length;
  //           i++
  //         ) {
  //           let result = await shipAsync({
  //             ...this.authDetail(),
  //             ...this.shipmentMapRequest(
  //               {
  //                 sender_information,
  //                 receipant_information,
  //                 parcel_information: {
  //                   ...parcel_information,
  //                   parcel_list: [shipment.parcel_information.parcel_list[i]],
  //                 },
  //               },
  //               "ship",
  //               i + 2,
  //               packageCount,
  //               firstShipment.CompletedShipmentDetail.MasterTrackingId
  //                 .TrackingNumber
  //             ),
  //           });
  //           response.push(result);
  //           // console.log(response.length)
  //         }
  //       } else {
  //         response = await Promise.all(
  //           await shipment.parcel_information.parcel_list.map(
  //             async (item, index) => {
  //               let {
  //                 sender_information,
  //                 receipant_information,
  //                 parcel_information,
  //               } = shipment;
  //               shipment.parcel_information.parcel_list = [item];
  //               let result = await shipAsync({
  //                 ...this.authDetail(),
  //                 ...this.shipmentMapRequest(
  //                   {
  //                     sender_information,
  //                     receipant_information,
  //                     parcel_information,
  //                   },
  //                   "ship",
  //                   index + 2,
  //                   packageCount,
  //                   firstShipment.CompletedShipmentDetail.MasterTrackingId
  //                     .TrackingNumber
  //                 ),
  //               });
  //               // console.log(
  //               //   util.inspect(result, {
  //               //     showHidden: false,
  //               //     depth: null,
  //               //     colors: true,
  //               //   })
  //               // );
  //               return result;
  //             }
  //           )
  //         );
  //       }
  //     } else {
  //     }

  //     console.log(
  //       util.inspect(response[response.length - 1], {
  //         showHidden: false,
  //         depth: null,
  //         colors: true,
  //       })
  //     );
  //     (await response).unshift(firstShipment);

  //     // return response;

  //     let Response = await this.handleResonse(response, "ship");

  //     // console.log(
  //     //   util.inspect(Response, {
  //     //     showHidden: false,
  //     //     depth: null,
  //     //     colors: true,
  //     //   })
  //     // );
  //     return Response;
  //   } catch (error) {
  //     console.log(error);
  //     // return;
  //     console.log("error happened");
  //   }
  // }

  // async rate(shipment, url = "RateService_v24.wsdl") {
  //   // console.log(shipment)
  //   try {
  //     let client = await soap.createClientAsync(
  //       path.join(__dirname, "wsdl/test", url)
  //     );

  //     //   console.log(
  //     //     util.inspect(
  //     //       {
  //     //         ...this.authDetail(),
  //     //         ...this.shipmentMapRequest(shipment),
  //     //       },
  //     //       {
  //     //         showHidden: false,
  //     //         depth: null,
  //     //         colors: true,
  //     //       }
  //     //     )
  //     //   );

  //     let getRatesAsync = util.promisify(client.getRates);

  //     let response = await getRatesAsync(
  //       {
  //         ...this.authDetail(),
  //         ...this.shipmentMapRequest(shipment),
  //       },
  //       { timeout: 6000 }
  //     );

  //     console.log(
  //       util.inspect(response, {
  //         showHidden: false,
  //         depth: null,
  //         colors: true,
  //       })
  //     );

  //     // return response;

  //     let Response = await this.handleResonse(response, "rate");

  //     console.log(
  //       util.inspect(Response, {
  //         showHidden: false,
  //         depth: null,
  //         colors: true,
  //       })
  //     );
  //     return Response;
  //   } catch (error) {
  //     console.log(error);
  //     // return;
  //     console.log("error happened");
  //     return this.errorMapResopnse(error);
  //   }
  // }

  // void = () => {

  // }

  // track = () => {

  // }

  // verify = () => {

  // }
}

module.exports = { FEDEX };
