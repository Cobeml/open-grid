const { ethers } = require("hardhat");

const CHAINLINK_MONITOR_ADDRESS = "0x5853a99Aa16BBcabe1EA1a92c09F984643c04fdB";
const REQUEST_TX_HASH = "0x2c922ae5ea2261a89d829563164d8195dcfbad2d93561dde1185fc8dbcac0d4c";

async function checkChainlinkRequest() {
    console.log("=== ANALYZING CHAINLINK FUNCTIONS REQUEST ===");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    
    try {
        // Get transaction receipt
        console.log(`Checking transaction: ${REQUEST_TX_HASH}`);
        const receipt = await provider.getTransactionReceipt(REQUEST_TX_HASH);
        
        if (!receipt) {
            console.log("❌ Transaction not found");
            return;
        }
        
        console.log(`Transaction status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        console.log(`Block number: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Look for ChainlinkRequestSent event
        const requestSentTopic = ethers.keccak256(ethers.toUtf8Bytes("ChainlinkRequestSent(bytes32)"));
        
        const requestEvents = receipt.logs.filter(log => 
            log.address.toLowerCase() === CHAINLINK_MONITOR_ADDRESS.toLowerCase() &&
            log.topics[0] === requestSentTopic
        );
        
        if (requestEvents.length > 0) {
            const requestId = requestEvents[0].topics[1];
            console.log(`✅ Chainlink request sent successfully`);
            console.log(`Request ID: ${requestId}`);
            
            // Now check for response events
            await checkForResponse(provider, requestId);
        } else {
            console.log("❌ No ChainlinkRequestSent event found");
            console.log("Logs found:", receipt.logs.length);
        }
        
    } catch (error) {
        console.error("Error checking request:", error.message);
    }
}

async function checkForResponse(provider, requestId) {
    console.log("\n=== CHECKING FOR CHAINLINK RESPONSE ===");
    
    const monitorABI = [
        "event ResponseReceived(bytes32 indexed requestId, bytes response, bytes err)",
        "function s_lastResponse() external view returns (bytes memory)",
        "function s_lastError() external view returns (bytes memory)",
        "function dataCount() external view returns (uint256)"
    ];
    
    const monitor = new ethers.Contract(CHAINLINK_MONITOR_ADDRESS, monitorABI, provider);
    
    try {
        // Check current state
        const dataCount = await monitor.dataCount();
        const lastResponse = await monitor.s_lastResponse();
        const lastError = await monitor.s_lastError();
        
        console.log(`Current data count: ${dataCount}`);
        console.log(`Last response length: ${lastResponse.length}`);
        console.log(`Last error length: ${lastError.length}`);
        
        if (lastError.length > 0) {
            console.log(`❌ Chainlink Functions error: ${ethers.toUtf8String(lastError)}`);
        }
        
        if (lastResponse.length > 0) {
            console.log(`✅ Response received (${lastResponse.length} bytes)`);
            
            if (dataCount > 0) {
                console.log(`🎉 SUCCESS! ${dataCount} data points generated`);
                return true;
            } else {
                console.log("⚠️ Response received but no data points created");
            }
        } else {
            console.log("⏳ No response received yet");
        }
        
        // Check for ResponseReceived events
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - 100; // Look back 100 blocks
        
        const filter = monitor.filters.ResponseReceived();
        const events = await monitor.queryFilter(filter, fromBlock, currentBlock);
        
        console.log(`\nFound ${events.length} ResponseReceived events in last 100 blocks`);
        
        if (events.length > 0) {
            const latestEvent = events[events.length - 1];
            console.log(`Latest response event block: ${latestEvent.blockNumber}`);
            console.log(`Request ID: ${latestEvent.args.requestId}`);
            console.log(`Response length: ${latestEvent.args.response.length}`);
            console.log(`Error length: ${latestEvent.args.err.length}`);
        }
        
        return dataCount > 0;
        
    } catch (error) {
        console.error("Error checking response:", error.message);
        return false;
    }
}

async function manualDataCheck() {
    console.log("\n=== ALTERNATIVE: SYNC WITHOUT NEW DATA ===");
    console.log("Since Chainlink Functions is taking time, let's check if we can sync the existing 27 nodes:");
    
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const senderABI = [
        "function getDataSummary() external view returns (uint256 nodeCount, uint256 edgeCount, uint256 dataCount, uint256 newDataAvailable)",
        "function quoteSyncFee(bool includeAllData) external view returns (uint256)"
    ];
    
    const sender = new ethers.Contract("0x1A57C0132A00d93ef1f1BC07B12E8aF4a1932c29", senderABI, wallet);
    
    try {
        const dataSummary = await sender.getDataSummary();
        console.log(`Nodes available: ${dataSummary[0]}`);
        console.log(`Edges available: ${dataSummary[1]}`);
        console.log(`Data points available: ${dataSummary[2]}`);
        
        if (dataSummary[0] > 0) {
            const fee = await sender.quoteSyncFee(false);
            console.log(`\n💡 We can sync the ${dataSummary[0]} registered nodes even without energy data`);
            console.log(`Sync fee: ${ethers.formatEther(fee)} POL`);
            console.log(`\nTo sync nodes now, run:`);
            console.log(`npx hardhat run scripts/syncNodesOnly.js`);
        }
        
    } catch (error) {
        console.error("Error checking sync options:", error.message);
    }
}

async function main() {
    await checkChainlinkRequest();
    await manualDataCheck();
    
    console.log("\n=== RECOMMENDATIONS ===");
    console.log("1. Wait longer for Chainlink Functions (can take 5-10 minutes)");
    console.log("2. Check Chainlink Functions dashboard at https://functions.chain.link/polygon-amoy");
    console.log("3. Verify subscription has sufficient LINK balance");
    console.log("4. Or sync just the node structure without energy data for now");
}

main().catch(console.error);