// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract UserManagement{

    struct User{
        string name; 
        string email; 
        bool isRegistered; 
    }

    mapping (address => User) public registeredUsers; 
    event UserRegistered (address indexed userAddress, string name, string email); //Event used by frontend to indicate user has been successfully registered. 
    event UserUpdated (address indexed userAddress, string name, string email); //Event used by frontend to indicate user profile has been successfully updated. 

    function registerCheck () external view returns (bool) { // Used to check whether the logged in user is registered, otherwise use "registeredUsers[address].isRegistered;"
        return registeredUsers[msg.sender].isRegistered; 
    }

    function register (string memory name, string memory email) external {
        require(!registeredUsers[msg.sender].isRegistered, "Already registered");       
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(email).length > 0, "Email cannot be empty"); 

        registeredUsers[msg.sender] = User(name, email, true);
        emit UserRegistered(msg.sender, name, email);
    }

    function updateUser (string memory name, string memory email) external {
        require(registeredUsers[msg.sender].isRegistered, "Not registered");
        require(bytes(name).length > 0 || bytes(email).length > 0, "Nothing to update");
        
        if (bytes(name).length > 0) {
            registeredUsers[msg.sender].name = name;
        }
        if (bytes(email).length > 0) {
            registeredUsers[msg.sender].email = email; 
        }
        emit UserUpdated(msg.sender, registeredUsers[msg.sender].name, registeredUsers[msg.sender].email);
    }

    function getUser (address userAddress) external view returns (User memory) { //Uses address parameter instead to be flexible and allow queries by other users if needed. 
        return registeredUsers[userAddress];
    }

}