import { ethers, network } from "hardhat";

async function main() {
  console.log(`Deploying NodeFunding to network: ${network.name}`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const Funding = await ethers.getContractFactory("NodeFunding");
  const funding = await Funding.deploy();
  await funding.waitForDeployment();

  const address = await funding.getAddress();
  console.log(`NodeFunding deployed at: ${address}`);

  // Print suggestions for frontend env var
  const chainId = network.config.chainId;
  if (chainId === 296) {
    console.log("Set NEXT_PUBLIC_HEDERA_TESTNET_FUNDING_ADDRESS=", address);
  } else if (chainId === 545) {
    console.log("Set NEXT_PUBLIC_FLOW_TESTNET_FUNDING_ADDRESS=", address);
  } else {
    console.log("Set funding address env var for chainId", chainId, ":", address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


