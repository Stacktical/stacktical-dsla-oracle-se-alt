const { log } = require("./helpers");
require("dotenv").config();

const {
  getValidatorInformation,
  getEndingEpoch,
  getStartingEpoch,
} = require("./networks/harmony");
const { getSLAData } = require("./helpers");

const { fromAscii, padRight } = require("web3-utils");
const { networkNames } = require("./constants");

async function getValidatorAPR(params) {
  const slaData = await getSLAData(params.sla_address);
  log("SLA Data from IPFS:");
  log(slaData);

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
      const apr =
        validAprs && validAprs.length > 0
          ? validAprs.reduce((result, apr) => result + Number(apr.apr), 0) /
            validAprs.length
          : 0;
      const precision = 10000;
      const { hits, misses } = {
        hits: Math.round(apr * precision),
        misses: Math.round((1 - apr) * precision),
      };
      log("hits: " + hits + ", misses: " + misses);
      const response = padRight(fromAscii(hits + "," + misses), 64);
      log("hits,misses parsed to bytes32: " + response);
      return response;
      break;
    default:
      throw new Error(
        "Staking efficiency not implemented for network: " +
          slaData.serviceTicker
      );
  }
}

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */

exports["dsla-indexer"] = async (req, res) => {
  const { id, data } = req.body;
  console.log("Request Body:");
  console.log(req.body);
  let result;
  switch (data.job_type) {
    case "staking_efficiency":
      // eslint-disable-next-line no-case-declarations
      const getAPR = {
        sla_address: data.sla_address,
        sla_monitoring_start: data.sla_monitoring_start,
        sla_monitoring_end: data.sla_monitoring_end,
      };
      result = await getValidatorAPR(getAPR);
      break;
    default:
      throw new Error("Job type not identified");
  }
  console.log("result:");
  console.log(result);
  res.send({
    jobRunID: id,
    data: {
      result,
    },
  });
};
