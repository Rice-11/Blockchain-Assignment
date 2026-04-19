const Crowdfunding = artifacts.require("Crowdfunding");
const UserManagement = artifacts.require("UserManagement");

module.exports = function (deployer) {
  deployer.deploy(Crowdfunding);
  deployer.deploy(UserManagement);
};
