// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NodeFunding
/// @notice Minimal payable contract to accept funding or purchases for infrastructure nodes
contract NodeFunding {
    /// @dev Owner with withdrawal and admin rights
    address public owner;

    /// @dev Total funds received across all nodes
    uint256 public totalFunds;

    /// @dev Per-node total funds
    mapping(uint256 => uint256) public nodeTotalFunds;

    /// @dev Per-node purchase price (optional). If set to non-zero, purchaseNode must send at least this much.
    mapping(uint256 => uint256) public nodePurchasePrice;

    /// @dev Track per-user contributions by node (optional view/analytics)
    mapping(uint256 => mapping(address => uint256)) public nodeContributionsByUser;

    event Funded(address indexed funder, uint256 indexed nodeId, uint256 amount);
    event Purchased(address indexed buyer, uint256 indexed nodeId, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event NodePriceSet(uint256 indexed nodeId, uint256 price);

    error NotOwner();
    error InvalidAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Fund a specific node with native currency
    function fundNode(uint256 nodeId) external payable {
        if (msg.value == 0) revert InvalidAmount();

        totalFunds += msg.value;
        nodeTotalFunds[nodeId] += msg.value;
        nodeContributionsByUser[nodeId][msg.sender] += msg.value;

        emit Funded(msg.sender, nodeId, msg.value);
    }

    /// @notice Optionally set a purchase price for a node
    function setNodePurchasePrice(uint256 nodeId, uint256 price) external onlyOwner {
        nodePurchasePrice[nodeId] = price;
        emit NodePriceSet(nodeId, price);
    }

    /// @notice Purchase a node by sending at least the configured price
    function purchaseNode(uint256 nodeId) external payable {
        uint256 price = nodePurchasePrice[nodeId];
        if (price == 0 || msg.value < price) revert InvalidAmount();

        totalFunds += msg.value;
        nodeTotalFunds[nodeId] += msg.value;
        nodeContributionsByUser[nodeId][msg.sender] += msg.value;

        emit Purchased(msg.sender, nodeId, msg.value);
    }

    /// @notice Withdraw funds to a specified recipient
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        uint256 bal = address(this).balance;
        if (amount > bal) amount = bal;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(to, amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /// @notice Accept direct donations without specifying a node
    receive() external payable {
        totalFunds += msg.value;
    }
}


