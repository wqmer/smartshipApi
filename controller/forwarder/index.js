const ticket = require("./ticket");
const carrier = require("./carrier");
const service = require("./service");
const user = require("./user");

module.exports = {
  ...ticket,
  ...carrier,
  ...service,
  ...user
};
