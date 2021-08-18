const _ = require("lodash");
const moment = require("moment");
require("dotenv").config();
const Ib =
  require("../../services/shipping_module/carrier/InternationalBridge").InternationalBridge;
const { responseClient, md5, MD5_SUFFIX } = require("../util");

const { IBProdEndpoint, IBUsername, IBPassword } = process.env;

const addressValidate = async (req, res) => {
  try {
    let account = {
      username: IBUsername,
      password: IBPassword,
    };
    let ib = new Ib({ ...account }, IBProdEndpoint);
    let result = await ib.validateAddress(req.body);
    responseClient(
      res,
      result.status,
      result.status == 200 ? 0 : 1,
      result.status == 200 ? "success" : "fail",
      result.data
    );
  } catch (error) {
    console.log(error);
    responseClient(res);
  }
};

module.exports = {
  addressValidate,
};
