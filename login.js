import {fetchHiveBalance, updateImagePlaceholders, handleInitialHash} from './ui.js';
import { getAddress, signMessage } from "sats-connect";

let loginFormEventListenerAdded = false;
let createAccountFormEventListenerAdded = false;
// Get the button that opens the modal
let btn = document.getElementById("loginButton");
let modal = document.getElementById("loginModal");
// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}
// When the user clicks the button, open the modal
btn.onclick = function() {
    modal.style.display = "block";
}

document.addEventListener('DOMContentLoaded', function() {
    if (!loginFormEventListenerAdded) {
        loginFormEventListenerAdded = true;
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLoginFormSubmit);
        }
    }

    if (!createAccountFormEventListenerAdded) {
        createAccountFormEventListenerAdded = true;
        const createAccountForm = document.getElementById('createAccountForm');
        if (createAccountForm) {
            createAccountForm.addEventListener('submit', handleCreateAccountFormSubmit);
        }
    }

    const savedUsername = localStorage.getItem('hive_username');
    if (savedUsername) {
        // Perform login actions as if the user has just logged in
        fetchHiveBalance(savedUsername);
        // Update the UI to reflect that the user is logged in
        updateLoginStatus(true, savedUsername);
    } else {
        // User is not logged in, show the Create Account button
        document.getElementById('createAccountButtonContainer').style.display = 'block';
    }
    handleInitialHash();

    // Add event listener for the "Link BTC Wallet" button
    const linkBtcWalletButton = document.getElementById('linkBtcWalletButton');
    if (linkBtcWalletButton) {
        linkBtcWalletButton.addEventListener('click', handleLinkBtcWallet);
    }

    // Add event listener for the "Create Account" button
    const createAccountButton = document.getElementById('createAccountButton');
    if (createAccountButton) {
        createAccountButton.addEventListener('click', function() {
            document.getElementById('createAccountModal').style.display = 'block';
        });
    }

    // Add event listener for closing the Create Account modal
    const closeCreateAccountModal = document.querySelector('#createAccountModal .close');
    if (closeCreateAccountModal) {
        closeCreateAccountModal.addEventListener('click', function() {
            document.getElementById('createAccountModal').style.display = 'none';
        });
    }
});

async function handleLinkBtcWallet() {
    const username = localStorage.getItem('hive_username');
    if (!username) {
        alert('Please log in first.');
        return;
    }

    const message = `hive:${username}`;

    try {
        // First, get the address
        const getAddressOptions = {
            payload: {
                purposes: ['payment'],
                message: 'Address for SPK Network',
                network: {
                    type: 'Mainnet'
                },
            },
            onFinish: async (response) => {
                const address = response.addresses[0].address;

                // Now sign the message with the obtained address
                const signMessageOptions = {
                    payload: {
                        network: {
                            type: 'Mainnet'
                        },
                        address: address,
                        message: message
                    },
                    onFinish: async (signResponse) => {
                        console.log(signResponse);
                        console.log('Signature response:', signResponse);

                        // Fetch the current profile metadata
                        const apiUrl = 'https://api.hive.blog';
                        const requestBody = {
                            jsonrpc: '2.0',
                            method: 'condenser_api.get_accounts',
                            params: [[username]],
                            id: 1
                        };

                        fetch(apiUrl, {
                            method: 'POST',
                            body: JSON.stringify(requestBody),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.result && data.result.length > 0) {
                                let metadata = {};
                                try {
                                    metadata = JSON.parse(data.result[0].posting_json_metadata);
                                } catch (e) {
                                    console.error('Error parsing existing metadata:', e);
                                }

                                // Update or add the Bitcoin address and signature
                                metadata.bitcoin = metadata.bitcoin || {};
                                metadata.bitcoin.address = address;
                                console.log("Sign response1: ", signResponse);
                                metadata.bitcoin.signature = signResponse;
                                metadata.bitcoin.message = message; // Add the message that was signed

                                // Update the profile on the Hive blockchain
                                const operations = [
                                    ['account_update2', {
                                        account: username,
                                        json_metadata: '',
                                        posting_json_metadata: JSON.stringify(metadata),
                                        extensions: []
                                    }]
                                ];

                                hive_keychain.requestBroadcast(username, operations, 'posting', function(response) {
                                    if (response.success) {
                                        alert('Bitcoin address and signature successfully added to your Hive profile!');
                                    } else {
                                        alert('Failed to update Hive profile: ' + response.message);
                                    }
                                });
                            } else {
                                console.error('Unable to fetch account details');
                                alert('Failed to fetch account details');
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching account details:', error);
                            alert('Error fetching account details: ' + error.message);
                        });
                    },
                    onCancel: () => alert('Message signing cancelled')
                };

                signMessage(signMessageOptions);
            },
            onCancel: () => alert('Address request cancelled')
        };

        await getAddress(getAddressOptions);
    } catch (error) {
        console.error('Error in BTC wallet linking process:', error);
        alert('Error linking BTC wallet. Please make sure Xverse wallet is installed and unlocked.');
    }
}

