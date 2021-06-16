require("dotenv").config();
const axios = require("axios");
const Web3 = require("web3");
const { SLAABI, MessengerABI } = require("./abis");
const debug = require("debug");

const {
  getValidatorInformation,
  getEndingEpoch,
  getStartingEpoch,
} = require("./networks/harmony");
const { networkNames } = require("./constants");

async function getSLAData(address) {
  const web3 = new Web3(process.env.WEB3_URI);
  const slaContract = new web3.eth.Contract(SLAABI, address);
  const ipfsCID = await slaContract.methods.ipfsHash().call();
  log("SLA IPFS url: " + process.env.IPFS_URI + "/ipfs/" + ipfsCID);
  const periodType = await slaContract.methods.periodType().call();
  const networkName = await slaContract.methods.extraData(0).call();
  const { data } = await axios.get(process.env.IPFS_URI + "/ipfs/" + ipfsCID);
  const messengerAddress = await slaContract.methods.messengerAddress().call();
  return { ...data, periodType, networkName, messengerAddress };
}

function log(message) {
  const logger = debug("develop");
  logger(message);
}

async function getValidatorAPR(params) {
  const slaData = await getSLAData(params.sla_address);
  log("SLA Data:");
  log(slaData);
  const web3 = new Web3(process.env.WEB3_URI);
  const messenger = new web3.eth.Contract(
    MessengerABI,
    slaData.messengerAddress
  );
  const precision = await messenger.methods.messengerPrecision().call();
  let apr;
  switch (slaData.serviceTicker) {
    case networkNames.ONE:
      log(params);
      const startingEpoch = await getStartingEpoch(params);
      const endingEpoch = await getEndingEpoch(params);
      const validatorApr = await getValidatorInformation(
        slaData.serviceAddress
      );
      log(validatorApr);
      const validAprs = validatorApr.apr?.filter(
        (apr) => apr.epoch >= startingEpoch && apr.epoch <= endingEpoch
      );
      apr =
        validAprs && validAprs.length > 0
          ? validAprs.reduce((result, apr) => result + Number(apr.apr), 0) /
            validAprs.length
          : 0;
      // multiply by 100 to represent a percentage
      apr *= 100;
      break;
    default:
      throw new Error(
        "Staking efficiency not implemented for network: " +
          slaData.serviceTicker
      );
  }
  return Math.floor(apr * precision);
}

exports["staking-efficiency-indexer"] = async (req, res) => {
  const { id, data } = req.body;
  console.log("Request Body:");
  console.log(req.body);
  const requestData = {
    sla_address: data.sla_address,
    sla_monitoring_start: data.sla_monitoring_start,
    sla_monitoring_end: data.sla_monitoring_end,
  };
  const result = await getValidatorAPR(requestData);
  console.log("result:");
  console.log(result);
  res.send({
    jobRunID: id,
    data: {
      result,
    },
  });
};
