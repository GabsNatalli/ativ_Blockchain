// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract EventStorage {
    struct EventData {
        uint256 id;
        address owner;
        string title;
        string description;
        uint256 eventDate;
        uint256 createdAt;
    }

    uint256 private nextId = 1;
    mapping(uint256 => EventData) private eventsById;
    mapping(address => uint256[]) private eventIdsByOwner;
    EventData[] private allEvents;

    event EventCreated(uint256 indexed id, address indexed owner, string title, uint256 eventDate);

    error EventNotFound();
    error InvalidEventData();

    function createEvent(
        string calldata title,
        string calldata description,
        uint256 eventDate
    ) external returns (uint256 id) {
        if (bytes(title).length == 0) {
            revert InvalidEventData();
        }

        id = nextId++;
        EventData memory created = EventData({
            id: id,
            owner: msg.sender,
            title: title,
            description: description,
            eventDate: eventDate,
            createdAt: block.timestamp
        });

        eventsById[id] = created;
        eventIdsByOwner[msg.sender].push(id);
        allEvents.push(created);

        emit EventCreated(id, msg.sender, title, eventDate);
    }

    function getEvent(uint256 id) external view returns (EventData memory data, bool exists) {
        data = eventsById[id];
        if (data.id == 0) {
            return (EventData({id: 0, owner: address(0), title: '', description: '', eventDate: 0, createdAt: 0}), false);
        }
        exists = true;
    }

    function getEventsByOwner(address owner) external view returns (EventData[] memory) {
        uint256[] storage ids = eventIdsByOwner[owner];
        EventData[] memory result = new EventData[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = eventsById[ids[i]];
        }
        return result;
    }

    function getAllEvents() external view returns (EventData[] memory) {
        return allEvents;
    }
}
