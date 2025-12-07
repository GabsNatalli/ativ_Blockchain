// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract IdentityRegistry {
    struct Identity {
        string name;
        string matricula;
        string curso;
        uint256 createdAt;
        bool exists;
    }

    struct IdentityInfo {
        address account;
        string name;
        string matricula;
        string curso;
        uint256 createdAt;
    }

    mapping(address => Identity) private identities;
    mapping(bytes32 => address) private addressByMatricula;
    mapping(address => uint256) private indexByAddress;
    IdentityInfo[] private identityList;

    event IdentityRegistered(address indexed account, string matricula, string name);
    event IdentityUpdated(address indexed account, string matricula, string name);

    error IdentityAlreadyExists();
    error MatriculaAlreadyInUse();
    error IdentityNotFound();

    function registerIdentity(
        string calldata name,
        string calldata matricula,
        string calldata curso
    ) external {
        if (bytes(name).length == 0 || bytes(matricula).length == 0) {
            revert IdentityNotFound();
        }

        Identity storage current = identities[msg.sender];
        if (current.exists) {
            revert IdentityAlreadyExists();
        }

        bytes32 matriculaHash = keccak256(abi.encodePacked(matricula));
        if (addressByMatricula[matriculaHash] != address(0)) {
            revert MatriculaAlreadyInUse();
        }

        Identity memory created = Identity({
            name: name,
            matricula: matricula,
            curso: curso,
            createdAt: block.timestamp,
            exists: true
        });

        identities[msg.sender] = created;
        addressByMatricula[matriculaHash] = msg.sender;

        identityList.push(
            IdentityInfo({
                account: msg.sender,
                name: name,
                matricula: matricula,
                curso: curso,
                createdAt: created.createdAt
            })
        );
        indexByAddress[msg.sender] = identityList.length;

        emit IdentityRegistered(msg.sender, matricula, name);
    }

    function updateIdentity(string calldata name, string calldata curso) external {
        Identity storage current = identities[msg.sender];
        if (!current.exists) {
            revert IdentityNotFound();
        }

        if (bytes(name).length > 0) {
            current.name = name;
        }
        current.curso = curso;

        uint256 index = indexByAddress[msg.sender];
        if (index > 0) {
            IdentityInfo storage info = identityList[index - 1];
            info.name = current.name;
            info.curso = curso;
        }

        emit IdentityUpdated(msg.sender, current.matricula, current.name);
    }

    function getIdentity(address account) external view returns (IdentityInfo memory info, bool exists) {
        Identity storage current = identities[account];
        if (!current.exists) {
            return (IdentityInfo({account: account, name: '', matricula: '', curso: '', createdAt: 0}), false);
        }

        info = IdentityInfo({
            account: account,
            name: current.name,
            matricula: current.matricula,
            curso: current.curso,
            createdAt: current.createdAt
        });
        exists = true;
    }

    function getIdentityByMatricula(string calldata matricula)
        external
        view
        returns (IdentityInfo memory info, bool exists)
    {
        bytes32 matriculaHash = keccak256(abi.encodePacked(matricula));
        address account = addressByMatricula[matriculaHash];
        if (account == address(0)) {
            return (IdentityInfo({account: address(0), name: '', matricula: '', curso: '', createdAt: 0}), false);
        }
        (info, exists) = this.getIdentity(account);
    }

    function getAllIdentities() external view returns (IdentityInfo[] memory) {
        return identityList;
    }
}
