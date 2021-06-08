const createClient = require("ipfs-http-client");
const bs58 = require("bs58");
const axios = require("axios");
const Web3 = require("web3");
const { SLAABI } = require("./abis");
const { NetworkAnalyticsABI } = require("./abis");
const { fromAscii } = require("web3-utils");
const ipfsClient = createClient({ url: process.env.IPFS_URI });
const debug = require("debug");

async function storeDataOnIFPS(ipfsData) {
  const dataString = JSON.stringify(ipfsData);
  const buffer = Buffer.from(dataString, "utf-8");
  const { path: ipfsHash } = await ipfsClient.add(buffer);
  return ipfsHash;
}

function periodTypeNumberToString(periodType) {
  return ["Hourly", "Daily", "Weekly", "BiWeekly", "Monthly", "Yearly"][
    periodType
  ];
}

function ipfsHashToBytes32(ipfsHash) {
  return bs58.decode(ipfsHash).slice(2).toString("hex");
}

function bytes32ToIPFSCID(bytes32) {
  return bs58.encode(Buffer.from(`1220${bytes32.replace("0x", "")}`, "hex"));
}

async function getIPFSDataFromCID(cid) {
  const { data } = await axios.get(process.env.IPFS_URI + "/ipfs/" + cid);
  return data;
}

async function getAnalyticsFromNetworkAnalyticsContract(
  params,
  networkName,
  periodType
) {
  const web3 = new Web3(process.env.WEB3_URI);
  const networkAnalyticsContract = new web3.eth.Contract(
    NetworkAnalyticsABI,
    params.network_analytics_address
  );
  const ipfsBytes32 = await networkAnalyticsContract.methods
    .periodAnalytics(fromAscii(networkName), periodType, params.period_id)
    .call();
  const ipfsCID = bytes32ToIPFSCID(ipfsBytes32);
  log("Analytics IPFS url: " + process.env.IPFS_URI + "/ipfs/" + ipfsCID);
  return getIPFSDataFromCID(ipfsCID);
}

async function getSLAData(address) {
  const web3 = new Web3(process.env.WEB3_URI);
  const slaContract = new web3.eth.Contract(SLAABI, address);
  const ipfsCID = await slaContract.methods.ipfsHash().call();
  log("SLA IPFS url: " + process.env.IPFS_URI + "/ipfs/" + ipfsCID);
  const periodType = await slaContract.methods.periodType().call();
  const networkName = await slaContract.methods.extraData(0).call();
  const ipfsData = await getIPFSDataFromCID(ipfsCID);
  return { ...ipfsData, periodType, networkName };
}

function log(message) {
  const logger = debug("develop");
  logger(message);
}

module.exports = {
  getSLAData,
  getAnalyticsFromNetworkAnalyticsContract,
  periodTypeNumberToString,
  storeDataOnIFPS,
  ipfsHashToBytes32,
  log,
};
