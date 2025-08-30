// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

contract SepoliaGateway is CCIPReceiver, OwnerIsCreator {
    IRouterClient private s_router;
    IERC20 private s_linkToken;

    uint64 private constant MONAD_CHAIN_SELECTOR = 2183018362218727504;
    address private constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address private constant LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789;

    address public monadHubAddress;

    mapping(address => uint256[]) public userProjects;
    mapping(bytes32 => address) public messageToCreator;

    event ProjectSentToMonad(
        bytes32 indexed messageId,
        address indexed creator,
        string s3Url,
        uint256 fees
    );

    event ContributionSentToMonad(
        bytes32 indexed messageId,
        uint256 indexed projectId,
        address indexed contributor,
        string s3Url
    );

    event ProjectRemixedFromMonad(
        uint256 indexed projectId,
        string newMixedUrl,
        uint256 versionNumber,
        address indexed creator
    );

    constructor() CCIPReceiver(SEPOLIA_ROUTER) {
        s_router = IRouterClient(SEPOLIA_ROUTER);
        s_linkToken = IERC20(LINK_TOKEN);
        // monadHubAddress는 배포 후에 setMonadHubAddress로 설정
        monadHubAddress = address(0);
    }
    
    function setMonadHubAddress(address _monadHubAddress) external onlyOwner {
        monadHubAddress = _monadHubAddress;
    }

    function createMusicProject(
        string memory s3Url,
        address[] memory collaborators
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            monadHubAddress,
            abi.encode("CREATE_PROJECT", s3Url, msg.sender, collaborators),
            address(s_linkToken)
        );

        uint256 fees = s_router.getFee(MONAD_CHAIN_SELECTOR, evm2AnyMessage);
        require(s_linkToken.balanceOf(address(this)) >= fees, "Insufficient LINK");

        s_linkToken.transferFrom(msg.sender, address(this), fees);
        s_linkToken.approve(address(s_router), fees);

        messageId = s_router.ccipSend(MONAD_CHAIN_SELECTOR, evm2AnyMessage);
        messageToCreator[messageId] = msg.sender;

        emit ProjectSentToMonad(messageId, msg.sender, s3Url, fees);
        return messageId;
    }

    function addContributionToProject(
        uint256 projectId,
        string memory contributionS3Url,
        string memory description
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            monadHubAddress,
            abi.encode("ADD_CONTRIBUTION", projectId, contributionS3Url, msg.sender, description),
            address(s_linkToken)
        );

        uint256 fees = s_router.getFee(MONAD_CHAIN_SELECTOR, evm2AnyMessage);
        require(s_linkToken.balanceOf(address(this)) >= fees, "Insufficient LINK");

        s_linkToken.transferFrom(msg.sender, address(this), fees);
        s_linkToken.approve(address(s_router), fees);

        messageId = s_router.ccipSend(MONAD_CHAIN_SELECTOR, evm2AnyMessage);

        emit ContributionSentToMonad(messageId, projectId, msg.sender, contributionS3Url);
        return messageId;
    }

    function requestAIRemix(uint256 projectId) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            monadHubAddress,
            abi.encode("REQUEST_REMIX", projectId, msg.sender),
            address(s_linkToken)
        );

        uint256 fees = s_router.getFee(MONAD_CHAIN_SELECTOR, evm2AnyMessage);
        require(s_linkToken.balanceOf(address(this)) >= fees, "Insufficient LINK");

        s_linkToken.transferFrom(msg.sender, address(this), fees);
        s_linkToken.approve(address(s_router), fees);

        messageId = s_router.ccipSend(MONAD_CHAIN_SELECTOR, evm2AnyMessage);
        return messageId;
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        (uint256 projectId, string memory newMixedUrl, uint256 versionNumber, address creator) = abi.decode(
            any2EvmMessage.data,
            (uint256, string, uint256, address)
        );

        userProjects[creator].push(projectId);

        emit ProjectRemixedFromMonad(projectId, newMixedUrl, versionNumber, creator);
    }

    function _buildCCIPMessage(
        address _receiver,
        bytes memory _data,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver),
                data: _data,
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 500_000})
                ),
                feeToken: _feeTokenAddress
            });
    }

    function getUserProjects(address user) external view returns (uint256[] memory) {
        return userProjects[user];
    }

    function updateMonadHubAddress(address _newAddress) external onlyOwner {
        monadHubAddress = _newAddress;
    }

    function withdrawToken(address _beneficiary, address _token) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_beneficiary, amount);
    }
}