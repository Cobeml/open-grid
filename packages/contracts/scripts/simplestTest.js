const { ethers } = require("hardhat");

const SENDER_ADDRESS_POLYGON = "0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29";
const MINIMAL_RECEIVER_ADDRESS = "0xB5c2Ce79CcB504509DB062C1589F6004Cb9d4bB6";

async function createCustomSender() {
    console.log("=== CREATING CUSTOM SIMPLE SENDER ===");
    console.log("This will send just the number 27 instead of complex node data");
    
    const customSenderContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

contract SimplestSender is OApp {
    using OptionsBuilder for bytes;
    
    uint32 public constant BASE_SEPOLIA_EID = 40245;
    address public destinationContract;
    uint256 public messagesSent = 0;
    
    event SimpleSent(uint256 value, uint256 messageSize);
    
    constructor(
        address _endpoint,
        address _owner,
        address _destination
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        destinationContract = _destination;
    }
    
    function sendSimpleNumber(uint256 _number) external payable onlyOwner {
        require(destinationContract != address(0), "No destination");
        
        // Encode just a single number - simplest possible message
        bytes memory payload = abi.encode(_number);
        
        console.log("Payload size:", payload.length, "bytes");
        
        // Minimal options
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(100000, 0); // Very low gas
        
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        _lzSend(
            BASE_SEPOLIA_EID,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
        
        messagesSent++;
        emit SimpleSent(_number, payload.length);
    }
    
    function quoteFee(uint256 _number) external view returns (uint256) {
        bytes memory payload = abi.encode(_number);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(100000, 0);
            
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        return fee.nativeFee;
    }
    
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        revert("Sender only");
    }
}`;
    
    console.log("📄 Simplest Sender contract created");
    console.log("Features:");
    console.log("- Sends single uint256 number");
    console.log("- Payload size: 32 bytes (vs 2819 bytes)");
    console.log("- Minimal gas requirements");
    console.log("- Should avoid 0xa512e2ff error");
    
    return customSenderContract;
}

async function deploySimplestSender() {
    console.log("\n=== DEPLOYING SIMPLEST SENDER ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`Deploying from: ${wallet.address}`);
    
    // Create the contract code file first
    const fs = require('fs');
    const contractCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

contract SimplestSender is OApp {
    using OptionsBuilder for bytes;
    
    uint32 public constant BASE_SEPOLIA_EID = 40245;
    address public destinationContract;
    uint256 public messagesSent = 0;
    
    event SimpleSent(uint256 value, uint256 messageSize);
    
    constructor(
        address _endpoint,
        address _owner,
        address _destination
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        destinationContract = _destination;
    }
    
    function sendSimpleNumber(uint256 _number) external payable onlyOwner {
        require(destinationContract != address(0), "No destination");
        
        bytes memory payload = abi.encode(_number);
        
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(100000, 0);
        
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        _lzSend(
            BASE_SEPOLIA_EID,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
        
        messagesSent++;
        emit SimpleSent(_number, payload.length);
    }
    
    function quoteFee(uint256 _number) external view returns (uint256) {
        bytes memory payload = abi.encode(_number);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(100000, 0);
            
        MessagingFee memory fee = _quote(BASE_SEPOLIA_EID, payload, options, false);
        return fee.nativeFee;
    }
    
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        revert("Sender only");
    }
}`;
    
    fs.writeFileSync('/Users/cobeliu/Developing/network-misfits/packages/contracts/contracts/SimplestSender.sol', contractCode);
    console.log("✅ Contract file created");
    
    try {
        const SimplestSender = await ethers.getContractFactory("SimplestSender", wallet);
        
        console.log("Deploying SimplestSender...");
        const POLYGON_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
        
        const sender = await SimplestSender.deploy(
            POLYGON_ENDPOINT,
            wallet.address,
            MINIMAL_RECEIVER_ADDRESS
        );
        
        console.log(`✅ Deployment transaction: ${sender.deploymentTransaction().hash}`);
        
        await sender.waitForDeployment();
        const senderAddress = await sender.getAddress();
        
        console.log(`🎉 SimplestSender deployed to: ${senderAddress}`);
        
        return { sender, senderAddress };
        
    } catch (error) {
        console.error("Deployment failed:", error.message);
        return null;
    }
}

async function configureSender(sender, senderAddress) {
    console.log("\n=== CONFIGURING SENDER ===");
    
    try {
        // Set peer relationship
        const receiverBytes32 = ethers.zeroPadValue(MINIMAL_RECEIVER_ADDRESS, 32);
        const setPeerTx = await sender.setPeer(40245, receiverBytes32); // Base Sepolia EID
        await setPeerTx.wait();
        console.log("✅ Peer relationship configured");
        
        return true;
        
    } catch (error) {
        console.error("Configuration failed:", error.message);
        return false;
    }
}