async function handleCreateAccountFormSubmit(event) {
    event.preventDefault();
    const newUsername = document.getElementById('newUsername').value;
    
    try {
        // First, get the address
        const getAddressOptions = {
            payload: {
                purposes: ['payment'],
                message: 'Address for SPK Network',
                network: {
                    type: 'Mainnet'
                },
            },
            onFinish: async (addressResponse) => {
                const address = addressResponse.addresses[0].address;

                // Now sign the message with the obtained address
                const signMessageOptions = {
                    payload: {
                        network: {
                            type: 'Mainnet'
                        },
                        address: address,
                        message: `hive:${newUsername}`
                    },
                    onFinish: (signResponse) => {
                        console.log('Signature:', signResponse);
                        alert(`Account creation requested for username: ${newUsername}\nSignature: ${signResponse}`);
                        
                        // TODO: Send the username, address, and signature to the backend for account creation
                        
                        // Close the modal after submission
                        document.getElementById('createAccountModal').style.display = 'none';
                    },
                    onCancel: () => {
                        console.log('Message signing cancelled');
                        alert('Account creation cancelled');
                    }
                };

                await signMessage(signMessageOptions);
            },
            onCancel: () => {
                console.log('Address request cancelled');
                alert('Account creation cancelled');
            }
        };

        await getAddress(getAddressOptions);
    } catch (error) {
        console.error('Error in account creation process:', error);
        alert('Error creating account. Please make sure Xverse wallet is installed and unlocked.');
    }
}


function handleLoginFormSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    if (window.hive_keychain) {
        console.log('Logging in with Hive Keychain:', username);
        window.hive_keychain.requestSignBuffer(
            username,
            'Login request message',
            'Posting',
            async function(response) {
                if (response.success) {
                    localStorage.setItem('hive_username', username);
                    fetchHiveBalance(response.data.username);
                    const hiveApiUrl = `https://api.hive.blog`;
                    const dluxApiUrl = `https://spktest.dlux.io/@${username}`;
                    try {
                        const [hiveRes, dluxRes] = await Promise.all([
                            fetch(hiveApiUrl, {
                                method: 'POST',
                                body: JSON.stringify({
                                    jsonrpc: '2.0',
                                    method: 'condenser_api.get_accounts',
                                    params: [[username]],
                                    id: 1
                                }),
                                headers: {'Content-Type': 'application/json'}
                            }),
                            fetch(dluxApiUrl)
                        ]);
                        const [hiveData, dluxData] = await Promise.all([hiveRes.json(), dluxRes.json()]);
                        const hivePubKey = hiveData.result[0].posting.key_auths[0][0];
                        const dluxPubKey = dluxData.pubKey;
                        console.log('Hive public key:', hivePubKey);
                        console.log('DLUX public key:', dluxPubKey);
                        if (hivePubKey === dluxPubKey) {
                            console.log('Public keys match, login successful.');
                            updateUserProfilePicture(username);
                            window.location.reload();
                        } else {
                            console.log('Public keys do not match, login failed.');
                            const statusMessage = document.getElementById('loginStatus');
                            statusMessage.innerText = 'Registering authority...';
                            statusMessage.style.display = 'block';

                            const registerOps = [
                                [
                                    "custom_json",
                                    {
                                        "required_auths": [username],
                                        "required_posting_auths": [],
                                        "id": "spkccT_register_authority",
                                        "json": JSON.stringify({"pubKey": hivePubKey})
                                    }
                                ]
                            ];
                            window.hive_keychain.requestBroadcast(
                                username,
                                registerOps,
                                'Active',
                                function(response) {
                                    if (response.success) {
                                        console.log('Register transaction successful:', response);
                                        statusMessage.innerText = 'Authority registered. Reloading in 5 seconds...';
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 5000);
                                    } else {
                                        console.error('Register transaction failed:', response.message);
                                        statusMessage.innerText = 'Registration failed. Please try again.';
                                    }
                                },
                                'Register Authority'
                            );
                        }
                    } catch (error) {
                        console.error('Error fetching public keys:', error);
                        document.getElementById('loginStatus').innerText = 'Login failed: ' + error.message;
                    }
                } else {
                    document.getElementById('loginStatus').innerText = 'Login failed';
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed');
    }
}

// Function to update the UI to reflect the user's login status
function updateLoginStatus(isLoggedIn, username) {
    console.log('Updating login status:', isLoggedIn, username);
    const loginButton = document.getElementById('loginButton');
    const balanceElement = document.getElementById('balance');
    const dropdownElement = document.querySelector('.dropdown');
    const createAccountButtonContainer = document.getElementById('createAccountButtonContainer');
    if (isLoggedIn) {
        loginButton.textContent = '';
        dropdownElement.classList.add('logged-in');
        document.getElementById('logoutButton').onclick = logout;
        fetchHiveBalance(username);
        updateUserProfilePicture(username);
        createAccountButtonContainer.style.display = 'none'; // Hide Create Account button when logged in
    } else {
        loginButton.textContent = 'Login';
        dropdownElement.classList.remove('logged-in');
        loginButton.onclick = function() {
            modal.style.display = "block";
        };
        balanceElement.innerText = '';
        createAccountButtonContainer.style.display = 'block'; // Show Create Account button when logged out
    }
}

// Function to handle user logout
export function logout() {
    localStorage.removeItem('hive_username');
    updateLoginStatus(false);
    window.location.reload(); // Optional: Reload the page to reset the state
}
// This function will be called after a successful login
function updateUserProfilePicture(username) {
    console.log('Fetching user profile picture:', username);
    // Hive blockchain API endpoint
    const apiUrl = 'https://api.hive.blog';
    const spkApiUrl = `https://spk.nathansenn.spk.tv/@${username}`;
    // Update the login button to show "Logout" instead of "Login"
    const loginButton = document.getElementById('loginButton');
    loginButton.textContent = 'Logout';
    loginButton.removeEventListener('click', btn.onclick);
    loginButton.addEventListener('click', logout);

    // Hive API request body to get account details
    const requestBody = {
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1
    };

    fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.result && data.result.length > 0) {
                // Extracting profile picture URL from posting_json_metadata
                const postingMetaData = data.result[0].posting_json_metadata ? JSON.parse(data.result[0].posting_json_metadata) : {};
                const profilePictureUrl = postingMetaData.profile && postingMetaData.profile.profile_image ? postingMetaData.profile.profile_image : 'default_profile_pic_url.jpg';

                // Update the login button to show the profile picture
                const loginButton = document.getElementById("loginButton");
                const sidebarLoginButton = document.getElementById("sidebarLoginButton");

                loginButton.style.backgroundImage = "url('" + profilePictureUrl + "')";
                loginButton.style.backgroundSize = 'cover';
                loginButton.style.backgroundPosition = 'center';
                loginButton.style.width = '40px';
                loginButton.style.height = '40px';
                loginButton.style.borderRadius = '50%';
                loginButton.textContent = ''; // Remove the text from the button

                if (sidebarLoginButton) {
                    sidebarLoginButton.style.backgroundImage = "url('" + profilePictureUrl + "')";
                    sidebarLoginButton.style.backgroundSize = 'cover';
                    sidebarLoginButton.style.backgroundPosition = 'center';
                    sidebarLoginButton.style.width = '40px';
                    sidebarLoginButton.style.height = '40px';
                    sidebarLoginButton.style.borderRadius = '50%';
                    sidebarLoginButton.textContent = ''; // Remove the text from the button
                }

                // Fetch additional user data from SPK API
                fetch(spkApiUrl)
                    .then(response => response.json())
                    .then(data => {
                        // Handle the SPK API data
                        // Extract and display the Broca balance
                        if (data.broca) {
                            const brocaBalance = data.broca.split(',')[0];
                            document.getElementById('balance').innerText = `Broca: ${brocaBalance}`;
                            document.getElementById('brocaBalance').innerText = `${brocaBalance} BROCA`;
                        }
                        // Extract and display the SPK Power balance
                        if (data.spk_power) {
                            const spkPowerBalance = data.spk_power;
                            document.getElementById('spkPowerBalance').innerText = `${spkPowerBalance} SPK Power`;
                        }
                        // Extract and display the SPK balance
                        if (data.spk) {
                            const spkBalance = data.spk;
                            document.getElementById('spkBalance').innerText = `${spkBalance} SPK`;
                        }
                        updateImagePlaceholders(data.file_contracts);
                        // You can update the UI or perform other actions with the data here
                    })
                    .catch(error => {
                        console.error('Error fetching data from SPK API:', error);
                    });
            } else {
                console.log('Unable to fetch account details');
            }
        })
        .catch(error => {
            console.error('Error fetching account details:', error);
        });
}
