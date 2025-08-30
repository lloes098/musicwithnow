// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

contract MusicCollaborationHub is CCIPReceiver, OwnerIsCreator {
    IRouterClient private s_router;
    IERC20 private s_linkToken;

    uint64 private constant SEPOLIA_CHAIN_SELECTOR = 16015286601757825753;
    address private constant MONAD_ROUTER = 0x5f16e51e3Dcb255480F090157DD01bA962a53E54;
    address private constant LINK_TOKEN = 0x6fE981Dbd557f81ff66836af0932cba535Cbc343;

    struct MusicProject {
        string originalS3Url;
        string[] contributionUrls;
        string currentMixedUrl;
        address creator;
        address[] collaborators;
        uint256 createdAt;
        uint256 lastUpdated;
        bool isActive;
        uint256 versionCount;
    }

    struct Contribution {
        address contributor;
        string s3Url;
        uint256 timestamp;
        string description;
    }

    mapping(uint256 => MusicProject) public musicProjects;
    mapping(uint256 => Contribution[]) public projectContributions;
    mapping(address => uint256[]) public userProjects;
    mapping(bytes32 => uint256) public ccipMessageToProject;
    uint256 public projectCounter;

    event MusicProjectReceived(
        bytes32 indexed messageId,
        uint256 indexed projectId,
        string s3Url,
        address creator
    );

    event ContributionAdded(
        uint256 indexed projectId,
        address indexed contributor,
        string s3Url,
        string description
    );

    event AIRemixRequested(
        uint256 indexed projectId,
        string[] contributionUrls,
        address requester
    );

    event ProjectRemixed(
        uint256 indexed projectId,
        string newMixedUrl,
        uint256 versionNumber,
        bytes32 responseMessageId
    );

    constructor() CCIPReceiver(MONAD_ROUTER) {
        s_router = IRouterClient(MONAD_ROUTER);
        s_linkToken = IERC20(LINK_TOKEN);
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        bytes32 messageId = any2EvmMessage.messageId;
        
        (string memory s3Url, address creator, address[] memory collaborators) = abi.decode(
            any2EvmMessage.data,
            (string, address, address[])
        );

        uint256 projectId = projectCounter++;
        
        musicProjects[projectId] = MusicProject({
            originalS3Url: s3Url,
            contributionUrls: new string[](0),
            currentMixedUrl: s3Url,
            creator: creator,
            collaborators: collaborators,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            isActive: true,
            versionCount: 1
        });

        projectContributions[projectId].push(Contribution({
            contributor: creator,
            s3Url: s3Url,
            timestamp: block.timestamp,
            description: "Original track"
        }));

        userProjects[creator].push(projectId);
        for (uint256 i = 0; i < collaborators.length; i++) {
            userProjects[collaborators[i]].push(projectId);
        }

        ccipMessageToProject[messageId] = projectId;

        emit MusicProjectReceived(messageId, projectId, s3Url, creator);
    }

    function addContribution(
        uint256 projectId,
        string memory contributionS3Url,
        string memory description
    ) external {
        require(projectId < projectCounter, "Project does not exist");
        require(musicProjects[projectId].isActive, "Project is not active");
        require(
            msg.sender == musicProjects[projectId].creator || 
            _isCollaborator(projectId, msg.sender),
            "Not authorized to contribute"
        );

        projectContributions[projectId].push(Contribution({
            contributor: msg.sender,
            s3Url: contributionS3Url,
            timestamp: block.timestamp,
            description: description
        }));

        musicProjects[projectId].contributionUrls.push(contributionS3Url);
        musicProjects[projectId].lastUpdated = block.timestamp;

        emit ContributionAdded(projectId, msg.sender, contributionS3Url, description);
    }

    function requestAIRemix(uint256 projectId) external {
        require(projectId < projectCounter, "Project does not exist");
        require(musicProjects[projectId].isActive, "Project is not active");
        require(
            msg.sender == musicProjects[projectId].creator || 
            _isCollaborator(projectId, msg.sender),
            "Not authorized"
        );

        string[] memory allUrls = new string[](projectContributions[projectId].length);
        for (uint256 i = 0; i < projectContributions[projectId].length; i++) {
            allUrls[i] = projectContributions[projectId][i].s3Url;
        }

        emit AIRemixRequested(projectId, allUrls, msg.sender);
    }

    function completeAIProcessing(
        uint256 projectId,
        string memory resultS3Url,
        address sepoliaReceiver
    ) external onlyOwner {
        require(projectId < projectCounter, "Invalid project ID");
        require(musicProjects[projectId].isActive, "Project not active");

        musicProjects[projectId].currentMixedUrl = resultS3Url;
        musicProjects[projectId].lastUpdated = block.timestamp;
        musicProjects[projectId].versionCount++;

        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            sepoliaReceiver,
            abi.encode(projectId, resultS3Url, musicProjects[projectId].creator),
            address(s_linkToken)
        );

        uint256 fees = s_router.getFee(SEPOLIA_CHAIN_SELECTOR, evm2AnyMessage);
        require(s_linkToken.balanceOf(address(this)) >= fees, "Insufficient LINK");

        s_linkToken.approve(address(s_router), fees);
        bytes32 responseMessageId = s_router.ccipSend(SEPOLIA_CHAIN_SELECTOR, evm2AnyMessage);

        emit ProjectRemixed(projectId, resultS3Url, musicProjects[projectId].versionCount, responseMessageId);
    }

    function _isCollaborator(uint256 projectId, address user) internal view returns (bool) {
        address[] memory collaborators = musicProjects[projectId].collaborators;
        for (uint256 i = 0; i < collaborators.length; i++) {
            if (collaborators[i] == user) {
                return true;
            }
        }
        return false;
    }

    function getProjectContributions(uint256 projectId) external view returns (Contribution[] memory) {
        require(projectId < projectCounter, "Project does not exist");
        return projectContributions[projectId];
    }

    function addCollaborator(uint256 projectId, address newCollaborator) external {
        require(projectId < projectCounter, "Project does not exist");
        require(msg.sender == musicProjects[projectId].creator, "Only creator can add collaborators");
        require(!_isCollaborator(projectId, newCollaborator), "Already a collaborator");

        musicProjects[projectId].collaborators.push(newCollaborator);
        userProjects[newCollaborator].push(projectId);
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
                    Client.EVMExtraArgsV1({gasLimit: 200_000})
                ),
                feeToken: _feeTokenAddress
            });
    }

    function getProject(uint256 projectId) external view returns (MusicProject memory) {
        require(projectId < projectCounter, "Project does not exist");
        return musicProjects[projectId];
    }

    function getUserProjects(address user) external view returns (uint256[] memory) {
        return userProjects[user];
    }

    function withdrawToken(address _beneficiary, address _token) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_beneficiary, amount);
    }
}