async function updateReceiverPeer(senderAddress) {
    console.log("\n=== UPDATING RECEIVER PEER ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, baseProvider);
    
    const receiverABI = ["function setPeer(uint32 _eid, bytes32 _peer) external"];
    const receiver = new ethers.Contract(MINIMAL_RECEIVER_ADDRESS, receiverABI, wallet);
    
    try {
        const senderBytes32 = ethers.zeroPadValue(senderAddress, 32);
        const setPeerTx = await receiver.setPeer(40267, senderBytes32); // Polygon Amoy EID
        await setPeerTx.wait();
        console.log("✅ Receiver peer updated for new sender");
        
        return true;
        
    } catch (error) {
        console.error("Receiver peer update failed:", error.message);
        return false;
    }
}

async function sendSimpleTest(sender) {
    console.log("\n=== SENDING SIMPLEST TEST MESSAGE ===");
    
    try {
        // Quote fee for sending number 27
        const fee = await sender.quoteFee(27);
        console.log(`Fee for sending number 27: ${ethers.formatEther(fee)} POL`);
        console.log("Payload size: 32 bytes (single uint256)");
        
        // Check balance
        const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
        const privateKey = process.env.PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        
        console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);
        
        if (balance < fee) {
            console.log("❌ Insufficient balance");
            return false;
        }
        
        console.log("🚀 Sending simple number: 27");
        const tx = await sender.sendSimpleNumber(27, { value: fee });
        console.log(`✅ Simple test sent: ${tx.hash}`);
        console.log(`🔍 Monitor at: https://layerzeroscan.com/tx/${tx.hash}`);
        
        return tx.hash;
        
    } catch (error) {
        console.error("Simple test failed:", error.message);
        return false;
    }
}

async function monitorSimpleTest(txHash) {
    console.log("\n=== MONITORING SIMPLE TEST ===");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const receiverABI = [
        "function getStats() external view returns (uint256, uint256, string memory, uint256)",
        "function isWorking() external view returns (bool)"
    ];
    
    const receiver = new ethers.Contract(MINIMAL_RECEIVER_ADDRESS, receiverABI, baseProvider);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 * 20 seconds = 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const stats = await receiver.getStats();
            const isWorking = await receiver.isWorking();
            
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Check ${attempts + 1}: Messages=${stats[0]}, Value=${stats[1]}, Type="${stats[2]}", Working=${isWorking}`);
            
            if (isWorking && stats[1] == 27) {
                console.log(`\n🎉 BREAKTHROUGH! Simple message successfully delivered!`);
                console.log(`✅ Received value: ${stats[1]} (our test number 27)`);
                console.log(`✅ LayerZero connectivity CONFIRMED!`);
                console.log(`❌ Previous errors were due to complex message format`);
                
                console.log(`\n🎯 SOLUTION CONFIRMED:`);
                console.log(`- Simple messages work perfectly`);
                console.log(`- Complex 27-node structure was too large`);
                console.log(`- Need to implement batching for full node data`);
                
                return true;
            }
            
            if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
            attempts++;
            
        } catch (error) {
            console.error("Monitoring error:", error.message);
            attempts++;
        }
    }
    
    console.log("⚠️ Simple test still pending. Check LayerZero Scan:");
    console.log(`https://layerzeroscan.com/tx/${txHash}`);
    return false;
}

async function main() {
    console.log("SIMPLEST LAYERZERO TEST");
    console.log("======================");
    console.log("Goal: Send just the number 27 (32 bytes vs 2819 bytes)");
    console.log("This will prove LayerZero works and isolate the parsing issue");
    
    // Step 1: Create and deploy simplest sender
    await createCustomSender();
    const deployment = await deploySimplestSender();
    if (!deployment) return;
    
    const { sender, senderAddress } = deployment;
    
    // Step 2: Configure sender
    const senderConfigured = await configureSender(sender, senderAddress);
    if (!senderConfigured) return;
    
    // Step 3: Update receiver to trust new sender
    const receiverUpdated = await updateReceiverPeer(senderAddress);
    if (!receiverUpdated) return;
    
    // Step 4: Send simple test
    const txHash = await sendSimpleTest(sender);
    if (!txHash) return;
    
    // Step 5: Monitor results
    const success = await monitorSimpleTest(txHash);
    
    console.log(`\n📍 Simplest Sender: ${senderAddress}`);
    console.log(`📍 Minimal Receiver: ${MINIMAL_RECEIVER_ADDRESS}`);
    console.log(`🔍 Transaction: ${txHash}`);
    
    if (success) {
        console.log(`\n🚀 NEXT STEPS:`);
        console.log(`1. ✅ LayerZero connectivity proven`);
        console.log(`2. 🔧 Implement node batching (3-5 nodes per message)`);
        console.log(`3. 🎯 Use simple coordinate format (no strings)`);
        console.log(`4. 🌐 Update frontend to new receiver address`);
    }
}

main().catch(console.error);