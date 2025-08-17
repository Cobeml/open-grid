
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
}